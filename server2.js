import express from "express";
import * as anchor from "@coral-xyz/anchor";
const { BN } = anchor.default;
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Setup Solana connection on devnet
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Load wallet from your local keypair
// Replace with your actual keypair path
let keypair;
try {
  const walletKey = JSON.parse(fs.readFileSync("./server-wallet.json"));
  keypair = Keypair.fromSecretKey(new Uint8Array(walletKey));
} catch (err) {
  console.error("Error loading wallet:", err);
  process.exit(1);
}

const wallet = new anchor.Wallet(keypair);

const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

// Use the IDL from your pasted content
const idl = JSON.parse(fs.readFileSync("./arcade_game.json"));

// Program ID from your deployed contract
const programId = new PublicKey("uqF9WXM1GkHE2nKFAPUVX1BSiWys59yzuWZW9GR9Fky");

// Initialize the program
const program = new anchor.Program(idl, provider);

// Helper function to derive PDA for a pot
const getPotPDA = (gameId, potNumber) => {
  const potNumberBN = new BN(parseInt(potNumber));

  const [potPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pot"),
      Buffer.from(gameId),
      potNumberBN.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );

  return potPda;
};

// Define routes
app.get("/pot/:gameId/:potNumber", async (req, res) => {
  try {
    const { gameId, potNumber } = req.params;

    // Get the PDA
    const potPda = getPotPDA(gameId, potNumber);

    try {
      // Fetch the pot account data
      const potAccount = await program.account.gamePot.fetch(potPda);

      // Return the pot balance and status
      res.json({
        gameId: potAccount.gameId,
        potNumber: potAccount.potNumber.toString(),
        balance: potAccount.totalLamports.toString(),
        status: Object.keys(potAccount.status)[0],
        balanceSol:
          potAccount.totalLamports.toNumber() / anchor.web3.LAMPORTS_PER_SOL,
      });
    } catch (err) {
      if (err.message.includes("Account does not exist")) {
        res.status(404).json({
          error: `Pot not found for game '${gameId}' with pot number ${potNumber}`,
          details: "The pot account may not have been initialized yet",
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error fetching pot status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get pot balance using the check_pot_status instruction
app.get("/pot-balance/:gameId/:potNumber", async (req, res) => {
  try {
    const { gameId, potNumber } = req.params;

    // Get the PDA
    const potPda = getPotPDA(gameId, potNumber);

    try {
      // Call the check_pot_status instruction
      const balance = await program.methods
        .checkPotStatus()
        .accounts({
          potAccount: potPda,
        })
        .view();

      res.json({
        gameId,
        potNumber,
        balance: balance.toString(),
        balanceSol: balance.toNumber() / anchor.web3.LAMPORTS_PER_SOL,
      });
    } catch (err) {
      if (err.message.includes("Account does not exist")) {
        res.status(404).json({
          error: `Pot not found for game '${gameId}' with pot number ${potNumber}`,
          details: "The pot account may not have been initialized yet",
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error checking pot balance:", error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize a new pot
app.post("/pot/initialize", async (req, res) => {
  try {
    const { gameId, potNumber } = req.body;

    if (!gameId || !potNumber) {
      return res
        .status(400)
        .json({ error: "gameId and potNumber are required" });
    }

    const potNumberBN = new BN(parseInt(potNumber));

    // Get the PDA
    const potPda = getPotPDA(gameId, potNumber);

    try {
      // Call the initialize_pot instruction
      const tx = await program.methods
        .initializePot(gameId, potNumberBN)
        .accounts({
          potAccount: potPda,
          signer: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      res.json({
        success: true,
        message: `Pot initialized for game '${gameId}' with pot number ${potNumber}`,
        transaction: tx,
        potAddress: potPda.toString(),
      });
    } catch (err) {
      if (err.message.includes("already in use")) {
        res.status(409).json({
          error: `Pot already exists for game '${gameId}' with pot number ${potNumber}`,
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error initializing pot:", error);
    res.status(500).json({ error: error.message });
  }
});

// List all pots for a game
app.get("/pots/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;

    // Get all GamePot accounts
    const accounts = await program.account.gamePot.all();

    // Filter for the specific game ID
    const gamePots = accounts
      .filter((account) => account.account.gameId === gameId)
      .map((account) => ({
        gameId: account.account.gameId,
        potNumber: account.account.potNumber.toString(),
        balance: account.account.totalLamports.toString(),
        status: Object.keys(account.account.status)[0],
        address: account.publicKey.toString(),
        balanceSol:
          account.account.totalLamports.toNumber() /
          anchor.web3.LAMPORTS_PER_SOL,
      }));

    res.json(gamePots);
  } catch (error) {
    console.error("Error fetching pots:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Wallet public key: ${wallet.publicKey.toString()}`);
  console.log(`Connected to Solana devnet: https://api.devnet.solana.com`);
});

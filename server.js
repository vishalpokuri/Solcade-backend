import express from "express";
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Initialize Express app
const app = express();
const PORT = 3001;

app.use(express.json());

// Setup Solana connection on devnet
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Load wallet from your local keypair
// Replace with your actual keypair path
const wallet = new anchor.Wallet(
  anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from([
      92, 53, 174, 191, 138, 100, 21, 121, 69, 161, 82, 0, 55, 223, 155, 222,
      160, 70, 42, 59, 125, 211, 83, 107, 52, 74, 160, 172, 56, 216, 85, 53,
      195, 238, 128, 144, 254, 176, 83, 80, 177, 30, 101, 195, 78, 151, 175, 25,
      203, 146, 13, 200, 11, 244, 21, 47, 137, 180, 176, 107, 63, 245, 24, 207,
    ])
  )
);

const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

// Hello World IDL
const idl = {
  version: "0.1.0",
  name: "hello_world",
  instructions: [
    {
      name: "initialize",
      accounts: [
        {
          name: "signer",
          isMut: false,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  metadata: {
    address: "G1LUPbvsHqVrtJpKwVEjiZt9BK85AJP8JtKn8amhKbxn",
  },
};
// Program ID from your deployed contract
const programId = new PublicKey("G1LUPbvsHqVrtJpKwVEjiZt9BK85AJP8JtKn8amhKbxn");

// Initialize the program
const program = new anchor.Program(idl, programId, provider);

// Basic route for testing connection
app.get("/", (req, res) => {
  res.json({
    message: "Solana Hello World backend is running",
    walletPublicKey: wallet.publicKey.toString(),
    programId: programId.toString(),
  });
});

// Initialize the Hello World program
app.post("/initialize", async (req, res) => {
  try {
    // Call the initialize instruction with required accounts
    const tx = await program.methods
      .initialize()
      .accounts({
        signer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    res.json({
      success: true,
      message: "Hello World program initialized",
      transaction: tx,
    });
  } catch (error) {
    console.error("Error initializing Hello World:", error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
});

// Get transaction details
app.get("/transaction/:signature", async (req, res) => {
  try {
    const { signature } = req.params;

    const transaction = await connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({
      transaction,
      blockTime: transaction.blockTime,
      confirmations: transaction.confirmations,
      status: transaction.meta.err ? "Failed" : "Success",
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get account balance
app.get("/balance", async (req, res) => {
  try {
    const balance = await connection.getBalance(wallet.publicKey);

    res.json({
      address: wallet.publicKey.toString(),
      balanceLamports: balance,
      balanceSol: balance / anchor.web3.LAMPORTS_PER_SOL,
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Wallet public key: ${wallet.publicKey.toString()}`);
    console.log(`Program ID: ${programId.toString()}`);
    console.log(`Connected to Solana devnet: https://api.devnet.solana.com`);
  })
  .on("error", (error) => {
    console.error("Server failed to start:", error);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

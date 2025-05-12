import express from "express";
import * as anchor from "@coral-xyz/anchor";
const { BN } = anchor.default;
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Game from "./models/Games.js";
import GamePot from "./models/GamePot.js";
import Gameplay from "./models/Gameplay.js";
import Txhash from "./models/Txhash.js";
// Initialize Express app
const app = express();
const PORT = 3001;

app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

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

app.get("/user/existOrCreate/:publicKey", async (req, res) => {
  const { publicKey } = req.params;
  const user = await User.findOne({ publicKey });
  if (!user) {
    const newUser = new User({ publicKey });
    await newUser.save();
    const json = {
      exists: false,
      status: "success",
      userId: newUser._id,
      message: "New user created successfully",
    };

    res.status(200).json(json);
  } else {
    const json = {
      exists: true,
      status: "success",
      message: "User already exists",
      userId: user._id,
    };

    res.status(200).json(json);
  }
});

app.get("/user/:userId/isPlayed/:gameId/:potId", async (req, res) => {
  const { userId, gameId, potId } = req.params;

  try {
    const mostRecent = await Gameplay.findOne({ userId, gameId, potId })
      .sort({ timestamp: -1 }) // get the latest one
      .populate("txhash");

    res.json({ latestGameplay: mostRecent });
  } catch (err) {
    console.error("Error fetching gameplay:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//this will be used to get the current potId for the game with useEffect
app.get("/pot/latest/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameObjectId = await Game.findOne({ gameId });

    const latestPot = await GamePot.findOne({ gameId: gameObjectId._id })
      .sort({ createdAt: -1 }) // sort by timestamp descending (latest first)
      .exec();

    if (!latestPot) {
      return res.status(404).json({
        success: false,
        message: "No pots found for the given gameId",
      });
    }
    if (latestPot.status === "Ended") {
      return res.status(404).json({
        success: false,
        message: "No active pots found for the given gameId",
      });
    }

    res.json({
      success: true,
      pot: latestPot,
    });
  } catch (error) {
    console.error("Error fetching latest pot:", error);
    res.status(500).json({ error: error.message });
  }
});

//leaderboard logic
// Public leaderboard without user-specific details
app.get("/leaderboard/:gameId/:potId", async (req, res) => {
  try {
    const { gameId, potId } = req.params;

    const leaderboard = await Gameplay.find({ gameId, potId })
      .sort({ score: -1 })
      .populate("userId", "username");

    const totalGamesPlayed = await Gameplay.countDocuments({ gameId, potId });
    const uniquePlayers = await Gameplay.distinct("userId", { gameId, potId });

    res.json({
      leaderboard,
      totalGamesPlayed,
      uniquePlayers: uniquePlayers.length,
    });
  } catch (error) {
    console.error("Error fetching public leaderboard:", error);
    res.status(500).json({ error: error.message });
  }
});
// Leaderboard with user-specific stats
app.get("/leaderboard/:gameId/:potId/user/:userId", async (req, res) => {
  try {
    const { gameId, potId, userId } = req.params;
    const leaderboard = await Gameplay.find({
      gameId,
      potId,
      score: { $gt: 0 },
    })
      .sort({ score: -1 })
      .populate("userId", "username");

    const totalGamesPlayed = await Gameplay.countDocuments({
      gameId,
      potId,
      score: { $gt: 0 },
    });
    const uniquePlayers = await Gameplay.distinct("userId", {
      gameId,
      potId,
      score: { $gt: 0 },
    });

    const userPlayCount = await Gameplay.countDocuments({
      gameId,
      potId,
      userId,
      score: { $gt: 0 },
    });

    res.json({
      leaderboard,
      totalGamesPlayed,
      uniquePlayers: uniquePlayers.length,
      userPlayCount,
    });
  } catch (error) {
    console.error("Error fetching personalized leaderboard:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Pot details (balance, status, balance_sol);
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
        potAddress: potPda.toString(),
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

// Initialize a new pot (done by cron job for only once)
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

      //db call
      const newGamePot = new GamePot({
        gameId,
        potNumber,
        potPublicKey: potPda.toString(),
        totalLamports: 0,
        gameplays: [], //array of gameplays
        status: "Active",
        createdAt: new Date(),
        closedAt: null,
      });
      await newGamePot.save();

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

// Close a pot (mark as ended)
app.post("/pot/close", async (req, res) => {
  try {
    const { gameId, potNumber } = req.body;

    if (!gameId || !potNumber) {
      return res
        .status(400)
        .json({ error: "gameId and potNumber are required" });
    }

    // Get the PDA
    const potPda = getPotPDA(gameId, potNumber);

    try {
      // Call the close_pot instruction
      const tx = await program.methods
        .closePot()
        .accounts({
          potAccount: potPda,
        })
        .rpc();
      //db call
      const gamePot = await GamePot.findOne({
        gameId,
        potNumber,
      });
      gamePot.status = "Ended";
      gamePot.closedAt = new Date();
      await gamePot.save();

      res.json({
        success: true,
        message: `Pot closed for game '${gameId}' with pot number ${potNumber}`,
        transaction: tx,
        potAddress: potPda.toString(),
      });
    } catch (err) {
      throw err;
    }
  } catch (error) {
    console.error("Error closing pot:", error);
    res.status(500).json({ error: error.message });
  }
});

// Distribute winnings to winners
app.post("/pot/distribute-winners", async (req, res) => {
  try {
    const { gameId, potNumber, winners } = req.body;

    if (
      !gameId ||
      !potNumber ||
      !winners ||
      !Array.isArray(winners) ||
      winners.length !== 5
    ) {
      return res.status(400).json({
        error:
          "gameId, potNumber, and winners array with exactly 5 public keys are required",
      });
    }

    // Get the PDA
    const potPda = getPotPDA(gameId, potNumber);

    // Convert winner addresses to PublicKey objects
    const winnerPubkeys = winners.map((winner) => new PublicKey(winner));

    try {
      // Prepare accounts for the distribute_winners instruction
      const remainingAccounts = winnerPubkeys.map((pubkey) => ({
        pubkey,
        isWritable: true,
        isSigner: false,
      }));

      // Call the distribute_winners instruction
      const tx = await program.methods
        .distributeWinners(winnerPubkeys)
        .accounts({
          potAccount: potPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .rpc();

      res.json({
        success: true,
        message: `Winnings distributed for game '${gameId}' with pot number ${potNumber}`,
        transaction: tx,
        potAddress: potPda.toString(),
        winners: winners,
      });
    } catch (err) {
      if (err.message.includes("PotNotActive")) {
        res.status(400).json({
          error: "The pot must be ended before distributing winnings.",
        });
      } else if (err.message.includes("InvalidWinnerList")) {
        res.status(400).json({
          error: "Invalid winner list: must contain exactly 5 addresses.",
        });
      } else if (err.message.includes("WinnerPubkeyMismatch")) {
        res.status(400).json({
          error: "Winner public key does not match the expected order.",
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error distributing winnings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create unsigned transaction for client to sign with wallet adapter
app.post("/pot/create-entry-fee-transaction", async (req, res) => {
  try {
    //game id comes from params
    //pot public key comes from params
    //publicKey will come from frontend localstorage
    const { gameId, potPublicKey, amount, playerPublicKey } = req.body;

    if (!gameId || !potPublicKey || !amount || !playerPublicKey) {
      return res.status(400).json({
        error: "gameId, potPublicKey, amount, and playerPublicKey are required",
      });
    }

    // Convert amount to lamports (BN format)
    const amountBN = new BN(parseInt(amount));

    // Parse player public key
    const player = new PublicKey(playerPublicKey);

    try {
      // Create transaction for pay_entry_fee instruction
      const transaction = await program.methods
        .payEntryFee(amountBN)
        .accounts({
          potAccount: potPublicKey,
          player: player,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();

      // Get recent blockhash for transaction
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = player;

      // Serialize the transaction to base64
      const serializedTransaction = Buffer.from(
        transaction.serialize({ requireAllSignatures: false })
      ).toString("base64");

      res.json({
        success: true,
        message: `Transaction created for entry fee payment of ${amount} lamports`,
        serializedTransaction,
        potAddress: potPublicKey,
      });
    } catch (err) {
      if (err.message.includes("PotNotActive")) {
        res.status(400).json({
          error: "The pot is not active.",
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error creating entry fee transaction:", error);
    res.status(500).json({ error: error.message });
  }
});

// Verify and record a completed payment transaction
//  This is only used for checking the transaction after create-entry-fee-transaction is called
app.post("/pot/verify-payment", async (req, res) => {
  try {
    const { gameId, potPublicKey, signature, playerPublicKey } = req.body;

    if (!gameId || !potPublicKey || !signature || !playerPublicKey) {
      return res.status(400).json({
        error:
          "gameId, potPublicKey, signature, and playerPublicKey are required",
      });
    }

    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (!tx.meta || tx.meta.err) {
      return res.status(400).json({ error: "Transaction failed" });
    }

    const programIndex = tx.transaction.message.accountKeys.findIndex((key) =>
      key.equals(programId)
    );

    if (programIndex === -1) {
      return res
        .status(400)
        .json({ error: "Transaction did not involve our program" });
    }

    const playerPubkey = new PublicKey(playerPublicKey);
    const playerIndex = tx.transaction.message.accountKeys.findIndex((key) =>
      key.equals(playerPubkey)
    );

    if (playerIndex === -1) {
      return res
        .status(400)
        .json({ error: "Player not involved in transaction" });
    }

    // Parse amount (from inner instructions or logs if needed, else trust input)
    // For now we assume it's trusted input or known fee
    const amount = 5000000; // Replace with dynamic extraction if needed

    // Save signed transaction base64
    const txnHash = await Txhash.create({
      txhash: signature,
      isPlayed: false,
    });

    const game = await Game.findOne({ _id: gameId });
    const fpot = await GamePot.findOne({ potPublicKey });
    const user = await User.findOne({ publicKey: playerPublicKey });

    const newGameplay = new Gameplay({
      gameId: game._id,
      potId: fpot._id,
      userId: user._id,
      score: 0,
      timestamp: new Date(),
      txhash: txnHash._id,
    });
    await newGameplay.save();

    // Add amount to the pot
    const pot = await GamePot.findOne({ potPublicKey });
    pot.totalLamports += amount;
    await pot.save();

    res.json({
      success: true,
      message: `Payment verified and gameplay entry saved`,
      signature,
      potAddress: potPublicKey,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// For admin/server-initiated payments
app.post("/pot/pay-entry-fee", async (req, res) => {
  try {
    const { gameId, potNumber, amount } = req.body;

    if (!gameId || !potNumber || !amount) {
      return res
        .status(400)
        .json({ error: "gameId, potNumber, and amount are required" });
    }

    // Get the PDA
    const potPda = getPotPDA(gameId, potNumber);

    // Convert amount to lamports (BN format)
    const amountBN = new BN(parseInt(amount));

    try {
      // Call the pay_entry_fee instruction using server wallet
      const tx = await program.methods
        .payEntryFee(amountBN)
        .accounts({
          potAccount: potPda,
          player: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      res.json({
        success: true,
        message: `Server paid entry fee of ${amount} lamports to pot for game '${gameId}' with pot number ${potNumber}`,
        transaction: tx,
        potAddress: potPda.toString(),
        player: wallet.publicKey.toString(),
      });
    } catch (err) {
      if (err.message.includes("PotNotActive")) {
        res.status(400).json({
          error: "The pot is not active.",
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error paying entry fee:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/score/update", async (req, res) => {
  try {
    const { gameId, potId, userId, txhash, score } = req.body;

    const gameplays = await Gameplay.find({
      gameId,
      potId,
      userId,
      txhash,
    });

    if (gameplays.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No gameplay found with the given parameters",
      });
    }

    if (gameplays.length > 1) {
      return res.status(409).json({
        success: false,
        message: "Multiple gameplays found — possible data inconsistency",
      });
    }

    const gameplay = gameplays[0];
    gameplay.score = score;
    await gameplay.save();

    // ✅ Also update isPlayed in Txhash
    const txhashDoc = await Txhash.findById(txhash);
    if (txhashDoc) {
      txhashDoc.isPlayed = true;
      await txhashDoc.save();
    } else {
      return res.status(404).json({
        success: false,
        message: "Associated txhash not found",
      });
    }

    res.json({
      success: true,
      message: "Score updated and isPlayed marked true",
      updated: {
        gameplay,
        txhash: txhashDoc,
      },
    });
  } catch (error) {
    console.error("Error updating score:", error);
    res.status(500).json({ error: error.message });
  }
});

//get all gameplays with gameId and potID
app.get("/gameplays/:gameId/:potId", async (req, res) => {
  try {
    const { gameId, potId } = req.params;
    const gameplays = await Gameplay.find({ gameId, potId }).populate(
      "userId txhash"
    );
    console.log("gameplays: ", gameplays);
    res.json(gameplays);
  } catch (error) {
    console.error("Error fetching gameplays:", error);
    res.status(500).json({ error: error.message });
  }
});
//get all games
app.get("/games/all", async (req, res) => {
  const games = await Game.find();
  res.status(200).json(games);
});

// // Get all pots across all games
// app.get("/pots", async (req, res) => {
//   try {
//     // Get all GamePot accounts
//     const accounts = await program.account.gamePot.all();

//     const allPots = accounts.map((account) => ({
//       gameId: account.account.gameId,
//       potNumber: account.account.potNumber.toString(),
//       balance: account.account.totalLamports.toString(),
//       status: Object.keys(account.account.status)[0],
//       address: account.publicKey.toString(),
//       balanceSol:
//         account.account.totalLamports.toNumber() / anchor.web3.LAMPORTS_PER_SOL,
//     }));

//     res.json(allPots);
//   } catch (error) {
//     console.error("Error fetching all pots:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// Start server
app.listen(PORT, () => {
  connectDB();
  console.log(`Server running on port ${PORT}`);
  console.log(`Wallet public key: ${wallet.publicKey.toString()}`);
  console.log(`Connected to Solana devnet: https://api.devnet.solana.com`);
});

app.post("/games/add", async (req, res) => {
  const { gameId, description, entryFee } = req.body;
  const game = await Game.findOne({ gameId });
  if (!game) {
    const newGame = new Game({ gameId, description, entryFee });
    await newGame.save();
    res.json({
      success: true,
      message: "Game added successfully",
      game: newGame,
    });
  } else {
    res.json({ success: false, message: "Game already exists" });
  }
});

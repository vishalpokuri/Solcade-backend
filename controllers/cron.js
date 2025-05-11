const cron = require("node-cron");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");
const fs = require("fs");
const BN = require("bn.js"); // Make sure to add this import
require("dotenv").config();

let idl;
try {
  idl = JSON.parse(fs.readFileSync("./arcade_game.json", "utf8"));
} catch (err) {
  console.error("Error loading IDL file:", err);
  process.exit(1);
}

const programId = new PublicKey(idl.metadata.address || idl.address);

let keypair;
try {
  const walletKey = JSON.parse(fs.readFileSync("./server-wallet.json"));
  keypair = Keypair.fromSecretKey(new Uint8Array(walletKey));
} catch (err) {
  console.error("Error loading wallet:", err);
  process.exit(1);
}

const connection = new Connection(process.env.SOLANA_RPC, "confirmed");
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  preflightCommitment: "confirmed",
});

let program;
try {
  program = new anchor.Program(idl, programId, provider);
} catch (err) {
  console.error("Failed to initialize Anchor program:", err);
  process.exit(1);
}

//Run every 15 minutes
// Run every minute (for testing, change as needed)
cron.schedule("*/1 * * * *", async () => {
  try {
    console.log("⏰ Running cron job to check and update pot...");

    // You need to pass these parameters or get them from somewhere
    const gameId = "your_game_id"; // Replace with actual game ID
    const potNumber = 1; // Replace with actual pot number

    // Create BN for pot number
    const potNumberBN = new BN(potNumber);

    // Find PDA for pot
    const [potPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("pot"),
        Buffer.from(gameId),
        Buffer.from(potNumberBN.toArray("le", 8)),
      ],
      programId
    );

    console.log("Pot PDA:", potPDA.toString());

    // Call the close_pot instruction
    const tx = await program.methods
      .closePot()
      .accounts({
        potAccount: potPDA,
        // Add any other required accounts based on your program
        authority: wallet.publicKey,
      })
      .rpc();

    console.log("✅ Pot closed successfully, transaction:", tx);
  } catch (e) {
    console.error("❌ Error in cron job:", e);
  }
});

console.log("Cron job scheduled");

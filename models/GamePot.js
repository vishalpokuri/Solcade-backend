import mongoose from "mongoose";

const gamePotSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
  potNumber: Number, // Equivalent to pot_number
  potPublicKey: String, // On-chain PDA public key of the pot
  totalLamports: Number,
  status: { type: String, enum: ["Active", "Ended"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
  closedAt: Date, // Set when status becomes Ended
});

const GamePot = mongoose.model("GamePot", gamePotSchema);
export default GamePot;

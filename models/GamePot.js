import mongoose from "mongoose";

const gamePotSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
  potNumber: { type: Number, required: true, unique: true }, // Equivalent to pot_number
  potPublicKey: { type: String, required: true, unique: true }, // On-chain PDA public key of the pot
  totalLamports: { type: Number, required: true },
  gameplays: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gameplay" }],
  status: { type: String, enum: ["Active", "Ended"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null }, // Set when status becomes Ended
});

const GamePot = mongoose.model("GamePot", gamePotSchema);
export default GamePot;

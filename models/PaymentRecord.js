import mongoose from "mongoose";

// Schema for tracking payment status of each wallet for each game pot
const paymentRecordSchema = new mongoose.Schema({
  wallet: { type: String, required: true },           // Wallet address of the user
  game_id: { type: String, required: true },         // Game identifier (e.g., flappy_bird, pacman)
  pot_number: { type: Number, required: true },      // Unique identifier for the pot
  paid: { type: Boolean, default: false }            // Status whether user has paid the entry fee
});

// Ensuring uniqueness of wallet, game, and pot combination to avoid duplicates
paymentRecordSchema.index({ wallet: 1, game_id: 1, pot_number: 1 }, { unique: true });

export default mongoose.model("PaymentRecord", paymentRecordSchema);

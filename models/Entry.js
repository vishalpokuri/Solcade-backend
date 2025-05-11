import mongoose from "mongoose";

const entrySchema = new mongoose.Schema({
  game_id: { type: String, required: true },           // Game ID like flappy_bird
  pot_number: { type: Number, required: true },        // Current pot number
  wallet: { type: String, required: true },            // User's wallet address
  scores: { type: [Number], default: [] },             // Array of scores submitted by user
  timestamp: { type: Date, default: Date.now }         // Timestamp of entry creation
});

// Compound index to allow fast queries per pot sorted by highest score
entrySchema.index({ game_id: 1, pot_number: 1, 'scores.0': -1 });

const Entry = mongoose.model("Entry", entrySchema);
export default Entry;

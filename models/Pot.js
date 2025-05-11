import mongoose from "mongoose";

const potSchema = new mongoose.Schema({
  game_id: { type: String, required: true },
  pot_number: { type: Number, required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  winners: { type: [String], default: [] }, // wallet addresses
  distributed: { type: Boolean, default: false },
  total_lamports: { type: Number, default: 0 }
});

potSchema.index({ game_id: 1, pot_number: 1 }, { unique: true });

const Pot = mongoose.model("Pot", potSchema);
export default Pot;

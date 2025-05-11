import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema({
  game_id: { type: String, required: true },
  pot_number: { type: Number, required: true },
  leaderboard: [
    {
      wallet: String,
      score: Number
    }
  ]
});

leaderboardSchema.index({ game_id: 1, pot_number: 1 }, { unique: true });

const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);
export default Leaderboard;

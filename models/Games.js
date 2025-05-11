import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  name: String,
  description: String,
  entryFee: Number, // Lamports
  duration: Number, // Leaderboard session duration in minutes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Game = mongoose.model("Game", gameSchema);
export default Game;

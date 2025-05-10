import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  name: String,
  description: String,
  entryFee: Number, // In lamports or SOL
  duration: Number, // Time period for leaderboard reset (in minutes)
  createdAt: Date,
  updatedAt: Date,
});

const Game = mongoose.model("Game", gameSchema);

export default Game;

import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  name: String,
  description: String,
  entryFee: Number, // Lamports
});

const Game = mongoose.model("Game", gameSchema);
export default Game;

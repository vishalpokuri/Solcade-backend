import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  description: String,
  entryFee: Number,
});

const Game = mongoose.model("Game", gameSchema);
export default Game;

import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  description: String,
  entryFee: Number,
  logo: String,
  genre: String,
  name: String,
});

const Game = mongoose.model("Game", gameSchema);
export default Game;

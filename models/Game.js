import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  game_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const Game = mongoose.model("Game", gameSchema);
export default Game;

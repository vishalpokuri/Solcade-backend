import mongoose from "mongoose";
const userGameplaySchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
  potId: { type: mongoose.Schema.Types.ObjectId, ref: "GamePot" }, // Link to pot
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  score: Number,
  timestamp: { type: Date, default: Date.now },
  txhash: { type: mongoose.Schema.Types.ObjectId, ref: "Txhash" },
});

const UserGameplay = mongoose.model("UserGameplay", userGameplaySchema);
export default UserGameplay;

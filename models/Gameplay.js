import mongoose from "mongoose";

const userGameplaySchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
  sessionId: String, //Pot Id maybe
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  score: Number,
  timestamp: Date,
  txHash: String, // Entry fee payment TX
  valid: Boolean, // Whether this play was valid (not cheated, etc.)
});

const UserGameplay = mongoose.model("UserGameplay", userGameplaySchema);

export default UserGameplay;

import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
  potId: { type: mongoose.Schema.Types.ObjectId, ref: "GamePot" },
  startTime: Date,
  endTime: Date,
  players: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      score: Number,
      rank: Number,
      timestamp: Date, // Time of score submission
    },
  ],
  isFinalized: Boolean, // Once prizes are distributed
  prizeDistribution: {
    first: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // publicKey of 1st
    second: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    third: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fourth: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fifth: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  transactionHashes: {
    first: String, // Solana tx hash for prize transfer
    second: String,
    third: String,
    fourth: String,
    fifth: String,
  },
});

const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);

export default Leaderboard;

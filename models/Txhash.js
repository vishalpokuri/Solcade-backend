import mongoose from "mongoose";
const txhashSchema = new mongoose.Schema({
  txhash: { type: String, required: true },
  isPlayed: { type: Boolean, default: false },
});

const Txhash = mongoose.model("Txhash", txhashSchema);

export default Txhash;

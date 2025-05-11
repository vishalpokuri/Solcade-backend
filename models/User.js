import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  publicKey: { type: String, unique: true }, // Must be unique for Pubkey matching
});

const User = mongoose.model("User", userSchema);
export default User;

import mongoose, { Schema, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.User || mongoose.model("User", UserSchema);

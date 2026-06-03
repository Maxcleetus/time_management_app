import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    defaultWorkHours: { type: Number, default: 8, min: 1, max: 24 },
    theme: { type: String, enum: ["light", "dark"], default: "light" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

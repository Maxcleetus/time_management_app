import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    project: { type: String, default: "General", trim: true, maxlength: 80 },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    dueDate: { type: Date },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    isCompleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, isCompleted: 1, dueDate: 1 });

export default mongoose.model("Task", taskSchema);

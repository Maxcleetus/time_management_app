import mongoose from "mongoose";

const timeEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      validate: {
        validator(value) {
          return !value || value >= this.startTime;
        },
        message: "End time must be after start time"
      }
    },
    durationSeconds: { type: Number, default: 0, min: 0 },
    isManual: { type: Boolean, default: false },
    source: { type: String, enum: ["timer", "manual", "pomodoro"], default: "timer" },
    note: { type: String, default: "", trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

timeEntrySchema.index({ userId: 1, startTime: -1 });

export default mongoose.model("TimeEntry", timeEntrySchema);

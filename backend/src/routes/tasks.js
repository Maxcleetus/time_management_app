import express from "express";
import Task from "../models/Task.js";
import TimeEntry from "../models/TimeEntry.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

router.get("/", async (req, res, next) => {
  try {
    const tasks = await Task.find({ userId: req.user._id }).sort({ isCompleted: 1, dueDate: 1, createdAt: -1 });
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const task = await Task.create({
      userId: req.user._id,
      title: req.body.title,
      description: req.body.description,
      project: req.body.project || "General",
      tags: normalizeTags(req.body.tags),
      dueDate: req.body.dueDate || undefined,
      priority: req.body.priority || "medium"
    });
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const updates = {
      title: req.body.title,
      description: req.body.description,
      project: req.body.project,
      tags: req.body.tags === undefined ? undefined : normalizeTags(req.body.tags),
      dueDate: req.body.dueDate || undefined,
      priority: req.body.priority,
      isCompleted: req.body.isCompleted
    };

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, {
      new: true,
      runValidators: true
    });

    if (!task) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    await TimeEntry.deleteMany({ userId: req.user._id, taskId: task._id });
    res.json({ message: "Task and related time entries deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;

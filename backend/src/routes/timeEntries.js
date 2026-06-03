import express from "express";
import Task from "../models/Task.js";
import TimeEntry from "../models/TimeEntry.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

function secondsBetween(start, end) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
}

async function assertOwnTask(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }
  return task;
}

router.get("/", async (req, res, next) => {
  try {
    const query = { userId: req.user._id };
    if (req.query.taskId) query.taskId = req.query.taskId;
    if (req.query.from || req.query.to) {
      query.startTime = {};
      if (req.query.from) query.startTime.$gte = new Date(req.query.from);
      if (req.query.to) query.startTime.$lte = new Date(req.query.to);
    }

    const entries = await TimeEntry.find(query)
      .populate("taskId", "title project priority")
      .sort({ startTime: -1 })
      .limit(Number(req.query.limit) || 200);

    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    await assertOwnTask(req.body.taskId, req.user._id);
    const startTime = new Date(req.body.startTime);
    const endTime = new Date(req.body.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      const error = new Error("Valid start and end times are required");
      error.statusCode = 400;
      throw error;
    }

    const entry = await TimeEntry.create({
      userId: req.user._id,
      taskId: req.body.taskId,
      startTime,
      endTime,
      durationSeconds: secondsBetween(startTime, endTime),
      isManual: true,
      source: req.body.source || "manual",
      note: req.body.note
    });

    await entry.populate("taskId", "title project priority");
    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
});

router.post("/timer/start", async (req, res, next) => {
  try {
    await assertOwnTask(req.body.taskId, req.user._id);

    await TimeEntry.updateMany(
      { userId: req.user._id, endTime: { $exists: false }, source: "timer" },
      [{ $set: { endTime: "$$NOW", durationSeconds: { $dateDiff: { startDate: "$startTime", endDate: "$$NOW", unit: "second" } } } }]
    );

    const entry = await TimeEntry.create({
      userId: req.user._id,
      taskId: req.body.taskId,
      startTime: new Date(),
      source: "timer",
      isManual: false,
      note: req.body.note
    });

    await entry.populate("taskId", "title project priority");
    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
});

router.put("/timer/stop/:entryId", async (req, res, next) => {
  try {
    const entry = await TimeEntry.findOne({ _id: req.params.entryId, userId: req.user._id });
    if (!entry) {
      const error = new Error("Timer entry not found");
      error.statusCode = 404;
      throw error;
    }

    const endTime = new Date();
    entry.endTime = endTime;
    entry.durationSeconds = secondsBetween(entry.startTime, endTime);
    await entry.save();
    await entry.populate("taskId", "title project priority");
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (req.body.taskId) await assertOwnTask(req.body.taskId, req.user._id);

    const updates = {
      taskId: req.body.taskId,
      startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
      endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      note: req.body.note,
      source: req.body.source,
      isManual: req.body.isManual
    };

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
    if (updates.startTime && updates.endTime) updates.durationSeconds = secondsBetween(updates.startTime, updates.endTime);

    const entry = await TimeEntry.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, {
      new: true,
      runValidators: true
    }).populate("taskId", "title project priority");

    if (!entry) {
      const error = new Error("Time entry not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const entry = await TimeEntry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!entry) {
      const error = new Error("Time entry not found");
      error.statusCode = 404;
      throw error;
    }
    res.json({ message: "Time entry deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;

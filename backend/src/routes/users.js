import express from "express";
import TimeEntry from "../models/TimeEntry.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    defaultWorkHours: user.defaultWorkHours,
    theme: user.theme
  };
}

router.put("/me", async (req, res, next) => {
  try {
    const updates = {
      name: req.body.name,
      timezone: req.body.timezone,
      defaultWorkHours: req.body.defaultWorkHours,
      theme: req.body.theme
    };
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me/export", async (req, res, next) => {
  try {
    const [tasks, timeEntries] = await Promise.all([
      Task.find({ userId: req.user._id }),
      TimeEntry.find({ userId: req.user._id })
    ]);
    res.json({ user: publicUser(req.user), tasks, timeEntries });
  } catch (error) {
    next(error);
  }
});

router.delete("/me", async (req, res, next) => {
  try {
    await Promise.all([
      Task.deleteMany({ userId: req.user._id }),
      TimeEntry.deleteMany({ userId: req.user._id }),
      User.deleteOne({ _id: req.user._id })
    ]);
    res.json({ message: "Account and all related data deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;

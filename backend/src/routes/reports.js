import express from "express";
import TimeEntry from "../models/TimeEntry.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

function dateRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function csvEscape(value) {
  const stringValue = value === undefined || value === null ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

router.get("/summary", async (req, res, next) => {
  try {
    const { from, to } = dateRange(req.query);
    const match = {
      userId: req.user._id,
      startTime: { $gte: from, $lte: to },
      endTime: { $exists: true }
    };

    const [byProject, daily, total] = await Promise.all([
      TimeEntry.aggregate([
        { $match: match },
        { $lookup: { from: "tasks", localField: "taskId", foreignField: "_id", as: "task" } },
        { $unwind: "$task" },
        { $group: { _id: "$task.project", seconds: { $sum: "$durationSeconds" }, entries: { $sum: 1 } } },
        { $sort: { seconds: -1 } }
      ]),
      TimeEntry.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { date: "$startTime", format: "%Y-%m-%d" } }, seconds: { $sum: "$durationSeconds" } } },
        { $sort: { _id: 1 } }
      ]),
      TimeEntry.aggregate([{ $match: match }, { $group: { _id: null, seconds: { $sum: "$durationSeconds" }, entries: { $sum: 1 } } }])
    ]);

    const totalSeconds = total[0]?.seconds || 0;
    res.json({
      range: { from, to },
      totals: {
        seconds: totalSeconds,
        hours: Number((totalSeconds / 3600).toFixed(2)),
        entries: total[0]?.entries || 0
      },
      byProject: byProject.map((item) => ({
        project: item._id || "General",
        seconds: item.seconds,
        hours: Number((item.seconds / 3600).toFixed(2)),
        entries: item.entries
      })),
      daily: daily.map((item) => ({
        date: item._id,
        seconds: item.seconds,
        hours: Number((item.seconds / 3600).toFixed(2))
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/export/csv", async (req, res, next) => {
  try {
    const { from, to } = dateRange(req.query);
    const entries = await TimeEntry.find({
      userId: req.user._id,
      startTime: { $gte: from, $lte: to },
      endTime: { $exists: true }
    })
      .populate("taskId", "title project")
      .sort({ startTime: 1 });

    const rows = [
      ["Task", "Project", "Start", "End", "Hours", "Source", "Note"],
      ...entries.map((entry) => [
        entry.taskId?.title || "Deleted task",
        entry.taskId?.project || "General",
        entry.startTime.toISOString(),
        entry.endTime?.toISOString() || "",
        (entry.durationSeconds / 3600).toFixed(2),
        entry.source,
        entry.note
      ])
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=time-report.csv");
    res.send(rows.map((row) => row.map(csvEscape).join(",")).join("\n"));
  } catch (error) {
    next(error);
  }
});

export default router;

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import timeEntryRoutes from "./routes/timeEntries.js";
import reportRoutes from "./routes/reports.js";
import userRoutes from "./routes/users.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const allowedOrigins = (
  process.env.CLIENT_ORIGIN ||
  "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    const vercelDeploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
    return origin === vercelDeploymentUrl || url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
};

function registerRoutes(prefix = "") {
  app.get(`${prefix}/health`, (_req, res) => {
    res.json({ status: "ok", service: "time-management-api", timestamp: new Date().toISOString() });
  });

  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/tasks`, taskRoutes);
  app.use(`${prefix}/time-entries`, timeEntryRoutes);
  app.use(`${prefix}/reports`, reportRoutes);
  app.use(`${prefix}/users`, userRoutes);
}

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

registerRoutes("/api");
registerRoutes();

app.use(notFound);
app.use(errorHandler);

export default app;

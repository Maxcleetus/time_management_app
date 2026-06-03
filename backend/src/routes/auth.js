import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

function issueToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET || "development-secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

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

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, timezone } = req.body;

    if (!name || !email || !password || password.length < 6) {
      const error = new Error("Name, valid email, and password with 6+ characters are required");
      error.statusCode = 400;
      throw error;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      const error = new Error("Email is already registered");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, timezone });
    res.status(201).json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase() });
    const isValid = user ? await bcrypt.compare(password || "", user.passwordHash) : false;

    if (!isValid) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    res.json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;

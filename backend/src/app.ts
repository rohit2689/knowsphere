import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { ZodError } from "zod";
import authRouter from "./routes/auth.js";
import postsRouter from "./routes/posts.js";
import { requireAuth } from "./middleware/auth.js";
import { authLimiter, apiLimiter } from "./middleware/rateLimit.js";
import { HttpError } from "./lib/errors.js";
import { env } from "./config/env.js";

export const app = express();

// To read the real client IP behind a proxy (required by the rate limiter)
app.set("trust proxy", env.TRUST_PROXY);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((o) => o.trim()) : true,
    exposedHeaders: ["X-Cache", "X-Instance"],
  }),
);
app.use((_req, res, next) => {
  res.set("X-Instance", env.INSTANCE_ID);
  next();
});
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, instance: env.INSTANCE_ID });
});

app.use("/auth", authLimiter, authRouter);
app.use("/posts", requireAuth, apiLimiter, postsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues[0]?.message ?? "Validation failed",
      issues: err.issues,
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
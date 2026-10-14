import { Redis } from "ioredis";
import { env } from "../config/env.js";

//if there is no REDIS_URL = null and app run withoud cache
export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      commandTimeout: 1000, // if any command runs more than 1 second then it will fail
    })
  : null;

// check if redis is connected or not (if disconnected cache/limiter will be skip)
export const redisReady = () => redis?.status === "ready";

redis?.on("ready", () => console.log("Redis connected"));
redis?.on("error", (err) => console.error("Redis error:", err.message));
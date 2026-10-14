import type { Request, Response } from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { redis, redisReady } from "../db/redis.js";
import { env } from "../config/env.js";

// Redis store: The counter is stored in Redis, so the rate limit remains shared across all server instances.
// If Redis is unavailable, an in-memory store is used instead.
function makeStore(name: string) {
  const client = redis;
  if (!client) return undefined;
  return new RedisStore({
    prefix: `rl:${name}:`,
    sendCommand: (command: string, ...args: string[]) =>
      client.call(command, ...args) as Promise<RedisReply>,
  });
}

// If Redis is unavailable, skip rate limiting so the API continues to work.
const redisDown = () => !!redis && !redisReady();

const keyByUser = (req: Request, res: Response) =>
  (res.locals.userId as string | undefined) ?? ipKeyGenerator(req.ip ?? "");

// Login/register: Rate-limit requests by IP address to prevent password-guessing attacks.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  skip: redisDown,
  store: makeStore("auth"),
  message: { error: "Too many attempts. Try again in a few minutes." },
});

// All post APIs: Apply a per-minute rate limit for each user.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  skip: redisDown,
  keyGenerator: keyByUser,
  store: makeStore("api"),
  message: { error: "Too many requests. Slow down." },
});

// Saving a link: Apply a stricter rate limit because each save triggers a request to an external website.
export const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  skip: redisDown,
  keyGenerator: keyByUser,
  store: makeStore("create"),
  message: { error: "You are saving links too fast. Try again in a minute." },
});
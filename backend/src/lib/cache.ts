import type { Response } from "express";
import { redis, redisReady } from "../db/redis.js";
import { env } from "../config/env.js";

// Each user has a version number. Whenever a post is added or deleted, the version increments,
// automatically invalidating the old cache keys.
const versionKey = (userId: string) => `posts:ver:${userId}`;

export async function getListVersion(userId: string): Promise<string> {
  if (!redis || !redisReady()) return "0";
  try {
    return (await redis.get(versionKey(userId))) ?? "0";
  } catch {
    return "0";
  }
}

export async function bumpListVersion(userId: string): Promise<void> {
  if (!redis || !redisReady()) return;
  try {
    await redis.incr(versionKey(userId));
  } catch (e) {
    console.error("Cache invalidation failed:", (e as Error).message);
  }
}

// If the data is in the cache, return it (HIT); otherwise, fetch it from the database, cache it, and return it (MISS).
export async function sendCached(
  res: Response,
  key: string,
  loader: () => Promise<unknown>,
): Promise<void> {
  if (redis && redisReady()) {
    try {
      const hit = await redis.get(key);
      if (hit) {
        res.set("X-Cache", "HIT").type("json").send(hit);
        return;
      }
    } catch {
      //if redis make proble DB will responded
    }
  }

  const body = JSON.stringify(await loader());

  if (redis && redisReady()) {
    try {
      await redis.set(key, body, "EX", env.CACHE_TTL_SECONDS);
    } catch {
      //if cache is nott saved then also responded
    }
  }
  res.set("X-Cache", "MISS").type("json").send(body);
}
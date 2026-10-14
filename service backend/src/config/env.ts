import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
});

export const env = schema.parse(process.env);
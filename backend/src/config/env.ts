import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
  //Number of proxy hops behind a proxy such as Nginx or Render (0 = no proxy)
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Comma-separated frontend URLs, e.g., https://knowsphere.vercel.app. Empty = allow all (development)
  CORS_ORIGIN: z.string().optional(),
  // Identifies which instance is responding (to demonstrate load balancing)
  INSTANCE_ID: z.string().default("local"),
});


export const env = schema.parse(process.env);
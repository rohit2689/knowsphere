import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../lib/errors.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing token");
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as { sub: string };
    res.locals.userId = payload.sub;
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  next();
}
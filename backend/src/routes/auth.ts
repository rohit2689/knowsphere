import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const credsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  const { email, password } = credsSchema.parse(req.body);
  const hash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { email, password: hash },
      select: { id: true, email: true },
    });
    res.status(201).json({ token: signToken(user.id), user });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Email already registered");
    }
    throw e;
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = credsSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user ? await bcrypt.compare(password, user.password) : false;
  if (!user || !passwordOk) throw new HttpError(401, "Invalid email or password");

  res.json({ token: signToken(user.id), user: { id: user.id, email: user.email } });
});

router.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: res.locals.userId },
    select: { id: true, email: true, createdAt: true },
  });
  if (!user) throw new HttpError(401, "User not found");
  res.json({ user });
});

export default router;
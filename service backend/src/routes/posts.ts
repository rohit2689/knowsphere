import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { resolvePreview } from "../lib/preview.js";
import { HttpError } from "../lib/errors.js";

const router = Router();

const createSchema = z.object({
  url: z.string().url("Enter a valid link"),
  title: z.string().trim().max(200).optional(),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(30))
    .max(10)
    .default([]),
});

const listSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  tag: z.string().trim().toLowerCase().optional(),
});

// save the Link + tags 
router.post("/", async (req, res) => {
  const body = createSchema.parse(req.body);
  const url = new URL(body.url).toString();
  const preview = await resolvePreview(url);

  try {
    const post = await prisma.post.create({
      data: {
        userId: res.locals.userId,
        url,
        title: body.title || preview.title,
        description: preview.description,
        imageUrl: preview.imageUrl,
        platform: preview.platform,
        tags: [...new Set(body.tags)],
      },
    });
    res.status(201).json(post);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "You already saved this link");
    }
    throw e;
  }
});

// saved posts (cursor pagination + optional tag filter)
router.get("/", async (req, res) => {
  const { cursor, limit, tag } = listSchema.parse(req.query);

  const items = await prisma.post.findMany({
    where: {
      userId: res.locals.userId,
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  res.json({ data, nextCursor: hasMore ? data[data.length - 1]!.id : null });
});

// delete the Post(sirf apna)
router.delete("/:id", async (req, res) => {
  const { count } = await prisma.post.deleteMany({
    where: { id: req.params.id, userId: res.locals.userId },
  });
  if (!count) throw new HttpError(404, "Post not found");
  res.status(204).end();
});

export default router;
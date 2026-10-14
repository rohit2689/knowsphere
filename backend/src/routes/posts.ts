import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { resolvePreview } from "../lib/preview.js";
import { HttpError } from "../lib/errors.js";
import { getListVersion, bumpListVersion, sendCached } from "../lib/cache.js";
import { createLimiter } from "../middleware/rateLimit.js";

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

const searchSchema = z.object({
  q: z.string().trim().min(1, "Type something to search").max(100),
  tag: z.string().trim().toLowerCase().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

// save the Link + tags
router.post("/", createLimiter, async (req, res) => {
  const userId = res.locals.userId as string;
  const body = createSchema.parse(req.body);
  const url = new URL(body.url).toString();
  const preview = await resolvePreview(url);

  try {
    const post = await prisma.post.create({
      data: {
        userId,
        url,
        title: body.title || preview.title,
        description: preview.description,
        imageUrl: preview.imageUrl,
        platform: preview.platform,
        tags: [...new Set(body.tags)],
      },
    });
    await bumpListVersion(userId); //Evict old cache
    res.status(201).json(post);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "You already saved this link");
    }
    throw e;
  }
});

// saved posts (cursor pagination + optional tag filter), with Redis cache
router.get("/", async (req, res) => {
  const userId = res.locals.userId as string;
  const { cursor, limit, tag } = listSchema.parse(req.query);

  const v = await getListVersion(userId);
  const key = `posts:list:${userId}:${v}:${tag ?? "-"}:${cursor ?? "-"}:${limit}`;

  await sendCached(res, key, async () => {
    const items = await prisma.post.findMany({
      where: { userId, ...(tag ? { tags: { has: tag } } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    return { data, nextCursor: hasMore ? data[data.length - 1]!.id : null };
  });
});

// delete Post (user depend)
router.delete("/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const { count } = await prisma.post.deleteMany({
    where: { id: req.params.id, userId },
  });
  if (!count) throw new HttpError(404, "Post not found");
  await bumpListVersion(userId);
  res.status(204).end();
});

// Keyword search (Postgres full-text search + GIN index)
router.get("/search", async (req, res) => {
  const userId = res.locals.userId as string;
  const { q, tag, limit, offset } = searchSchema.parse(req.query);

  const v = await getListVersion(userId);
  const key = `posts:search:${userId}:${v}:${tag ?? "-"}:${limit}:${offset}:${q.toLowerCase()}`;

  await sendCached(res, key, async () => {
    const tagFilter = tag ? Prisma.sql`AND ${tag} = ANY("tags")` : Prisma.empty;
    const data = await prisma.$queryRaw`
      SELECT "id", "url", "title", "description", "imageUrl", "platform", "tags", "createdAt"
      FROM "Post"
      WHERE "userId" = ${userId}
        AND "search" @@ websearch_to_tsquery('english', ${q})
        ${tagFilter}
      ORDER BY ts_rank("search", websearch_to_tsquery('english', ${q})) DESC,
               "createdAt" DESC, "id" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { data };
  });
});

export default router;
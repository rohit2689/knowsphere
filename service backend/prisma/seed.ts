import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("Pehle ek user register karo");

  const total = 100_000;
  const batch = 5_000;

  for (let i = 0; i < total; i += batch) {
    const data = Array.from({ length: batch }, (_, j) => {
      const n = i + j;
      return {
        userId: user.id,
        url: `https://example.com/post-${n}`,
        title: `Post ${n}`,
        description: `Seeded post number ${n}`,
        platform: "example.com",
        tags: [`tag${n % 50}`, `topic${n % 10}`],
        createdAt: new Date(Date.now() - n * 1000),
      };
    });
    await prisma.post.createMany({ data });
    console.log(`${i + batch} inserted`);
  }
}

main().finally(() => prisma.$disconnect());
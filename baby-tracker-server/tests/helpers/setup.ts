import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../src/lib/prisma.js";

export { prisma };

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  return app;
}

export async function cleanDb() {
  await prisma.photo.deleteMany();
  await prisma.message.deleteMany();
  await prisma.record.deleteMany();
  await prisma.babyMember.deleteMany();
  await prisma.baby.deleteMany();
  await prisma.user.deleteMany();
}

import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { prisma } from "../lib/prisma.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing token" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    request.userId = payload.userId;
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}

export async function requireBabyAccess(
  request: FastifyRequest<{ Params: { babyId: string } }>,
  reply: FastifyReply
) {
  const member = await prisma.babyMember.findUnique({
    where: {
      babyId_userId: {
        babyId: request.params.babyId,
        userId: request.userId,
      },
    },
  });

  if (!member) {
    return reply.status(403).send({ error: "No access to this baby" });
  }
}

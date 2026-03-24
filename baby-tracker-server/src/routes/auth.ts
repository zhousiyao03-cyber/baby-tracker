import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { prisma } from "../lib/prisma.js";

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: "7d",
  });
  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
  return { accessToken, refreshToken };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const { email, password, nickname } = request.body as {
      email: string;
      password: string;
      nickname: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, nickname },
    });

    const tokens = generateTokens(user.id);
    return reply.status(201).send({
      ...tokens,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  });

  app.post("/api/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const tokens = generateTokens(user.id);
    return reply.send({
      ...tokens,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
      };
      const tokens = generateTokens(payload.userId);
      return reply.send(tokens);
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
  });
}

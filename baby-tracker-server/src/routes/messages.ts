import { FastifyInstance } from "fastify";
import { join } from "path";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { saveFile } from "../services/storage.js";
import { env } from "../config.js";

export async function messagesRoutes(app: FastifyInstance) {
  // 创建寄语 (multipart: textContent, optional audio file)
  app.post(
    "/api/babies/:babyId/messages",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request, reply) => {
      const { babyId } = request.params as { babyId: string };

      let textContent: string | undefined;
      let audioUrl: string | undefined;
      let audioDurationSeconds: number | undefined;
      let recordedAt: Date = new Date();

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "field") {
          if (part.fieldname === "textContent") {
            textContent = part.value as string;
          } else if (part.fieldname === "audioDurationSeconds") {
            audioDurationSeconds = parseFloat(part.value as string);
          } else if (part.fieldname === "recordedAt") {
            recordedAt = new Date(part.value as string);
          }
        } else if (part.type === "file" && part.fieldname === "audio") {
          const buffer = await part.toBuffer();
          audioUrl = await saveFile(buffer, part.filename, "audio");
        }
      }

      if (!textContent && !audioUrl) {
        return reply
          .status(400)
          .send({ error: "Either textContent or audio file is required" });
      }

      const message = await prisma.message.create({
        data: {
          babyId,
          userId: request.userId,
          textContent,
          audioUrl,
          audioDurationSeconds,
          recordedAt,
        },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
          photos: true,
        },
      });

      return reply.status(201).send(message);
    }
  );

  // 列出寄语 with user and photos
  app.get(
    "/api/babies/:babyId/messages",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };

      return prisma.message.findMany({
        where: { babyId },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
          photos: true,
        },
        orderBy: { recordedAt: "desc" },
      });
    }
  );

  // 播放音频 (with auth check)
  app.get(
    "/api/messages/:id/audio",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      let message;
      try {
        message = await prisma.message.findUnique({ where: { id } });
      } catch {
        return reply.status(404).send({ error: "Message not found" });
      }
      if (!message) {
        return reply.status(404).send({ error: "Message not found" });
      }

      if (!message.audioUrl) {
        return reply.status(404).send({ error: "No audio for this message" });
      }

      const member = await prisma.babyMember.findUnique({
        where: {
          babyId_userId: {
            babyId: message.babyId,
            userId: request.userId,
          },
        },
      });
      if (!member) {
        return reply.status(403).send({ error: "No access" });
      }

      return reply.sendFile(
        message.audioUrl,
        join(process.cwd(), env.UPLOAD_DIR)
      );
    }
  );
}

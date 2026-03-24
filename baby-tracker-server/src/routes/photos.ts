import { FastifyInstance } from "fastify";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { savePhoto, deleteFile } from "../services/storage.js";

export async function photosRoutes(app: FastifyInstance) {
  // 上传照片
  app.post(
    "/api/babies/:babyId/photos",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request, reply) => {
      const { babyId } = request.params as { babyId: string };
      const { recordId, messageId } = request.query as {
        recordId?: string;
        messageId?: string;
      };

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const buffer = await data.toBuffer();
      const { url, thumbnailUrl } = await savePhoto(buffer, data.filename);

      const photo = await prisma.photo.create({
        data: {
          babyId,
          userId: request.userId,
          url,
          thumbnailUrl,
          recordId: recordId || null,
          messageId: messageId || null,
        },
      });

      return reply.status(201).send(photo);
    }
  );

  // 列出照片
  app.get(
    "/api/babies/:babyId/photos",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { date } = request.query as { date?: string };

      const where: any = { babyId };
      if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        where.uploadedAt = { gte: start, lt: end };
      }

      return prisma.photo.findMany({
        where,
        orderBy: { uploadedAt: "desc" },
      });
    }
  );

  // 删除照片 (with auth check via babyMember)
  app.delete(
    "/api/photos/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      let photo;
      try {
        photo = await prisma.photo.findUnique({ where: { id } });
      } catch {
        return reply.status(404).send({ error: "Photo not found" });
      }
      if (!photo) {
        return reply.status(404).send({ error: "Photo not found" });
      }

      const member = await prisma.babyMember.findUnique({
        where: {
          babyId_userId: { babyId: photo.babyId, userId: request.userId },
        },
      });
      if (!member) {
        return reply.status(403).send({ error: "No access" });
      }

      await deleteFile(photo.url);
      await deleteFile(photo.thumbnailUrl);
      await prisma.photo.delete({ where: { id } });

      return reply.status(204).send();
    }
  );
}

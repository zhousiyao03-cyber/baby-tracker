import { FastifyInstance } from "fastify";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { parseVoiceText } from "../services/llm.js";

export async function recordsRoutes(app: FastifyInstance) {
  // 创建记录
  app.post(
    "/api/babies/:babyId/records",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request, reply) => {
      const { babyId } = request.params as { babyId: string };
      const { type, recordedAt, data, note } = request.body as {
        type: string;
        recordedAt: string;
        data?: any;
        note?: string;
      };

      const record = await prisma.record.create({
        data: {
          babyId,
          userId: request.userId,
          type: type as any,
          recordedAt: new Date(recordedAt),
          data: data || {},
          note,
        },
        include: { user: { select: { nickname: true } } },
      });

      return reply.status(201).send(record);
    }
  );

  // 按日期查询记录
  app.get(
    "/api/babies/:babyId/records",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { date } = request.query as { date?: string };

      const where: any = { babyId };
      if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        where.recordedAt = { gte: start, lt: end };
      }

      return prisma.record.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true } },
          photos: { select: { id: true, thumbnailUrl: true } },
        },
        orderBy: { recordedAt: "desc" },
      });
    }
  );

  // 每日小结
  app.get(
    "/api/babies/:babyId/records/summary",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { date } = request.query as { date: string };

      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);

      const records = await prisma.record.findMany({
        where: {
          babyId,
          recordedAt: { gte: start, lt: end },
        },
      });

      const summary: any = {
        date,
        formulaTotalMl: 0,
        formulaCount: 0,
        breastTotalMinutes: 0,
        breastCount: 0,
        poopCount: 0,
        poopDetails: [],
        peeCount: 0,
        sleepTotalHours: 0,
        sleepCount: 0,
        bathCount: 0,
        latestTemperature: null,
        latestWeight: null,
        latestJaundice: null,
        dailyChange: null,
      };

      for (const r of records) {
        const data = r.data as any;
        switch (r.type) {
          case "feeding_formula":
            summary.formulaCount++;
            summary.formulaTotalMl += data.amount_ml || 0;
            break;
          case "feeding_breast":
            summary.breastCount++;
            summary.breastTotalMinutes += data.duration_minutes || 0;
            break;
          case "poop":
            summary.poopCount++;
            summary.poopDetails.push({ color: data.color, texture: data.texture });
            break;
          case "pee":
            summary.peeCount++;
            break;
          case "sleep":
            summary.sleepCount++;
            if (data.end_time) {
              const sleepStart = r.recordedAt.getTime();
              const sleepEnd = new Date(data.end_time).getTime();
              summary.sleepTotalHours += (sleepEnd - sleepStart) / 3600000;
            }
            break;
          case "bath":
            summary.bathCount++;
            break;
          case "temperature":
            summary.latestTemperature = data.value;
            break;
          case "weight":
            summary.latestWeight = data.value_g;
            break;
          case "jaundice":
            summary.latestJaundice = data.value;
            break;
          case "daily_change":
            summary.dailyChange = data.description;
            break;
        }
      }

      return summary;
    }
  );

  // 修改记录 (with authorization check)
  app.put(
    "/api/records/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { type, recordedAt, data, note } = request.body as {
        type?: string;
        recordedAt?: string;
        data?: any;
        note?: string;
      };

      let record;
      try {
        record = await prisma.record.findUnique({ where: { id } });
      } catch {
        return reply.status(404).send({ error: "Record not found" });
      }
      if (!record) {
        return reply.status(404).send({ error: "Record not found" });
      }

      const member = await prisma.babyMember.findUnique({
        where: { babyId_userId: { babyId: record.babyId, userId: request.userId } },
      });
      if (!member) {
        return reply.status(403).send({ error: "No access" });
      }

      const updateData: any = {};
      if (type) updateData.type = type;
      if (recordedAt) updateData.recordedAt = new Date(recordedAt);
      if (data) updateData.data = data;
      if (note !== undefined) updateData.note = note;

      return prisma.record.update({ where: { id }, data: updateData });
    }
  );

  // 语音解析 — 返回预览（不保存）
  app.post(
    "/api/babies/:babyId/records/voice",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { text } = request.body as { text: string };

      const baby = await prisma.baby.findUnique({ where: { id: babyId } });
      const currentTime = new Date().toISOString();
      const parsed = await parseVoiceText(text, baby!.name, currentTime);

      return { parsed };
    }
  );

  // 确认保存解析结果
  app.post(
    "/api/babies/:babyId/records/voice/confirm",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request, reply) => {
      const { babyId } = request.params as { babyId: string };
      const { records: recordsData } = request.body as {
        records: Array<{
          type: string;
          recordedAt: string;
          data: any;
          note?: string;
        }>;
      };

      const created = await prisma.$transaction(
        recordsData.map((r) =>
          prisma.record.create({
            data: {
              babyId,
              userId: request.userId,
              type: r.type as any,
              recordedAt: new Date(r.recordedAt),
              data: r.data,
              note: r.note,
            },
          })
        )
      );

      return reply.status(201).send(created);
    }
  );

  // 删除记录 (with authorization check)
  app.delete(
    "/api/records/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      let record;
      try {
        record = await prisma.record.findUnique({ where: { id } });
      } catch {
        return reply.status(404).send({ error: "Record not found" });
      }
      if (!record) {
        return reply.status(404).send({ error: "Record not found" });
      }

      const member = await prisma.babyMember.findUnique({
        where: { babyId_userId: { babyId: record.babyId, userId: request.userId } },
      });
      if (!member) {
        return reply.status(403).send({ error: "No access" });
      }

      await prisma.record.delete({ where: { id } });
      return reply.status(204).send();
    }
  );
}

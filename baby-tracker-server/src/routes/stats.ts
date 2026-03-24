import { FastifyInstance } from "fastify";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export async function statsRoutes(app: FastifyInstance) {
  // 喂养统计 by day
  app.get(
    "/api/babies/:babyId/stats/feeding",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { days = "7" } = request.query as { days?: string };

      const daysNum = parseInt(days, 10);
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      since.setHours(0, 0, 0, 0);

      const records = await prisma.record.findMany({
        where: {
          babyId,
          type: { in: ["feeding_formula", "feeding_breast"] },
          recordedAt: { gte: since },
        },
        orderBy: { recordedAt: "asc" },
      });

      // Group by date
      const byDay: Record<
        string,
        {
          date: string;
          formulaMl: number;
          formulaCount: number;
          breastMinutes: number;
          breastCount: number;
        }
      > = {};

      for (const r of records) {
        const dateStr = r.recordedAt.toISOString().slice(0, 10);
        if (!byDay[dateStr]) {
          byDay[dateStr] = {
            date: dateStr,
            formulaMl: 0,
            formulaCount: 0,
            breastMinutes: 0,
            breastCount: 0,
          };
        }
        const data = r.data as any;
        if (r.type === "feeding_formula") {
          byDay[dateStr].formulaMl += data.amount_ml || 0;
          byDay[dateStr].formulaCount++;
        } else if (r.type === "feeding_breast") {
          byDay[dateStr].breastMinutes += data.duration_minutes || 0;
          byDay[dateStr].breastCount++;
        }
      }

      return Object.values(byDay).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
  );

  // 体重曲线
  app.get(
    "/api/babies/:babyId/stats/weight",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { days = "7" } = request.query as { days?: string };

      const daysNum = parseInt(days, 10);
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      since.setHours(0, 0, 0, 0);

      const records = await prisma.record.findMany({
        where: {
          babyId,
          type: "weight",
          recordedAt: { gte: since },
        },
        orderBy: { recordedAt: "asc" },
      });

      return records.map((r) => ({
        date: r.recordedAt.toISOString().slice(0, 10),
        recordedAt: r.recordedAt,
        valueG: (r.data as any).value_g,
      }));
    }
  );

  // 黄疸趋势
  app.get(
    "/api/babies/:babyId/stats/jaundice",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { days = "7" } = request.query as { days?: string };

      const daysNum = parseInt(days, 10);
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      since.setHours(0, 0, 0, 0);

      const records = await prisma.record.findMany({
        where: {
          babyId,
          type: "jaundice",
          recordedAt: { gte: since },
        },
        orderBy: { recordedAt: "asc" },
      });

      return records.map((r) => ({
        date: r.recordedAt.toISOString().slice(0, 10),
        recordedAt: r.recordedAt,
        value: (r.data as any).value,
        position: (r.data as any).position,
      }));
    }
  );

  // 睡眠规律 by day
  app.get(
    "/api/babies/:babyId/stats/sleep",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { days = "7" } = request.query as { days?: string };

      const daysNum = parseInt(days, 10);
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      since.setHours(0, 0, 0, 0);

      const records = await prisma.record.findMany({
        where: {
          babyId,
          type: "sleep",
          recordedAt: { gte: since },
        },
        orderBy: { recordedAt: "asc" },
      });

      // Group by date
      const byDay: Record<
        string,
        {
          date: string;
          totalHours: number;
          count: number;
        }
      > = {};

      for (const r of records) {
        const dateStr = r.recordedAt.toISOString().slice(0, 10);
        if (!byDay[dateStr]) {
          byDay[dateStr] = { date: dateStr, totalHours: 0, count: 0 };
        }
        byDay[dateStr].count++;
        const data = r.data as any;
        if (data.end_time) {
          const sleepMs =
            new Date(data.end_time).getTime() - r.recordedAt.getTime();
          byDay[dateStr].totalHours += sleepMs / 3600000;
        }
      }

      return Object.values(byDay).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
  );
}

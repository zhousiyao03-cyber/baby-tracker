import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTestApp, cleanDb, prisma } from "./helpers/setup.js";

async function registerUser(
  app: Awaited<ReturnType<typeof createTestApp>>,
  email: string,
  nickname: string
) {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { email, password: "password123", nickname },
  });
  return JSON.parse(res.body).accessToken as string;
}

async function createBaby(
  app: Awaited<ReturnType<typeof createTestApp>>,
  token: string,
  name = "Test Baby"
) {
  const res = await app.inject({
    method: "POST",
    url: "/api/babies",
    headers: { authorization: `Bearer ${token}` },
    payload: { name, birthDate: "2024-01-01" },
  });
  return JSON.parse(res.body) as { id: string };
}

describe("Stats API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe("GET /api/babies/:babyId/stats/feeding - feeding stats", () => {
    it("returns empty array when no feeding records", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/feeding`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });

    it("aggregates formula and breast feeding by day", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      const now = new Date();
      const today = new Date(now);
      today.setHours(12, 0, 0, 0);

      await prisma.record.createMany({
        data: [
          {
            babyId: baby.id,
            userId: user!.id,
            type: "feeding_formula",
            recordedAt: today,
            data: { amount_ml: 100 },
          },
          {
            babyId: baby.id,
            userId: user!.id,
            type: "feeding_formula",
            recordedAt: today,
            data: { amount_ml: 80 },
          },
          {
            babyId: baby.id,
            userId: user!.id,
            type: "feeding_breast",
            recordedAt: today,
            data: { duration_minutes: 15 },
          },
        ],
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/feeding?days=7`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].formulaCount).toBe(2);
      expect(body[0].formulaMl).toBe(180);
      expect(body[0].breastCount).toBe(1);
      expect(body[0].breastMinutes).toBe(15);
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/feeding`,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when no baby access", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/feeding`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/babies/:babyId/stats/weight - weight curve", () => {
    it("returns empty array when no weight records", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/weight`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });

    it("returns weight records with valueG field", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      const now = new Date();
      await prisma.record.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          type: "weight",
          recordedAt: now,
          data: { value_g: 4500 },
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/weight`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].valueG).toBe(4500);
      expect(body[0].date).toBeDefined();
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/weight`,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when no baby access", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/weight`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/babies/:babyId/stats/jaundice - jaundice trend", () => {
    it("returns empty array when no jaundice records", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/jaundice`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });

    it("returns jaundice records with value and position", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      const now = new Date();
      await prisma.record.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          type: "jaundice",
          recordedAt: now,
          data: { value: 8.5, position: "forehead" },
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/jaundice`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].value).toBe(8.5);
      expect(body[0].position).toBe("forehead");
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/jaundice`,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when no baby access", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/jaundice`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/babies/:babyId/stats/sleep - sleep patterns", () => {
    it("returns empty array when no sleep records", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/sleep`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });

    it("aggregates sleep hours and count by day", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      const now = new Date();
      const today = new Date(now);
      today.setHours(10, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(12, 0, 0, 0);

      const today2 = new Date(now);
      today2.setHours(14, 0, 0, 0);
      const todayEnd2 = new Date(now);
      todayEnd2.setHours(15, 30, 0, 0);

      await prisma.record.createMany({
        data: [
          {
            babyId: baby.id,
            userId: user!.id,
            type: "sleep",
            recordedAt: today,
            data: { end_time: todayEnd.toISOString() },
          },
          {
            babyId: baby.id,
            userId: user!.id,
            type: "sleep",
            recordedAt: today2,
            data: { end_time: todayEnd2.toISOString() },
          },
        ],
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/sleep?days=7`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].count).toBe(2);
      expect(body[0].totalHours).toBeCloseTo(3.5, 1);
    });

    it("respects the days query parameter", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      // Record 30 days ago (outside 7-day window)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);

      await prisma.record.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          type: "sleep",
          recordedAt: oldDate,
          data: { end_time: new Date(oldDate.getTime() + 3600000).toISOString() },
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/sleep?days=7`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toHaveLength(0);
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/sleep`,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when no baby access", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/sleep`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});

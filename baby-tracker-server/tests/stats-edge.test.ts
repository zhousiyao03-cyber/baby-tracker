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

async function getUserId(email: string) {
  const user = await prisma.user.findFirst({ where: { email } });
  return user!.id;
}

describe("Stats API - edge cases", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe("Feeding stats - multi-day", () => {
    it("returns data grouped by multiple days", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const userId = await getUserId("user1@example.com");

      const now = new Date();
      const day1 = new Date(now);
      day1.setDate(day1.getDate() - 1);
      day1.setHours(10, 0, 0, 0);
      const day2 = new Date(now);
      day2.setHours(10, 0, 0, 0);

      await prisma.record.createMany({
        data: [
          {
            babyId: baby.id,
            userId,
            type: "feeding_formula",
            recordedAt: day1,
            data: { amount_ml: 100 },
          },
          {
            babyId: baby.id,
            userId,
            type: "feeding_formula",
            recordedAt: day2,
            data: { amount_ml: 150 },
          },
          {
            babyId: baby.id,
            userId,
            type: "feeding_breast",
            recordedAt: day2,
            data: { duration_minutes: 20 },
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
      expect(body).toHaveLength(2);
      // Sorted by date ascending
      expect(body[0].formulaMl).toBe(100);
      expect(body[0].breastCount).toBe(0);
      expect(body[1].formulaMl).toBe(150);
      expect(body[1].breastCount).toBe(1);
      expect(body[1].breastMinutes).toBe(20);
    });
  });

  describe("Sleep stats - edge cases", () => {
    it("counts sleep without end_time but does not add hours", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const userId = await getUserId("user1@example.com");

      const now = new Date();
      now.setHours(14, 0, 0, 0);

      await prisma.record.create({
        data: {
          babyId: baby.id,
          userId,
          type: "sleep",
          recordedAt: now,
          data: {},
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/sleep?days=7`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].count).toBe(1);
      expect(body[0].totalHours).toBe(0);
    });
  });

  describe("Weight stats - multiple entries", () => {
    it("returns multiple weight records sorted by date ascending", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const userId = await getUserId("user1@example.com");

      const day1 = new Date();
      day1.setDate(day1.getDate() - 2);
      day1.setHours(10, 0, 0, 0);
      const day2 = new Date();
      day2.setDate(day2.getDate() - 1);
      day2.setHours(10, 0, 0, 0);

      await prisma.record.createMany({
        data: [
          {
            babyId: baby.id,
            userId,
            type: "weight",
            recordedAt: day1,
            data: { value_g: 3500 },
          },
          {
            babyId: baby.id,
            userId,
            type: "weight",
            recordedAt: day2,
            data: { value_g: 3600 },
          },
        ],
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/weight?days=7`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(2);
      expect(body[0].valueG).toBe(3500);
      expect(body[1].valueG).toBe(3600);
    });
  });

  describe("Jaundice stats - multiple entries", () => {
    it("returns multiple jaundice records with different positions", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const userId = await getUserId("user1@example.com");

      const now = new Date();
      const time1 = new Date(now);
      time1.setHours(8, 0, 0, 0);
      const time2 = new Date(now);
      time2.setHours(12, 0, 0, 0);

      await prisma.record.createMany({
        data: [
          {
            babyId: baby.id,
            userId,
            type: "jaundice",
            recordedAt: time1,
            data: { value: 10.5, position: "forehead" },
          },
          {
            babyId: baby.id,
            userId,
            type: "jaundice",
            recordedAt: time2,
            data: { value: 9.2, position: "chest" },
          },
        ],
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/stats/jaundice?days=7`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(2);
      expect(body[0].value).toBe(10.5);
      expect(body[0].position).toBe("forehead");
      expect(body[1].value).toBe(9.2);
      expect(body[1].position).toBe("chest");
    });
  });
});

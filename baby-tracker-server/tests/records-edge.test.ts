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

async function createRecord(
  app: Awaited<ReturnType<typeof createTestApp>>,
  token: string,
  babyId: string,
  payload: object
) {
  return app.inject({
    method: "POST",
    url: `/api/babies/${babyId}/records`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

describe("Records API - edge cases", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe("Summary - additional record types", () => {
    it("summary includes jaundice data", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const date = "2024-03-01";

      await createRecord(app, token, baby.id, {
        type: "jaundice",
        recordedAt: `${date}T10:00:00.000Z`,
        data: { value: 12.5, position: "chest" },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=${date}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.latestJaundice).toBe(12.5);
    });

    it("summary includes daily_change data", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const date = "2024-03-01";

      await createRecord(app, token, baby.id, {
        type: "daily_change",
        recordedAt: `${date}T20:00:00.000Z`,
        data: { description: "宝宝今天精神很好" },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=${date}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.dailyChange).toBe("宝宝今天精神很好");
    });

    it("summary handles sleep without end_time (totalHours stays 0)", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const date = "2024-03-01";

      await createRecord(app, token, baby.id, {
        type: "sleep",
        recordedAt: `${date}T14:00:00.000Z`,
        data: {},
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=${date}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.sleepCount).toBe(1);
      expect(body.sleepTotalHours).toBe(0);
    });

    it("summary handles formula without amount_ml (defaults to 0)", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const date = "2024-03-01";

      await createRecord(app, token, baby.id, {
        type: "feeding_formula",
        recordedAt: `${date}T08:00:00.000Z`,
        data: {},
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=${date}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.formulaCount).toBe(1);
      expect(body.formulaTotalMl).toBe(0);
    });

    it("summary aggregates multiple poop records with details", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const date = "2024-03-01";

      await createRecord(app, token, baby.id, {
        type: "poop",
        recordedAt: `${date}T08:00:00.000Z`,
        data: { color: "yellow", texture: "soft" },
      });
      await createRecord(app, token, baby.id, {
        type: "poop",
        recordedAt: `${date}T14:00:00.000Z`,
        data: { color: "green", texture: "normal" },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=${date}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.poopCount).toBe(2);
      expect(body.poopDetails).toHaveLength(2);
      expect(body.poopDetails[0]).toMatchObject({ color: "yellow", texture: "soft" });
      expect(body.poopDetails[1]).toMatchObject({ color: "green", texture: "normal" });
    });
  });

  describe("PUT /api/records/:id - edge cases", () => {
    it("updates type field", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const createRes = await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      const record = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "PUT",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { type: "poop", data: { color: "yellow", texture: "soft" } },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("poop");
      expect(body.data).toMatchObject({ color: "yellow", texture: "soft" });
    });

    it("clears note by setting it to empty string", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const createRes = await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
        note: "Some note",
      });
      const record = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "PUT",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { note: "" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.note).toBe("");
    });
  });

  describe("Multi-user record operations", () => {
    it("member can create and view records for shared baby", async () => {
      const token1 = await registerUser(app, "admin@example.com", "Admin");
      const token2 = await registerUser(app, "member@example.com", "Member");
      const baby = await createBaby(app, token1);

      // Invite and join
      const inviteRes = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/invite`,
        headers: { authorization: `Bearer ${token1}` },
      });
      const { inviteCode } = JSON.parse(inviteRes.body);
      await app.inject({
        method: "POST",
        url: "/api/babies/join",
        headers: { authorization: `Bearer ${token2}` },
        payload: { inviteCode },
      });

      // Member creates a record
      const createRes = await createRecord(app, token2, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      expect(createRes.statusCode).toBe(201);

      // Admin can see member's record
      const listRes = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(listRes.statusCode).toBe(200);
      const records = JSON.parse(listRes.body);
      expect(records).toHaveLength(1);
      expect(records[0].user.nickname).toBe("Member");
    });

    it("admin can update member's record", async () => {
      const token1 = await registerUser(app, "admin@example.com", "Admin");
      const token2 = await registerUser(app, "member@example.com", "Member");
      const baby = await createBaby(app, token1);

      const inviteRes = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/invite`,
        headers: { authorization: `Bearer ${token1}` },
      });
      const { inviteCode } = JSON.parse(inviteRes.body);
      await app.inject({
        method: "POST",
        url: "/api/babies/join",
        headers: { authorization: `Bearer ${token2}` },
        payload: { inviteCode },
      });

      const createRes = await createRecord(app, token2, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
        note: "original",
      });
      const record = JSON.parse(createRes.body);

      // Admin updates member's record
      const updateRes = await app.inject({
        method: "PUT",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { note: "updated by admin" },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(JSON.parse(updateRes.body).note).toBe("updated by admin");
    });
  });
});

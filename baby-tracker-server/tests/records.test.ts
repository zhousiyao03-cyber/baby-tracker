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
  const body = JSON.parse(res.body);
  return body.accessToken as string;
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
  const res = await app.inject({
    method: "POST",
    url: `/api/babies/${babyId}/records`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
  return res;
}

describe("Records API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe("POST /api/babies/:babyId/records - create record", () => {
    it("creates a feeding_formula record and returns 201", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "feeding_formula",
        recordedAt: "2024-03-01T08:00:00.000Z",
        data: { amount_ml: 120 },
        note: "Morning feed",
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("feeding_formula");
      expect(body.babyId).toBe(baby.id);
      expect(body.data).toMatchObject({ amount_ml: 120 });
      expect(body.note).toBe("Morning feed");
      expect(body.user).toBeDefined();
      expect(body.user.nickname).toBe("User1");
    });

    it("creates a feeding_breast record", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "feeding_breast",
        recordedAt: "2024-03-01T09:00:00.000Z",
        data: { duration_minutes: 15, side: "left" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("feeding_breast");
      expect(body.data).toMatchObject({ duration_minutes: 15, side: "left" });
    });

    it("creates a poop record", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "poop",
        recordedAt: "2024-03-01T10:00:00.000Z",
        data: { color: "yellow", texture: "soft" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("poop");
      expect(body.data).toMatchObject({ color: "yellow", texture: "soft" });
    });

    it("creates a pee record", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T11:00:00.000Z",
        data: {},
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("pee");
    });

    it("creates a sleep record", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "sleep",
        recordedAt: "2024-03-01T12:00:00.000Z",
        data: { end_time: "2024-03-01T14:00:00.000Z" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("sleep");
    });

    it("creates a temperature record", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "temperature",
        recordedAt: "2024-03-01T08:30:00.000Z",
        data: { value: 37.2, method: "armpit" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("temperature");
      expect(body.data).toMatchObject({ value: 37.2, method: "armpit" });
    });

    it("creates a weight record", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "weight",
        recordedAt: "2024-03-01T09:00:00.000Z",
        data: { value_g: 4500 },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("weight");
      expect(body.data).toMatchObject({ value_g: 4500 });
    });

    it("creates a bath record", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "bath",
        recordedAt: "2024-03-01T19:00:00.000Z",
        data: {},
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.type).toBe("bath");
    });

    it("creates a record without data field (defaults to {})", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data).toEqual({});
    });

    it("returns 401 when no token is provided", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/records`,
        payload: { type: "pee", recordedAt: "2024-03-01T10:00:00.000Z" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when user does not have access to the baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const res = await createRecord(app, token2, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/babies/:babyId/records - query records", () => {
    it("returns all records for a baby when no date filter", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      await createRecord(app, token, baby.id, {
        type: "poop",
        recordedAt: "2024-03-02T10:00:00.000Z",
        data: { color: "yellow", texture: "soft" },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(2);
    });

    it("returns only records for the specified date", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      await createRecord(app, token, baby.id, {
        type: "poop",
        recordedAt: "2024-03-02T10:00:00.000Z",
        data: { color: "yellow", texture: "soft" },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records?date=2024-03-01`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].type).toBe("pee");
    });

    it("returns records ordered by recordedAt descending", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T08:00:00.000Z",
      });
      await createRecord(app, token, baby.id, {
        type: "bath",
        recordedAt: "2024-03-01T20:00:00.000Z",
      });
      await createRecord(app, token, baby.id, {
        type: "poop",
        recordedAt: "2024-03-01T12:00:00.000Z",
        data: { color: "green", texture: "normal" },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records?date=2024-03-01`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(3);
      expect(body[0].type).toBe("bath");
      expect(body[1].type).toBe("poop");
      expect(body[2].type).toBe("pee");
    });

    it("includes user info and photos in the response", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body[0].user).toBeDefined();
      expect(body[0].user.nickname).toBe("User1");
      expect(body[0].photos).toBeDefined();
    });

    it("returns empty list when no records exist", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toHaveLength(0);
    });

    it("returns 401 when no token is provided", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records`,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when user does not have access to the baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/babies/:babyId/records/summary - daily summary", () => {
    it("returns a complete daily summary with all record types", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const date = "2024-03-01";
      await createRecord(app, token, baby.id, {
        type: "feeding_formula",
        recordedAt: `${date}T08:00:00.000Z`,
        data: { amount_ml: 120 },
      });
      await createRecord(app, token, baby.id, {
        type: "feeding_formula",
        recordedAt: `${date}T12:00:00.000Z`,
        data: { amount_ml: 100 },
      });
      await createRecord(app, token, baby.id, {
        type: "feeding_breast",
        recordedAt: `${date}T10:00:00.000Z`,
        data: { duration_minutes: 15 },
      });
      await createRecord(app, token, baby.id, {
        type: "poop",
        recordedAt: `${date}T09:00:00.000Z`,
        data: { color: "yellow", texture: "soft" },
      });
      await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: `${date}T11:00:00.000Z`,
      });
      await createRecord(app, token, baby.id, {
        type: "sleep",
        recordedAt: `${date}T14:00:00.000Z`,
        data: { end_time: `${date}T16:00:00.000Z` },
      });
      await createRecord(app, token, baby.id, {
        type: "bath",
        recordedAt: `${date}T19:00:00.000Z`,
      });
      await createRecord(app, token, baby.id, {
        type: "temperature",
        recordedAt: `${date}T08:30:00.000Z`,
        data: { value: 37.2, method: "armpit" },
      });
      await createRecord(app, token, baby.id, {
        type: "weight",
        recordedAt: `${date}T09:00:00.000Z`,
        data: { value_g: 4500 },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=${date}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.date).toBe(date);
      expect(body.feedingFormula.count).toBe(2);
      expect(body.feedingFormula.totalMl).toBe(220);
      expect(body.feedingBreast.count).toBe(1);
      expect(body.feedingBreast.totalMinutes).toBe(15);
      expect(body.poop.count).toBe(1);
      expect(body.poop.details).toHaveLength(1);
      expect(body.poop.details[0]).toMatchObject({ color: "yellow", texture: "soft" });
      expect(body.pee.count).toBe(1);
      expect(body.sleep.count).toBe(1);
      expect(body.sleep.totalHours).toBeCloseTo(2, 1);
      expect(body.bath.count).toBe(1);
      expect(body.temperature).toMatchObject({ value: 37.2, method: "armpit" });
      expect(body.weight).toMatchObject({ value_g: 4500 });
    });

    it("returns zeroed summary when no records exist for the date", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=2024-03-01`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.feedingFormula.count).toBe(0);
      expect(body.feedingFormula.totalMl).toBe(0);
      expect(body.pee.count).toBe(0);
      expect(body.temperature).toBeNull();
      expect(body.weight).toBeNull();
    });

    it("only counts records for the specified date, not other days", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      // Records on Mar 1
      await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      // Record on Mar 2 (should not appear in Mar 1 summary)
      await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-02T10:00:00.000Z",
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=2024-03-01`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.pee.count).toBe(1);
    });

    it("returns 401 when no token is provided", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records/summary?date=2024-03-01`,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("PUT /api/records/:id - update record", () => {
    it("updates record type and data", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const createRes = await createRecord(app, token, baby.id, {
        type: "feeding_formula",
        recordedAt: "2024-03-01T08:00:00.000Z",
        data: { amount_ml: 100 },
      });
      const record = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "PUT",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { data: { amount_ml: 150 } },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toMatchObject({ amount_ml: 150 });
    });

    it("updates record note", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const createRes = await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
        note: "Original note",
      });
      const record = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "PUT",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { note: "Updated note" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.note).toBe("Updated note");
    });

    it("updates recordedAt timestamp", async () => {
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
        payload: { recordedAt: "2024-03-01T11:00:00.000Z" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(new Date(body.recordedAt).getUTCHours()).toBe(11);
    });

    it("returns 404 when record does not exist", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const res = await app.inject({
        method: "PUT",
        url: `/api/records/nonexistent-id`,
        headers: { authorization: `Bearer ${token}` },
        payload: { note: "test" },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 403 when user does not have access to the baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const createRes = await createRecord(app, token1, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      const record = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "PUT",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token2}` },
        payload: { note: "hacked" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 when no token is provided", async () => {
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
        payload: { note: "test" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/records/:id - delete record", () => {
    it("deletes a record and returns 204", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const createRes = await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      const record = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "DELETE",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(204);

      // Verify it's gone
      const listRes = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/records`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(JSON.parse(listRes.body)).toHaveLength(0);
    });

    it("returns 404 when record does not exist", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const res = await app.inject({
        method: "DELETE",
        url: `/api/records/nonexistent-id`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 403 when user does not have access to the baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const createRes = await createRecord(app, token1, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      const record = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "DELETE",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 when no token is provided", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const createRes = await createRecord(app, token, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      const record = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "DELETE",
        url: `/api/records/${record.id}`,
      });

      expect(res.statusCode).toBe(401);
    });

    it("allows a member (non-admin) to delete their own record", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      // User2 joins as member
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

      // User2 creates a record
      const createRes = await createRecord(app, token2, baby.id, {
        type: "pee",
        recordedAt: "2024-03-01T10:00:00.000Z",
      });
      const record = JSON.parse(createRes.body);

      // User2 can delete their record
      const res = await app.inject({
        method: "DELETE",
        url: `/api/records/${record.id}`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(204);
    });
  });
});

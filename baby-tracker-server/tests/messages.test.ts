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

function buildTextMessagePayload(textContent: string, recordedAt?: string) {
  const fields: Array<{ name: string; value: string }> = [
    { name: "textContent", value: textContent },
  ];
  if (recordedAt) {
    fields.push({ name: "recordedAt", value: recordedAt });
  }

  const boundary = "testboundary";
  const parts = fields
    .map(
      (f) =>
        `--${boundary}\r\nContent-Disposition: form-data; name="${f.name}"\r\n\r\n${f.value}`
    )
    .join("\r\n");
  const body = `${parts}\r\n--${boundary}--\r\n`;

  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

describe("Messages API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe("POST /api/babies/:babyId/messages - create message", () => {
    it("creates a text message and returns 201", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const { body, contentType } = buildTextMessagePayload(
        "Hello little one!",
        "2024-03-01T10:00:00.000Z"
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/messages`,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const msg = JSON.parse(res.body);
      expect(msg.id).toBeDefined();
      expect(msg.babyId).toBe(baby.id);
      expect(msg.textContent).toBe("Hello little one!");
      expect(msg.user).toBeDefined();
      expect(msg.user.nickname).toBe("User1");
      expect(msg.photos).toBeDefined();
    });

    it("creates message with recordedAt", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const { body, contentType } = buildTextMessagePayload(
        "Test message",
        "2024-06-15T08:00:00.000Z"
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/messages`,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const msg = JSON.parse(res.body);
      expect(new Date(msg.recordedAt).toISOString()).toBe(
        "2024-06-15T08:00:00.000Z"
      );
    });

    it("returns 400 when no textContent and no audio", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const boundary = "testboundary";
      const body = `--${boundary}--\r\n`;

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/messages`,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const { body, contentType } = buildTextMessagePayload("Hello");

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/messages`,
        headers: { "content-type": contentType },
        payload: body,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when user has no access to baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);
      const { body, contentType } = buildTextMessagePayload("Hello");

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/messages`,
        headers: {
          authorization: `Bearer ${token2}`,
          "content-type": contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/babies/:babyId/messages - list messages", () => {
    it("returns empty list when no messages", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/messages`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toHaveLength(0);
    });

    it("returns messages with user and photos", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });
      await prisma.message.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          textContent: "Direct db message",
          recordedAt: new Date("2024-03-01T10:00:00.000Z"),
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/messages`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].textContent).toBe("Direct db message");
      expect(body[0].user).toBeDefined();
      expect(body[0].user.nickname).toBe("User1");
      expect(body[0].photos).toBeDefined();
    });

    it("returns messages ordered by recordedAt descending", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      await prisma.message.createMany({
        data: [
          {
            babyId: baby.id,
            userId: user!.id,
            textContent: "First",
            recordedAt: new Date("2024-03-01T08:00:00.000Z"),
          },
          {
            babyId: baby.id,
            userId: user!.id,
            textContent: "Second",
            recordedAt: new Date("2024-03-01T10:00:00.000Z"),
          },
        ],
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/messages`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body[0].textContent).toBe("Second");
      expect(body[1].textContent).toBe("First");
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/messages`,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when no baby access", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/messages`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/messages/:id/audio - serve audio", () => {
    it("returns 404 when message does not exist", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const res = await app.inject({
        method: "GET",
        url: `/api/messages/nonexistent-id/audio`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 404 when message has no audio", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      const message = await prisma.message.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          textContent: "Text only",
          recordedAt: new Date(),
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/messages/${message.id}/audio`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 403 when user has no access to the baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);
      const user1 = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      const message = await prisma.message.create({
        data: {
          babyId: baby.id,
          userId: user1!.id,
          audioUrl: "/audio/test.mp3",
          recordedAt: new Date(),
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/messages/${message.id}/audio`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({
        where: { email: "user1@example.com" },
      });

      const message = await prisma.message.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          audioUrl: "/audio/test.mp3",
          recordedAt: new Date(),
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/messages/${message.id}/audio`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});

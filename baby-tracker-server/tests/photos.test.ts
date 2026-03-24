import { describe, it, expect, beforeEach, afterAll } from "vitest";
import sharp from "sharp";
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

async function makeImageBuffer() {
  return sharp({
    create: { width: 100, height: 100, channels: 3, background: "red" },
  })
    .jpeg()
    .toBuffer();
}

describe("Photos API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe("POST /api/babies/:babyId/photos - upload photo", () => {
    it("uploads a photo and returns 201", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const imageBuffer = await makeImageBuffer();

      const form = [
        "--boundary\r\n",
        'Content-Disposition: form-data; name="file"; filename="test.jpg"\r\n',
        "Content-Type: image/jpeg\r\n",
        "\r\n",
        imageBuffer.toString("binary"),
        "\r\n--boundary--\r\n",
      ].join("");

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/photos`,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "multipart/form-data; boundary=boundary",
        },
        payload: Buffer.concat([
          Buffer.from(
            "--boundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n"
          ),
          imageBuffer,
          Buffer.from("\r\n--boundary--\r\n"),
        ]),
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBeDefined();
      expect(body.babyId).toBe(baby.id);
      expect(body.url).toBeDefined();
      expect(body.thumbnailUrl).toBeDefined();
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const imageBuffer = await makeImageBuffer();

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/photos`,
        headers: {
          "content-type": "multipart/form-data; boundary=boundary",
        },
        payload: Buffer.concat([
          Buffer.from(
            '--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'
          ),
          imageBuffer,
          Buffer.from("\r\n--boundary--\r\n"),
        ]),
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when user has no access to baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);
      const imageBuffer = await makeImageBuffer();

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/photos`,
        headers: {
          authorization: `Bearer ${token2}`,
          "content-type": "multipart/form-data; boundary=boundary",
        },
        payload: Buffer.concat([
          Buffer.from(
            '--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'
          ),
          imageBuffer,
          Buffer.from("\r\n--boundary--\r\n"),
        ]),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/babies/:babyId/photos - list photos", () => {
    it("returns empty list when no photos", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/photos`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toHaveLength(0);
    });

    it("returns photos for the baby", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      // Insert photo directly via prisma
      await prisma.photo.create({
        data: {
          babyId: baby.id,
          userId: (
            await prisma.user.findFirst({ where: { email: "user1@example.com" } })
          )!.id,
          url: "/photos/test.jpg",
          thumbnailUrl: "/photos/thumbs/test.jpg",
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/photos`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].url).toBe("/photos/test.jpg");
    });

    it("filters by date when date query param provided", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({ where: { email: "user1@example.com" } });

      await prisma.photo.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          url: "/photos/photo1.jpg",
          thumbnailUrl: "/photos/thumbs/photo1.jpg",
          uploadedAt: new Date("2024-03-01T10:00:00.000Z"),
        },
      });
      await prisma.photo.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          url: "/photos/photo2.jpg",
          thumbnailUrl: "/photos/thumbs/photo2.jpg",
          uploadedAt: new Date("2024-03-02T10:00:00.000Z"),
        },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/photos?date=2024-03-01`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].url).toBe("/photos/photo1.jpg");
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/photos`,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when no baby access", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);

      const res = await app.inject({
        method: "GET",
        url: `/api/babies/${baby.id}/photos`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("DELETE /api/photos/:id - delete photo", () => {
    it("deletes a photo and returns 204", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({ where: { email: "user1@example.com" } });

      const photo = await prisma.photo.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          url: "/photos/deleteme.jpg",
          thumbnailUrl: "/photos/thumbs/deleteme.jpg",
        },
      });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/photos/${photo.id}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(204);

      const deleted = await prisma.photo.findUnique({ where: { id: photo.id } });
      expect(deleted).toBeNull();
    });

    it("returns 404 when photo does not exist", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const res = await app.inject({
        method: "DELETE",
        url: `/api/photos/nonexistent-id`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 403 when user has no access to the baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");
      const baby = await createBaby(app, token1);
      const user1 = await prisma.user.findFirst({ where: { email: "user1@example.com" } });

      const photo = await prisma.photo.create({
        data: {
          babyId: baby.id,
          userId: user1!.id,
          url: "/photos/secret.jpg",
          thumbnailUrl: "/photos/thumbs/secret.jpg",
        },
      });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/photos/${photo.id}`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 when no token", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");
      const baby = await createBaby(app, token);
      const user = await prisma.user.findFirst({ where: { email: "user1@example.com" } });

      const photo = await prisma.photo.create({
        data: {
          babyId: baby.id,
          userId: user!.id,
          url: "/photos/noauth.jpg",
          thumbnailUrl: "/photos/thumbs/noauth.jpg",
        },
      });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/photos/${photo.id}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});

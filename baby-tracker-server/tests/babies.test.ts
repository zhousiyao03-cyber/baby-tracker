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

describe("Babies API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe("POST /api/babies - create baby", () => {
    it("creates a baby and returns 201", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const res = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "Little One",
          gender: "female",
          birthDate: "2024-01-15",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("Little One");
      expect(body.gender).toBe("female");
      expect(body.id).toBeDefined();
    });

    it("creates a baby with unknown gender when gender is omitted", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const res = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Baby", birthDate: "2024-06-01" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.gender).toBe("unknown");
    });

    it("returns 401 when no token is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/babies",
        payload: { name: "Baby", birthDate: "2024-01-01" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/babies - get baby list", () => {
    it("returns babies for the authenticated user", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Baby One", birthDate: "2024-01-01" },
      });
      await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Baby Two", birthDate: "2024-06-01" },
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(2);
      expect(body[0].role).toBe("admin");
    });

    it("returns empty list when user has no babies", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const res = await app.inject({
        method: "GET",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toHaveLength(0);
    });

    it("returns 401 when no token is provided", async () => {
      const res = await app.inject({ method: "GET", url: "/api/babies" });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("PUT /api/babies/:babyId - update baby info", () => {
    it("updates baby name and returns updated baby", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Old Name", birthDate: "2024-01-01" },
      });
      const baby = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "PUT",
        url: `/api/babies/${baby.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "New Name" },
      });

      expect(res.statusCode).toBe(200);
      const updated = JSON.parse(res.body);
      expect(updated.name).toBe("New Name");
    });

    it("updates multiple fields at once", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Baby", birthDate: "2024-01-01" },
      });
      const baby = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "PUT",
        url: `/api/babies/${baby.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "Updated Baby",
          gender: "male",
          birthDate: "2024-03-15",
        },
      });

      expect(res.statusCode).toBe(200);
      const updated = JSON.parse(res.body);
      expect(updated.name).toBe("Updated Baby");
      expect(updated.gender).toBe("male");
    });

    it("returns 403 when user is not a member of the baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: "Baby", birthDate: "2024-01-01" },
      });
      const baby = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "PUT",
        url: `/api/babies/${baby.id}`,
        headers: { authorization: `Bearer ${token2}` },
        payload: { name: "Hacked Name" },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("POST /api/babies/:babyId/invite - generate invite code", () => {
    it("generates and returns an invite code", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Baby", birthDate: "2024-01-01" },
      });
      const baby = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/invite`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.inviteCode).toBeDefined();
      expect(body.inviteCode).toHaveLength(8); // 4 bytes = 8 hex chars
    });

    it("returns 403 when user is not a member of the baby", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: "Baby", birthDate: "2024-01-01" },
      });
      const baby = JSON.parse(createRes.body);

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/invite`,
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("POST /api/babies/join - join via invite code", () => {
    it("allows a second user to join via invite code", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: "Shared Baby", birthDate: "2024-01-01" },
      });
      const baby = JSON.parse(createRes.body);

      const inviteRes = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/invite`,
        headers: { authorization: `Bearer ${token1}` },
      });
      const { inviteCode } = JSON.parse(inviteRes.body);

      const joinRes = await app.inject({
        method: "POST",
        url: "/api/babies/join",
        headers: { authorization: `Bearer ${token2}` },
        payload: { inviteCode },
      });

      expect(joinRes.statusCode).toBe(201);
      const joined = JSON.parse(joinRes.body);
      expect(joined.id).toBe(baby.id);
      expect(joined.name).toBe("Shared Baby");
    });

    it("user2 can see the baby in their list after joining", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: "Shared Baby", birthDate: "2024-01-01" },
      });
      const baby = JSON.parse(createRes.body);

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

      const listRes = await app.inject({
        method: "GET",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token2}` },
      });

      const list = JSON.parse(listRes.body);
      expect(list).toHaveLength(1);
      expect(list[0].role).toBe("member");
    });

    it("returns 404 for invalid invite code", async () => {
      const token = await registerUser(app, "user1@example.com", "User1");

      const res = await app.inject({
        method: "POST",
        url: "/api/babies/join",
        headers: { authorization: `Bearer ${token}` },
        payload: { inviteCode: "invalidcode" },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 409 when user tries to join a baby they already belong to", async () => {
      const token1 = await registerUser(app, "user1@example.com", "User1");
      const token2 = await registerUser(app, "user2@example.com", "User2");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/babies",
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: "Baby", birthDate: "2024-01-01" },
      });
      const baby = JSON.parse(createRes.body);

      const inviteRes = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/invite`,
        headers: { authorization: `Bearer ${token1}` },
      });
      const { inviteCode } = JSON.parse(inviteRes.body);

      // Join once
      await app.inject({
        method: "POST",
        url: "/api/babies/join",
        headers: { authorization: `Bearer ${token2}` },
        payload: { inviteCode },
      });

      // Try to join again
      const res = await app.inject({
        method: "POST",
        url: "/api/babies/join",
        headers: { authorization: `Bearer ${token2}` },
        payload: { inviteCode },
      });

      expect(res.statusCode).toBe(409);
    });
  });
});

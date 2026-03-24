import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTestApp, cleanDb, prisma } from "./helpers/setup.js";

describe("Auth API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it("POST /api/auth/register - creates user and returns tokens", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "password123",
        nickname: "TestUser",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.email).toBe("test@example.com");
  });

  it("POST /api/auth/register - rejects duplicate email", async () => {
    const payload = {
      email: "test@example.com",
      password: "password123",
      nickname: "TestUser",
    };
    await app.inject({ method: "POST", url: "/api/auth/register", payload });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload,
    });
    expect(res.statusCode).toBe(409);
  });

  it("POST /api/auth/login - returns tokens for valid credentials", async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "password123",
        nickname: "TestUser",
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "test@example.com", password: "password123" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
  });

  it("POST /api/auth/login - rejects invalid password", async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "password123",
        nickname: "TestUser",
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "test@example.com", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/auth/refresh - returns new access token", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "password123",
        nickname: "TestUser",
      },
    });
    const { refreshToken } = JSON.parse(regRes.body);
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).accessToken).toBeDefined();
  });
});

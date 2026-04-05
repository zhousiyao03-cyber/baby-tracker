import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTestApp, cleanDb, prisma } from "./helpers/setup.js";

describe("Auth API - edge cases", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it("POST /api/auth/login - returns 401 for non-existent email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "nobody@example.com", password: "password123" },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBeDefined();
  });

  it("POST /api/auth/refresh - returns 401 for invalid refresh token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken: "totally-invalid-jwt-token" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/auth/register - returns user id and nickname in response", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "struct@example.com",
        password: "password123",
        nickname: "StructTest",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.id).toBeDefined();
    expect(body.user.nickname).toBe("StructTest");
    expect(body.user.email).toBe("struct@example.com");
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it("POST /api/auth/refresh - new access token works for authenticated endpoints", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "refresh@example.com",
        password: "password123",
        nickname: "RefreshUser",
      },
    });
    const { refreshToken } = JSON.parse(regRes.body);

    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });
    const { accessToken } = JSON.parse(refreshRes.body);

    // Use new token to access protected endpoint
    const babiesRes = await app.inject({
      method: "GET",
      url: "/api/babies",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(babiesRes.statusCode).toBe(200);
  });

  it("returns 401 for malformed authorization header", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/babies",
      headers: { authorization: "NotBearer some-token" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 for expired/corrupted token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/babies",
      headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMiLCJpYXQiOjAsImV4cCI6MH0.invalid" },
    });
    expect(res.statusCode).toBe(401);
  });
});

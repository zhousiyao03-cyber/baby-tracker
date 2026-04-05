import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTestApp, cleanDb, prisma } from "./helpers/setup.js";

describe("Health API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/health - returns ok status", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });

  it("GET /api/health - does not require authentication", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(res.statusCode).toBe(200);
  });
});

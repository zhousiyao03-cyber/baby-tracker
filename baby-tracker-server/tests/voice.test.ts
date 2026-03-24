import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { createTestApp, cleanDb, prisma } from "./helpers/setup.js";

// Mock the llm service so tests don't call the real Claude API
vi.mock("../src/services/llm.js", () => ({
  parseVoiceText: vi.fn(),
}));

import { parseVoiceText } from "../src/services/llm.js";

const mockParseVoiceText = parseVoiceText as ReturnType<typeof vi.fn>;

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

describe("Voice API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe("POST /api/babies/:babyId/records/voice - parse voice text", () => {
    it("returns parsed records from LLM without saving", async () => {
      const token = await registerUser(app, "voice@example.com", "VoiceUser");
      const baby = await createBaby(app, token, "Little One");

      const mockParsed = [
        {
          type: "feeding_formula",
          recordedAt: new Date().toISOString(),
          data: { amount_ml: 120 },
        },
      ];
      mockParseVoiceText.mockResolvedValueOnce(mockParsed);

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/records/voice`,
        headers: { authorization: `Bearer ${token}` },
        payload: { text: "刚刚喝了120毫升配方奶" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.parsed).toHaveLength(1);
      expect(body.parsed[0].type).toBe("feeding_formula");
      expect(body.parsed[0].data.amount_ml).toBe(120);

      // Verify nothing was saved to DB
      const records = await prisma.record.findMany({ where: { babyId: baby.id } });
      expect(records).toHaveLength(0);
    });

    it("returns empty array when LLM cannot recognize records", async () => {
      const token = await registerUser(app, "voice2@example.com", "VoiceUser2");
      const baby = await createBaby(app, token, "Baby Two");

      mockParseVoiceText.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/records/voice`,
        headers: { authorization: `Bearer ${token}` },
        payload: { text: "今天天气不错" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.parsed).toEqual([]);
    });

    it("returns 401 without auth token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/babies/some-id/records/voice",
        payload: { text: "喝奶了" },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/babies/:babyId/records/voice/confirm - save parsed records", () => {
    it("saves multiple records in a batch", async () => {
      const token = await registerUser(app, "confirm@example.com", "ConfirmUser");
      const baby = await createBaby(app, token, "Confirm Baby");

      const now = new Date().toISOString();
      const records = [
        {
          type: "feeding_formula",
          recordedAt: now,
          data: { amount_ml: 100 },
        },
        {
          type: "pee",
          recordedAt: now,
          data: {},
        },
      ];

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/records/voice/confirm`,
        headers: { authorization: `Bearer ${token}` },
        payload: { records },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(2);
      expect(body[0].type).toBe("feeding_formula");
      expect(body[1].type).toBe("pee");

      // Verify records are in DB
      const dbRecords = await prisma.record.findMany({
        where: { babyId: baby.id },
        orderBy: { type: "asc" },
      });
      expect(dbRecords).toHaveLength(2);
    });

    it("saves a single record with note", async () => {
      const token = await registerUser(app, "confirm2@example.com", "ConfirmUser2");
      const baby = await createBaby(app, token, "Note Baby");

      const now = new Date().toISOString();
      const records = [
        {
          type: "poop",
          recordedAt: now,
          data: { color: "yellow", texture: "soft" },
          note: "看起来正常",
        },
      ];

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/records/voice/confirm`,
        headers: { authorization: `Bearer ${token}` },
        payload: { records },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].type).toBe("poop");
      expect(body[0].note).toBe("看起来正常");
    });

    it("returns 401 without auth token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/babies/some-id/records/voice/confirm",
        payload: { records: [] },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when user has no access to baby", async () => {
      const token1 = await registerUser(app, "owner@example.com", "Owner");
      const token2 = await registerUser(app, "other@example.com", "Other");
      const baby = await createBaby(app, token1, "Owner Baby");

      const res = await app.inject({
        method: "POST",
        url: `/api/babies/${baby.id}/records/voice/confirm`,
        headers: { authorization: `Bearer ${token2}` },
        payload: {
          records: [
            {
              type: "pee",
              recordedAt: new Date().toISOString(),
              data: {},
            },
          ],
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});

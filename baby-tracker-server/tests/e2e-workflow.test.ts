import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTestApp, cleanDb, prisma } from "./helpers/setup.js";

/**
 * E2E workflow tests: cover cross-module flows that exercise
 * register → baby → invite/join → records → summary → stats.
 */
describe("E2E Workflow", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it("full family workflow: register, create baby, invite, join, record, summary, stats", async () => {
    // --- Step 1: Parent registers ---
    const regRes1 = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "mom@example.com", password: "pass123", nickname: "妈妈" },
    });
    expect(regRes1.statusCode).toBe(201);
    const { accessToken: momToken } = JSON.parse(regRes1.body);

    // --- Step 2: Create baby ---
    const babyRes = await app.inject({
      method: "POST",
      url: "/api/babies",
      headers: { authorization: `Bearer ${momToken}` },
      payload: { name: "宝宝", gender: "female", birthDate: "2024-06-15" },
    });
    expect(babyRes.statusCode).toBe(201);
    const baby = JSON.parse(babyRes.body);
    expect(baby.name).toBe("宝宝");
    expect(baby.gender).toBe("female");

    // --- Step 3: Dad registers and joins via invite ---
    const regRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "dad@example.com", password: "pass123", nickname: "爸爸" },
    });
    const { accessToken: dadToken } = JSON.parse(regRes2.body);

    const inviteRes = await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/invite`,
      headers: { authorization: `Bearer ${momToken}` },
    });
    const { inviteCode } = JSON.parse(inviteRes.body);

    const joinRes = await app.inject({
      method: "POST",
      url: "/api/babies/join",
      headers: { authorization: `Bearer ${dadToken}` },
      payload: { inviteCode },
    });
    expect(joinRes.statusCode).toBe(201);

    // Dad sees baby in list
    const dadBabiesRes = await app.inject({
      method: "GET",
      url: "/api/babies",
      headers: { authorization: `Bearer ${dadToken}` },
    });
    const dadBabies = JSON.parse(dadBabiesRes.body);
    expect(dadBabies).toHaveLength(1);
    expect(dadBabies[0].name).toBe("宝宝");
    expect(dadBabies[0].role).toBe("member");

    // --- Step 4: Both parents create records for today ---
    const today = new Date().toISOString().slice(0, 10);

    // Mom: formula feeding
    await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/records`,
      headers: { authorization: `Bearer ${momToken}` },
      payload: {
        type: "feeding_formula",
        recordedAt: `${today}T08:00:00.000Z`,
        data: { amount_ml: 120 },
        note: "早上第一顿",
      },
    });

    // Dad: formula feeding
    await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/records`,
      headers: { authorization: `Bearer ${dadToken}` },
      payload: {
        type: "feeding_formula",
        recordedAt: `${today}T12:00:00.000Z`,
        data: { amount_ml: 100 },
      },
    });

    // Mom: breast feeding
    await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/records`,
      headers: { authorization: `Bearer ${momToken}` },
      payload: {
        type: "feeding_breast",
        recordedAt: `${today}T10:00:00.000Z`,
        data: { duration_minutes: 20, side: "left" },
      },
    });

    // Dad: sleep
    await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/records`,
      headers: { authorization: `Bearer ${dadToken}` },
      payload: {
        type: "sleep",
        recordedAt: `${today}T14:00:00.000Z`,
        data: { end_time: `${today}T16:00:00.000Z` },
      },
    });

    // Mom: pee + poop
    await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/records`,
      headers: { authorization: `Bearer ${momToken}` },
      payload: { type: "pee", recordedAt: `${today}T09:00:00.000Z` },
    });
    await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/records`,
      headers: { authorization: `Bearer ${momToken}` },
      payload: {
        type: "poop",
        recordedAt: `${today}T11:00:00.000Z`,
        data: { color: "yellow", texture: "soft" },
      },
    });

    // Mom: weight
    await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/records`,
      headers: { authorization: `Bearer ${momToken}` },
      payload: {
        type: "weight",
        recordedAt: `${today}T09:30:00.000Z`,
        data: { value_g: 5200 },
      },
    });

    // --- Step 5: View records list ---
    const listRes = await app.inject({
      method: "GET",
      url: `/api/babies/${baby.id}/records?date=${today}`,
      headers: { authorization: `Bearer ${dadToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const records = JSON.parse(listRes.body);
    expect(records).toHaveLength(7);
    // Should be ordered desc by recordedAt
    expect(records[0].type).toBe("sleep"); // 14:00
    expect(records[records.length - 1].type).toBe("feeding_formula"); // 08:00

    // --- Step 6: Verify daily summary ---
    const summaryRes = await app.inject({
      method: "GET",
      url: `/api/babies/${baby.id}/records/summary?date=${today}`,
      headers: { authorization: `Bearer ${momToken}` },
    });
    expect(summaryRes.statusCode).toBe(200);
    const summary = JSON.parse(summaryRes.body);
    expect(summary.formulaCount).toBe(2);
    expect(summary.formulaTotalMl).toBe(220);
    expect(summary.breastCount).toBe(1);
    expect(summary.breastTotalMinutes).toBe(20);
    expect(summary.peeCount).toBe(1);
    expect(summary.poopCount).toBe(1);
    expect(summary.sleepCount).toBe(1);
    expect(summary.sleepTotalHours).toBeCloseTo(2, 1);
    expect(summary.latestWeight).toBe(5200);

    // --- Step 7: Verify feeding stats ---
    const feedRes = await app.inject({
      method: "GET",
      url: `/api/babies/${baby.id}/stats/feeding?days=1`,
      headers: { authorization: `Bearer ${dadToken}` },
    });
    expect(feedRes.statusCode).toBe(200);
    const feedStats = JSON.parse(feedRes.body);
    expect(feedStats).toHaveLength(1);
    expect(feedStats[0].formulaCount).toBe(2);
    expect(feedStats[0].formulaMl).toBe(220);
    expect(feedStats[0].breastCount).toBe(1);

    // --- Step 8: Update a record ---
    const recordToUpdate = records.find((r: any) => r.type === "feeding_formula" && r.note === "早上第一顿");
    const updateRes = await app.inject({
      method: "PUT",
      url: `/api/records/${recordToUpdate.id}`,
      headers: { authorization: `Bearer ${momToken}` },
      payload: { data: { amount_ml: 130 }, note: "更新了奶量" },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(JSON.parse(updateRes.body).data.amount_ml).toBe(130);

    // --- Step 9: Delete a record ---
    const peeRecord = records.find((r: any) => r.type === "pee");
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/records/${peeRecord.id}`,
      headers: { authorization: `Bearer ${momToken}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    // Verify deleted
    const listRes2 = await app.inject({
      method: "GET",
      url: `/api/babies/${baby.id}/records?date=${today}`,
      headers: { authorization: `Bearer ${momToken}` },
    });
    expect(JSON.parse(listRes2.body)).toHaveLength(6);
  });

  it("baby update workflow: update name, gender, birthDate", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "parent@example.com", password: "pass123", nickname: "Parent" },
    });
    const { accessToken: token } = JSON.parse(regRes.body);

    const babyRes = await app.inject({
      method: "POST",
      url: "/api/babies",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "OldName", birthDate: "2024-01-01" },
    });
    const baby = JSON.parse(babyRes.body);
    expect(baby.gender).toBe("unknown");

    // Update all fields
    const updateRes = await app.inject({
      method: "PUT",
      url: `/api/babies/${baby.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "NewName", gender: "male", birthDate: "2024-02-01" },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body);
    expect(updated.name).toBe("NewName");
    expect(updated.gender).toBe("male");
    expect(new Date(updated.birthDate).toISOString()).toContain("2024-02-01");
  });

  it("voice confirm batch creates records", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "voice@example.com", password: "pass123", nickname: "VoiceUser" },
    });
    const { accessToken: token } = JSON.parse(regRes.body);

    const babyRes = await app.inject({
      method: "POST",
      url: "/api/babies",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "VoiceBaby", birthDate: "2024-01-01" },
    });
    const baby = JSON.parse(babyRes.body);

    const today = new Date().toISOString().slice(0, 10);

    // Confirm multiple records in batch
    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/babies/${baby.id}/records/voice/confirm`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        records: [
          {
            type: "feeding_formula",
            recordedAt: `${today}T08:00:00.000Z`,
            data: { amount_ml: 120 },
            note: "语音识别",
          },
          {
            type: "pee",
            recordedAt: `${today}T08:30:00.000Z`,
            data: {},
          },
          {
            type: "poop",
            recordedAt: `${today}T09:00:00.000Z`,
            data: { color: "yellow", texture: "soft" },
          },
        ],
      },
    });
    expect(confirmRes.statusCode).toBe(201);
    const created = JSON.parse(confirmRes.body);
    expect(created).toHaveLength(3);

    // Verify they are in the database
    const listRes = await app.inject({
      method: "GET",
      url: `/api/babies/${baby.id}/records?date=${today}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(JSON.parse(listRes.body)).toHaveLength(3);
  });

  it("access isolation: user cannot access another user's baby", async () => {
    const regRes1 = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "u1@example.com", password: "pass123", nickname: "U1" },
    });
    const { accessToken: token1 } = JSON.parse(regRes1.body);

    const regRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "u2@example.com", password: "pass123", nickname: "U2" },
    });
    const { accessToken: token2 } = JSON.parse(regRes2.body);

    // Each user creates their own baby
    const baby1Res = await app.inject({
      method: "POST",
      url: "/api/babies",
      headers: { authorization: `Bearer ${token1}` },
      payload: { name: "Baby1", birthDate: "2024-01-01" },
    });
    const baby1 = JSON.parse(baby1Res.body);

    const baby2Res = await app.inject({
      method: "POST",
      url: "/api/babies",
      headers: { authorization: `Bearer ${token2}` },
      payload: { name: "Baby2", birthDate: "2024-01-01" },
    });
    const baby2 = JSON.parse(baby2Res.body);

    // User1 can only see their own baby
    const listRes1 = await app.inject({
      method: "GET",
      url: "/api/babies",
      headers: { authorization: `Bearer ${token1}` },
    });
    const babies1 = JSON.parse(listRes1.body);
    expect(babies1).toHaveLength(1);
    expect(babies1[0].name).toBe("Baby1");

    // User1 cannot access baby2's records
    const recordRes = await app.inject({
      method: "POST",
      url: `/api/babies/${baby2.id}/records`,
      headers: { authorization: `Bearer ${token1}` },
      payload: { type: "pee", recordedAt: "2024-03-01T10:00:00.000Z" },
    });
    expect(recordRes.statusCode).toBe(403);

    // User1 cannot see baby2's stats
    const statsRes = await app.inject({
      method: "GET",
      url: `/api/babies/${baby2.id}/stats/feeding`,
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(statsRes.statusCode).toBe(403);

    // User1 cannot update baby2
    const updateRes = await app.inject({
      method: "PUT",
      url: `/api/babies/${baby2.id}`,
      headers: { authorization: `Bearer ${token1}` },
      payload: { name: "hacked" },
    });
    expect(updateRes.statusCode).toBe(403);
  });
});

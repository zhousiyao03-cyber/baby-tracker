import { FastifyInstance } from "fastify";
import { randomBytes } from "crypto";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export async function babiesRoutes(app: FastifyInstance) {
  // 创建宝宝
  app.post(
    "/api/babies",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { name, gender, birthDate } = request.body as {
        name: string;
        gender?: string;
        birthDate: string;
      };

      const baby = await prisma.baby.create({
        data: {
          name,
          gender: (gender as any) || "unknown",
          birthDate: new Date(birthDate),
          members: {
            create: { userId: request.userId, role: "admin" },
          },
        },
      });

      return reply.status(201).send(baby);
    }
  );

  // 获取我的宝宝列表
  app.get(
    "/api/babies",
    { preHandler: [authenticate] },
    async (request) => {
      const members = await prisma.babyMember.findMany({
        where: { userId: request.userId },
        include: { baby: true },
      });
      return members.map((m) => ({ ...m.baby, role: m.role }));
    }
  );

  // 更新宝宝信息
  app.put(
    "/api/babies/:babyId",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const data = request.body as {
        name?: string;
        gender?: string;
        birthDate?: string;
        avatarUrl?: string;
      };

      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.gender) updateData.gender = data.gender;
      if (data.birthDate) updateData.birthDate = new Date(data.birthDate);
      if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;

      return prisma.baby.update({ where: { id: babyId }, data: updateData });
    }
  );

  // 生成邀请码
  app.post(
    "/api/babies/:babyId/invite",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const inviteCode = randomBytes(4).toString("hex");

      await prisma.babyMember.update({
        where: { babyId_userId: { babyId, userId: request.userId } },
        data: { inviteCode },
      });

      return { inviteCode };
    }
  );

  // 通过邀请码加入
  app.post(
    "/api/babies/join",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { inviteCode } = request.body as { inviteCode: string };

      const member = await prisma.babyMember.findUnique({
        where: { inviteCode },
      });
      if (!member) {
        return reply.status(404).send({ error: "Invalid invite code" });
      }

      const existing = await prisma.babyMember.findUnique({
        where: {
          babyId_userId: { babyId: member.babyId, userId: request.userId },
        },
      });
      if (existing) {
        return reply.status(409).send({ error: "Already a member" });
      }

      await prisma.babyMember.create({
        data: {
          babyId: member.babyId,
          userId: request.userId,
          role: "member",
        },
      });

      const baby = await prisma.baby.findUnique({
        where: { id: member.babyId },
      });
      return reply.status(201).send(baby);
    }
  );
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  return app;
}

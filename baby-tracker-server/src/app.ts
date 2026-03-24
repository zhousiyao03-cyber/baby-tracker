import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { join } from "path";
import { mkdir } from "fs/promises";
import { authRoutes } from "./routes/auth.js";
import { babiesRoutes } from "./routes/babies.js";
import { recordsRoutes } from "./routes/records.js";
import { photosRoutes } from "./routes/photos.js";
import { messagesRoutes } from "./routes/messages.js";
import { statsRoutes } from "./routes/stats.js";
import { env } from "./config.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  });

  const uploadDir = join(process.cwd(), env.UPLOAD_DIR);
  await mkdir(uploadDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: "/uploads/",
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(babiesRoutes);
  await app.register(recordsRoutes);
  await app.register(photosRoutes);
  await app.register(messagesRoutes);
  await app.register(statsRoutes);

  return app;
}

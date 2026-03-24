import { mkdir, writeFile, unlink } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { env } from "../config.js";

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  subdir: string
): Promise<string> {
  const dir = join(env.UPLOAD_DIR, subdir);
  await ensureDir(dir);

  const ext = extname(originalName);
  const filename = `${randomUUID()}${ext}`;
  const filepath = join(dir, filename);
  await writeFile(filepath, buffer);

  return `/${subdir}/${filename}`;
}

export async function savePhoto(
  buffer: Buffer,
  originalName: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const url = await saveFile(buffer, originalName, "photos");

  const dir = join(env.UPLOAD_DIR, "photos", "thumbs");
  await ensureDir(dir);

  const ext = extname(originalName);
  const thumbFilename = `${randomUUID()}${ext}`;
  const thumbPath = join(dir, thumbFilename);

  await sharp(buffer).resize(300, 300, { fit: "cover" }).toFile(thumbPath);

  const thumbnailUrl = `/photos/thumbs/${thumbFilename}`;
  return { url, thumbnailUrl };
}

export async function deleteFile(filepath: string): Promise<void> {
  const fullPath = join(env.UPLOAD_DIR, filepath);
  try {
    await unlink(fullPath);
  } catch {
    // file doesn't exist, ignore
  }
}

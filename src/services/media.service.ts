import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { MediaKind } from "@prisma/client";

const maxMb = Number(process.env.UPLOAD_MAX_MB ?? "20");
const maxBytes = maxMb * 1024 * 1024;

function extensionFor(file: File) {
  const fromName = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  if (fromName) return fromName;
  const fallback: Record<string,string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/svg+xml": ".svg", "video/mp4": ".mp4", "application/pdf": ".pdf" };
  return fallback[file.type] ?? "";
}
function kindFor(type: string): MediaKind {
  if (type.startsWith("image/")) return "IMAGE";
  if (type.startsWith("video/")) return "VIDEO";
  if (type === "application/pdf" || type.startsWith("text/") || type.includes("document")) return "DOCUMENT";
  return "OTHER";
}

export const mediaService = {
  list: () => prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } }),
  async upload(file: File, altText?: string | null) {
    if (!file || file.size === 0) throw new Error("Select a file to upload");
    if (file.size > maxBytes) throw new Error(`File is larger than ${maxMb}MB`);
    const ext = extensionFor(file);
    const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const now = new Date();
    const relativeDir = path.join("uploads", String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(absoluteDir, fileName), bytes);
    const url = `/${relativeDir.replaceAll(path.sep, "/")}/${fileName}`;
    return prisma.mediaAsset.create({ data: { fileName, originalName: file.name, url, mimeType: file.type || "application/octet-stream", size: file.size, kind: kindFor(file.type), altText: altText || null } });
  },
  async remove(id: number) {
    const asset = await prisma.mediaAsset.delete({ where: { id } });
    if (asset.url.startsWith("/uploads/")) {
      const target = path.join(process.cwd(), "public", asset.url.replace(/^\//, ""));
      await unlink(target).catch(() => undefined);
    }
    return asset;
  },
};

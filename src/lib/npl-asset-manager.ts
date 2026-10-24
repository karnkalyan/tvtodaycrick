import * as fs from "fs";
import * as path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const ASSETS_BASE_DIR = path.join(PUBLIC_DIR, "images", "teams");

function sanitizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-");
}

function getExtension(url: string, contentType?: string | null): string {
  if (contentType) {
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("png")) return "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
    if (contentType.includes("svg")) return "svg";
  }
  const cleanUrl = url.split("?")[0].split("#")[0];
  const ext = path.extname(cleanUrl).toLowerCase().replace(".", "");
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return "webp";
}

/**
 * Downloads an image asset and stores it in public/images/teams/...
 * Returns the public web path: e.g. /images/teams/{teamSlug}/logo.png
 */
export async function downloadAsset(
  remoteUrl: string | null | undefined,
  subPath: string,
  force = false
): Promise<string | null> {
  if (!remoteUrl || !remoteUrl.startsWith("http")) {
    return remoteUrl || null;
  }

  try {
    const extMatch = remoteUrl.split("?")[0].match(/\.(png|jpg|jpeg|webp|svg)$/i);
    const ext = extMatch ? (extMatch[1].toLowerCase() === "jpeg" ? "jpg" : extMatch[1].toLowerCase()) : "webp";

    const relativePath = path.join("images", "teams", `${subPath}.${ext}`).replace(/\\/g, "/");
    const fullDiskPath = path.join(PUBLIC_DIR, relativePath);

    // If file exists and is not empty, avoid re-download unless forced
    if (!force && fs.existsSync(fullDiskPath)) {
      const stats = fs.statSync(fullDiskPath);
      if (stats.size > 200) {
        return `/${relativePath}`;
      }
    }

    const dir = path.dirname(fullDiskPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[AssetDownloader] HTTP ${res.status} for ${remoteUrl}`);
      return remoteUrl;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) {
      return remoteUrl;
    }

    fs.writeFileSync(fullDiskPath, buffer);
    return `/${relativePath}`;
  } catch (error) {
    console.warn(`[AssetDownloader] Failed to download ${remoteUrl}:`, error instanceof Error ? error.message : error);
    return remoteUrl; // Return remote URL as reliable fallback
  }
}

/**
 * Downloads a team logo into public/images/teams/{teamSlug}/logo.{ext}
 */
export async function downloadTeamLogo(teamSlug: string, remoteUrl: string | null | undefined, force = false): Promise<string | null> {
  const safeSlug = sanitizeSlug(teamSlug);
  return downloadAsset(remoteUrl, `${safeSlug}/logo`, force);
}

/**
 * Downloads a player image into public/images/teams/{teamSlug}/players/{playerSlug}.{ext}
 */
export async function downloadPlayerImage(
  teamSlug: string,
  playerSlug: string,
  remoteUrl: string | null | undefined,
  force = false
): Promise<string | null> {
  const safeTeam = sanitizeSlug(teamSlug || "general");
  const safePlayer = sanitizeSlug(playerSlug);
  return downloadAsset(remoteUrl, `${safeTeam}/players/${safePlayer}`, force);
}

/**
 * Helper to limit concurrent executions
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err) {
        console.error(`Error in concurrency worker for item index ${idx}:`, err);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

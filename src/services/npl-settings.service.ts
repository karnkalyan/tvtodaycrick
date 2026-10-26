import { prisma } from "../lib/prisma";
import { nplSeason } from "../lib/npl-seasons";
import { SECONDARY_SCHEDULE } from "../lib/npl-source";

export type NplProvider = "nplt20league" | "cricnepal" | "onlinekhabar";

export interface NplSettingsResponse {
  season: string;
  seasonNumber: number;
  provider: NplProvider;
  sourceUrl: string;
  secondaryUrl: string | null;
  nplt20Url: string;
  cricnepalUrl: string;
  onlinekhabarUrl?: string;
  autoSync: boolean;
  autoSyncInterval: number; // in seconds
}

export const DEFAULT_NPLT20_URL = "https://nplt20league.com";
export const DEFAULT_ONLINEKHABAR_URL = "https://www.onlinekhabar.com/cricket-tournament/npl-nepal-premier-league-2026";

export function detectProvider(url?: string | null): NplProvider {
  if (!url) return "cricnepal";
  if (url.includes("onlinekhabar.com")) return "onlinekhabar";
  if (url.includes("nplt20league.com")) return "nplt20league";
  return "cricnepal";
}

export async function getSourceSettings(year: string): Promise<NplSettingsResponse> {
  const config = nplSeason(year);
  const saved = await prisma.nplSourceSettings.findUnique({ where: { season: year } });

  const rawUrl = saved?.sourceUrl || config.sourceUrl;
  const provider = detectProvider(rawUrl);

  return {
    season: year,
    seasonNumber: config.number,
    provider,
    sourceUrl: rawUrl,
    secondaryUrl: saved ? saved.secondaryUrl : year === "2026" ? SECONDARY_SCHEDULE : null,
    nplt20Url: DEFAULT_NPLT20_URL,
    cricnepalUrl: config.sourceUrl,
    onlinekhabarUrl: DEFAULT_ONLINEKHABAR_URL,
    autoSync: false,
    autoSyncInterval: 25,
  };
}

export async function saveSourceSettings(year: string, body: unknown): Promise<NplSettingsResponse> {
  const config = nplSeason(year);
  if (!body || typeof body !== "object") throw new Error("Source settings are required");
  const data = body as {
    provider?: NplProvider;
    sourceUrl?: unknown;
    secondaryUrl?: unknown;
  };

  let chosenProvider = data.provider || (data.sourceUrl ? detectProvider(String(data.sourceUrl)) : "cricnepal");
  let targetUrl = typeof data.sourceUrl === "string" ? data.sourceUrl.trim() : "";

  if (chosenProvider === "cricnepal") {
    if (!targetUrl || !targetUrl.includes("cricnepal.com")) {
      targetUrl = config.sourceUrl;
    }
  } else if (chosenProvider === "onlinekhabar") {
    if (!targetUrl || !targetUrl.includes("onlinekhabar.com")) {
      targetUrl = DEFAULT_ONLINEKHABAR_URL;
    }
  } else if (chosenProvider === "nplt20league") {
    targetUrl = DEFAULT_NPLT20_URL;
  } else {
    chosenProvider = "cricnepal";
    targetUrl = config.sourceUrl;
  }

  // Validate format
  if (chosenProvider === "cricnepal") {
    try {
      const input = new URL(targetUrl);
      if (input.protocol !== "https:" || !["www.cricnepal.com", "go.cricnepal.com"].includes(input.hostname)) {
        targetUrl = config.sourceUrl;
      }
    } catch {
      targetUrl = config.sourceUrl;
    }
  } else if (chosenProvider === "onlinekhabar") {
    try {
      const input = new URL(targetUrl);
      if (input.protocol !== "https:" || !input.hostname.includes("onlinekhabar.com")) {
        targetUrl = DEFAULT_ONLINEKHABAR_URL;
      }
    } catch {
      targetUrl = DEFAULT_ONLINEKHABAR_URL;
    }
  } else {
    targetUrl = DEFAULT_NPLT20_URL;
  }

  let secondaryUrl: string | null = null;
  if (data.secondaryUrl && typeof data.secondaryUrl === "string") {
    secondaryUrl = data.secondaryUrl.trim();
  } else if (year === "2026") {
    secondaryUrl = SECONDARY_SCHEDULE;
  }

  await prisma.nplSourceSettings.upsert({
    where: { season: year },
    create: { season: year, sourceUrl: targetUrl, secondaryUrl },
    update: { sourceUrl: targetUrl, secondaryUrl },
  });

  // Also update nplSourceSnapshot payload so cached reads report chosenProvider
  try {
    const snapshot = await prisma.nplSourceSnapshot.findUnique({ where: { season: year } });
    if (snapshot && typeof snapshot.payload === "object" && snapshot.payload !== null) {
      const payload = snapshot.payload as any;
      payload.sourceProvider = chosenProvider;
      payload.sourceUrl = targetUrl;
      await prisma.nplSourceSnapshot.update({
        where: { season: year },
        data: { payload },
      });
    }
  } catch {
    // optional
  }

  return getSourceSettings(year);
}

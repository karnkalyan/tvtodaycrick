import { prisma } from "../lib/prisma";
import { nplSeason } from "../lib/npl-seasons";
import { SECONDARY_SCHEDULE } from "../lib/npl-source";

export type NplProvider = "nplt20league" | "cricnepal";

export interface NplSettingsResponse {
  season: string;
  seasonNumber: number;
  provider: NplProvider;
  sourceUrl: string;
  secondaryUrl: string | null;
  nplt20Url: string;
  cricnepalUrl: string;
  autoSync: boolean;
  autoSyncInterval: number; // in seconds
}

export const DEFAULT_NPLT20_URL = "https://nplt20league.com";

export function detectProvider(url?: string | null): NplProvider {
  if (!url) return "nplt20league";
  if (url.includes("cricnepal.com")) return "cricnepal";
  return "nplt20league";
}

export async function getSourceSettings(year: string): Promise<NplSettingsResponse> {
  const config = nplSeason(year);
  const saved = await prisma.nplSourceSettings.findUnique({ where: { season: year } });

  const rawUrl = saved?.sourceUrl || DEFAULT_NPLT20_URL;
  const provider = detectProvider(rawUrl);

  return {
    season: year,
    seasonNumber: config.number,
    provider,
    sourceUrl: rawUrl,
    secondaryUrl: saved ? saved.secondaryUrl : year === "2026" ? SECONDARY_SCHEDULE : null,
    nplt20Url: DEFAULT_NPLT20_URL,
    cricnepalUrl: config.sourceUrl,
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

  let targetUrl = typeof data.sourceUrl === "string" ? data.sourceUrl.trim() : "";
  let chosenProvider = data.provider;

  if (chosenProvider === "nplt20league") {
    targetUrl = DEFAULT_NPLT20_URL;
  } else if (chosenProvider === "cricnepal") {
    if (!targetUrl || !targetUrl.includes("cricnepal.com")) {
      targetUrl = config.sourceUrl;
    }
  } else if (targetUrl) {
    chosenProvider = detectProvider(targetUrl);
  } else {
    chosenProvider = "nplt20league";
    targetUrl = DEFAULT_NPLT20_URL;
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

  return getSourceSettings(year);
}

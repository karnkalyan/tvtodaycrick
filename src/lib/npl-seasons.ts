// Verified series URLs are provider configuration, not seeded fixtures or rosters.
export const NPL_SEASONS = [
  { year: "2024", number: 1, sourceUrl: "https://www.cricnepal.com/tournament/nepal-premier-league-2024-017" },
  { year: "2025", number: 2, sourceUrl: "https://www.cricnepal.com/tournament/nepal-premier-league-2025-174" },
  { year: "2026", number: 3, sourceUrl: "https://www.cricnepal.com/tournament/nepal-premier-league-2026-207" },
] as const;
export function nplSeason(year: string = "2026") { const season = NPL_SEASONS.find(s => s.year === year); if (!season) throw new Error("Choose a supported NPL season"); return season; }
export function requestSeason(req: Request) { return nplSeason(new URL(req.url).searchParams.get("season") || "2026").year; }
export function matchLabel(year: string, ordinal: number) { return `Season${nplSeason(year).number}-M${ordinal}`; }

import * as path from "path";
import { downloadTeamLogo, downloadPlayerImage, mapWithConcurrency } from "./npl-asset-manager";
import { getFranchiseBrand } from "./npl-franchises";
import type { NplFixture, NplPlayer, NplSeason, NplTeam } from "../types/npl";
import type { BattingStyle, BowlingStyle, PlayerRole } from "@prisma/client";
import { ensureIpv4Dispatcher } from "./fetch-network";
import { oversStringToBalls, type CricNepalParsedLiveMatch } from "./cricnepal-live";

ensureIpv4Dispatcher();

const NPLT20_BASE = "https://nplt20league.com";
const API_BASE = `${NPLT20_BASE}/api/v1`;

const HEADERS = {
  "User-Agent": "NPL-TVToday/2.0 (Mozilla/5.0; Windows NT 10.0; Win64; x64)",
  Accept: "application/json",
};

export async function fetchJson<T>(endpoint: string, timeoutMs = 15000): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}/${endpoint.replace(/^\//, "")}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`nplt20 API HTTP ${res.status}: ${url}`);
    }
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  } finally {
    clearTimeout(timer);
  }
}

export function mapRole(roleStr?: string | null): PlayerRole {
  if (!roleStr) return "BATSMAN";
  const lower = roleStr.toLowerCase();
  if (lower.includes("wicket") || lower.includes("keeper") || lower.includes("wk")) return "WICKET_KEEPER";
  if (lower.includes("all-round") || lower.includes("allround") || lower.includes("all rounder")) return "ALL_ROUNDER";
  if (lower.includes("bowl")) return "BOWLER";
  return "BATSMAN";
}

export function mapBatting(style?: string | null): BattingStyle | null {
  if (!style) return null;
  const lower = style.toLowerCase();
  if (lower.includes("left")) return "LEFT_HAND";
  if (lower.includes("right")) return "RIGHT_HAND";
  return null;
}

export function mapBowling(style?: string | null): BowlingStyle {
  if (!style) return "NONE";
  const lower = style.toLowerCase();
  if (lower.includes("offbreak") || lower.includes("off-break") || lower.includes("off spin") || lower.includes("off-spin")) return "OFF_SPIN";
  if (lower.includes("legbreak") || lower.includes("leg-break") || lower.includes("leg spin") || lower.includes("leg-spin")) return "LEG_SPIN";
  if (lower.includes("left-arm") || lower.includes("left arm")) {
    if (lower.includes("orthodox") || lower.includes("spin")) return "LEFT_ARM_ORTHODOX";
    if (lower.includes("chinaman") || lower.includes("wrist")) return "LEFT_ARM_CHINAMAN";
    if (lower.includes("medium")) return "LEFT_ARM_MEDIUM";
    if (lower.includes("fast")) return "LEFT_ARM_FAST";
    return "LEFT_ARM_MEDIUM";
  }
  if (lower.includes("right-arm") || lower.includes("right arm")) {
    if (lower.includes("medium")) return "RIGHT_ARM_MEDIUM";
    if (lower.includes("fast")) return "RIGHT_ARM_FAST";
    return "RIGHT_ARM_MEDIUM";
  }
  return "NONE";
}

export interface NplT20TeamRaw {
  id: string;
  slug: string;
  name: string;
  shortCode?: string;
  logoUrl?: string;
  captain?: string;
  coach?: string;
  owner?: string;
  championships?: number;
  venueName?: string;
  website?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  introContent?: string;
  faqs?: Array<{ question: string; answer: string }>;
  roster?: Array<{
    id: string;
    playerId: string;
    slug: string;
    name: string;
    imageUrl?: string;
    isOverseas?: boolean;
    role?: string;
    status?: string;
    auctionPrice?: string;
  }>;
}

export interface NplT20PlayerRaw {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  playerLink?: string;
  battingStyle?: string | null;
  bowlingStyle?: string | null;
  isOverseas?: boolean;
  role?: string;
  team?: string;
  teamSlug?: string;
  status?: string;
  currentMembership?: {
    teamName?: string;
    teamSlug?: string;
    teamLogoUrl?: string;
    role?: string;
    status?: string;
    auctionPrice?: string | null;
    isMarquee?: boolean;
    seasonYear?: number;
  };
  profile?: {
    fullName?: string;
    displayName?: string;
    image?: string;
    role?: string;
    intro?: string;
    summary?: string;
    tagline?: string;
    personalInfo?: Array<{ label: string; value: string }>;
    salaryAuction?: { details?: Array<{ label: string; value: string }>; note?: string };
    career?: Array<{ title: string; paragraphs: string[] }>;
    faqs?: Array<{ question: string; answer: string }>;
  };
}

export interface NplT20MatchRaw {
  id: string;
  legacyId?: number | null;
  year: number;
  matchNumber: string;
  matchType?: string;
  stage?: string;
  playedAt?: string;
  dateLabel?: string;
  timeLabel?: string;
  venueLabel?: string;
  status: string;
  result?: string | null;
  winnerLabel?: string | null;
  participants?: Array<{
    side: string;
    teamName: string;
    logoUrl?: string;
    score?: string;
    runs?: number;
    wickets?: number;
    overs?: string;
    target?: number | null;
  }>;
}

/**
 * Fetch all teams and their detailed information from nplt20league.com
 */
export async function fetchNplT20TeamsData(downloadImages = true): Promise<NplTeam[]> {
  const teamsList = await fetchJson<NplT20TeamRaw[]>("teams");
  if (!Array.isArray(teamsList) || teamsList.length === 0) {
    throw new Error("No teams returned from nplt20league.com");
  }

  // Fetch full detail for each team
  const teamsDetailed = await mapWithConcurrency(teamsList, 4, async (team) => {
    try {
      const detailed = await fetchJson<NplT20TeamRaw>(`teams/${team.slug}`);
      return { ...team, ...detailed };
    } catch {
      return team;
    }
  });

  // Transform into NplTeam and download team logo
  const teams: NplTeam[] = await Promise.all(
    teamsDetailed.map(async (t) => {
      const brand = getFranchiseBrand(t.name);
      let localLogoUrl = t.logoUrl || brand.logoFallback;

      if (downloadImages && t.logoUrl) {
        const downloaded = await downloadTeamLogo(t.slug, t.logoUrl);
        if (downloaded) localLogoUrl = downloaded;
      }

      return {
        name: t.name,
        shortName: t.shortCode || brand.shortName || t.name.slice(0, 3).toUpperCase(),
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        logoUrl: localLogoUrl,
        logoSourceUrl: `${NPLT20_BASE}/teams/${t.slug}/`,
        city: brand.city,
        ownerName: t.owner || brand.ownerName,
        sourceUrl: `${NPLT20_BASE}/teams/${t.slug}/`,
        squadUrl: `${NPLT20_BASE}/teams/${t.slug}/`,
        players: [],
        playerCount: t.roster?.length || 0,
      };
    })
  );

  return teams;
}

/**
 * Fetch all players from nplt20league.com with full profiles
 */
export async function fetchNplT20PlayersData(downloadImages = true): Promise<Map<string, NplPlayer[]>> {
  const rawPlayers = await fetchJson<NplT20PlayerRaw[]>("players");
  if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
    throw new Error("No players returned from nplt20league.com");
  }

  const playersByTeam = new Map<string, NplPlayer[]>();

  // Process and download images
  await mapWithConcurrency(rawPlayers, 6, async (p) => {
    const teamName = p.team || p.currentMembership?.teamName;
    if (!teamName || teamName.toLowerCase() === "no team") return;

    const teamSlug = p.teamSlug || p.currentMembership?.teamSlug || teamName.toLowerCase().replace(/\s+/g, "-");
    const pInfo = p.profile?.personalInfo || [];
    const getField = (lbl: string) => pInfo.find((x) => x.label.toLowerCase() === lbl.toLowerCase())?.value;

    const dobStr = getField("Date of Birth") || getField("DOB");
    let dob: string | null = null;
    if (dobStr) {
      const parsed = Date.parse(dobStr);
      if (!Number.isNaN(parsed)) dob = new Date(parsed).toISOString();
    }

    const nationality = getField("Nationality") || (p.isOverseas ? "Overseas" : "Nepal");
    const batting = getField("Batting Style") || p.battingStyle || "";
    const bowling = getField("Bowling Style") || p.bowlingStyle || "";
    const roleStr = p.role || p.currentMembership?.role || p.profile?.role || getField("Playing Role") || "BATSMAN";

    const isCaptain = roleStr.toLowerCase().includes("captain") || !!p.currentMembership?.isMarquee;
    const isOverseas = p.isOverseas ?? (nationality.toLowerCase() !== "nepal" && nationality.toLowerCase() !== "nepali");

    // Download high-res player photo
    const remoteImage = p.imageUrl || p.profile?.image;
    let localImageUrl = remoteImage || null;
    if (downloadImages && remoteImage) {
      const downloaded = await downloadPlayerImage(teamSlug, p.slug, remoteImage);
      if (downloaded) localImageUrl = downloaded;
    }

    const bioParts = [
      p.profile?.tagline,
      p.profile?.intro,
      p.profile?.summary,
      p.currentMembership?.auctionPrice ? `Auction Price: ${p.currentMembership.auctionPrice}` : null,
      p.profile?.salaryAuction?.note,
    ].filter(Boolean);

    const playerObj: NplPlayer = {
      name: p.name || p.profile?.fullName || p.slug.replace(/-/g, " "),
      sourceUrl: `${NPLT20_BASE}/player/${p.slug}/profile/`,
      registrationUrl: `${NPLT20_BASE}/teams/${teamSlug}/`,
      jerseyNumber: null,
      dateOfBirth: dob,
      role: mapRole(roleStr),
      batting: batting,
      bowling: bowling,
      imageUrl: localImageUrl,
      nationality: nationality,
      isCaptain: isCaptain,
      isOverseas: isOverseas,
    };

    if (!playersByTeam.has(teamName)) {
      playersByTeam.set(teamName, []);
    }
    playersByTeam.get(teamName)!.push(playerObj);
  });

  return playersByTeam;
}

/**
 * Fetch matches/fixtures from nplt20league.com
 */
export async function fetchNplT20MatchesData(year: string = "2026"): Promise<NplFixture[]> {
  try {
    const rawMatches = await fetchJson<NplT20MatchRaw[]>(`matches?season=${year}`);
    if (Array.isArray(rawMatches) && rawMatches.length > 0) {
      return transformMatches(rawMatches, year);
    }
  } catch {
    // try without query
  }

  try {
    const all = await fetchJson<NplT20MatchRaw[]>("matches");
    if (Array.isArray(all)) {
      const filtered = all.filter((m) => String(m.year) === year);
      if (filtered.length > 0) return transformMatches(filtered, year);
    }
  } catch {}

  throw new Error(`No matches found for season ${year} from nplt20league.com`);
}

function transformMatches(rawMatches: NplT20MatchRaw[], year: string): NplFixture[] {
  return rawMatches.map((m, idx) => {
    const team1 = m.participants?.[0]?.teamName || "TBA";
    const team2 = m.participants?.[1]?.teamName || "TBA";
    const homeScore = m.participants?.[0]?.score || null;
    const awayScore = m.participants?.[1]?.score || null;

    let stage = "League";
    const numLower = (m.matchNumber || "").toLowerCase();
    if (numLower.includes("final")) stage = "Final";
    else if (numLower.includes("eliminator")) stage = "Eliminator";
    else if (numLower.includes("qualifier 1")) stage = "Qualifier 1";
    else if (numLower.includes("qualifier 2")) stage = "Qualifier 2";

    let status = "SCHEDULED";
    const sLower = (m.status || "").toLowerCase();
    if (sLower === "completed" || sLower === "result") status = "COMPLETED";
    else if (sLower.includes("live") || sLower.includes("innings")) status = "LIVE";
    else if (sLower.includes("abandon")) status = "ABANDONED";

    const startTime = m.playedAt ? new Date(m.playedAt).toISOString() : new Date().toISOString();

    const ordinal = idx + 1;
    const number = `Season${year === "2026" ? "3" : year === "2025" ? "2" : "1"}-M${ordinal}`;

    return {
      sourceId: m.id || `nplt20-${year}-${ordinal}`,
      number: m.matchNumber || number,
      stage: stage,
      home: team1,
      away: team2,
      homeScore: homeScore,
      awayScore: awayScore,
      startTime: startTime,
      venue: m.venueLabel || "Tribhuvan University Cricket Ground, Kirtipur",
      status: status,
      result: m.result || null,
      sourceUrl: `${NPLT20_BASE}/matches/${year}/`,
    };
  });
}

/**
 * Fetch standings / points table from nplt20league.com
 */
export async function fetchNplT20StandingsData(year: string = "2026"): Promise<NonNullable<NplSeason["standings"]>> {
  try {
    const points = await fetchJson<any[]>(`points?season=${year}`);
    if (Array.isArray(points) && points.length > 0) {
      return points.map((p, idx) => ({
        name: p.team || p.teamName,
        position: p.position ?? idx + 1,
        played: Number(p.matches || p.played || 0),
        won: Number(p.won || 0),
        lost: Number(p.lost || 0),
        tied: Number(p.tied || 0),
        noResult: Number(p.noResult || 0),
        points: Number(p.points || 0),
        netRunRate: Number(p.netRunRate || 0),
      }));
    }
  } catch {
    // Points table might not be generated yet for 2026
  }
  return [];
}

/**
 * Fetch live scores stream/snapshot
 */
export async function fetchNplT20LiveSnapshot(): Promise<any> {
  return fetchJson<any>("live/npl", 15000);
}

/**
 * Converts an NPLT20 live snapshot match into a CricNepalParsedLiveMatch
 * so it can be reconciled into the database with full innings and score continuity.
 */
export function convertNplT20LiveMatchToParsed(liveMatch: any): CricNepalParsedLiveMatch {
  const team1 = liveMatch.team1 || {};
  const team2 = liveMatch.team2 || {};

  const parseScore = (s?: string) => {
    if (!s) return { runs: 0, wickets: 0 };
    const parts = String(s).split("/");
    return {
      runs: parseInt(parts[0], 10) || 0,
      wickets: parts[1] !== undefined ? parseInt(parts[1], 10) || 0 : 0,
    };
  };

  const t1Score = parseScore(team1.score);
  const t1Balls = oversStringToBalls(team1.overs);
  const t2Score = parseScore(team2.score);
  const t2Balls = oversStringToBalls(team2.overs);

  const rawStatus = (liveMatch.status || "").toLowerCase();
  let status: CricNepalParsedLiveMatch["status"] = "SCHEDULED";
  if (rawStatus === "live" || rawStatus === "innings_break" || rawStatus === "interrupted") {
    status = "LIVE";
  } else if (rawStatus === "completed" || rawStatus === "result" || liveMatch.result) {
    status = "COMPLETED";
  } else if (rawStatus === "abandoned" || rawStatus === "cancelled") {
    status = "ABANDONED";
  }

  const hasCommentary = Array.isArray(liveMatch.commentary);
  const commentaryText = hasCommentary ? liveMatch.commentary.map((c: any) => c.text || "").join(" ") : "";
  const isTeam2First =
    t2Score.wickets === 10 ||
    commentaryText.includes("2ND INNINGS") ||
    (t2Balls > 0 && t1Balls > 0 && commentaryText.toLowerCase().includes("chasing")) ||
    (t2Score.runs > 0 && t1Balls <= t2Balls && t2Balls >= 100);

  let innings1Team = team1;
  let innings1Score = t1Score;
  let innings1Balls = t1Balls;
  let innings1Overs = team1.overs || "0.0";

  let innings2Team = team2;
  let innings2Score = t2Score;
  let innings2Balls = t2Balls;
  let innings2Overs = team2.overs || "0.0";

  if (isTeam2First) {
    innings1Team = team2;
    innings1Score = t2Score;
    innings1Balls = t2Balls;
    innings1Overs = team2.overs || "0.0";

    innings2Team = team1;
    innings2Score = t1Score;
    innings2Balls = t1Balls;
    innings2Overs = team1.overs || "0.0";
  }

  const innings: CricNepalParsedLiveMatch["innings"] = [];
  let currentInningsNumber = 1;

  if (innings1Balls > 0 || innings1Score.runs > 0 || innings1Score.wickets > 0) {
    const isInn1Done = innings1Score.wickets === 10 || innings1Balls >= 120 || innings2Balls > 0;
    innings.push({
      inningsNumber: 1,
      battingTeamName: innings1Team.name || "Home",
      bowlingTeamName: innings2Team.name || "Away",
      runs: innings1Score.runs,
      wickets: innings1Score.wickets,
      balls: innings1Balls,
      overs: innings1Overs,
      extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 },
      target: null,
      status: isInn1Done ? "COMPLETED" : "LIVE",
    });
  }

  if (innings2Balls > 0 || innings2Score.runs > 0 || innings2Score.wickets > 0) {
    currentInningsNumber = 2;
    const target = innings1Score.runs > 0 ? innings1Score.runs + 1 : null;
    innings.push({
      inningsNumber: 2,
      battingTeamName: innings2Team.name || "Away",
      bowlingTeamName: innings1Team.name || "Home",
      runs: innings2Score.runs,
      wickets: innings2Score.wickets,
      balls: innings2Balls,
      overs: innings2Overs,
      extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 },
      target,
      status: status === "COMPLETED" ? "COMPLETED" : "LIVE",
    });
  }

  const currentBatters: NonNullable<CricNepalParsedLiveMatch["liveSummary"]>["currentBatters"] = [];
  let currentBowler: NonNullable<CricNepalParsedLiveMatch["liveSummary"]>["currentBowler"] = null;

  if (Array.isArray(liveMatch.batters) && liveMatch.batters.length > 0) {
    for (const b of liveMatch.batters.slice(0, 2)) {
      if (b?.name) {
        currentBatters.push({
          name: String(b.name).trim(),
          runs: Number(b.runs) || 0,
          balls: Number(b.balls) || 0,
          fours: Number(b.fours) || 0,
          sixes: Number(b.sixes) || 0,
          strikeRate: Number(b.strikeRate) || 0,
          isStriker: Boolean(b.isStriker ?? currentBatters.length === 0),
        });
      }
    }
  }
  if (liveMatch.bowler?.name) {
    currentBowler = {
      name: String(liveMatch.bowler.name).trim(),
      overs: String(liveMatch.bowler.overs || "0.0"),
      runs: Number(liveMatch.bowler.runs) || 0,
      wickets: Number(liveMatch.bowler.wickets) || 0,
      economy: Number(liveMatch.bowler.economy) || 0,
    };
  }

  return {
    sourceId: liveMatch.ourMatchId || liveMatch.providerMatchId || "",
    sourceUrl: `${NPLT20_BASE}/matches/2026/`,
    title: liveMatch.title || `${team1.name || "Home"} vs ${team2.name || "Away"}`,
    status,
    venue: liveMatch.venue || "Tribhuvan University Cricket Ground, Kirtipur",
    homeTeam: { name: team1.name || "Home", abbr: team1.short },
    awayTeam: { name: team2.name || "Away", abbr: team2.short },
    currentInningsNumber,
    innings,
    liveSummary: {
      currentBatters,
      currentBowler,
    },
  };
}

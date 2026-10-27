import { load } from "cheerio";
import dns from "node:dns";
import { prisma } from "./prisma";
import { fetchSource, NPL_SOURCE, parseFixtures } from "./npl-source";
import type { Prisma } from "@prisma/client";
import { syncMatchToBroadcastDb } from "./broadcast-state";
import { cleanPlayerDisplayName } from "./onlinekhabar-live";

import { ensureIpv4Dispatcher } from "./fetch-network";
ensureIpv4Dispatcher();

export interface CricNepalParsedLiveMatch {
  sourceId?: string;
  sourceUrl?: string;
  title: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED";
  resultSummary?: string | null;
  venue?: string;
  scheduledStart?: string;
  homeTeam: {
    name: string;
    abbr?: string;
    shortName?: string;
    id?: number;
  };
  awayTeam: {
    name: string;
    abbr?: string;
    shortName?: string;
    id?: number;
  };
  toss?: {
    winnerName: string;
    decision: "BAT" | "BOWL";
    notes?: string;
  } | null;
  currentInningsNumber: number;
  innings: Array<{
    inningsNumber: number;
    battingTeamName: string;
    bowlingTeamName?: string;
    runs: number;
    wickets: number;
    balls: number;
    overs: string;
    extras: {
      total: number;
      wides: number;
      noBalls: number;
      byes: number;
      legByes: number;
      penalties: number;
    };
    target?: number | null;
    status: "LIVE" | "COMPLETED" | "NOT_STARTED";
  }>;
  liveSummary?: {
    currentBatters: Array<{
      name: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      strikeRate: number;
      isStriker: boolean;
    }>;
    currentBowler?: {
      name: string;
      overs: string;
      runs: number;
      wickets: number;
      economy: number;
      maidens?: number;
    } | null;
    partnership?: {
      runs: number;
      balls: number;
    } | null;
    crr?: number;
  };
  playerPerformances?: Array<{
    name: string;
    teamName?: string;
    innings: number;
    type: "BATSMAN" | "BOWLER";
    batting?: {
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      strikeRate: number;
      dismissal?: string;
      isNotOut: boolean;
    };
    bowling?: {
      overs: string;
      maidens: number;
      runs: number;
      wickets: number;
      economy: number;
    };
  }>;
  fowByInnings?: Record<number, Array<[string, string, string]>>;
  oversByInnings?: Record<number, Array<{ overNo: string; score: string; balls: string[] }>>;
  recentDeliveries?: string[];
}

/**
 * Converts overs string (e.g. "9.1" or 9.1) to integer balls (55).
 */
export function oversStringToBalls(overs: string | number | undefined): number {
  if (overs === undefined || overs === null || overs === "") return 0;
  const str = String(overs).trim();
  const parts = str.split(".");
  const overNum = parseInt(parts[0], 10) || 0;
  const ballNum = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
  return overNum * 6 + ballNum;
}

/**
 * Parses CricNepal match HTML containing Next.js RSC flight stream or DOM elements.
 */
export function parseCricNepalMatchHtml(html: string, sourceUrl = ""): CricNepalParsedLiveMatch | null {
  const $ = load(html);
  let flight = "";
  $('script:not([src])').each((_, el) => {
    const text = $(el).text();
    const prefix = "self.__next_f.push(";
    if (text.startsWith(prefix)) {
      try {
        const entry = JSON.parse(text.slice(prefix.length, text.lastIndexOf(")")));
        if (typeof entry[1] === "string") flight += entry[1];
      } catch {
        // Skip invalid chunks
      }
    }
  });

  let stateRoot: any = null;
  const stateIdx = flight.indexOf('"state":{"innings_number"');
  if (stateIdx !== -1) {
    for (let i = stateIdx; i >= 0; i--) {
      if (flight[i] === "{" && (i === 0 || flight[i - 1] === ":" || flight[i - 1] === "," || flight[i - 1] === "[")) {
        let depth = 0;
        let end = -1;
        for (let j = i; j < flight.length; j++) {
          if (flight[j] === "{") depth++;
          else if (flight[j] === "}") {
            depth--;
            if (depth === 0) {
              end = j + 1;
              break;
            }
          }
        }
        if (end > stateIdx + 500) {
          try {
            const parsed = JSON.parse(flight.slice(i, end));
            if (parsed.match || parsed.state || parsed.innings) {
              stateRoot = parsed;
              break;
            }
          } catch {
            // keep searching
          }
        }
      }
    }
  }

  let matchObj = stateRoot?.match;
  if (!matchObj) {
    const mIdx = flight.indexOf('"live_match_id"');
    if (mIdx !== -1) {
      for (let i = mIdx; i >= 0; i--) {
        if (flight[i] === "{" && (i === 0 || flight[i - 1] === ":" || flight[i - 1] === "," || flight[i - 1] === "[")) {
          let depth = 0;
          let end = -1;
          for (let j = i; j < flight.length; j++) {
            if (flight[j] === "{") depth++;
            else if (flight[j] === "}") {
              depth--;
              if (depth === 0) {
                end = j + 1;
                break;
              }
            }
          }
          if (end > mIdx) {
            try {
              const parsed = JSON.parse(flight.slice(i, end));
              if (parsed.live_match_id) {
                matchObj = parsed;
                break;
              }
            } catch {
              // keep searching
            }
          }
        }
      }
    }
  }

  // Extract from JSON or DOM
  const rawStatus = (matchObj?.status || matchObj?.lifecycle_state || "").toLowerCase();
  let status: "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED" = "SCHEDULED";
  if (rawStatus === "live" || rawStatus === "innings_break" || rawStatus === "interrupted") status = "LIVE";
  else if (rawStatus === "completed" || rawStatus === "result") status = "COMPLETED";
  else if (rawStatus === "abandoned" || rawStatus === "cancelled") status = "ABANDONED";
  else {
    // Check DOM badge
    const domLabel = $(".cn-label").text().toLowerCase();
    if (domLabel.includes("live")) status = "LIVE";
  }

  const teamA = matchObj?.team_a || {};
  const teamB = matchObj?.team_b || {};
  const title = matchObj?.title || `${teamA.name || "Home"} vs ${teamB.name || "Away"}`;

  // Toss details
  let toss: CricNepalParsedLiveMatch["toss"] = null;
  if (matchObj?.toss?.winner?.name) {
    const dec = (matchObj.toss.decision || "").toLowerCase();
    toss = {
      winnerName: matchObj.toss.winner.name,
      decision: dec === "bat" ? "BAT" : "BOWL",
      notes: `${matchObj.toss.winner.abbr || matchObj.toss.winner.name} won the toss, chose to ${dec === "bat" ? "bat" : "bowl"}`,
    };
  } else {
    // Parse from DOM
    const bodyText = $("main").text();
    const tossMatch = bodyText.match(/([A-Z]{3}|[A-Za-z\s]+)\s+won the toss,\s+chose to\s+(bat|bowl|field)/i);
    if (tossMatch) {
      const winnerStr = tossMatch[1].trim();
      const decStr = tossMatch[2].toLowerCase();
      toss = {
        winnerName: winnerStr,
        decision: decStr === "bat" ? "BAT" : "BOWL",
        notes: `${winnerStr} won the toss, chose to ${decStr}`,
      };
    }
  }

  // Innings list
  const innings: CricNepalParsedLiveMatch["innings"] = [];
  const rawInnings = stateRoot?.innings || [];

  if (Array.isArray(rawInnings) && rawInnings.length > 0) {
    for (const inn of rawInnings) {
      const innScore = inn.score || {};
      const innExtras = inn.extras || {};
      const runs = typeof innScore.runs === "number" ? innScore.runs : 0;
      const wickets = typeof innScore.wickets === "number" ? innScore.wickets : 0;
      const overs = innScore.overs ? String(innScore.overs) : "0.0";
      const balls = typeof innScore.legal_balls === "number" ? innScore.legal_balls : oversStringToBalls(overs);
      const innStatus = inn.status === "completed" ? "COMPLETED" : inn.status === "live" ? "LIVE" : "NOT_STARTED";

      innings.push({
        inningsNumber: inn.innings_number || innings.length + 1,
        battingTeamName: inn.batting_team?.name || "",
        bowlingTeamName: inn.bowling_team?.name || "",
        runs,
        wickets,
        balls,
        overs,
        extras: {
          total: Number(innExtras.total) || 0,
          wides: Number(innExtras.wides) || 0,
          noBalls: Number(innExtras.no_balls) || 0,
          byes: Number(innExtras.byes) || 0,
          legByes: Number(innExtras.leg_byes) || 0,
          penalties: Number(innExtras.penalties) || 0,
        },
        target: inn.target_runs ? Number(inn.target_runs) : null,
        status: innStatus,
      });
    }
  } else if (stateRoot?.state?.score) {
    // Single state fallback
    const st = stateRoot.state;
    const overs = st.score?.overs ? String(st.score.overs) : "0.0";
    innings.push({
      inningsNumber: st.innings_number || 1,
      battingTeamName: st.batting_team?.name || teamB.name || "",
      bowlingTeamName: st.bowling_team?.name || teamA.name || "",
      runs: st.score?.runs || 0,
      wickets: st.score?.wickets || 0,
      balls: st.score?.legal_balls ?? oversStringToBalls(overs),
      overs,
      extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 },
      target: st.target_runs || null,
      status: "LIVE",
    });
  }

  const currentInningsNumber = Number(
    matchObj?.current_innings_number || stateRoot?.state?.innings_number || innings[innings.length - 1]?.inningsNumber || 1
  );

  // Full scorecard, FOW, Overs, and Live Summary from stateRoot.live_summary
  let liveSummary: CricNepalParsedLiveMatch["liveSummary"] = undefined;
  const playerPerformances: NonNullable<CricNepalParsedLiveMatch["playerPerformances"]> = [];
  const fowByInnings: NonNullable<CricNepalParsedLiveMatch["fowByInnings"]> = {};
  const oversByInnings: NonNullable<CricNepalParsedLiveMatch["oversByInnings"]> = {};
  let recentDeliveries: string[] = [];

  if (stateRoot?.live_summary) {
    const ls = stateRoot.live_summary;

    // 1. Batting cards by innings
    const battingByInnings: Record<string, any[]> =
      ls.batting_cards_by_innings && typeof ls.batting_cards_by_innings === "object" && Object.keys(ls.batting_cards_by_innings).length > 0
        ? ls.batting_cards_by_innings
        : Array.isArray(ls.batting_card) && ls.batting_card.length > 0
          ? { [String(currentInningsNumber)]: ls.batting_card }
          : {};

    for (const [innKey, batters] of Object.entries(battingByInnings)) {
      const innNum = Number(innKey) || 1;
      if (!Array.isArray(batters)) continue;
      const innInfo = innings.find((i) => i.inningsNumber === innNum);
      for (const b of batters) {
        const name = cleanPlayerDisplayName(b.name || b.player?.name || "");
        if (!name) continue;
        const runs = Number(b.runs) || 0;
        const balls = Number(b.balls) || 0;
        const fours = Number(b.fours) || 0;
        const sixes = Number(b.sixes) || 0;
        const dismissalDetail = String(b.dismissal_detail || "").trim();
        const statusStr = String(b.status || "").trim();
        const isStriker = !!b.is_striker;
        const isNonStriker = !!b.is_non_striker;
        const hasBatted =
          balls > 0 ||
          runs > 0 ||
          isStriker ||
          isNonStriker ||
          !!dismissalDetail ||
          /not\s*out|batting|retired|out|lbw|run\s*out|st\s|c\s|b\s/i.test(statusStr);
        if (!hasBatted) continue;

        const isNotOut = !dismissalDetail && (/not\s*out|batting/i.test(statusStr) || isStriker || isNonStriker);
        const strikeRate =
          Number(b.strike_rate) || (balls > 0 ? Number(((runs / balls) * 100).toFixed(2)) : 0);

        playerPerformances.push({
          name,
          teamName: innInfo?.battingTeamName,
          innings: innNum,
          type: "BATSMAN",
          batting: {
            runs,
            balls,
            fours,
            sixes,
            strikeRate,
            dismissal: dismissalDetail || (isNotOut ? "not out" : statusStr || "out"),
            isNotOut,
          },
        });
      }
    }

    // 2. Bowling cards by innings
    const bowlingByInnings: Record<string, any[]> =
      ls.bowling_cards_by_innings && typeof ls.bowling_cards_by_innings === "object" && Object.keys(ls.bowling_cards_by_innings).length > 0
        ? ls.bowling_cards_by_innings
        : Array.isArray(ls.bowling_card) && ls.bowling_card.length > 0
          ? { [String(currentInningsNumber)]: ls.bowling_card }
          : {};

    for (const [innKey, bowlers] of Object.entries(bowlingByInnings)) {
      const innNum = Number(innKey) || 1;
      if (!Array.isArray(bowlers)) continue;
      const innInfo = innings.find((i) => i.inningsNumber === innNum);
      for (const bw of bowlers) {
        const name = cleanPlayerDisplayName(bw.name || bw.player?.name || "");
        if (!name) continue;
        const overs = bw.overs !== undefined && bw.overs !== null ? String(bw.overs) : "0.0";
        const balls = Number(bw.balls) || oversStringToBalls(overs);
        const runs = Number(bw.runs) || 0;
        const wickets = Number(bw.wickets) || 0;
        const maidens = Number(bw.maidens) || 0;
        if (balls === 0 && runs === 0 && wickets === 0 && !bw.is_current) continue;
        const economy =
          Number(bw.economy) || (balls > 0 ? Number(((runs / balls) * 6).toFixed(2)) : 0);

        playerPerformances.push({
          name,
          teamName: innInfo?.bowlingTeamName,
          innings: innNum,
          type: "BOWLER",
          bowling: {
            overs,
            maidens,
            runs,
            wickets,
            economy,
          },
        });
      }
    }

    // 3. Timeline overs & Fall of wickets by innings
    const timelineByInnings: Record<string, any[]> =
      ls.timeline_overs_by_innings && typeof ls.timeline_overs_by_innings === "object" && Object.keys(ls.timeline_overs_by_innings).length > 0
        ? ls.timeline_overs_by_innings
        : Array.isArray(ls.timeline_overs) && ls.timeline_overs.length > 0
          ? { [String(currentInningsNumber)]: ls.timeline_overs }
          : {};

    const normalizeCnToken = (tok: any): string => {
      const raw = String(tok ?? "").trim();
      if (!raw) return ".";
      const lower = raw.toLowerCase();
      if (lower === "w") return "W";
      if (/^\d*w$/.test(lower) || /^\d*wd$/.test(lower)) return `${lower.replace(/wd?$/, "") || "1"}WD`;
      if (/^\d*nb$/.test(lower)) return `${lower.slice(0, -2) || "1"}NB`;
      if (/^\d*lb$/.test(lower)) return `${lower.slice(0, -2) || "1"}LB`;
      if (/^\d*b$/.test(lower)) return `${lower.slice(0, -1) || "1"}B`;
      return raw.toUpperCase();
    };

    for (const [innKey, rawOvers] of Object.entries(timelineByInnings)) {
      const innNum = Number(innKey) || 1;
      if (!Array.isArray(rawOvers)) continue;

      const sortedOvers = [...rawOvers].sort((a, b) => {
        const na = Number(a.display_over) || (typeof a.over_number === "number" ? a.over_number + 1 : 0);
        const nb = Number(b.display_over) || (typeof b.over_number === "number" ? b.over_number + 1 : 0);
        return na - nb;
      });

      oversByInnings[innNum] = sortedOvers.map((ov) => {
        const overNum = Number(ov.display_over) || (typeof ov.over_number === "number" ? ov.over_number + 1 : 1);
        const balls = Array.isArray(ov.tokens)
          ? ov.tokens.map(normalizeCnToken)
          : [];
        return {
          overNo: `Ov ${overNum}`,
          score: `${Number(ov.runs) || 0} runs`,
          balls,
        };
      });

      const wicketCards: any[] = [];
      for (const ov of sortedOvers) {
        if (Array.isArray(ov.summary_cards)) {
          for (const sc of ov.summary_cards) {
            if (sc && sc.kind === "wicket") {
              wicketCards.push(sc);
            }
          }
        }
      }
      if (wicketCards.length > 0) {
        wicketCards.sort((a, b) => (Number(a.wicket_number) || 0) - (Number(b.wicket_number) || 0));
        fowByInnings[innNum] = wicketCards.map((w) => [
          `${w.fow_runs ?? 0}/${w.wicket_number ?? 1}`,
          cleanPlayerDisplayName(w.title || w.players?.[0]?.name || "Batter"),
          String(w.display_ball || "0.0"),
        ]);
      }
    }

    if (!fowByInnings[currentInningsNumber]?.length && Array.isArray(ls.fall_of_wickets) && ls.fall_of_wickets.length > 0) {
      fowByInnings[currentInningsNumber] = ls.fall_of_wickets.map((w: any) => [
        String(w.score?.label || `${w.score?.runs ?? 0}/${w.score?.wickets ?? 1}`),
        cleanPlayerDisplayName(w.player?.name || "Batter"),
        String(w.display_ball || "0.0"),
      ]);
    }

    const activeInningsOvers = oversByInnings[currentInningsNumber] || [];
    if (activeInningsOvers.length > 0) {
      recentDeliveries = activeInningsOvers[activeInningsOvers.length - 1].balls;
    } else if (Array.isArray(ls.current_over?.tokens)) {
      recentDeliveries = ls.current_over.tokens.map(normalizeCnToken);
    }

    // 4. Current batters and bowler (with fallback to active innings cards when completed)
    let currentBatters = Array.isArray(ls.current_batters)
      ? ls.current_batters
          .map((b: any) => ({
            name: cleanPlayerDisplayName(b.name || ""),
            runs: Number(b.runs) || 0,
            balls: Number(b.balls) || 0,
            fours: Number(b.fours) || 0,
            sixes: Number(b.sixes) || 0,
            strikeRate: Number(b.strike_rate) || 0,
            isStriker: !!b.is_striker,
          }))
          .filter((b: any) => !!b.name)
      : [];

    if (currentBatters.length === 0) {
      const activeBatCard = battingByInnings[String(currentInningsNumber)] || [];
      if (Array.isArray(activeBatCard) && activeBatCard.length > 0) {
        const notOut = activeBatCard.filter(
          (b: any) => !b.dismissal_detail && (/not\s*out|batting/i.test(String(b.status || "")) || b.is_striker || b.is_non_striker)
        );
        const dismissed = activeBatCard.filter((b: any) => !notOut.includes(b));
        const chosen = [...notOut, ...dismissed.slice(-2)].slice(0, 2);
        currentBatters = chosen.map((b: any, idx: number) => ({
          name: cleanPlayerDisplayName(b.name || ""),
          runs: Number(b.runs) || 0,
          balls: Number(b.balls) || 0,
          fours: Number(b.fours) || 0,
          sixes: Number(b.sixes) || 0,
          strikeRate: Number(b.strike_rate) || 0,
          isStriker: idx === 0,
        }));
      }
    }

    let currentBowler = ls.current_bowler?.name
      ? {
          name: cleanPlayerDisplayName(ls.current_bowler.name || ""),
          overs: ls.current_bowler.overs ? String(ls.current_bowler.overs) : "0.0",
          runs: Number(ls.current_bowler.runs) || 0,
          wickets: Number(ls.current_bowler.wickets) || 0,
          economy: Number(ls.current_bowler.economy) || 0,
          maidens: Number(ls.current_bowler.maidens) || 0,
        }
      : null;

    if (!currentBowler) {
      const activeBowlCard = bowlingByInnings[String(currentInningsNumber)] || [];
      const activeTimeline = timelineByInnings[String(currentInningsNumber)] || [];
      const latestOverBowlerName = cleanPlayerDisplayName(activeTimeline[0]?.bowler?.name || "");
      const matchedBowler =
        (latestOverBowlerName &&
          Array.isArray(activeBowlCard) &&
          activeBowlCard.find((bw: any) => cleanPlayerDisplayName(bw.name || "") === latestOverBowlerName)) ||
        (Array.isArray(activeBowlCard) ? activeBowlCard[activeBowlCard.length - 1] : null);
      if (matchedBowler?.name) {
        currentBowler = {
          name: cleanPlayerDisplayName(matchedBowler.name),
          overs: matchedBowler.overs ? String(matchedBowler.overs) : "0.0",
          runs: Number(matchedBowler.runs) || 0,
          wickets: Number(matchedBowler.wickets) || 0,
          economy: Number(matchedBowler.economy) || 0,
          maidens: Number(matchedBowler.maidens) || 0,
        };
      }
    }

    liveSummary = {
      currentBatters,
      currentBowler,
      partnership: ls.partnership
        ? {
            runs: Number(ls.partnership.runs) || 0,
            balls: Number(ls.partnership.balls) || 0,
          }
        : null,
      crr: Number(stateRoot.state?.current_run_rate) || undefined,
    };
  }

  return {
    sourceId: String(matchObj?.wp_match_post_id || matchObj?.live_match_id || ""),
    sourceUrl,
    title,
    status,
    resultSummary: matchObj?.result_summary || matchObj?.footer_text || null,
    venue: matchObj?.venue?.name || undefined,
    scheduledStart: matchObj?.scheduled_start_gmt || undefined,
    homeTeam: {
      name: teamA.name || "Home",
      abbr: teamA.abbr,
      shortName: teamA.short_name,
      id: teamA.id,
    },
    awayTeam: {
      name: teamB.name || "Away",
      abbr: teamB.abbr,
      shortName: teamB.short_name,
      id: teamB.id,
    },
    toss,
    currentInningsNumber,
    innings,
    liveSummary,
    playerPerformances: playerPerformances.length > 0 ? playerPerformances : undefined,
    fowByInnings: Object.keys(fowByInnings).length > 0 ? fowByInnings : undefined,
    oversByInnings: Object.keys(oversByInnings).length > 0 ? oversByInnings : undefined,
    recentDeliveries: recentDeliveries.length > 0 ? recentDeliveries : undefined,
  };
}

interface FailureBackoff {
  at: number;
  error: string;
}

const urlFailureBackoffs = new Map<string, FailureBackoff>();
const liveMatchCache = new Map<string, { at: number; data: CricNepalParsedLiveMatch }>();
const BACKOFF_COOLDOWN_MS = 30000; // 30s cooldown before retrying a failed external URL
const CACHE_TTL_MS = 3000; // 3s reuse cache for rapid polling

/**
 * Fetches and parses a CricNepal live match from the given URL.
 * Includes circuit-breaker backoff and short-term cache to prevent timeout loops.
 */
export async function fetchCricNepalLiveMatch(matchUrl: string): Promise<CricNepalParsedLiveMatch | null> {
  let cleanUrl = matchUrl.trim();
  try {
    const u = new URL(cleanUrl);
    u.protocol = "https:";
    cleanUrl = u.href;
  } catch {
    return null;
  }

  // Check short-term cache to avoid rapid duplicate fetches
  const cached = liveMatchCache.get(cleanUrl);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  // Check circuit breaker / failure backoff: if recently failed, don't hammer external host
  const failure = urlFailureBackoffs.get(cleanUrl);
  if (failure && Date.now() - failure.at < BACKOFF_COOLDOWN_MS) {
    return cached?.data || null;
  }

  try {
    const response = await fetch(cleanUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${cleanUrl}`);
    }
    const html = await response.text();
    const parsed = parseCricNepalMatchHtml(html, cleanUrl);
    if (parsed) {
      urlFailureBackoffs.delete(cleanUrl);
      liveMatchCache.set(cleanUrl, { at: Date.now(), data: parsed });
    }
    return parsed;
  } catch (err) {
    const errorMsg = (err as any)?.cause?.message || (err instanceof Error ? err.message : String(err));
    urlFailureBackoffs.set(cleanUrl, { at: Date.now(), error: errorMsg });
    if (cached?.data) {
      return cached.data;
    }
    throw err;
  }
}

let tournamentFixtureCache: { at: number; urlsByOrdinal: Map<number, string>; urlsByTeams: Map<string, string> } | null = null;
const TOURNAMENT_CACHE_TTL_MS = 60000;

/**
 * Builds deterministic CricNepal match URL candidates for any current or upcoming match
 * without any hardcoded match URLs.
 */
export function getCricNepalUrlsForMatch(params: {
  matchNumber?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  title?: string | null;
  stage?: string | null;
  notes?: string | null;
}): string[] {
  const candidates: string[] = [];
  const matchNum = (params.matchNumber || "").trim();
  const ordinal = Number(matchNum.match(/(\d+)$/)?.[1]);

  if (params.notes) {
    const noteMatch = params.notes.match(/Source:\s*(https?:\/\/[^\s]+cricnepal\.com\/match\/[^\s\r\n]+)/i);
    if (noteMatch) {
      const noteUrl = noteMatch[1].trim();
      if (!ordinal || noteUrl.includes(`-match-${ordinal}-`)) {
        candidates.push(noteUrl);
      }
    }
  }

  let homeName = (params.homeTeamName || "").trim();
  let awayName = (params.awayTeamName || "").trim();
  if ((!homeName || !awayName) && params.title && /\svs\s/i.test(params.title)) {
    const parts = params.title.split(/\svs\s/i);
    if (!homeName) homeName = (parts[0] || "").trim();
    if (!awayName) awayName = (parts[1] || "").trim();
  }

  const slugify = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  if (homeName && awayName) {
    const homeSlug = slugify(homeName);
    const awaySlug = slugify(awayName);
    if (homeSlug && awaySlug && homeSlug !== "tba" && awaySlug !== "tba") {
      if (ordinal >= 1) {
        candidates.push(
          `https://www.cricnepal.com/match/${homeSlug}-vs-${awaySlug}-match-${ordinal}-nepal-premier-league-2026`,
          `https://www.cricnepal.com/match/${awaySlug}-vs-${homeSlug}-match-${ordinal}-nepal-premier-league-2026`
        );
      }
      if (params.stage && !/^league$/i.test(params.stage)) {
        const stageSlug = slugify(params.stage);
        if (stageSlug) {
          candidates.push(
            `https://www.cricnepal.com/match/${homeSlug}-vs-${awaySlug}-${stageSlug}-nepal-premier-league-2026`,
            `https://www.cricnepal.com/match/${awaySlug}-vs-${homeSlug}-${stageSlug}-nepal-premier-league-2026`
          );
        }
      }
    }
  }

  return [...new Set(candidates)];
}

/**
 * Dynamically discovers a match's CricNepal URL from the CricNepal tournament fixture feed
 * if direct slug candidates do not resolve.
 */
export async function discoverCricNepalMatchUrl(params: {
  matchNumber?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  title?: string | null;
}): Promise<string | null> {
  try {
    if (!tournamentFixtureCache || Date.now() - tournamentFixtureCache.at > TOURNAMENT_CACHE_TTL_MS) {
      const html = await fetchSource(NPL_SOURCE);
      const fixtures = parseFixtures(html, NPL_SOURCE);
      const urlsByOrdinal = new Map<number, string>();
      const urlsByTeams = new Map<string, string>();
      fixtures.forEach((f, idx) => {
        if (!f.sourceUrl) return;
        const ord = Number(f.number.match(/(\d+)$/)?.[1]) || idx + 1;
        urlsByOrdinal.set(ord, f.sourceUrl);
        if (f.home && f.away) {
          urlsByTeams.set(`${f.home.toLowerCase()}|${f.away.toLowerCase()}`, f.sourceUrl);
        }
      });
      tournamentFixtureCache = { at: Date.now(), urlsByOrdinal, urlsByTeams };
    }

    const matchNum = (params.matchNumber || "").trim();
    const ordinal = Number(matchNum.match(/(\d+)$/)?.[1]);
    if (ordinal && tournamentFixtureCache.urlsByOrdinal.has(ordinal)) {
      return tournamentFixtureCache.urlsByOrdinal.get(ordinal) || null;
    }

    const home = (params.homeTeamName || "").trim().toLowerCase();
    const away = (params.awayTeamName || "").trim().toLowerCase();
    if (home && away) {
      return (
        tournamentFixtureCache.urlsByTeams.get(`${home}|${away}`) ||
        tournamentFixtureCache.urlsByTeams.get(`${away}|${home}`) ||
        null
      );
    }
  } catch {
    // discovery optional
  }
  return null;
}

/**
 * Fetches and reconciles live match data using CricNepal's authoritative CN Engine scorecard
 * as the primary source of truth (with automatic fallback/reconciliation against OnlineKhabar).
 */
export async function reconcileWithCricNepalScorecard(
  primaryData: CricNepalParsedLiveMatch | null,
  cnCandidateUrls: string[],
  discoveryParams?: {
    matchNumber?: string | null;
    homeTeamName?: string | null;
    awayTeamName?: string | null;
    title?: string | null;
  }
): Promise<{ data: CricNepalParsedLiveMatch | null; usedUrl?: string }> {
  let cnData: CricNepalParsedLiveMatch | null = null;
  let cnUsedUrl: string | undefined;

  const urlsToTry = [...cnCandidateUrls];
  for (const url of urlsToTry) {
    if (!url) continue;
    try {
      const fetched = await fetchCricNepalLiveMatch(url);
      if (fetched && (fetched.innings.some((i) => i.balls > 0 || i.runs > 0 || i.wickets > 0) || !primaryData)) {
        cnData = fetched;
        cnUsedUrl = url;
        break;
      }
    } catch {
      // try next candidate
    }
  }

  if (!cnData && discoveryParams) {
    const discoveredUrl = await discoverCricNepalMatchUrl(discoveryParams);
    if (discoveredUrl && !urlsToTry.includes(discoveredUrl)) {
      try {
        const fetched = await fetchCricNepalLiveMatch(discoveredUrl);
        if (fetched && (fetched.innings.some((i) => i.balls > 0 || i.runs > 0 || i.wickets > 0) || !primaryData)) {
          cnData = fetched;
          cnUsedUrl = discoveredUrl;
        }
      } catch {
        // ignore
      }
    }
  }

  if (!cnData) {
    return { data: primaryData };
  }
  if (!primaryData) {
    return { data: cnData, usedUrl: cnUsedUrl };
  }

  const merged: CricNepalParsedLiveMatch = {
    ...primaryData,
    innings: [...primaryData.innings],
    playerPerformances: [...(primaryData.playerPerformances || [])],
    fowByInnings: { ...(primaryData.fowByInnings || {}) },
    oversByInnings: { ...(primaryData.oversByInnings || {}) },
  };

  for (const cnInn of cnData.innings) {
    const idx = merged.innings.findIndex((i) => i.inningsNumber === cnInn.inningsNumber);
    const okInn = idx >= 0 ? merged.innings[idx] : null;
    const cnIsAuthoritative =
      !okInn || cnInn.balls >= okInn.balls || cnInn.status === "COMPLETED";

    if (cnIsAuthoritative) {
      if (idx >= 0) {
        merged.innings[idx] = cnInn;
      } else {
        merged.innings.push(cnInn);
      }

      const cnPerfs = (cnData.playerPerformances || []).filter(
        (p) => p.innings === cnInn.inningsNumber
      );
      if (cnPerfs.length > 0) {
        merged.playerPerformances = [
          ...(merged.playerPerformances || []).filter((p) => p.innings !== cnInn.inningsNumber),
          ...cnPerfs,
        ];
      }

      if (cnData.fowByInnings?.[cnInn.inningsNumber]?.length) {
        merged.fowByInnings![cnInn.inningsNumber] = cnData.fowByInnings[cnInn.inningsNumber];
      }
      if (cnData.oversByInnings?.[cnInn.inningsNumber]?.length) {
        merged.oversByInnings![cnInn.inningsNumber] = cnData.oversByInnings[cnInn.inningsNumber];
      }
    }
  }

  if (cnData.status === "COMPLETED" || primaryData.status !== "LIVE") {
    merged.status = cnData.status;
    if (cnData.resultSummary) {
      merged.resultSummary = cnData.resultSummary;
    }
  }
  if (cnData.toss && !merged.toss) {
    merged.toss = cnData.toss;
  }

  const activeInnNum = merged.currentInningsNumber || cnData.currentInningsNumber || 1;
  const cnActiveInn = cnData.innings.find((i) => i.inningsNumber === activeInnNum);
  const okActiveInn = primaryData.innings.find((i) => i.inningsNumber === activeInnNum);
  if (
    cnActiveInn &&
    (!okActiveInn || cnActiveInn.balls >= okActiveInn.balls || cnActiveInn.status === "COMPLETED")
  ) {
    if (cnData.liveSummary?.currentBatters?.length) {
      merged.liveSummary = cnData.liveSummary;
    }
    if (cnData.recentDeliveries?.length) {
      merged.recentDeliveries = cnData.recentDeliveries;
    }
  }

  return { data: merged, usedUrl: cnUsedUrl };
}

/**
 * Reconciles parsed CricNepal match data into the local database for a given match.
 *
 * CRITICAL REQUIREMENTS:
 * 1. DO NOT touch team logos, player images, franchise logos, or player profiles.
 * 2. Reconcile Toss, Innings, and player stats safely.
 * 3. Continuity with manual scoring:
 *    - If operator scored manually (higher ball count or recent ScoreEvents),
 *      do not decrease balls or wipe manual score events!
 *    - Update toss if missing.
 *    - Update extras, CRR, and missing innings stats.
 */
export async function applyCricNepalMatchToDb(
  matchId: number,
  data: CricNepalParsedLiveMatch,
  options: { forceOverwrite?: boolean; syncBroadcast?: boolean; forceBroadcast?: boolean } = {}
) {
  let didSyncBroadcast = false;
  const updated = await prisma.$transaction(
    async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: { include: { players: true } },
          awayTeam: { include: { players: true } },
          toss: true,
          innings: true,
          scoreEvents: { take: 5, orderBy: { createdAt: "desc" } },
        },
      });

      if (!match) throw new Error(`Match ${matchId} not found`);

      // 1. Update Match Header Status & Result
      const matchUpdateData: Prisma.MatchUpdateInput = {
        status: data.status,
      };

      if (data.resultSummary) {
        matchUpdateData.resultText = data.resultSummary;
      }
      if (data.venue && !match.venue) {
        matchUpdateData.venue = data.venue;
      }

      // Find winner team if completed
      if (data.status === "COMPLETED" && data.resultSummary) {
        if (data.resultSummary.toLowerCase().includes(match.homeTeam.name.toLowerCase())) {
          matchUpdateData.winnerTeam = { connect: { id: match.homeTeamId } };
        } else if (data.resultSummary.toLowerCase().includes(match.awayTeam.name.toLowerCase())) {
          matchUpdateData.winnerTeam = { connect: { id: match.awayTeamId } };
        }
      }

      await tx.match.update({
        where: { id: match.id },
        data: matchUpdateData,
      });

      // Clean up any corrupted player records (e.g. "Players 6756e7f8a2d3ajimmy", Devanagari names, or duplicate alias typos)
      const allTeamPlayers = [...match.homeTeam.players, ...match.awayTeam.players];
      const corruptedPlayers = allTeamPlayers.filter((p) => {
        if (/^Players\s+[0-9a-f]{6,}/i.test(p.displayName) || /[^\x00-\x7F]/.test(p.displayName)) {
          return true;
        }
        const canonical = cleanPlayerDisplayName(p.displayName);
        if (canonical && canonical.toLowerCase() !== p.displayName.trim().toLowerCase()) {
          const hasCanonicalOnTeam = allTeamPlayers.some(
            (other) =>
              other.id !== p.id &&
              other.teamId === p.teamId &&
              other.displayName.trim().toLowerCase() === canonical.toLowerCase()
          );
          if (hasCanonicalOnTeam) return true;
        }
        return false;
      });
      if (corruptedPlayers.length > 0) {
        const corruptedIds = corruptedPlayers.map((p) => p.id);
        await tx.playerMatchStat.deleteMany({ where: { playerId: { in: corruptedIds } } });
        await tx.player.deleteMany({ where: { id: { in: corruptedIds } } }).catch(() => {});
      }

      // An authoritative refresh or full scorecard sync must not retain player rows
      // imported from a previously selected/source-mismatched match or default manual selection.
      if (options.forceOverwrite || (Array.isArray(data.playerPerformances) && data.playerPerformances.length > 0)) {
        await tx.playerMatchStat.deleteMany({ where: { matchId: match.id } });
      }

      // 2. Reconcile Toss
      if (data.toss) {
        // Resolve toss winner team ID
        const tossWinnerName = data.toss.winnerName.toLowerCase();
        let tossWinnerId: number | null = null;

        if (
          match.homeTeam.name.toLowerCase() === tossWinnerName ||
          match.homeTeam.shortName.toLowerCase() === tossWinnerName ||
          tossWinnerName.includes(match.homeTeam.shortName.toLowerCase()) ||
          match.homeTeam.name.toLowerCase().includes(tossWinnerName)
        ) {
          tossWinnerId = match.homeTeamId;
        } else if (
          match.awayTeam.name.toLowerCase() === tossWinnerName ||
          match.awayTeam.shortName.toLowerCase() === tossWinnerName ||
          tossWinnerName.includes(match.awayTeam.shortName.toLowerCase()) ||
          match.awayTeam.name.toLowerCase().includes(tossWinnerName)
        ) {
          tossWinnerId = match.awayTeamId;
        }

        if (tossWinnerId) {
          await tx.toss.upsert({
            where: { matchId: match.id },
            create: {
              matchId: match.id,
              winnerTeamId: tossWinnerId,
              decision: data.toss.decision,
              notes: data.toss.notes || `${data.toss.winnerName} won the toss, chose to ${data.toss.decision.toLowerCase()}`,
            },
            update: {
              winnerTeamId: tossWinnerId,
              decision: data.toss.decision,
              notes: data.toss.notes || undefined,
            },
          });
        }
      }

      // 3. Reconcile Innings
      const hasStartedInnings2 = data.innings.some(
        (i) => i.inningsNumber === 2 && (i.balls > 0 || i.runs > 0 || i.wickets > 0)
      );
      if (data.currentInningsNumber === 1 && !hasStartedInnings2) {
        await tx.matchInnings.deleteMany({
          where: {
            matchId: match.id,
            inningsNumber: 2,
            runs: 0,
            balls: 0,
            wickets: 0,
          },
        });
      }

      let inn1BattingTeamId: number | null = null;
      for (const inn of data.innings) {
        if (inn.inningsNumber === 2 && inn.status === "NOT_STARTED" && inn.balls === 0 && inn.runs === 0 && inn.wickets === 0) {
          continue;
        }
        // Find batting team ID
        let battingTeamId = match.homeTeamId;
        const bName = (inn.battingTeamName || "").toLowerCase();
        if (
          match.awayTeam.name.toLowerCase() === bName ||
          match.awayTeam.shortName.toLowerCase() === bName ||
          match.awayTeam.name.toLowerCase().includes(bName) ||
          bName.includes(match.awayTeam.shortName.toLowerCase())
        ) {
          battingTeamId = match.awayTeamId;
        }

        // Strictly enforce that Innings 1 and Innings 2 have opposing teams
        if (inn.inningsNumber === 1) {
          inn1BattingTeamId = battingTeamId;
        } else if (inn.inningsNumber === 2 && inn1BattingTeamId) {
          if (battingTeamId === inn1BattingTeamId) {
            battingTeamId = inn1BattingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
          }
        }

        const existingInn = match.innings.find((i) => i.inningsNumber === inn.inningsNumber);

        // Continuity check: If manual scoring is actively ahead (e.g. operator scored more balls),
        // keep the higher ball/run count unless forceOverwrite is set.
        let runsToSave = inn.runs;
        let ballsToSave = inn.balls;
        let wicketsToSave = inn.wickets;
        let extrasToSave = inn.extras.total;

        if (existingInn && !options.forceOverwrite) {
          if (existingInn.balls > inn.balls) {
            // Manual entry is ahead of CricNepal feed; preserve manual ball & run count!
            ballsToSave = existingInn.balls;
            runsToSave = Math.max(existingInn.runs, inn.runs);
            wicketsToSave = Math.max(existingInn.wickets, inn.wickets);
          }
          if (existingInn.extras > 0 && inn.extras.total === 0) {
            extrasToSave = existingInn.extras;
          }
        }

        await tx.matchInnings.upsert({
          where: { matchId_inningsNumber: { matchId: match.id, inningsNumber: inn.inningsNumber } },
          create: {
            matchId: match.id,
            teamId: battingTeamId,
            inningsNumber: inn.inningsNumber,
            runs: runsToSave,
            wickets: wicketsToSave,
            balls: ballsToSave,
            extras: extrasToSave,
            target: inn.target || null,
            status: inn.status,
          },
          update: {
            teamId: battingTeamId,
            runs: runsToSave,
            wickets: wicketsToSave,
            balls: ballsToSave,
            extras: extrasToSave,
            target: inn.target || undefined,
            status: inn.status,
          },
        });
      }

      // Shared player registry for auto-syncing missing players
      const homeTeamId = match.homeTeamId;
      const awayTeamId = match.awayTeamId;
      const corruptedIdSet = new Set(corruptedPlayers.map((p) => p.id));
      const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players].filter(
        (p) => !corruptedIdSet.has(p.id) && !/^Players\s+[0-9a-f]{6,}/i.test(p.displayName) && !/[^\x00-\x7F]/.test(p.displayName)
      );
      const activeBattingTeamId = (data.currentInningsNumber === 2 && inn1BattingTeamId)
        ? (inn1BattingTeamId === homeTeamId ? awayTeamId : homeTeamId)
        : (inn1BattingTeamId || homeTeamId);
      const activeBowlingTeamId = activeBattingTeamId === homeTeamId ? awayTeamId : homeTeamId;

      async function getOrCreatePlayer(
        name: string,
        preferredTeamId: number,
        role: "BATSMAN" | "BOWLER" | "ALL_ROUNDER" | "WICKET_KEEPER" = "BATSMAN"
      ) {
        const cleanName = cleanPlayerDisplayName(name || "").trim();
        if (!cleanName) return null;
        const lowerClean = cleanName.toLowerCase();

        const scoreCandidate = (item: any) =>
          (item.teamId === preferredTeamId ? 100 : 0) +
          (item.isActive ? 10 : 0) +
          (item.imageUrl ? 5 : 0);

        const exactMatches = allPlayers
          .filter(
            (item) =>
              item.displayName.trim().toLowerCase() === lowerClean ||
              cleanPlayerDisplayName(item.displayName).toLowerCase() === lowerClean
          )
          .sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
        if (exactMatches.length > 0) return exactMatches[0];

        const fuzzyMatches = allPlayers
          .filter(
            (item) =>
              item.teamId === preferredTeamId &&
              (item.displayName.toLowerCase().includes(lowerClean) ||
                lowerClean.includes(item.displayName.toLowerCase()))
          )
          .sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
        if (fuzzyMatches.length > 0) return fuzzyMatches[0];

        const crossTeamMatches = allPlayers
          .filter(
            (item) =>
              item.displayName.toLowerCase().includes(lowerClean) ||
              lowerClean.includes(item.displayName.toLowerCase())
          )
          .sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
        if (crossTeamMatches.length > 0) return crossTeamMatches[0];

        const dbPlayer = await tx.player.findFirst({
          where: {
            displayName: { equals: cleanName },
            teamId: { in: [homeTeamId, awayTeamId] },
          },
        });
        if (dbPlayer) {
          allPlayers.push(dbPlayer as any);
          return dbPlayer as any;
        }

        const parts = cleanName.split(" ");
        const firstName = parts[0] || cleanName;
        const lastName = parts.slice(1).join(" ") || "";
        try {
          const created = await tx.player.create({
            data: {
              teamId: preferredTeamId,
              firstName,
              lastName,
              displayName: cleanName,
              role,
              nationality: "Nepal",
              isActive: true,
            },
          });
          allPlayers.push(created as any);
          return created as any;
        } catch {
          const fallback = await tx.player.findFirst({
            where: { teamId: preferredTeamId, displayName: cleanName },
          });
          if (fallback) {
            allPlayers.push(fallback as any);
            return fallback as any;
          }
          return null;
        }
      }

      // 4. Reconcile Live Batters and Bowler (auto-creating missing players)
      if (data.liveSummary) {
        const currentInningsNum = data.currentInningsNumber || 1;

        // Batters
        for (const batter of data.liveSummary.currentBatters) {
          const player = await getOrCreatePlayer(batter.name, activeBattingTeamId, "BATSMAN");

          if (player) {
            const existingStat = await tx.playerMatchStat.findUnique({
              where: {
                matchId_playerId_innings: {
                  matchId: match.id,
                  playerId: player.id,
                  innings: currentInningsNum,
                },
              },
            });

            const runsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsFaced > batter.balls
                ? existingStat.runs
                : batter.runs;
            const ballsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsFaced > batter.balls
                ? existingStat.ballsFaced
                : batter.balls;

            await tx.playerMatchStat.upsert({
              where: {
                matchId_playerId_innings: {
                  matchId: match.id,
                  playerId: player.id,
                  innings: currentInningsNum,
                },
              },
              create: {
                matchId: match.id,
                playerId: player.id,
                teamId: player.teamId,
                innings: currentInningsNum,
                runs: runsToSave,
                ballsFaced: ballsToSave,
                fours: batter.fours,
                sixes: batter.sixes,
              },
              update: {
                runs: runsToSave,
                ballsFaced: ballsToSave,
                fours: batter.fours,
                sixes: batter.sixes,
              },
            });
          }
        }

        // Bowler
        if (data.liveSummary.currentBowler) {
          const bowler = data.liveSummary.currentBowler;
          const player = await getOrCreatePlayer(bowler.name, activeBowlingTeamId, "BOWLER");

          if (player) {
            const ballsBowled = oversStringToBalls(bowler.overs);
            const existingStat = await tx.playerMatchStat.findUnique({
              where: {
                matchId_playerId_innings: {
                  matchId: match.id,
                  playerId: player.id,
                  innings: currentInningsNum,
                },
              },
            });

            const ballsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsBowled > ballsBowled
                ? existingStat.ballsBowled
                : ballsBowled;
            const runsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsBowled > ballsBowled
                ? existingStat.runsConceded
                : bowler.runs;
            const wicketsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsBowled > ballsBowled
                ? existingStat.wickets
                : bowler.wickets;

            await tx.playerMatchStat.upsert({
              where: {
                matchId_playerId_innings: {
                  matchId: match.id,
                  playerId: player.id,
                  innings: currentInningsNum,
                },
              },
              create: {
                matchId: match.id,
                playerId: player.id,
                teamId: player.teamId,
                innings: currentInningsNum,
                ballsBowled: ballsToSave,
                runsConceded: runsToSave,
                wickets: wicketsToSave,
                maidens: bowler.maidens || 0,
              },
              update: {
                ballsBowled: ballsToSave,
                runsConceded: runsToSave,
                wickets: wicketsToSave,
                maidens: bowler.maidens || undefined,
              },
            });
          }
        }
      }

      // 5. Reconcile Full Innings Scorecard (Batters and Bowlers) if available
      if (Array.isArray(data.playerPerformances) && data.playerPerformances.length > 0) {
        for (const perf of data.playerPerformances) {
          const innNum = perf.innings || 1;
          const innBattingTeamId = (innNum === 2 && inn1BattingTeamId)
            ? (inn1BattingTeamId === homeTeamId ? awayTeamId : homeTeamId)
            : (inn1BattingTeamId || homeTeamId);
          const innBowlingTeamId = innBattingTeamId === homeTeamId ? awayTeamId : homeTeamId;

          let targetTeamId = perf.type === "BATSMAN" ? innBattingTeamId : innBowlingTeamId;
          if (perf.teamName) {
            const tn = perf.teamName.toLowerCase();
            if (match.awayTeam.name.toLowerCase().includes(tn) || tn.includes(match.awayTeam.shortName.toLowerCase())) {
              targetTeamId = awayTeamId;
            } else if (match.homeTeam.name.toLowerCase().includes(tn) || tn.includes(match.homeTeam.shortName.toLowerCase())) {
              targetTeamId = homeTeamId;
            }
          }

          const player = await getOrCreatePlayer(
            perf.name,
            targetTeamId,
            perf.type === "BOWLER" ? "BOWLER" : "BATSMAN"
          );
          if (!player) continue;

          const existingStat = await tx.playerMatchStat.findUnique({
            where: {
              matchId_playerId_innings: {
                matchId: match.id,
                playerId: player.id,
                innings: innNum,
              },
            },
          });

          if (perf.type === "BATSMAN" && perf.batting) {
            const b = perf.batting;
            const runsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsFaced > b.balls
                ? existingStat.runs
                : b.runs;
            const ballsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsFaced > b.balls
                ? existingStat.ballsFaced
                : b.balls;

            await tx.playerMatchStat.upsert({
              where: {
                matchId_playerId_innings: {
                  matchId: match.id,
                  playerId: player.id,
                  innings: innNum,
                },
              },
              create: {
                matchId: match.id,
                playerId: player.id,
                teamId: player.teamId,
                innings: innNum,
                runs: runsToSave,
                ballsFaced: ballsToSave,
                fours: b.fours,
                sixes: b.sixes,
                isOut: !b.isNotOut,
              },
              update: {
                runs: runsToSave,
                ballsFaced: ballsToSave,
                fours: b.fours,
                sixes: b.sixes,
                isOut: !b.isNotOut,
              },
            });
          } else if (perf.type === "BOWLER" && perf.bowling) {
            const bw = perf.bowling;
            const ballsBowled = oversStringToBalls(bw.overs);
            const ballsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsBowled > ballsBowled
                ? existingStat.ballsBowled
                : ballsBowled;
            const runsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsBowled > ballsBowled
                ? existingStat.runsConceded
                : bw.runs;
            const wicketsToSave =
              existingStat && !options.forceOverwrite && existingStat.ballsBowled > ballsBowled
                ? existingStat.wickets
                : bw.wickets;

            await tx.playerMatchStat.upsert({
              where: {
                matchId_playerId_innings: {
                  matchId: match.id,
                  playerId: player.id,
                  innings: innNum,
                },
              },
              create: {
                matchId: match.id,
                playerId: player.id,
                teamId: player.teamId,
                innings: innNum,
                ballsBowled: ballsToSave,
                runsConceded: runsToSave,
                wickets: wicketsToSave,
                maidens: bw.maidens || 0,
              },
              update: {
                ballsBowled: ballsToSave,
                runsConceded: runsToSave,
                wickets: wicketsToSave,
                maidens: bw.maidens !== undefined ? bw.maidens : undefined,
              },
            });
          }
        }
      }

      // Return refreshed match and automatically update live broadcast graphics state
      const refreshed = await tx.match.findUnique({
        where: { id: match.id },
        include: {
          tournament: true,
          homeTeam: { include: { players: true, franchise: true } },
          awayTeam: { include: { players: true, franchise: true } },
          toss: { include: { winnerTeam: true } },
          innings: { include: { team: true }, orderBy: { inningsNumber: "asc" } },
          stats: { include: { player: true, team: true } },
        },
      });

      if (refreshed && options.syncBroadcast !== false) {
        try {
          const existingBs = await (tx as any).broadcastState.findUnique({ where: { id: "current" } });
          const activeMatchId = (existingBs?.state as any)?.match?.matchId;
          const shouldSync =
            options.forceBroadcast === true ||
            !activeMatchId ||
            Number(activeMatchId) === Number(match.id) ||
            data.status === "LIVE";
          if (shouldSync) {
            await syncMatchToBroadcastDb(tx, refreshed, data);
            didSyncBroadcast = true;
          }
        } catch (bsErr) {
          console.warn("[BroadcastState] Could not auto-sync broadcast state:", bsErr);
        }
      }

      return refreshed;
    },
    { timeout: 30000 }
  );

  // Broadcast WebSocket notification to all active graphics screens
  if (updated && didSyncBroadcast) {
    try {
      if (typeof (global as any).__npl_ws_broadcast === "function") {
        const stateRecord = await (prisma as any).broadcastState.findUnique({ where: { id: "current" } });
        if (stateRecord?.state) {
          (global as any).__npl_ws_broadcast(JSON.stringify({
            action: "updateData",
            type: "updateData",
            payload: stateRecord.state,
            timestamp: Date.now(),
          }));
        }
      }
    } catch {}
  }

  return updated;
}

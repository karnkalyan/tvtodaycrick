import { load } from "cheerio";
import dns from "node:dns";
import type { CricNepalParsedLiveMatch } from "./cricnepal-live";

import { ensureIpv4Dispatcher } from "./fetch-network";
ensureIpv4Dispatcher();

interface FailureBackoff {
  at: number;
  error: string;
}

const urlFailureBackoffs = new Map<string, FailureBackoff>();
const liveMatchCache = new Map<string, { at: number; data: CricNepalParsedLiveMatch }>();
const BACKOFF_COOLDOWN_MS = 30000;
const CACHE_TTL_MS = 3000;

export const OK_BASE_MATCH_ID = 314; // Match 1 = 315, Match 2 = 316, etc.

/**
 * Returns OnlineKhabar match URL given a match number (e.g. "Match 1", "Season3-M1", "M2").
 */
export function getOnlineKhabarUrlForMatch(matchNumber: string): string | null {
  const m = matchNumber.match(/(\d+)$/);
  if (!m) return null;
  const ordinal = parseInt(m[1], 10);
  if (ordinal < 1 || ordinal > 40) return null;
  const matchId = OK_BASE_MATCH_ID + ordinal;
  return `https://www.onlinekhabar.com/cricket-match/${matchId}`;
}

export function slugToPlayerOrTeamName(slug: string): string {
  if (!slug) return "";
  const clean = slug.replace(/-\d{4}$/, "").replace(/-\d+$/, "");
  return clean
    .split("-")
    .map((w) => {
      const lower = w.toLowerCase();
      if (lower === "van" || lower === "de" || lower === "la") return lower;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function parseScoreStr(str: string): { runs: number; wickets: number; overs: string; balls: number } {
  let runs = 0;
  let wickets = 0;
  let overs = "0.0";
  let balls = 0;

  const m = str.match(/(\d+)(?:\/(\d+))?/);
  if (m) {
    runs = parseInt(m[1], 10) || 0;
    wickets = m[2] !== undefined ? parseInt(m[2], 10) || 0 : 0;
  }
  const ovMatch = str.match(/([\d.]+)\s*overs?/i);
  if (ovMatch) {
    overs = ovMatch[1];
    const parts = overs.split(".");
    balls = (parseInt(parts[0], 10) || 0) * 6 + (parseInt(parts[1], 10) || 0);
  }
  return { runs, wickets, overs, balls };
}

function parseExtrasStr(text: string) {
  let total = 0;
  let wides = 0;
  let noBalls = 0;
  let byes = 0;
  let legByes = 0;
  let penalties = 0;

  const totMatch = text.match(/Extras:\s*(\d+)/i);
  if (totMatch) total = parseInt(totMatch[1], 10) || 0;
  const wMatch = text.match(/wide\s*(\d+)/i);
  if (wMatch) wides = parseInt(wMatch[1], 10) || 0;
  const nbMatch = text.match(/no_ball\s*(\d+)/i);
  if (nbMatch) noBalls = parseInt(nbMatch[1], 10) || 0;
  const bMatch = text.match(/bye\s*(\d+)/i);
  if (bMatch) byes = parseInt(bMatch[1], 10) || 0;
  const lbMatch = text.match(/leg_bye\s*(\d+)/i);
  if (lbMatch) legByes = parseInt(lbMatch[1], 10) || 0;
  const pMatch = text.match(/other\s*(\d+)/i);
  if (pMatch) penalties = parseInt(pMatch[1], 10) || 0;

  return { total, wides, noBalls, byes, legByes, penalties };
}

/**
 * Parses OnlineKhabar match JSON payload (from wp-json/okcm/v1/matches/:id/live)
 * into a standardized CricNepalParsedLiveMatch object.
 */
export function parseOnlineKhabarData(data: any, sourceUrl = ""): CricNepalParsedLiveMatch {
  const scoreHtml = data.regions?.score?.html || "";
  const $score = load(scoreHtml);

  const stateAttr = ($score("section.npl-score").attr("data-match-state") || data.state || "").toLowerCase();
  const status: "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED" =
    stateAttr === "live"
      ? "LIVE"
      : stateAttr === "completed" || stateAttr === "result" || stateAttr === "finished"
      ? "COMPLETED"
      : stateAttr === "upcoming"
      ? "SCHEDULED"
      : (data.state === "finished" || data.state === "completed" ? "COMPLETED" : "SCHEDULED");

  const venue = "TU Cricket Ground, Kirtipur";

  // Result summary if completed
  let resultSummary: string | undefined = undefined;
  const tossOrResult = $score(".npl-score__toss").text().trim();
  const directResult = $score(".npl-score__result").text().trim();
  if (tossOrResult && /won by|tied|no result/i.test(tossOrResult)) {
    resultSummary = tossOrResult;
  } else if (directResult) {
    resultSummary = directResult;
  }

  // Teams
  const teamEls = $score(".npl-team");
  const teams: any[] = [];
  teamEls.each((i, el) => {
    const rawName = $score(el).find(".npl-team__name").text().trim();
    const link = $score(el).find(".npl-team-link").attr("href") || "";
    const slugMatch = link.match(/\/cricket-team\/([^\/]+)/);
    const slug = slugMatch ? slugMatch[1] : "";
    const englishName = slugToPlayerOrTeamName(slug) || rawName;
    const scoreText = $score(el).find(".npl-team__score").text().trim();
    const statusText = $score(el).find(".npl-team__status").text().trim();
    const parsed = parseScoreStr(scoreText);

    teams.push({
      name: englishName,
      rawName,
      slug,
      link,
      scoreText,
      statusText,
      ...parsed,
    });
  });

  const homeTeam = teams[0] || { name: "Home Team" };
  const awayTeam = teams[1] || { name: "Away Team" };

  // Toss
  const tossText = $score(".npl-score__toss").text().trim();
  let toss: { winnerName: string; decision: "BAT" | "BOWL"; notes?: string } | null = null;
  if (tossText && !tossText.includes("not taken place")) {
    const isBowl = /chose bowling|opted to bowl/i.test(tossText);
    const winnerName =
      teams.find((t) => tossText.includes(t.rawName) || tossText.includes(t.name))?.name || homeTeam.name;
    toss = {
      winnerName,
      decision: isBowl ? "BOWL" : "BAT",
      notes: tossText,
    };
  }

  // Fall of Wickets (by innings)
  const fowByInnings: Record<number, Array<[string, string, string]>> = {};
  [1, 2].forEach((innNum) => {
    const fowHtml = data.regions?.[`fow-${innNum}`]?.html;
    if (!fowHtml) return;
    const $fow = load(fowHtml);
    const rows: Array<[string, string, string]> = [];
    $fow("table.npl-sc-table--fow tbody tr").each((_, tr) => {
      const playerLink = $fow(tr).find(".npl-player-link").attr("href") || "";
      const playerSlug = playerLink.split("/").filter(Boolean).pop() || "";
      const rawName = $fow(tr).find(".npl-sc-player__name").text().trim();
      const playerName = isNaN(Number(playerSlug)) && playerSlug ? slugToPlayerOrTeamName(playerSlug) : rawName;
      const score = $fow(tr).find("td:nth-child(2)").text().trim();
      const over = $fow(tr).find("td:nth-child(3)").text().trim();
      if (score && over) {
        const formattedScore = score.includes("-") ? score.replace("-", "/") : score;
        rows.push([formattedScore, playerName, `${over} OV`]);
      }
    });
    if (rows.length > 0) {
      fowByInnings[innNum] = rows;
    }
  });

  // Overs Summary with ball-by-ball deliveries
  const oversByInnings: Record<number, Array<{ overNo: string; score: string; balls: string[] }>> = {};
  let recentDeliveries: string[] = [];
  [1, 2].forEach((innNum) => {
    const oversHtml = data.regions?.[`overs-${innNum}`]?.html;
    if (!oversHtml) return;
    const $ov = load(oversHtml);
    const oversList: Array<{ overNo: string; score: string; balls: string[] }> = [];
    $ov("table.npl-sc-table--overs tbody tr").each((_, tr) => {
      const overNo = $ov(tr).find(".npl-overs__no").text().trim();
      const score = $ov(tr).find(".npl-overs__score").text().trim();
      const balls: string[] = [];
      $ov(tr).find(".npl-overs__balls li").each((_, li) => {
        const text = $ov(li).text().trim();
        const title = $ov(li).attr("title") || "";
        if (text) balls.push(text);
        else if ($ov(li).hasClass("npl-chip--dot") || title.includes("नो रन") || title.includes("Dot")) balls.push("0");
        else if (title.includes("आउट") || title.includes("Wicket")) balls.push("W");
        else balls.push(".");
      });
      if (balls.length > 0) {
        oversList.push({ overNo, score, balls });
      }
    });
    if (oversList.length > 0) {
      oversByInnings[innNum] = oversList;
      if (recentDeliveries.length === 0 && oversList[0]?.balls) {
        recentDeliveries = oversList[0].balls;
      }
    }
  });

  // Innings and Player Performances
  const innings: CricNepalParsedLiveMatch["innings"] = [];
  const playerPerformances: any[] = [];

  [1, 2].forEach((innNum) => {
    const batHtml = data.regions?.[`batting-${innNum}`]?.html || "";
    const bowlHtml = data.regions?.[`bowling-${innNum}`]?.html || "";
    if (!batHtml && !bowlHtml) return;

    const $bat = load(batHtml);
    const $bowl = load(bowlHtml);
    const extras = parseExtrasStr($bat.root().text());

    let battingTeamName =
      innNum === 1
        ? teams[1]?.scoreText
          ? awayTeam.name
          : homeTeam.name
        : teams[1]?.scoreText
        ? homeTeam.name
        : awayTeam.name;
    let bowlingTeamName = battingTeamName === homeTeam.name ? awayTeam.name : homeTeam.name;

    const innTeam = teams.find((t) => t.name === battingTeamName);
    const isLive =
      $score(".npl-score__innings").text().includes(`${innNum}st Innings`) ||
      $score(".npl-score__innings").text().includes(`${innNum}nd Innings`);

    innings.push({
      inningsNumber: innNum,
      battingTeamName,
      bowlingTeamName,
      runs: innTeam?.runs || 0,
      wickets: innTeam?.wickets || 0,
      balls: innTeam?.balls || 0,
      overs: innTeam?.overs || "0.0",
      extras,
      status: isLive && status === "LIVE" ? "LIVE" : innTeam?.runs ? "COMPLETED" : "NOT_STARTED",
    });

    // Batters
    $bat("tbody tr").each((_, tr) => {
      const tds = $bat(tr).find("td");
      if (tds.length < 5) return;
      const rawPName = $bat(tds[0]).find(".npl-sc-player__name").text().trim();
      const pLink = $bat(tds[0]).find(".npl-player-link").attr("href") || "";
      const pSlug = pLink.match(/\/cricket-player\/([^\/]+)/)?.[1] || "";
      const playerName = isNaN(Number(pSlug)) && pSlug ? slugToPlayerOrTeamName(pSlug) : rawPName;
      const how = $bat(tds[1]).text().trim();
      const isNotOut = /not out/i.test(how);
      const runs = parseInt($bat(tds[2]).text().trim(), 10) || 0;
      const balls = parseInt($bat(tds[3]).text().trim(), 10) || 0;
      const fours = parseInt($bat(tds[4]).text().trim(), 10) || 0;
      const sixes = parseInt($bat(tds[5]).text().trim(), 10) || 0;
      const strikeRate = parseFloat($bat(tds[6]).text().trim()) || 0;

      playerPerformances.push({
        name: playerName,
        teamName: battingTeamName,
        innings: innNum,
        type: "BATSMAN",
        batting: {
          runs,
          balls,
          fours,
          sixes,
          strikeRate,
          dismissal: isNotOut ? "not out" : how,
          isNotOut,
        },
      });
    });

    // Bowlers
    $bowl("tbody tr").each((_, tr) => {
      const tds = $bowl(tr).find("td");
      if (tds.length < 5) return;
      const rawPName = $bowl(tds[0]).find(".npl-sc-player__name").text().trim();
      const pLink = $bowl(tds[0]).find(".npl-player-link").attr("href") || "";
      const pSlug = pLink.match(/\/cricket-player\/([^\/]+)/)?.[1] || "";
      const playerName = isNaN(Number(pSlug)) && pSlug ? slugToPlayerOrTeamName(pSlug) : rawPName;
      const overs = $bowl(tds[1]).text().trim();
      const maidens = parseInt($bowl(tds[2]).text().trim(), 10) || 0;
      const runs = parseInt($bowl(tds[3]).text().trim(), 10) || 0;
      const wickets = parseInt($bowl(tds[4]).text().trim(), 10) || 0;
      const economy = parseFloat($bowl(tds[5]).text().trim()) || 0;

      playerPerformances.push({
        name: playerName,
        teamName: bowlingTeamName,
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
    });
  });

  // Live Summary
  const crrText = $score(".npl-score__rates").text().trim();
  const crr = parseFloat(crrText.replace(/[^0-9.]/g, "")) || 0;

  const activeInnNum = innings.find((i) => i.status === "LIVE")?.inningsNumber || (innings.length > 1 && status === "COMPLETED" ? 2 : (innings[0]?.inningsNumber || 1));
  if (oversByInnings[activeInnNum]?.[0]?.balls?.length) {
    recentDeliveries = oversByInnings[activeInnNum][0].balls;
  }

  const currentBatters = playerPerformances
    .filter((p) => p.innings === activeInnNum && p.type === "BATSMAN" && p.batting.isNotOut)
    .map((p, idx) => ({
      name: p.name,
      runs: p.batting.runs,
      balls: p.batting.balls,
      fours: p.batting.fours,
      sixes: p.batting.sixes,
      strikeRate: p.batting.strikeRate,
      isStriker: idx === 0,
    }));

  let currentBowler: NonNullable<CricNepalParsedLiveMatch["liveSummary"]>["currentBowler"] = null;
  const bowlerEl = $score(".npl-score__player--bowler");
  if (bowlerEl.length) {
    const rawName = bowlerEl.find(".npl-player-link").text().trim();
    const link = bowlerEl.find(".npl-player-link").attr("href") || "";
    const slug = link.match(/\/cricket-player\/([^\/]+)/)?.[1] || "";
    const name = isNaN(Number(slug)) && slug ? slugToPlayerOrTeamName(slug) : rawName;
    const text = bowlerEl.text().replace(rawName, "").trim();
    const m = text.match(/(\d+)\/(\d+)\s*\(([\d.]+)\)/);
    if (m) {
      currentBowler = {
        name,
        wickets: parseInt(m[1], 10) || 0,
        runs: parseInt(m[2], 10) || 0,
        overs: m[3],
        economy: 0,
      };
    }
  }

  return {
    sourceId: String(data.match_id || ""),
    sourceUrl,
    title: `${homeTeam.name} vs ${awayTeam.name}`,
    status,
    resultSummary,
    venue,
    homeTeam: { name: homeTeam.name },
    awayTeam: { name: awayTeam.name },
    toss,
    currentInningsNumber: activeInnNum,
    innings,
    liveSummary: {
      currentBatters,
      currentBowler,
      crr,
    },
    playerPerformances,
    fowByInnings,
    oversByInnings,
    recentDeliveries,
  };
}

/**
 * Fetches and parses an OnlineKhabar live match from URL or match ID.
 * Returns null if network fails or circuit breaker is active.
 */
export async function fetchOnlineKhabarLiveMatch(urlOrId: string | number): Promise<CricNepalParsedLiveMatch | null> {
  let matchId = 0;
  let targetUrl = "";

  if (typeof urlOrId === "number") {
    matchId = urlOrId;
    targetUrl = `https://www.onlinekhabar.com/cricket-match/${matchId}`;
  } else {
    targetUrl = String(urlOrId).trim();
    const numMatch = targetUrl.match(/\/cricket-match\/(\d+)/);
    if (numMatch) {
      matchId = parseInt(numMatch[1], 10);
    }
  }

  // Cache check
  const cacheKey = `ok-${matchId || targetUrl}`;
  const cached = liveMatchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  // Circuit breaker check
  const failure = urlFailureBackoffs.get(cacheKey);
  if (failure && Date.now() - failure.at < BACKOFF_COOLDOWN_MS) {
    return cached?.data || null;
  }

  try {
    let jsonEndpoint = matchId ? `https://www.onlinekhabar.com/wp-json/okcm/v1/matches/${matchId}/live` : "";

    // If we only have a named slug URL without numeric ID, fetch HTML first to discover matchId
    if (!jsonEndpoint) {
      const pageRes = await fetch(targetUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const idMatch = html.match(/window\.okcmNplMatch\s*=\s*\{[^}]*"matchId"\s*:\s*(\d+)/);
        if (idMatch) {
          matchId = parseInt(idMatch[1], 10);
          jsonEndpoint = `https://www.onlinekhabar.com/wp-json/okcm/v1/matches/${matchId}/live`;
        }
      }
    }

    if (!jsonEndpoint) {
      return null;
    }

    const res = await fetch(jsonEndpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${jsonEndpoint}`);
    }

    const json = await res.json();
    const parsed = parseOnlineKhabarData(json, targetUrl);
    if (parsed) {
      urlFailureBackoffs.delete(cacheKey);
      liveMatchCache.set(cacheKey, { at: Date.now(), data: parsed });
    }
    return parsed;
  } catch (err) {
    const errorMsg = (err as any)?.cause?.message || (err instanceof Error ? err.message : String(err));
    urlFailureBackoffs.set(cacheKey, { at: Date.now(), error: errorMsg });
    if (cached?.data) return cached.data;
    throw err;
  }
}

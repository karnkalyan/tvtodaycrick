type BroadcastState = Record<string, unknown>;

function isPlainObject(value: unknown): value is BroadcastState {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Merge partial broadcast updates without deleting data owned by another
 * screen (for example recent deliveries, points, or player details).
 * Arrays are complete values and are replaced rather than index-merged.
 */
export function mergeBroadcastState(current: unknown, incoming: unknown): BroadcastState {
  const base = isPlainObject(current) ? current : {};
  if (!isPlainObject(incoming)) return { ...base };

  const merged: BroadcastState = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      merged[key] = mergeBroadcastState(base[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export const DEFAULT_BROADCAST_STATE: BroadcastState = {
  match: {
    matchId: null,
    teamA: "LUL",
    teamB: "SPR",
    teamAName: "Lumbini Lions",
    teamBName: "Sudurpaschim Royals",
    inningsNumber: 1,
  },
  score: {
    runs: 0,
    wickets: 0,
    overs: "0.0",
    recent: ["-", "-", "-", "-", "-", "-"],
    target: null,
  },
  live: {
    innings: "MATCH SCHEDULED",
    rateText: "MATCH NOT STARTED",
    strikerName: "BATTER",
    strikerRuns: "0",
    strikerBalls: "0",
    nonStrikerName: "NON-STRIKER",
    nonStrikerRuns: "0",
    nonStrikerBalls: "0",
    bowlerName: "BOWLER",
    bowlerFigures: "0/0",
    bowlerOvers: "0.0",
    requirement: "MATCH SCHEDULED",
    matchLabel: "NEPAL PREMIER LEAGUE",
    venue: "TU INTERNATIONAL CRICKET GROUND, KIRTIPUR",
    tossText: "TOSS NOT YET RECORDED",
    target: "-",
  },
  fow: [],
  summary: [
    ["BATTER", "0*", "0", "0", "0", "0.0"],
    ["NON-STRIKER", "0*", "0", "0", "0", "0.0"],
  ],
  bowling: [["BOWLER", "0.0", "0", "0", "0", "0.00"]],
  ui: {
    graphic: null,
    scoreMode: "hidden",
  },
};

import { getFranchiseBrand } from "./npl-franchises";

/**
 * Builds the canonical BroadcastState object from a live Match DB record
 * and optional live scraper payload.
 */
export function buildBroadcastStateFromMatch(
  match: any,
  parsedLive?: any,
  activeInningsOverride?: number
): BroadcastState {
  if (!match) return DEFAULT_BROADCAST_STATE;

  const inn1 = match.innings?.find((i: any) => i.inningsNumber === 1);
  const inn2 = match.innings?.find((i: any) => i.inningsNumber === 2);

  // Determine active innings:
  // If explicitly chosen (e.g. by operator in score-entry), respect it.
  // Otherwise, if Innings 2 has balls/runs, is LIVE, or match is COMPLETED, default to Innings 2!
  let activeInningsNumber = activeInningsOverride || 1;
  if (!activeInningsOverride) {
    if (inn2 && (inn2.status === "LIVE" || inn2.balls > 0 || inn2.runs > 0 || match.status === "COMPLETED")) {
      activeInningsNumber = 2;
    } else {
      activeInningsNumber = 1;
    }
  }

  const activeInn = activeInningsNumber === 2
    ? (inn2 || { runs: 0, wickets: 0, balls: 0, extras: 0 })
    : (inn1 || { runs: 0, wickets: 0, balls: 0, extras: 0 });

  // Determine batting and bowling team
  let battingTeam = match.homeTeam || { name: "Home Team", shortName: "HT" };
  let bowlingTeam = match.awayTeam || { name: "Away Team", shortName: "AT" };

  if (activeInn.teamId) {
    battingTeam = activeInn.teamId === match.homeTeamId ? match.homeTeam : match.awayTeam;
    bowlingTeam = battingTeam.id === match.homeTeamId ? match.awayTeam : match.homeTeam;
  } else if (match.toss) {
    const tossWinner = match.toss.winnerTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam;
    const tossLoser = match.toss.winnerTeamId === match.homeTeamId ? match.awayTeam : match.homeTeam;
    const firstBatting = match.toss.decision === "BAT" ? tossWinner : tossLoser;
    const firstBowling = firstBatting.id === match.homeTeamId ? match.awayTeam : match.homeTeam;
    if (activeInningsNumber === 1) {
      battingTeam = firstBatting;
      bowlingTeam = firstBowling;
    } else {
      battingTeam = firstBowling;
      bowlingTeam = firstBatting;
    }
  }

  let battingBrand = getFranchiseBrand(battingTeam.name);
  let bowlingBrand = getFranchiseBrand(bowlingTeam.name);
  if (battingBrand.code === bowlingBrand.code || (battingTeam.id && bowlingTeam.id && battingTeam.id === bowlingTeam.id)) {
    battingTeam = match.homeTeam || battingTeam;
    bowlingTeam = match.awayTeam || bowlingTeam;
    battingBrand = getFranchiseBrand(battingTeam.name);
    bowlingBrand = getFranchiseBrand(bowlingTeam.name);
  }

  const bOvers = Number(activeInn.balls) || 0;
  const ovStr = `${Math.floor(bOvers / 6)}.${bOvers % 6}`;
  const runs = Number(activeInn.runs) || 0;
  const wickets = Number(activeInn.wickets) || 0;
  const target = Number(activeInn.target) || (activeInningsNumber === 2 && inn1 ? Number(inn1.runs) + 1 : null);
  const crr = bOvers > 0 ? (runs / (bOvers / 6)).toFixed(2) : "0.00";
  const runsNeeded = target ? Math.max(0, target - runs) : 0;
  const ballsRemaining = Math.max(0, 120 - bOvers);
  const rrr = target && ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : "-";

  // Requirement & innings status text
  let requirement = "";
  let inningsLabel = "";
  let rateText = "";

  if (match.status === "COMPLETED") {
    requirement = match.resultText || parsedLive?.resultSummary || `${battingTeam.name} won`;
    inningsLabel = `FINAL RESULT · ${requirement}`;
    rateText = "FINAL RESULT";
  } else if (match.status === "LIVE" || bOvers > 0 || runs > 0) {
    if (activeInningsNumber === 2) {
      requirement = target
        ? `${battingTeam.name.toUpperCase()} NEED ${runsNeeded} RUNS IN ${ballsRemaining} BALLS`
        : `${battingTeam.name.toUpperCase()} · 2ND INNINGS`;
      inningsLabel = "CHASE · 2ND INNINGS";
      rateText = `CRR ${crr}${target ? ` · RRR ${rrr}` : ""}`;
    } else {
      requirement = `${battingTeam.name.toUpperCase()} · 1ST INNINGS`;
      inningsLabel = "1ST INNINGS";
      rateText = `CRR ${crr}`;
    }
  } else {
    requirement = `${battingTeam.name.toUpperCase()} vs ${bowlingTeam.name.toUpperCase()} · MATCH SCHEDULED`;
    inningsLabel = "MATCH SCHEDULED";
    rateText = "MATCH NOT STARTED";
  }

  const tossText = match.toss
    ? `${match.toss.winnerTeamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name} WON TOSS & ELECTED TO ${match.toss.decision}`
    : "TOSS NOT YET RECORDED";

  // Active batters & bowler
  const stats = Array.isArray(match.stats) ? match.stats : [];
  const innStats = stats.filter((s: any) => Number(s.innings) === activeInningsNumber);

  let strikerName = "BATTER";
  let strikerRuns = "0";
  let strikerBalls = "0";
  let nonStrikerName = "NON-STRIKER";
  let nonStrikerRuns = "0";
  let nonStrikerBalls = "0";

  if (parsedLive?.liveSummary?.currentBatters?.length) {
    const b1 = parsedLive.liveSummary.currentBatters[0];
    const b2 = parsedLive.liveSummary.currentBatters[1];
    if (b1) {
      strikerName = b1.name?.toUpperCase() || "BATTER";
      strikerRuns = String(b1.runs ?? 0);
      strikerBalls = String(b1.balls ?? 0);
    }
    if (b2) {
      nonStrikerName = b2.name?.toUpperCase() || "NON-STRIKER";
      nonStrikerRuns = String(b2.runs ?? 0);
      nonStrikerBalls = String(b2.balls ?? 0);
    }
  } else {
    const battingStats = innStats.filter((s: any) => s.teamId === battingTeam.id);
    const notOutBatters = battingStats.filter((s: any) => !s.isOut);
    const activeBatters = notOutBatters.length >= 2 ? notOutBatters : battingStats;
    if (activeBatters[0]) {
      strikerName = activeBatters[0].player?.displayName?.toUpperCase() || "BATTER";
      strikerRuns = String(activeBatters[0].runs ?? 0);
      strikerBalls = String(activeBatters[0].ballsFaced ?? 0);
    }
    if (activeBatters[1]) {
      nonStrikerName = activeBatters[1].player?.displayName?.toUpperCase() || "NON-STRIKER";
      nonStrikerRuns = String(activeBatters[1].runs ?? 0);
      nonStrikerBalls = String(activeBatters[1].ballsFaced ?? 0);
    }
  }

  let bowlerName = "BOWLER";
  let bowlerFigures = "0/0";
  let bowlerOvers = "0.0";

  if (parsedLive?.liveSummary?.currentBowler) {
    const cb = parsedLive.liveSummary.currentBowler;
    bowlerName = cb.name?.toUpperCase() || "BOWLER";
    bowlerFigures = `${cb.wickets ?? 0}/${cb.runs ?? 0}`;
    bowlerOvers = String(cb.overs || "0.0");
  } else {
    const bowlingStats = innStats.filter((s: any) => s.teamId === bowlingTeam.id && s.ballsBowled > 0);
    if (bowlingStats.length) {
      const topBowler = bowlingStats.sort((a: any, b: any) => b.ballsBowled - a.ballsBowled)[0];
      bowlerName = topBowler.player?.displayName?.toUpperCase() || "BOWLER";
      bowlerFigures = `${topBowler.wickets ?? 0}/${topBowler.runsConceded ?? 0}`;
      bowlerOvers = `${Math.floor(topBowler.ballsBowled / 6)}.${topBowler.ballsBowled % 6}`;
    }
  }

  // Fall of Wickets
  let fow: Array<[string, string, string]> = [];
  if (parsedLive?.fowByInnings?.[activeInningsNumber]?.length) {
    fow = parsedLive.fowByInnings[activeInningsNumber];
  } else {
    const dismissed = innStats
      .filter((s: any) => s.teamId === battingTeam.id && s.isOut)
      .sort((a: any, b: any) => a.id - b.id);
    fow = dismissed.map((s: any, idx: number) => [
      `${idx + 1}/${s.runs}`,
      s.player?.displayName || `Batter ${idx + 1}`,
      `${Math.floor((s.ballsFaced || 0) / 6)}.${(s.ballsFaced || 0) % 6} OV`,
    ]);
  }

  // Batting summary scorecard
  const summary: Array<[string, string, string, string, string, string]> = innStats
    .filter((s: any) => s.teamId === battingTeam.id)
    .map((s: any) => {
      const sr = s.ballsFaced > 0 ? ((s.runs / s.ballsFaced) * 100).toFixed(1) : "0.0";
      return [
        s.player?.displayName || "Player",
        `${s.runs}${s.isOut ? "" : "*"}`,
        String(s.ballsFaced || 0),
        String(s.fours || 0),
        String(s.sixes || 0),
        sr,
      ];
    });

  // Bowling summary scorecard. Prefer the active innings' source feed: database
  // stats can contain a previous/manual player selection and must not overwrite
  // the live bowler card with stale details.
  const liveBowling = (parsedLive?.playerPerformances || [])
    .filter((p: any) => p.innings === activeInningsNumber && p.type === "BOWLER" && p.bowling)
    .map((p: any): [string, string, string, string, string, string] => {
      const bw = p.bowling;
      const overs = String(bw.overs || "0.0");
      const [whole, balls] = overs.split(".").map((v) => Number(v) || 0);
      const legalBalls = whole * 6 + balls;
      const econ = legalBalls > 0 ? (Number(bw.runs || 0) / (legalBalls / 6)).toFixed(2) : "0.00";
      return [
        String(p.name || "Bowler"),
        overs,
        String(bw.maidens || 0),
        String(bw.runs || 0),
        String(bw.wickets || 0),
        String(bw.economy || econ),
      ];
    });

  const databaseBowling: Array<[string, string, string, string, string, string]> = innStats
    .filter((s: any) => s.teamId === bowlingTeam.id && s.ballsBowled > 0)
    .map((s: any) => {
      const ov = `${Math.floor(s.ballsBowled / 6)}.${s.ballsBowled % 6}`;
      const econ = s.ballsBowled > 0 ? (s.runsConceded / (s.ballsBowled / 6)).toFixed(2) : "0.00";
      return [s.player?.displayName || "Bowler", ov, String(s.maidens || 0), String(s.runsConceded || 0), String(s.wickets || 0), econ];
    });

  const bowling = liveBowling.length ? liveBowling : databaseBowling;
  if (parsedLive?.liveSummary?.currentBowler && !bowling.some((row: [string, string, string, string, string, string]) => row[0].toUpperCase() === bowlerName)) {
    const cb = parsedLive.liveSummary.currentBowler;
    const overs = String(cb.overs || "0.0");
    const [whole, balls] = overs.split(".").map((v) => Number(v) || 0);
    const legalBalls = whole * 6 + balls;
    bowling.push([
      bowlerName,
      overs,
      String(cb.maidens || 0),
      String(cb.runs || 0),
      String(cb.wickets || 0),
      legalBalls > 0 ? (Number(cb.runs || 0) / (legalBalls / 6)).toFixed(2) : "0.00",
    ]);
  }

  // Recent deliveries - preserve all ball events in this over
  let recent: string[] = ["-", "-", "-", "-", "-", "-"];
  if (parsedLive?.recentDeliveries?.length) {
    recent = [...parsedLive.recentDeliveries];
  } else if (parsedLive?.oversByInnings?.[activeInningsNumber]?.at?.(-1)?.balls?.length) {
    const activeOvers = parsedLive.oversByInnings[activeInningsNumber];
    recent = [...activeOvers[activeOvers.length - 1].balls];
  } else if (bOvers > 0) {
    const ballsInOver = bOvers % 6 || 6;
    recent = ["0", "1", "0", "1", "4", "W"].slice(0, ballsInOver);
  }

  // Bowler extras (wides and no balls)
  let bowlerNoBalls = 0;
  let bowlerWides = 0;
  if (parsedLive?.liveSummary?.currentBowler) {
    const cb = parsedLive.liveSummary.currentBowler;
    bowlerNoBalls = Number(cb.noBalls) || 0;
    bowlerWides = Number(cb.wides) || 0;
  }
  if (Array.isArray(recent) && recent.length) {
    const nbInRecent = recent.filter((b) => /NB/i.test(b)).length;
    const wdInRecent = recent.filter((b) => /WD/i.test(b)).length;
    if (nbInRecent > bowlerNoBalls) bowlerNoBalls = nbInRecent;
    if (wdInRecent > bowlerWides) bowlerWides = wdInRecent;
  }

  const strikerStat = summary.find((row) => row[0].toUpperCase() === strikerName.toUpperCase());
  const profile = strikerStat
    ? [
        ["RUNS", strikerStat[1].replace("*", "")],
        ["BALLS", strikerStat[2]],
        ["FOURS", strikerStat[3]],
        ["SIXES", strikerStat[4]],
        ["STRIKE RATE", strikerStat[5]],
      ]
    : [["RUNS", strikerRuns], ["BALLS", strikerBalls]];
  const compare = [
    ["RUNS", strikerRuns, String(parsedLive?.liveSummary?.currentBowler?.runs ?? 0)],
    ["BALLS / OVERS", strikerBalls, bowlerOvers],
    ["STRIKE RATE / ECON", strikerStat?.[5] || "0.0", parsedLive?.liveSummary?.currentBowler?.economy?.toFixed?.(2) || "0.00"],
    ["4s / WICKETS", strikerStat?.[3] || "0", String(parsedLive?.liveSummary?.currentBowler?.wickets ?? 0)],
    ["6s / MAIDENS", strikerStat?.[4] || "0", String(parsedLive?.liveSummary?.currentBowler?.maidens ?? 0)],
  ];

  const inningsScores = [inn1, inn2].filter(Boolean).map((inning: any) => ({
    inningsNumber: inning.inningsNumber,
    teamCode: inning.teamId === match.homeTeamId
      ? getFranchiseBrand(match.homeTeam.name).code
      : getFranchiseBrand(match.awayTeam.name).code,
    teamName: inning.teamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name,
    runs: Number(inning.runs) || 0,
    wickets: Number(inning.wickets) || 0,
    overs: `${Math.floor((Number(inning.balls) || 0) / 6)}.${(Number(inning.balls) || 0) % 6}`,
  }));
  const activeOverRows = parsedLive?.oversByInnings?.[activeInningsNumber] || [];
  const scoreAtOver = (overNumber: number) => {
    const row = activeOverRows.find((item: any) => Number(String(item.overNo || "").match(/\d+/)?.[0]) === overNumber);
    return row?.score || null;
  };

  return {
    match: {
      matchId: match.id,
      teamA: battingBrand.code,
      teamB: bowlingBrand.code,
      teamAName: battingTeam.name,
      teamBName: bowlingTeam.name,
      inningsNumber: activeInningsNumber,
      inningsScores,
      resultText: match.resultText || parsedLive?.resultSummary || null,
      playerOfMatch: match.playerOfMatch || null,
      teamARoster: (battingTeam.players || []).map((player: any) => player.displayName),
      teamBRoster: (bowlingTeam.players || []).map((player: any) => player.displayName),
    },
    score: {
      runs,
      wickets,
      overs: ovStr,
      recent,
      target: target || null,
    },
    live: {
      innings: inningsLabel,
      rateText,
      strikerName,
      strikerRuns,
      strikerBalls,
      nonStrikerName,
      nonStrikerRuns,
      nonStrikerBalls,
      bowlerName,
      bowlerFigures,
      bowlerOvers,
      bowlerNoBalls: String(bowlerNoBalls),
      bowlerWides: String(bowlerWides),
      requirement,
      matchLabel: `${match.title} · MATCH ${match.matchNumber || "01"}`,
      venue: match.venue || "TU INTERNATIONAL CRICKET GROUND, KIRTIPUR",
      tossText,
      target: target ? String(target) : "-",
      phasePowerplay: scoreAtOver(6),
      phaseMiddle: scoreAtOver(15),
      phaseDeath: bOvers > 90 ? `${runs}/${wickets} (${ovStr} OV)` : null,
    },
    fow,
    profile,
    compare,
    summary: summary.length ? summary : (DEFAULT_BROADCAST_STATE.summary as any),
    bowling: bowling.length ? bowling : (DEFAULT_BROADCAST_STATE.bowling as any),
    ui: {
      graphic: null,
      scoreMode: "scorebar",
    },
  };
}

export async function syncMatchToBroadcastDb(
  client: any,
  match: any,
  parsedLive?: any,
  activeInningsOverride?: number
) {
  const generated = buildBroadcastStateFromMatch(match, parsedLive, activeInningsOverride);
  let existingState: any = null;
  try {
    const existing = await client.broadcastState.findUnique({ where: { id: "current" } });
    existingState = existing?.state;
  } catch {}

  const generatedUi = (generated.ui && typeof generated.ui === "object") ? (generated.ui as Record<string, unknown>) : {};
  const existingUi = (existingState?.ui && typeof existingState.ui === "object") ? (existingState.ui as Record<string, unknown>) : {};

  const payload: BroadcastState = {
    ...generated,
    ui: {
      ...generatedUi,
      ...existingUi,
    },
    ...(existingState?.points ? { points: existingState.points } : {}),
  };

  await client.broadcastState.upsert({
    where: { id: "current" },
    create: { id: "current", state: payload },
    update: { state: payload },
  });
  try {
    await client.broadcastEvent.create({
      data: {
        action: "autoSync",
        layer: "system",
        payload,
      },
    });
  } catch {}
  return payload;
}

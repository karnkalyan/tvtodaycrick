import { load } from "cheerio";
import { prisma } from "./prisma";
import { fetchSource } from "./npl-source";
import type { Prisma } from "@prisma/client";

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

  // Live Summary (batters, bowlers, partnership)
  let liveSummary: CricNepalParsedLiveMatch["liveSummary"] = undefined;
  if (stateRoot?.live_summary) {
    const ls = stateRoot.live_summary;
    const currentBatters = Array.isArray(ls.current_batters)
      ? ls.current_batters.map((b: any) => ({
          name: b.name || "",
          runs: Number(b.runs) || 0,
          balls: Number(b.balls) || 0,
          fours: Number(b.fours) || 0,
          sixes: Number(b.sixes) || 0,
          strikeRate: Number(b.strike_rate) || 0,
          isStriker: !!b.is_striker,
        }))
      : [];

    const currentBowler = ls.current_bowler
      ? {
          name: ls.current_bowler.name || "",
          overs: ls.current_bowler.overs ? String(ls.current_bowler.overs) : "0.0",
          runs: Number(ls.current_bowler.runs) || 0,
          wickets: Number(ls.current_bowler.wickets) || 0,
          economy: Number(ls.current_bowler.economy) || 0,
          maidens: Number(ls.current_bowler.maidens) || 0,
        }
      : null;

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
    currentInningsNumber: Number(matchObj?.current_innings_number || stateRoot?.state?.innings_number || 1),
    innings,
    liveSummary,
  };
}

/**
 * Fetches and parses a CricNepal live match from the given URL.
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

  try {
    const html = await fetchSource(cleanUrl);
    return parseCricNepalMatchHtml(html, cleanUrl);
  } catch (err) {
    // If fetch failed, try one direct fallback
    const response = await fetch(cleanUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "NPL-TVToday/1.0 (cricket data reader)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${cleanUrl}`);
    }
    const html = await response.text();
    return parseCricNepalMatchHtml(html, cleanUrl);
  }
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
  options: { forceOverwrite?: boolean } = {}
) {
  return prisma.$transaction(
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
      for (const inn of data.innings) {
        // Find batting team ID
        let battingTeamId = match.homeTeamId;
        const bName = inn.battingTeamName.toLowerCase();
        if (
          match.awayTeam.name.toLowerCase() === bName ||
          match.awayTeam.shortName.toLowerCase() === bName ||
          match.awayTeam.name.toLowerCase().includes(bName) ||
          bName.includes(match.awayTeam.shortName.toLowerCase())
        ) {
          battingTeamId = match.awayTeamId;
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

      // 4. Reconcile Live Batters and Bowler (without altering images/logos)
      if (data.liveSummary) {
        const currentInningsNum = data.currentInningsNumber || 1;
        const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players];

        // Batters
        for (const batter of data.liveSummary.currentBatters) {
          const player = allPlayers.find(
            (p) =>
              p.displayName.trim().toLowerCase() === batter.name.trim().toLowerCase() ||
              p.displayName.toLowerCase().includes(batter.name.toLowerCase()) ||
              batter.name.toLowerCase().includes(p.displayName.toLowerCase())
          );

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
          const player = allPlayers.find(
            (p) =>
              p.displayName.trim().toLowerCase() === bowler.name.trim().toLowerCase() ||
              p.displayName.toLowerCase().includes(bowler.name.toLowerCase()) ||
              bowler.name.toLowerCase().includes(p.displayName.toLowerCase())
          );

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

      // Return refreshed match
      return tx.match.findUnique({
        where: { id: match.id },
        include: {
          tournament: true,
          homeTeam: { include: { players: true } },
          awayTeam: { include: { players: true } },
          toss: { include: { winnerTeam: true } },
          innings: { include: { team: true }, orderBy: { inningsNumber: "asc" } },
          stats: { include: { player: true, team: true } },
        },
      });
    },
    { timeout: 30000 }
  );
}

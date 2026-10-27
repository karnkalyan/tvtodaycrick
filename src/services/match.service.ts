import { getNpl } from "./npl.service";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { journaledWrite, scoreUndoService, type UndoMeta } from "./score-undo.service";
import { DEFAULT_BROADCAST_STATE } from "@/lib/broadcast-state";

const matchOrdinal = (value: unknown) => {
  const text = String(value || "");
  const match = text.match(/M(?:ATCH)?\s*0*(\d+)/i);
  return match ? Number(match[1]) : null;
};

const canonicalMatchKey = (match: any) => {
  const ordinal = matchOrdinal(match.matchNumber) ?? matchOrdinal(match.title);
  if (!ordinal) return `id:${match.id}`;
  const teams = [match.homeTeamId, match.awayTeamId].map(Number).sort((a, b) => a - b).join(":");
  return `match:${ordinal}:${teams}`;
};

const canonicalPriority = (match: any) => {
  const number = String(match.matchNumber || "");
  const sourcePriority = /^Season3-M\d+$/i.test(number) ? 100 : /^Match\s*\d+$/i.test(number) ? 50 : 0;
  const statusPriority = match.status === "LIVE" ? 30 : match.status === "COMPLETED" ? 20 : 10;
  return sourcePriority + statusPriority + (Array.isArray(match.innings) ? match.innings.length : 0);
};

/** Hide legacy aliases such as Season3-M2 and Match 2 from fixture pickers. */
export function dedupeMatchAliases<T extends { id: number; matchNumber?: string | null; title?: string | null; homeTeamId: number; awayTeamId: number; status?: string; innings?: unknown[] }>(rows: T[]): T[] {
  const selected = new Map<string, T>();
  for (const row of rows) {
    const key = canonicalMatchKey(row);
    const existing = selected.get(key);
    if (!existing || canonicalPriority(row) > canonicalPriority(existing)) selected.set(key, row);
  }
  return [...selected.values()].sort((a, b) => {
    const aOrdinal = matchOrdinal(a.matchNumber) ?? 999;
    const bOrdinal = matchOrdinal(b.matchNumber) ?? 999;
    return aOrdinal - bOrdinal || a.id - b.id;
  });
}

export const matchService = {
  list: async (year = "2026") => {
    const rows = await prisma.match.findMany({
      where: { OR: [{ tournament: { season: year } }, { tournamentId: null }] },
      include: { tournament: true, homeTeam: true, awayTeam: true, winnerTeam: true, toss: { include: { winnerTeam: true } }, innings: { include: { team: true }, orderBy: { inningsNumber: "asc" } } },
      orderBy: { startTime: "asc" },
    });
    return dedupeMatchAliases(rows);
  },
  get: async (id: number) => { const match = await prisma.match.findUnique({
    where: { id },
    include: {
      tournament: true,
      homeTeam: { include: { players: { where: { isActive: true } } } }, awayTeam: { include: { players: { where: { isActive: true } } } }, winnerTeam: true,
      toss: { include: { winnerTeam: true } }, innings: { include: { team: true }, orderBy: { inningsNumber: "asc" } },
      stats: { include: { player: true, team: true }, orderBy: [{ innings: "asc" }, { runs: "desc" }] },
    },
  });
    if(!match)return null;
    const source=await getNpl(match.tournament?.season || "2026");
    for(const team of [match.homeTeam,match.awayTeam]){
      const sourceTeam=source.teams.find(t=>t.id===team.id||t.name===team.name);
      const roster=sourceTeam?.players||[];
      team.players=team.players.map(player=>{
        const registration=roster.find(r=>r.id===player.id||r.name.trim().toLocaleLowerCase()===player.displayName.trim().toLocaleLowerCase());
        return registration?{
          ...player,
          role:(registration.role||player.role) as typeof player.role,
          isCaptain:registration.isCaptain??player.isCaptain,
          imageUrl:registration.imageUrl||player.imageUrl,
        }:player;
      });
    }
    const fixture=source.fixtures.find(f=>f.number===match.matchNumber);
    return {...match,sourceScores:{home:fixture?.homeScore,away:fixture?.awayScore}};
  },
  create: (data: Prisma.MatchUncheckedCreateInput) => prisma.match.create({ data }),
  update: (id: number, data: Prisma.MatchUncheckedUpdateInput) => prisma.match.update({ where: { id }, data }),
  remove: (id: number) => prisma.match.delete({ where: { id } }),
  saveToss: (data: Prisma.TossUncheckedCreateInput, meta: UndoMeta = {}) => journaledWrite(
    { matchId: data.matchId, kind: "toss", key: "toss", defaultLabel: "Toss updated" },
    meta,
    (tx) => tx.toss.upsert({ where: { matchId: data.matchId }, create: data, update: data }),
  ),
  saveStat: (data: Prisma.PlayerMatchStatUncheckedCreateInput, meta: UndoMeta = {}) => journaledWrite(
    { matchId: data.matchId, kind: "stat", key: `stat:${data.playerId}:${data.innings ?? 1}`, defaultLabel: "Player record saved" },
    meta,
    (tx) => tx.playerMatchStat.upsert({
      where: { matchId_playerId_innings: { matchId: data.matchId, playerId: data.playerId, innings: data.innings ?? 1 } },
      create: data,
      update: data,
    }),
  ),
  saveInnings: (data: Prisma.MatchInningsUncheckedCreateInput, meta: UndoMeta = {}) => journaledWrite(
    { matchId: data.matchId, kind: "innings", key: `innings:${data.inningsNumber ?? 1}`, defaultLabel: `Innings ${data.inningsNumber ?? 1} saved` },
    meta,
    (tx) => tx.matchInnings.upsert({
      where: { matchId_inningsNumber: { matchId: data.matchId, inningsNumber: data.inningsNumber ?? 1 } },
      create: data,
      update: data,
    }),
  ),
  undoHistory: (matchId: number) => scoreUndoService.history(matchId),
  undoLast: (matchId: number) => scoreUndoService.undoLast(matchId),
  truncateMatchData: async (season?: string) => {
    const result = await prisma.$transaction(
      async (tx) => {
        const deletedEvents = await tx.scoreEvent.deleteMany({});
        const deletedStats = await tx.playerMatchStat.deleteMany({});
        const deletedInnings = await tx.matchInnings.deleteMany({});
        const deletedTosses = await tx.toss.deleteMany({});
        const matchFilter = season ? { tournament: { season } } : {};
        const resetMatches = await tx.match.updateMany({
          where: matchFilter,
          data: {
            status: "SCHEDULED",
            resultText: null,
            winnerTeamId: null,
            playerOfMatch: null,
            notes: null,
          },
        });
        const tournamentFilter = season ? { tournament: { season } } : {};
        await tx.tournamentTeam.updateMany({
          where: tournamentFilter,
          data: {
            position: null,
            played: 0,
            won: 0,
            lost: 0,
            tied: 0,
            noResult: 0,
            points: 0,
            netRunRate: 0,
          },
        });
        await (tx as any).broadcastState.upsert({
          where: { id: "current" },
          create: { id: "current", state: DEFAULT_BROADCAST_STATE as any },
          update: { state: DEFAULT_BROADCAST_STATE as any },
        });
        await (tx as any).broadcastEvent.create({
          data: {
            action: "reset",
            layer: "system",
            payload: { action: "reset", state: DEFAULT_BROADCAST_STATE } as any,
          },
        });

        return {
          deletedEvents: deletedEvents.count,
          deletedStats: deletedStats.count,
          deletedInnings: deletedInnings.count,
          deletedTosses: deletedTosses.count,
          resetMatches: resetMatches.count,
        };
      },
      { timeout: 30000 }
    );
    try {
      if (typeof (global as any).__npl_ws_reset === "function") {
        (global as any).__npl_ws_reset();
      }
    } catch { /* WebSocket may be running in another process */ }
    return result;
  },
};

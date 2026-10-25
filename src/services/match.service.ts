import { getNpl } from "./npl.service";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { journaledWrite, scoreUndoService, type UndoMeta } from "./score-undo.service";

export const matchService = {
  list: (year = "2026") => prisma.match.findMany({
    where: { OR: [{ tournament: { season: year } }, { tournamentId: null }] },
    include: { tournament: true, homeTeam: true, awayTeam: true, winnerTeam: true, toss: { include: { winnerTeam: true } }, innings: { include: { team: true }, orderBy: { inningsNumber: "asc" } } },
    orderBy: { startTime: "asc" },
  }),
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
    return prisma.$transaction(
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
        await tx.broadcastState.deleteMany({});

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
  },
};

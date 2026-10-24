import { getNpl } from "./npl.service";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
  }); if(!match)return null; const source=await getNpl(match.tournament?.season || "2026"); for(const team of [match.homeTeam,match.awayTeam]){const roster=source.teams.find(t=>t.id===team.id)?.players||[]; const people=await prisma.player.findMany({where:{id:{in:roster.flatMap(p=>p.id?[p.id]:[])}}}); team.players=people.map(p=>{const r=roster.find(r=>r.id===p.id);return {...p,teamId:team.id,role:(r?.role||p.role) as typeof p.role,isCaptain:r?.isCaptain||false,imageUrl:r?.imageUrl||null,isActive:true};});} const fixture=source.fixtures.find(f=>f.number===match.matchNumber);return {...match,sourceScores:{home:fixture?.homeScore,away:fixture?.awayScore}}; },
  create: (data: Prisma.MatchUncheckedCreateInput) => prisma.match.create({ data }),
  update: (id: number, data: Prisma.MatchUncheckedUpdateInput) => prisma.match.update({ where: { id }, data }),
  remove: (id: number) => prisma.match.delete({ where: { id } }),
  saveToss: (data: Prisma.TossUncheckedCreateInput) => prisma.toss.upsert({ where: { matchId: data.matchId }, create: data, update: data }),
  saveStat: (data: Prisma.PlayerMatchStatUncheckedCreateInput) => prisma.playerMatchStat.upsert({
    where: { matchId_playerId_innings: { matchId: data.matchId, playerId: data.playerId, innings: data.innings ?? 1 } },
    create: data,
    update: data,
  }),
  saveInnings: (data: Prisma.MatchInningsUncheckedCreateInput) => prisma.matchInnings.upsert({
    where: { matchId_inningsNumber: { matchId: data.matchId, inningsNumber: data.inningsNumber ?? 1 } },
    create: data,
    update: data,
  }),
};

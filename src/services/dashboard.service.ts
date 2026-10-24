import { prisma } from "@/lib/prisma";

export const dashboardService = {
  async get(year="2026") {
    const [franchises, teams, players, matches, liveMatches, recentMatches, tournament, topRuns, topWickets] = await Promise.all([
      prisma.franchise.count(),
      prisma.team.count(),
      prisma.player.count({ where: { isActive: true } }),
      prisma.match.count({ where: { tournament: { season: year } } }),
      prisma.match.count({ where: { status: "LIVE", tournament: { season: year } } }),
      prisma.match.findMany({ where: { tournament: { season: year } }, include: { homeTeam: true, awayTeam: true, winnerTeam: true, innings: { include: { team: true }, orderBy: { inningsNumber: "asc" } } }, orderBy: { startTime: "asc" }, take: 5 }),
      prisma.tournament.findFirst({ where: { season: year }, include: { teams: { include: { team: true }, orderBy: [{ position: "asc" }, { points: "desc" }, { netRunRate: "desc" }] } }, orderBy: { startDate: "desc" } }),
      prisma.playerMatchStat.groupBy({ where: { match: { tournament: { season: year } } }, by: ["playerId"], _sum: { runs: true, fours: true, sixes: true }, orderBy: { _sum: { runs: "desc" } }, take: 5 }),
      prisma.playerMatchStat.groupBy({ where: { match: { tournament: { season: year } } }, by: ["playerId"], _sum: { wickets: true, runsConceded: true }, orderBy: { _sum: { wickets: "desc" } }, take: 5 }),
    ]);
    const playerIds = [...new Set([...topRuns, ...topWickets].map(x => x.playerId))];
    const playerRows = await prisma.player.findMany({ where: { id: { in: playerIds } }, include: { team: true } });
    const playerMap = new Map(playerRows.map(p => [p.id, p]));
    const source = await prisma.nplSourceSnapshot.findUnique({ where: { season: year } });
    const fixtureCount = (source?.payload as { fixtures?: unknown[] } | undefined)?.fixtures?.length;
    return {
      counts: { franchises, teams, players, matches: fixtureCount ?? matches, liveMatches },
      recentMatches,
      tournament,
      topRuns: topRuns.map(row => ({ ...row, player: playerMap.get(row.playerId) })),
      topWickets: topWickets.map(row => ({ ...row, player: playerMap.get(row.playerId) })),
    };
  },
};

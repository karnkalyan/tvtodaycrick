import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const tournamentService = {
  list: () => prisma.tournament.findMany({
    where: { NOT: [{ season: "Archived preview" }, { season: { contains: "Demo" } }] },
    include: { teams: { include: { team: true }, orderBy: [{ points: "desc" }, { netRunRate: "desc" }] }, _count: { select: { matches: true } } },
    orderBy: { startDate: "desc" },
  }),
  get: (id: number) => prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: { include: { team: { include: { franchise: true } } }, orderBy: [{ position: "asc" }, { points: "desc" }] },
      matches: { include: { homeTeam: true, awayTeam: true, winnerTeam: true }, orderBy: { startTime: "asc" } },
    },
  }),
  create: (data: Prisma.TournamentCreateInput) => prisma.tournament.create({ data }),
  update: (id: number, data: Prisma.TournamentUpdateInput) => prisma.tournament.update({ where: { id }, data }),
  remove: (id: number) => prisma.tournament.delete({ where: { id } }),
};

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const teamService = {
  list: () => prisma.team.findMany({
    include: { franchise: true, _count: { select: { players: { where: { isActive: true } } } } },
    orderBy: { name: "asc" },
  }),
  get: (id: number) => prisma.team.findUnique({
    where: { id },
    include: { franchise: true, players: { where: { isActive: true }, orderBy: [{ isCaptain: "desc" }, { displayName: "asc" }] }, tournamentTeams: { include: { tournament: true } } },
  }),
  create: (data: Prisma.TeamUncheckedCreateInput) => prisma.team.create({ data, include: { franchise: true } }),
  update: (id: number, data: Prisma.TeamUncheckedUpdateInput) => prisma.team.update({ where: { id }, data, include: { franchise: true } }),
  remove: (id: number) => prisma.team.delete({ where: { id } }),
};

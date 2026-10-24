import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const playerService = {
  list: (teamId?: number, q?: string) => prisma.player.findMany({
    where: {
      isActive: true,
      ...(teamId ? { teamId } : {}),
      ...(q ? { OR: [{ displayName: { contains: q } }, { nationality: { contains: q } }] } : {}),
    },
    include: { team: { include: { franchise: true } } },
    orderBy: [{ isCaptain: "desc" }, { displayName: "asc" }],
  }),
  get: (id: number) => prisma.player.findUnique({
    where: { id },
    include: { team: { include: { franchise: true } }, stats: { include: { match: true }, orderBy: { match: { startTime: "desc" } } } },
  }),
  create: (data: Prisma.PlayerUncheckedCreateInput) => prisma.player.create({ data, include: { team: true } }),
  update: (id: number, data: Prisma.PlayerUncheckedUpdateInput) => prisma.player.update({ where: { id }, data, include: { team: true } }),
  remove: (id: number) => prisma.player.delete({ where: { id } }),
};

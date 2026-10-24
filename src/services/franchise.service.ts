import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const franchiseService = {
  list: () => prisma.franchise.findMany({ include: { teams: true }, orderBy: { name: "asc" } }),
  get: (id: number) => prisma.franchise.findUnique({ where: { id }, include: { teams: { include: { _count: { select: { players: true } } } } } }),
  create: (data: Prisma.FranchiseCreateInput) => prisma.franchise.create({ data }),
  update: (id: number, data: Prisma.FranchiseUpdateInput) => prisma.franchise.update({ where: { id }, data }),
  remove: (id: number) => prisma.franchise.delete({ where: { id } }),
};

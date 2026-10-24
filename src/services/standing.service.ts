import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
export const standingService={
 save:(data:Prisma.TournamentTeamUncheckedCreateInput)=>prisma.tournamentTeam.upsert({where:{tournamentId_teamId:{tournamentId:data.tournamentId,teamId:data.teamId}},create:data,update:data}),
 remove:(tournamentId:number,teamId:number)=>prisma.tournamentTeam.delete({where:{tournamentId_teamId:{tournamentId,teamId}}})
};

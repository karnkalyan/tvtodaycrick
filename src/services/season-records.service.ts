import { prisma } from "@/lib/prisma";
import { getNpl } from "./npl.service";

const normalizeName = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

export async function seasonTeams(year:string){const s=await getNpl(year);const rows=await prisma.team.findMany({where:{id:{in:s.teams.flatMap(t=>t.id?[t.id]:[])}},include:{franchise:true,_count:{select:{players:{where:{isActive:true}}}}}});return rows.map(row=>{const t=s.teams.find(t=>t.id===row.id)!;return {...row,logoUrl:t.logoUrl,city:t.city,_count:{players:row._count.players},franchise:row.franchise?{...row.franchise,logoUrl:t.logoUrl,ownerName:t.ownerName}:null};});}

export async function seasonPlayers(year:string,teamId?:number,q=""){
  const s=await getNpl(year);
  const sourceTeams=s.teams.filter(t=>!teamId||t.id===teamId);
  const teamIds=sourceTeams.flatMap(t=>t.id?[t.id]:[]);
  const rows=await prisma.player.findMany({
    where:{teamId:{in:teamIds},isActive:true},
    include:{team:{include:{franchise:true}}},
    orderBy:[{isCaptain:"desc"},{displayName:"asc"}],
  });
  const query=q.trim().toLocaleLowerCase();
  return rows.map(row=>{
    const sourceTeam=sourceTeams.find(t=>t.id===row.teamId);
    const registration=sourceTeam?.players.find(p=>p.id===row.id||normalizeName(p.name)===normalizeName(row.displayName));
    return {
      ...row,
      ...(registration||{}),
      id:row.id,
      teamId:row.teamId,
      displayName:registration?.name||row.displayName,
      isActive:true,
      team:sourceTeam?{...row.team,...sourceTeam,id:row.teamId}:row.team,
    };
  }).filter(p=>`${p.displayName} ${p.nationality||""}`.toLocaleLowerCase().includes(query));
}
export async function seasonFranchises(year:string){const teams=await seasonTeams(year);return teams.flatMap(t=>t.franchise?[{...t.franchise,teams:[t]}]:[]);}
export function seasonTournaments(year:string){return prisma.tournament.findMany({where:{season:year},include:{teams:{include:{team:true}},_count:{select:{matches:true}}}});}

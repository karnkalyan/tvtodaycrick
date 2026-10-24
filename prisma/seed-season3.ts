import { syncNpl } from "../src/services/npl.service";
import { prisma } from "../src/lib/prisma";
async function main(){const all=process.argv.includes("--all");for(const year of all?["2024","2025","2026"]:["2026"]){const data=await syncNpl(true,year);console.log(`Season ${data.seasonNumber} (${year}): ${data.fixtures.length} sourced fixtures, ${data.teams.length} franchises, ${data.teams.reduce((n,t)=>n+t.players.length,0)} registrations.`);}}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());

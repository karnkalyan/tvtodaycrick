import { prisma } from "../src/lib/prisma";

async function main() {
  const t = await prisma.tournament.findMany();
  console.log("Tournaments:", t.map(x => ({ id: x.id, name: x.name, season: x.season })));
  const f = await prisma.franchise.findMany({ select: { id: true, name: true, ownerName: true, logoUrl: true } });
  console.log("Franchises count:", f.length);
  const teams = await prisma.team.findMany({ select: { id: true, name: true, franchiseId: true, logoUrl: true } });
  console.log("Teams count:", teams.length);
  const pCount = await prisma.player.count();
  const activePCount = await prisma.player.count({ where: { isActive: true } });
  console.log("Total Players:", pCount, "Active:", activePCount);
  const mCount = await prisma.match.count();
  console.log("Matches:", mCount);
  const snaps = await prisma.nplSourceSnapshot.findMany({ select: { season: true, fetchedAt: true, rostersFetchedAt: true, lastError: true } });
  console.log("Snapshots:", snaps);
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { prisma } from "../src/lib/prisma";

async function main() {
  const teams = await prisma.team.findMany({
    select: {
      name: true,
      logoUrl: true,
      franchise: { select: { ownerName: true, website: true, logoUrl: true } },
    },
  });
  console.log("DB Teams & Franchises:");
  teams.forEach((t) => {
    console.log(`- ${t.name}: logoUrl="${t.logoUrl}", owner="${t.franchise?.ownerName}"`);
  });

  const players = await prisma.player.findMany({
    take: 8,
    where: { isActive: true },
    select: {
      displayName: true,
      team: { select: { name: true } },
      imageUrl: true,
      role: true,
      battingStyle: true,
      bowlingStyle: true,
      isOverseas: true,
      nationality: true,
      dateOfBirth: true,
    },
  });
  console.log("\nSample Active Players in DB (Total 129):");
  players.forEach((p) => {
    console.log(`- ${p.displayName} (${p.team.name}): role=${p.role}, nat=${p.nationality}, img=${p.imageUrl}`);
  });

  const matches = await prisma.match.findMany({
    take: 5,
    where: { tournament: { season: "2026" } },
    select: {
      matchNumber: true,
      title: true,
      stage: true,
      status: true,
      venue: true,
      startTime: true,
    },
  });
  console.log("\nSample 2026 Matches:");
  matches.forEach((m) => {
    console.log(`- ${m.matchNumber} (${m.stage}): ${m.title} @ ${m.venue} [${m.status}]`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { prisma } from '../src/lib/prisma';

async function main() {
  const matches = await prisma.match.findMany({
    select: {
      id: true,
      matchNumber: true,
      title: true,
      status: true,
      resultText: true,
      startTime: true,
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
      innings: { select: { inningsNumber: true, runs: true, wickets: true, balls: true } }
    },
    orderBy: { id: 'asc' }
  });
  console.log('Total matches:', matches.length);
  for (const m of matches) {
    const inn = m.innings.map(i => `Inn${i.inningsNumber}: ${i.runs}/${i.wickets} (${i.balls}b)`).join(', ');
    console.log(`${m.id} [${m.matchNumber}] ${m.homeTeam?.shortName} vs ${m.awayTeam?.shortName} | ${m.status} | Res: ${m.resultText || 'none'} | ${m.startTime?.toISOString()} | ${inn}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { prisma } from '../src/lib/prisma';

async function main() {
  const states = await prisma.broadcastState.findMany();
  console.log('BroadcastState count:', states.length);
  for (const s of states) {
    console.log(JSON.stringify(s, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

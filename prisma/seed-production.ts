import { syncNpl } from "../src/services/npl.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("==========================================================");
  console.log("   TV TODAY NPL CRICKET MANAGER — PRODUCTION DATABASE SEED");
  console.log("==========================================================");
  console.log("• Environment: Production");
  console.log("• Priority Data Provider: nplt20league (Official HQ Source)");
  console.log("• Target Season: 2026 (Season 3)");
  console.log("• Seeding: Franchises, Teams, Rosters, Venues, Fixtures");
  console.log("• Match Details Live Scores: FALSE (clean SCHEDULED for live sync)");
  console.log("----------------------------------------------------------");

  // Enforce no mock / pre-seeded match scores in production
  process.env.SEED_MATCH_SCORES = "false";

  try {
    const data = await syncNpl(true, "2026");
    console.log(`\n✔ Successfully seeded Season 3 (2026):`);
    console.log(`  - Tournament: ${data.name} (Season ${data.seasonNumber})`);
    console.log(`  - Franchises & Teams: ${data.teams.length} verified clubs`);
    console.log(`  - Squad Registrations: ${data.teams.reduce((n, t) => n + t.players.length, 0)} players`);
    console.log(`  - Official Fixtures: ${data.fixtures.length} matches scheduled`);
    console.log(`  - All Match Scores: Clean / Unstarted (0/0 in 0.0 ov), ready for Live Sync!`);
    console.log("==========================================================\n");
  } catch (error) {
    console.error("✘ Production seed encountered an error:", error);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

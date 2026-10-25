/**
 * Clears ALL match data and re-seeds fixtures from scratch.
 *
 * Removes : matches, innings, player match stats (runs/wickets/etc.), toss records,
 *           score-entry undo journal, broadcast live state + broadcast event log,
 *           and resets every points-table row to zero.
 * Keeps   : tournaments, franchises, teams, players (with images, bios, roles…),
 *           media library, NPL source settings.
 * Then    : re-syncs the official NPL source with SEED_MATCH_SCORES=false so
 *           Season 3 (2026) fixtures come back clean as SCHEDULED (0/0, no toss,
 *           no stats) and rosters/player images are refreshed (existing images kept).
 *
 * Usage:
 *   npm run db:reset:matches                     # clear + reseed 2026 + archives (2024/2025)
 *   npm run db:reset:matches -- --skip-seed      # clear only (boot seed step reseeds)
 *   npm run db:reset:matches -- --season-only    # reseed 2026 only
 *   npm run db:reset:matches -- --once=TOKEN     # run only once per TOKEN (used on production boot)
 */
import { prisma } from "../src/lib/prisma";
import { syncNpl } from "../src/services/npl.service";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=").trim();

// Marker rows survive resets so a given --once token never runs twice.
const MARKER_PREFIX = "system:match-data-reset:";

async function clearMatchData() {
  const before = {
    matches: await prisma.match.count(),
    innings: await prisma.matchInnings.count(),
    stats: await prisma.playerMatchStat.count(),
    tosses: await prisma.toss.count(),
  };

  await prisma.$transaction(
    async (tx) => {
      await tx.scoreEvent.deleteMany({});
      await tx.playerMatchStat.deleteMany({});
      await tx.matchInnings.deleteMany({});
      await tx.toss.deleteMany({});
      await tx.match.deleteMany({});
      await tx.tournamentTeam.updateMany({
        data: { position: null, played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, netRunRate: 0 },
      });
      await tx.broadcastState.deleteMany({});
      await tx.broadcastEvent.deleteMany({ where: { NOT: { action: { startsWith: MARKER_PREFIX } } } });
    },
    { timeout: 120000 },
  );

  // Force the next sync to rebuild fixtures instead of trusting cached snapshots.
  await prisma.nplSourceSnapshot.updateMany({ data: { lastAttemptAt: new Date(0) } });
  return before;
}

async function reseed(seasonOnly: boolean) {
  // Never pre-seed scores: fixtures must start clean for live scoring.
  process.env.SEED_MATCH_SCORES = "false";

  const data = await syncNpl(true, "2026");
  console.log(`✔ Season ${data.seasonNumber} (2026): ${data.fixtures.length} fixtures (clean SCHEDULED), ${data.teams.length} teams, ${data.teams.reduce((n, t) => n + t.players.length, 0)} players`);

  if (seasonOnly) return;
  for (const year of ["2024", "2025"]) {
    try {
      const archive = await syncNpl(true, year);
      console.log(`✔ Season ${archive.seasonNumber} (${year}) archive: ${archive.fixtures.length} official fixtures restored (results only, no scorecards)`);
    } catch (error) {
      console.warn(`⚠ Season ${year} archive could not be re-synced now (it will auto-sync when viewed):`, error instanceof Error ? error.message : error);
    }
  }
}

async function main() {
  const token = option("once");
  if (token) {
    const marker = `${MARKER_PREFIX}${token}`.slice(0, 190);
    const done = await prisma.broadcastEvent.findFirst({ where: { action: marker } });
    if (done) {
      console.log(`• Match data reset "${token}" already applied on ${done.timestamp.toISOString()} — skipping.`);
      return;
    }
  }

  console.log("==========================================================");
  console.log("   TV TODAY NPL — CLEAR ALL MATCH DATA & RESEED FIXTURES");
  console.log("==========================================================");

  const keep = {
    franchises: await prisma.franchise.count(),
    teams: await prisma.team.count(),
    players: await prisma.player.count(),
    playersWithImages: await prisma.player.count({ where: { imageUrl: { not: null } } }),
  };

  const removed = await clearMatchData();
  console.log(`✔ Cleared ${removed.matches} matches, ${removed.innings} innings, ${removed.stats} player stat rows, ${removed.tosses} tosses; standings zeroed; broadcast state reset.`);

  if (!flag("skip-seed")) await reseed(flag("season-only"));
  else console.log("• Skipping reseed (--skip-seed); the regular seed step will rebuild fixtures.");

  const after = {
    franchises: await prisma.franchise.count(),
    teams: await prisma.team.count(),
    players: await prisma.player.count(),
    playersWithImages: await prisma.player.count({ where: { imageUrl: { not: null } } }),
  };
  console.log(`✔ Preserved franchises ${keep.franchises}→${after.franchises}, teams ${keep.teams}→${after.teams}, players ${keep.players}→${after.players}, players with images ${keep.playersWithImages}→${after.playersWithImages}`);

  if (token) {
    await prisma.broadcastEvent.create({
      data: { action: `${MARKER_PREFIX}${token}`.slice(0, 190), layer: "system", payload: { token, removed } },
    });
  }
  console.log("==========================================================\n");
}

main()
  .catch((e) => {
    console.error("✘ Match data reset failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

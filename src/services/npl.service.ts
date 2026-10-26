import dns from "node:dns";
import { prisma } from "../lib/prisma";

if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
import {
  fetchSource,
  parseFixtures,
  parsePlayoffs,
  parsePlayerProfile,
  parseSquad,
  parseTeam,
  sourceUrl,
  squadLinks,
  tournamentNewsUrl,
  announcedPlayerLinks,
  publicProps,
} from "../lib/npl-source";
import { imageAvailable, verifiedLogo } from "../lib/npl-logos";
import { nplSeason, matchLabel } from "../lib/npl-seasons";
import { getSourceSettings, detectProvider } from "./npl-settings.service";
import { getFranchiseBrand } from "../lib/npl-franchises";
import {
  fetchNplT20TeamsData,
  fetchNplT20PlayersData,
  fetchNplT20MatchesData,
  fetchNplT20StandingsData,
  fetchNplT20LiveSnapshot,
  mapRole,
  mapBatting,
  mapBowling,
} from "../lib/nplt20-api";
import { downloadTeamLogo, downloadPlayerImage } from "../lib/npl-asset-manager";
import { fetchCricNepalLiveMatch, applyCricNepalMatchToDb } from "../lib/cricnepal-live";
import type { NplSeason, NplTeam, NplPlayer, NplFixture } from "../types/npl";
import type { BattingStyle, BowlingStyle, PlayerRole, Prisma } from "@prisma/client";

async function mapLimit<T, R>(items: T[], work: (item: T, index: number) => Promise<R>, limit = 4): Promise<R[]> {
  const output: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        output[index] = await work(items[index], index);
      }
    })
  );
  return output;
}

function bowling(value: string): BowlingStyle {
  if (/offbreak|off.spin/i.test(value)) return "OFF_SPIN";
  if (/legbreak|leg.spin/i.test(value)) return "LEG_SPIN";
  if (/left.arm.*orthodox/i.test(value)) return "LEFT_ARM_ORTHODOX";
  if (/left.arm.*chinaman|left.arm.*wrist/i.test(value)) return "LEFT_ARM_CHINAMAN";
  if (/left.arm.*fast/i.test(value)) return "LEFT_ARM_FAST";
  if (/left.arm.*medium/i.test(value)) return "LEFT_ARM_MEDIUM";
  if (/right.arm.*fast/i.test(value)) return "RIGHT_ARM_FAST";
  if (/right.arm.*medium/i.test(value)) return "RIGHT_ARM_MEDIUM";
  return "NONE";
}

const profiles = new Map<string, { at: number; promise: Promise<ReturnType<typeof parsePlayerProfile>> }>();
async function profile(url: string, fallback: string | null) {
  const existing = profiles.get(url);
  if (existing && Date.now() - existing.at < 3600000) return existing.promise;
  const promise = (async () => {
    const p = parsePlayerProfile(await fetchSource(url));
    const image = p.imageUrl || fallback;
    return { ...p, imageUrl: (await imageAvailable(image)) ? image : null };
  })();
  profiles.set(url, { at: Date.now(), promise });
  try {
    return await promise;
  } catch (e) {
    profiles.delete(url);
    throw e;
  }
}

function sourceStandings(html: string): NonNullable<NplSeason["standings"]> {
  let rows: any[] = [];
  function walk(x: any) {
    if (!x || typeof x !== "object") return;
    if (x.standings?.groups) rows = x.standings.groups.flatMap((g: any) => g.rows || []);
    for (const child of Object.values(x)) walk(child);
  }
  publicProps(html).forEach(walk);
  return rows
    .map((row) => ({
      name: row.team_name,
      position: Number(row.position),
      played: Number(row.played),
      won: Number(row.won),
      lost: Number(row.lost),
      tied: Number(row.tied),
      noResult: Number(row.no_result),
      points: Number(row.points),
      netRunRate: Number(row.nrr),
    }))
    .filter((row) => row.name && Object.values(row).every((value) => typeof value !== "number" || Number.isFinite(value)));
}

/**
 * Parses score strings like "130/6", "167", "131/5 (18.0)" into runs and wickets
 */
function parseScoreDetails(scoreStr?: string | null): { runs: number; wickets: number } | null {
  if (!scoreStr || typeof scoreStr !== "string") return null;
  const trimmed = scoreStr.trim();
  if (/^(?:—|-|yet to bat)$/i.test(trimmed)) return null;
  const match = trimmed.match(/^(\d+)(?:\/(\d+))?/);
  if (!match) return null;
  const runs = Number(match[1]);
  const wickets = match[2] !== undefined ? Number(match[2]) : 10;
  return { runs, wickets };
}

/**
 * Collect data from selected provider (nplt20league or cricnepal)
 */
async function collect(year: string, previous?: NplSeason, full = true): Promise<NplSeason> {
  const config = nplSeason(year);
  const settings = await getSourceSettings(year);
  const provider = settings.provider;
  const warnings: string[] = [];

  // 1. PRIMARY PROVIDER: nplt20league.com
  if (provider === "nplt20league") {
    console.log(`[NplService] Collecting season ${year} from nplt20league.com (HQ Provider)...`);
    const teams = await fetchNplT20TeamsData(true);
    const playersByTeam = await fetchNplT20PlayersData(true);

    // Attach players to each team
    for (const team of teams) {
      const brand = getFranchiseBrand(team.name);
      // Try exact name or brand name or alias
      const roster =
        playersByTeam.get(team.name) ||
        playersByTeam.get(brand.name) ||
        Array.from(playersByTeam.entries()).find(([k]) => k.toLowerCase() === team.name.toLowerCase() || k.toLowerCase().includes(team.name.toLowerCase()))?.[1] ||
        [];

      team.players = roster;
      team.playerCount = roster.length;
    }

    // Matches for the requested year
    let fixtures: NplFixture[] = [];
    try {
      fixtures = await fetchNplT20MatchesData(year);
    } catch (e) {
      if (year === "2024") {
        console.log(`[NplService] Season 2024 matches not in nplt20, falling back to cricnepal 2024 archive...`);
        const base = settings.cricnepalUrl;
        const fixtureHtml = await fetchSource(`${base}/matches`);
        fixtures = parseFixtures(fixtureHtml, base);
        for (const f of fixtures) {
          const ordinal = f.stage === "League" ? Number(f.number.match(/\d+/)?.[0]) : f.stage === "Final" ? 32 : f.stage === "Eliminator" ? 30 : /2/.test(f.stage) ? 31 : 29;
          if (ordinal) f.number = matchLabel(year, ordinal);
        }
      } else {
        throw e;
      }
    }

    let standings = await fetchNplT20StandingsData(year);
    if (!standings || standings.length === 0) {
      try {
        const tableHtml = await fetchSource(`${settings.cricnepalUrl}/points-table`);
        standings = sourceStandings(tableHtml);
      } catch {}
    }

    // Check live score updates
    try {
      const live = await fetchNplT20LiveSnapshot();
      if (live?.matches && Array.isArray(live.matches) && live.matches.length > 0) {
        for (const lm of live.matches) {
          const matchIdx = fixtures.findIndex((f) => f.sourceId === lm.ourMatchId || f.home === lm.team1?.name || f.away === lm.team2?.name);
          if (matchIdx !== -1) {
            fixtures[matchIdx].status = "LIVE";
            if (lm.team1?.score) fixtures[matchIdx].homeScore = lm.team1.score;
            if (lm.team2?.score) fixtures[matchIdx].awayScore = lm.team2.score;
          }
        }
      }
    } catch {
      // Live feed optional
    }

    const sorted = fixtures.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const startDate = sorted[0]?.startTime || new Date(`${year}-10-26T00:00:00Z`).toISOString();
    const endDate = sorted[sorted.length - 1]?.startTime || new Date(`${year}-11-21T00:00:00Z`).toISOString();

    return {
      season: year,
      seasonNumber: config.number,
      sourceProvider: "nplt20league",
      name: "Nepal Premier League",
      sourceUrl: settings.sourceUrl,
      fetchedAt: new Date().toISOString(),
      rostersFetchedAt: new Date().toISOString(),
      teams,
      fixtures: sorted,
      standings: standings.length > 0 ? standings : previous?.standings || [],
      warnings,
      startDate,
      endDate,
      statistics: {
        matches: sorted.length,
        teams: teams.length,
        venues: new Set(sorted.map((f) => f.venue)).size,
        league: sorted.filter((f) => f.stage === "League").length,
        playoffs: sorted.filter((f) => f.stage !== "League").length,
        players: teams.reduce((n, t) => n + t.players.length, 0),
      },
    };
  }

  // 2. ALTERNATIVE PROVIDER: cricnepal.com (with High-Res Asset Enrichment from nplt20league)
  console.log(`[NplService] Collecting season ${year} from cricnepal.com with nplt20league image enrichment...`);
  const base = settings.cricnepalUrl;
  const fixtureHtml = await fetchSource(`${base}/matches`);
  const fixtures = parseFixtures(fixtureHtml, base);

  if (year === "2026" && !fixtures.some((f) => f.stage !== "League") && settings.secondaryUrl) {
    fixtures.push(...parsePlayoffs(await fetchSource(settings.secondaryUrl), fixtures[0].venue));
    warnings.push("Playoff dates use supplementary schedule; participants remain unannounced.");
  }

  for (const f of fixtures) {
    const ordinal = f.stage === "League" ? Number(f.number.match(/\d+/)?.[0]) : f.stage === "Final" ? 32 : f.stage === "Eliminator" ? 30 : /2/.test(f.stage) ? 31 : 29;
    if (ordinal) f.number = matchLabel(year, ordinal);
  }

  let teams = previous?.teams || [];
  let standings = previous?.standings;

  if (full || !teams.length) {
    const [squadHtml, tableHtml] = await Promise.all([fetchSource(`${base}/squads`), fetchSource(`${base}/points-table`)]);
    const links = squadLinks(squadHtml, base);
    if (links.length !== 8) throw new Error(`Expected eight ${year} squad sources; previous records preserved`);

    standings = sourceStandings(tableHtml);

    // Fetch nplt20 assets map to enrich Cricnepal's low-quality images
    let nplt20PlayersMap: Map<string, NplPlayer[]> | null = null;
    let nplt20TeamsList: NplTeam[] | null = null;
    try {
      nplt20TeamsList = await fetchNplT20TeamsData(true);
      nplt20PlayersMap = await fetchNplT20PlayersData(true);
    } catch (e) {
      console.warn("[NplService] Could not pre-fetch nplt20 high-res assets for enrichment:", e);
    }

    teams = await mapLimit(
      links,
      async (squadUrl) => {
        const squad = parseSquad(await fetchSource(squadUrl));
        const slug = squadUrl.split("/").pop()!.replace(/-\d+$/, "");
        const profileUrl = sourceUrl(`/team/${slug}/profile`);
        const teamProfile = parseTeam(await fetchSource(profileUrl));

        const brand = getFranchiseBrand(squad.name);

        // Find high-res logo from nplt20
        const nplTeamMatch = nplt20TeamsList?.find((t) => t.name.toLowerCase() === squad.name.toLowerCase() || t.shortName === brand.shortName);
        let finalLogoUrl = nplTeamMatch?.logoUrl || (year === "2026" ? (await verifiedLogo(squad.name, teamProfile.logoUrl, profileUrl)).logoUrl : teamProfile.logoUrl);

        // Match players and swap in crisp nplt20 photos
        const players = await mapLimit(
          squad.players,
          async (player) => {
            const p = await profile(player.sourceUrl, player.imageUrl);

            // Find matching high-res image from nplt20
            let highResImage = p.imageUrl;
            if (nplt20PlayersMap) {
              for (const roster of nplt20PlayersMap.values()) {
                const found = roster.find(
                  (np) => np.name.toLowerCase() === player.name.toLowerCase() || (np.name && player.name && (np.name.includes(player.name) || player.name.includes(np.name)))
                );
                if (found?.imageUrl) {
                  highResImage = found.imageUrl;
                  break;
                }
              }
            }

            return {
              ...player,
              nationality: p.nationality,
              imageUrl: highResImage,
              jerseyNumber: p.jerseyNumber,
              dateOfBirth: p.dateOfBirth,
            };
          },
          3
        );

        return {
          ...teamProfile,
          logoUrl: finalLogoUrl,
          logoSourceUrl: profileUrl,
          name: squad.name,
          shortName: brand.shortName || squad.name.split(" ").map((w) => w[0]).join(""),
          primaryColor: brand.primaryColor,
          secondaryColor: brand.secondaryColor,
          sourceUrl: profileUrl,
          squadUrl,
          players,
          playerCount: players.length,
        };
      },
      2
    );

    // News signings for 2026
    if (year === "2026") {
      try {
        const news = JSON.parse(await fetchSource(tournamentNewsUrl(fixtureHtml))) as { items: { title: string; url: string; date: string }[] };
        if (Array.isArray(news.items)) {
          for (const item of news.items.filter((n) => n.date.startsWith(year) && /joins|returns to|signs|signed|releases|withdraws|pulls out/i.test(n.title) && !/coach/i.test(n.title)).sort((a, b) => a.date.localeCompare(b.date))) {
            const team = teams.find((t) => item.title.includes(t.name));
            if (!team) continue;
            for (const link of announcedPlayerLinks(await fetchSource(sourceUrl(item.url)), item.title)) {
              if (/releases|withdraws|pulls out/i.test(item.title)) {
                team.players = team.players.filter((p) => p.sourceUrl !== link.url);
                continue;
              }
              if (team.players.some((p) => p.sourceUrl === link.url)) continue;
              const p = await profile(link.url, null);
              if (!p.role) continue;
              team.players.push({
                name: p.name,
                sourceUrl: link.url,
                registrationUrl: item.url,
                jerseyNumber: p.jerseyNumber,
                dateOfBirth: p.dateOfBirth,
                role: p.role,
                batting: p.batting,
                bowling: p.bowling,
                nationality: p.nationality,
                imageUrl: p.imageUrl,
                isCaptain: false,
                isOverseas: p.nationality !== null && p.nationality !== "Nepal",
              });
            }
          }
        }
      } catch {
        // News parsing non-critical
      }
    }

    teams.forEach((t) => {
      t.playerCount = t.players.length;
    });
  }

  const sorted = fixtures.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return {
    season: year,
    seasonNumber: config.number,
    sourceProvider: "cricnepal",
    name: "Nepal Premier League",
    sourceUrl: base,
    fetchedAt: new Date().toISOString(),
    rostersFetchedAt: full || !previous ? new Date().toISOString() : previous.rostersFetchedAt,
    teams,
    fixtures: sorted,
    standings,
    warnings,
    startDate: sorted[0]?.startTime,
    endDate: sorted[sorted.length - 1]?.startTime,
    statistics: {
      matches: fixtures.length,
      teams: teams.length,
      venues: new Set(fixtures.map((f) => f.venue)).size,
      league: fixtures.filter((f) => f.stage === "League").length,
      playoffs: fixtures.filter((f) => f.stage !== "League").length,
      players: teams.reduce((n, t) => n + t.players.length, 0),
    },
  };
}

/**
 * Persist collected season data into MySQL tables with full consistency
 */
async function persist(data: NplSeason, full: boolean) {
  const year = data.season;
  const config = nplSeason(year);

  await prisma.$transaction(
    async (tx) => {
      const tournamentData = {
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        venue: data.fixtures[0]?.venue || "Tribhuvan University International Cricket Ground, Kirtipur",
        description: `Season ${config.number} (${year}). Source Provider: ${data.sourceProvider || "nplt20league"} (${data.sourceUrl})`,
      };

      const tournament = await tx.tournament.upsert({
        where: { name_season: { name: data.name, season: year } },
        create: { name: data.name, shortName: "NPL", season: year, ...tournamentData },
        update: tournamentData,
      });
      data.tournamentId = tournament.id;
      const teamIdMap = new Map<string, number>();

      // 1. Teams & Franchises
      for (const t of data.teams) {
        let team = await tx.team.findFirst({
          where: {
            OR: [
              { name: t.name },
              ...(t.name === "Kathmandu Gorkhas" ? [{ name: "Kathmandu Gurkhas" }] : []),
              ...(t.name === "Kathmandu Gurkhas" ? [{ name: "Kathmandu Gorkhas" }] : []),
            ],
          },
        });

        const brand = getFranchiseBrand(t.name);
        const existingFranchise = team ? await tx.franchise.findUnique({ where: { id: team.franchiseId } }) : null;
        const franchiseData = {
          name: `${t.name} Franchise`,
          shortName: t.shortName || existingFranchise?.shortName || brand.shortName,
          ownerName: t.ownerName || existingFranchise?.ownerName || brand.ownerName,
          logoUrl: (existingFranchise?.logoUrl && !existingFranchise.logoUrl.includes("placeholder"))
            ? existingFranchise.logoUrl
            : (t.logoUrl || brand.logoFallback),
          website: t.website || existingFranchise?.website || brand.website,
          description: existingFranchise?.description || `Ownership: ${t.ownerName || brand.ownerName}. Source: ${t.sourceUrl}.`,
          address: t.city ? `${t.city}, Nepal` : `${brand.city}, Nepal`,
        };

        const franchise = team
          ? await tx.franchise.update({ where: { id: team.franchiseId }, data: franchiseData })
          : await tx.franchise.upsert({ where: { name: franchiseData.name }, create: franchiseData, update: franchiseData });

        const teamData = {
          franchiseId: franchise.id,
          name: t.name,
          shortName: t.shortName || team?.shortName || brand.shortName,
          primaryColor: team?.primaryColor || brand.primaryColor,
          secondaryColor: team?.secondaryColor || brand.secondaryColor,
          accentColor: team?.accentColor || brand.accentColor,
          themeName: team?.themeName || brand.themeName,
          slogan: team?.slogan || brand.slogan,
          logoUrl: (team?.logoUrl && !team.logoUrl.includes("placeholder"))
            ? team.logoUrl
            : (t.logoUrl || brand.logoFallback),
          city: t.city || team?.city || brand.city,
          country: "Nepal",
          description: team?.description || `NPL ${year} Squad. Ground: ${t.venueName || brand.city}`,
          homeGround: team?.homeGround || t.venueName || data.fixtures[0]?.venue || "Tribhuvan University Cricket Ground",
        };

        team = team ? await tx.team.update({ where: { id: team.id }, data: teamData }) : await tx.team.create({ data: teamData });
        t.id = team.id;
        t.primaryColor = team.primaryColor;
        t.secondaryColor = team.secondaryColor;
        teamIdMap.set(t.name, team.id);
        teamIdMap.set(brand.name, team.id);

        // Standings
        const standing = data.standings?.find((s) => s.name === t.name || s.name === brand.name);
        const standingData = standing
          ? {
              position: standing.position,
              played: standing.played,
              won: standing.won,
              lost: standing.lost,
              tied: standing.tied,
              noResult: standing.noResult,
              points: standing.points,
              netRunRate: standing.netRunRate,
            }
          : {};

        await tx.tournamentTeam.upsert({
          where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: team.id } },
          create: { tournamentId: tournament.id, teamId: team.id, ...standingData },
          update: standingData,
        });

        // 2. Players
        if (full) {
          if (year === "2026") {
            await tx.player.updateMany({ where: { teamId: team.id }, data: { isActive: false } });
          }

          for (const p of t.players) {
            const parts = p.name.trim().split(" ");
            const firstName = parts[0] || p.name;
            const lastName = parts.slice(1).join(" ") || "";

            const existingPlayer = await tx.player.findFirst({
              where: { teamId: team.id, displayName: p.name },
            });

            // Preserve existing high-res or custom player photo if new source lacks it
            const finalImageUrl = (existingPlayer?.imageUrl && !p.imageUrl)
              ? existingPlayer.imageUrl
              : (p.imageUrl || existingPlayer?.imageUrl || null);

            const personData = {
              firstName,
              lastName,
              displayName: p.name,
              jerseyNumber: p.jerseyNumber ?? existingPlayer?.jerseyNumber ?? null,
              dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : (existingPlayer?.dateOfBirth ?? null),
              nationality: p.nationality || existingPlayer?.nationality || "Nepal",
              imageUrl: finalImageUrl,
            };

            const registration = {
              role: (p.role as PlayerRole) || existingPlayer?.role || "BATSMAN",
              battingStyle: (/left/i.test(p.batting) ? "LEFT_HAND" : /right/i.test(p.batting) ? "RIGHT_HAND" : null) as BattingStyle | null,
              bowlingStyle: bowling(p.bowling),
              isCaptain: p.isCaptain ?? existingPlayer?.isCaptain ?? false,
              isOverseas: p.isOverseas ?? existingPlayer?.isOverseas ?? false,
              isWicketKeeper: p.role === "WICKET_KEEPER" || /wicket|keeper|wk/i.test(p.role) || existingPlayer?.isWicketKeeper || false,
              isActive: year === "2026",
              bio: p.bio || existingPlayer?.bio || `Season ${config.number} (${year}) Squad for ${t.name}. Source: ${p.sourceUrl}`,
            };

            const player = await tx.player.upsert({
              where: { teamId_displayName: { teamId: team.id, displayName: p.name } },
              create: { ...personData, ...registration, teamId: team.id },
              update: year === "2026" ? { ...personData, ...registration } : personData,
            });
            p.id = player.id;
          }
        } else {
          // Lightweight fixture refreshes must retain database IDs in the cached
          // roster. Score entry and season APIs require these IDs for selections.
          const existingPlayers = await tx.player.findMany({
            where: { teamId: team.id, isActive: true },
            select: { id: true, displayName: true },
          });
          for (const p of t.players) {
            p.id = existingPlayers.find(
              (row) => row.displayName.trim().toLocaleLowerCase() === p.name.trim().toLocaleLowerCase(),
            )?.id;
          }
        }
      }

      // Clean preview fixtures if replacing with sourced records
      if (year === "2026") {
        const preview = await tx.tournament.findFirst({ where: { name: data.name, season: "2026 S3 Preview" } });
        if (preview) {
          await tx.match.deleteMany({ where: { tournamentId: preview.id, notes: { contains: "MOCK fixture" } } });
          await tx.tournament.update({ where: { id: preview.id }, data: { season: "Archived preview", description: "Archived generated preview." } });
        }
      }

      // 3. Matches and Innings
      for (const f of data.fixtures) {
        const homeTeamId = teamIdMap.get(f.home);
        const awayTeamId = teamIdMap.get(f.away);
        if (!homeTeamId || !awayTeamId || f.status === "UNKNOWN") continue;

        const matchNumber = f.number;
        const ordinal = Number(matchNumber.match(/M(\d+)$/)?.[1]);

        const shouldSeedScores = process.env.SEED_MATCH_SCORES !== "false";
        let winnerTeamId: number | null = null;
        let matchStatus = f.status as "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED";
        let matchResultText = f.result;

        // In production (or when SEED_MATCH_SCORES is false), 2026 upcoming matches stay clean SCHEDULED without scores
        if (!shouldSeedScores && year === "2026") {
          winnerTeamId = null;
          matchStatus = "SCHEDULED";
          matchResultText = null;
        } else if (f.result) {
          if (f.result.includes(f.home)) winnerTeamId = homeTeamId;
          else if (f.result.includes(f.away)) winnerTeamId = awayTeamId;
        }

        const matchData = {
          matchNumber,
          title: `${f.home} vs ${f.away}`,
          stage: f.stage === "League" ? ("LEAGUE" as const) : f.stage === "Final" ? ("FINAL" as const) : f.stage === "Eliminator" ? ("ELIMINATOR" as const) : ("QUALIFIER" as const),
          venue: f.venue,
          startTime: new Date(f.startTime),
          status: matchStatus,
          homeTeamId,
          awayTeamId,
          winnerTeamId,
          resultText: matchResultText,
          notes: `Source ID: ${f.sourceId}\nProvider: ${data.sourceProvider || "nplt20league"}\nSource: ${f.sourceUrl}\nChecked: ${data.fetchedAt}`,
        };

        const exists = await tx.match.findFirst({
          where: {
            tournamentId: tournament.id,
            OR: [{ matchNumber }, { matchNumber: `SOURCE-${f.sourceId}` }, ...(year === "2026" ? [{ matchNumber: `Match ${ordinal}` }] : [])],
          },
          include: { innings: true },
        });

        if (exists && (exists.status === "LIVE" || exists.status === "COMPLETED" || exists.innings.length > 0)) {
          // Preserve ongoing or finished match state! Do not revert to SCHEDULED.
          matchData.status = exists.status;
          matchData.winnerTeamId = exists.winnerTeamId ?? matchData.winnerTeamId;
          matchData.resultText = exists.resultText ?? matchData.resultText;
        }

        const savedMatch = exists ? await tx.match.update({ where: { id: exists.id }, data: matchData }) : await tx.match.create({ data: { ...matchData, tournamentId: tournament.id, matchNumber } });

        // Record MatchInnings if scores are present and score seeding is enabled
        const homeParsed = shouldSeedScores ? parseScoreDetails(f.homeScore) : null;
        if (homeParsed) {
          await tx.matchInnings.upsert({
            where: { matchId_inningsNumber: { matchId: savedMatch.id, inningsNumber: 1 } },
            create: {
              matchId: savedMatch.id,
              teamId: homeTeamId,
              inningsNumber: 1,
              runs: homeParsed.runs,
              wickets: homeParsed.wickets,
              status: f.status === "COMPLETED" ? "COMPLETED" : "LIVE",
            },
            update: {
              runs: homeParsed.runs,
              wickets: homeParsed.wickets,
              status: f.status === "COMPLETED" ? "COMPLETED" : "LIVE",
            },
          });
        }

        const awayParsed = shouldSeedScores ? parseScoreDetails(f.awayScore) : null;
        if (awayParsed) {
          await tx.matchInnings.upsert({
            where: { matchId_inningsNumber: { matchId: savedMatch.id, inningsNumber: 2 } },
            create: {
              matchId: savedMatch.id,
              teamId: awayTeamId,
              inningsNumber: 2,
              runs: awayParsed.runs,
              wickets: awayParsed.wickets,
              target: homeParsed ? homeParsed.runs + 1 : null,
              status: f.status === "COMPLETED" ? "COMPLETED" : "LIVE",
            },
            update: {
              runs: awayParsed.runs,
              wickets: awayParsed.wickets,
              target: homeParsed ? homeParsed.runs + 1 : null,
              status: f.status === "COMPLETED" ? "COMPLETED" : "LIVE",
            },
          });
        }
      }

      // 4. Source snapshot
      const payload = JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
      const metadata = {
        payload,
        fetchedAt: new Date(data.fetchedAt),
        rostersFetchedAt: new Date(data.rostersFetchedAt),
        lastAttemptAt: new Date(),
        lastError: null,
      };
      await tx.nplSourceSnapshot.upsert({
        where: { season: year },
        create: { season: year, ...metadata },
        update: metadata,
      });
    },
    { timeout: 90000 }
  );

  return data;
}

const globalSync = globalThis as unknown as { nplSyncBySeason?: Map<string, Promise<NplSeason>> };

export async function syncNpl(full = true, year = "2026"): Promise<NplSeason> {
  nplSeason(year);
  const pending = (globalSync.nplSyncBySeason ??= new Map());
  if (pending.has(year)) return pending.get(year)!;

  const work = (async () => {
    const saved = await prisma.nplSourceSnapshot.findUnique({ where: { season: year } });
    try {
      return await persist(await collect(year, saved?.payload as unknown as NplSeason | undefined, full || !saved), full || !saved);
    } catch (error) {
      if (saved) {
        await prisma.nplSourceSnapshot.update({
          where: { season: year },
          data: { lastAttemptAt: new Date(), lastError: error instanceof Error ? error.message : "Source refresh failed" },
        });
      }
      throw error;
    }
  })();

  pending.set(year, work);
  try {
    return await work;
  } finally {
    pending.delete(year);
  }
}

export async function getNpl(year = "2026"): Promise<NplSeason> {
  nplSeason(year);
  const saved = await prisma.nplSourceSnapshot.findUnique({ where: { season: year } });
  if (!saved) return syncNpl(true, year);

  const interval = year === "2026" ? 60000 : 24 * 3600000;
  if (Date.now() - saved.lastAttemptAt.getTime() > interval) {
    try {
      return await syncNpl(Date.now() - saved.rostersFetchedAt.getTime() > 6 * 3600000, year);
    } catch (error) {
      return { ...(saved.payload as unknown as NplSeason), error: error instanceof Error ? error.message : "Refresh failed" };
    }
  }
  return { ...(saved.payload as unknown as NplSeason), error: saved.lastError };
}

const lastLiveWarnByMatch = new Map<number, number>();

/**
 * Lightweight real-time live score update (called by Auto-Sync)
 * CricNepal is primary live provider.
 */
export async function syncLiveScoresOnly(year = "2026"): Promise<{ live: boolean; updated: number; timestamp: string }> {
  try {
    let updatedCount = 0;
    let hasLive = false;

    // 1. PRIMARY: CricNepal Live Sync
    // First prioritize matches that are currently marked LIVE, otherwise the next scheduled match
    const liveMatches = await prisma.match.findMany({
      where: {
        tournament: { season: year },
        status: "LIVE",
      },
    });

    const candidateMatches =
      liveMatches.length > 0
        ? liveMatches
        : await prisma.match.findMany({
            where: {
              tournament: { season: year },
              status: "SCHEDULED",
            },
            orderBy: { startTime: "asc" },
            take: 2,
          });

    for (const m of candidateMatches) {
      let sourceUrl = "";
      if (m.notes) {
        const matchUrlLine = m.notes.match(/Source:\s*(https?:\/\/[^\s]+cricnepal\.com\/match\/[^\s\r\n]+)/i);
        if (matchUrlLine) sourceUrl = matchUrlLine[1].trim();
      }
      if (
        !sourceUrl &&
        year === "2026" &&
        (m.matchNumber === "Season3-M1" || m.matchNumber === "Match 1" || m.title.toLowerCase().includes("lumbini"))
      ) {
        sourceUrl = "https://www.cricnepal.com/match/lumbini-lions-vs-sudurpaschim-royals-match-1-nepal-premier-league-2026";
      }

      if (sourceUrl) {
        try {
          const parsed = await fetchCricNepalLiveMatch(sourceUrl);
          if (parsed) {
            await applyCricNepalMatchToDb(m.id, parsed);
            updatedCount++;
            if (parsed.status === "LIVE") hasLive = true;
          }
        } catch (err) {
          const now = Date.now();
          const lastWarn = lastLiveWarnByMatch.get(m.id) || 0;
          if (now - lastWarn > 60000) {
            lastLiveWarnByMatch.set(m.id, now);
            const msg = (err as any)?.cause?.message || (err instanceof Error ? err.message : String(err));
            console.warn(`[NplService] CricNepal sync skipped for match ${m.id} (${sourceUrl}):`, msg);
          }
        }
      }
    }

    // 2. SECONDARY / FALLBACK: nplt20 snapshot if no CricNepal match was live
    if (!hasLive) {
      try {
        const snapshot = await fetchNplT20LiveSnapshot();
        const liveMatches = snapshot?.matches || [];
        if (Array.isArray(liveMatches) && liveMatches.length > 0) {
          for (const lm of liveMatches) {
            const match = await prisma.match.findFirst({
              where: {
                OR: [
                  { title: { contains: lm.team1?.name } },
                  { title: { contains: lm.team2?.name } },
                ],
              },
            });
            if (match) {
              await prisma.match.update({
                where: { id: match.id },
                data: {
                  status: "LIVE",
                  notes: `Live Score Update: ${lm.team1?.name} ${lm.team1?.score || ""} vs ${lm.team2?.name} ${lm.team2?.score || ""}`,
                },
              });
              updatedCount++;
              hasLive = true;
            }
          }
        }
      } catch {
        // Fallback optional
      }
    }

    return {
      live: hasLive,
      updated: updatedCount,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      live: false,
      updated: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export function seasonSlice(data: NplSeason, params: URLSearchParams): NplSeason {
  const view = params.get("view");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(24, Math.max(1, Number(params.get("limit")) || 8));
  const team = params.get("team") || "";
  const query = (params.get("q") || "").toLowerCase();

  if (!view) return data;

  const teams = data.teams.map((t) => ({ ...t, playerCount: t.players.length, players: [] as NplPlayer[] }));
  const output = { ...data, teams, fixtures: [] as typeof data.fixtures };

  if (view === "squads") {
    const players = data.teams
      .filter((t) => !team || t.name === team || String(t.id) === team)
      .flatMap((t) => t.players.filter((p) => `${p.name} ${p.nationality || ""}`.toLowerCase().includes(query)).map((p) => ({ team: t.name, player: p })));
    const selected = players.slice((page - 1) * pageSize, page * pageSize);
    for (const t of teams) t.players = selected.filter((p) => p.team === t.name).map((p) => p.player);
    output.pagination = { page, pageSize, total: players.length, totalPages: Math.max(1, Math.ceil(players.length / pageSize)) };
  } else if (view === "schedule") {
    const stage = params.get("stage") || "all";
    const fixtures = data.fixtures.filter((f) => (!team || f.home === team || f.away === team) && (stage === "all" || (stage === "league" ? f.stage === "League" : f.stage !== "League")));
    output.fixtures = fixtures.slice((page - 1) * pageSize, page * pageSize);
    output.pagination = { page, pageSize, total: fixtures.length, totalPages: Math.max(1, Math.ceil(fixtures.length / pageSize)) };
  } else if (view === "home") {
    output.fixtures = [...data.fixtures.filter((f) => f.status === "LIVE"), ...data.fixtures.filter((f) => f.status === "SCHEDULED"), ...data.fixtures.filter((f) => f.status === "COMPLETED").reverse()].slice(0, 4);
  }
  return output;
}

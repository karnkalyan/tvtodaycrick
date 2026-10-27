import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NPL_FRANCHISE_BRANDS } from "@/lib/npl-franchises";
import { dedupeMatchAliases } from "@/services/match.service";

export const dynamic = "force-dynamic";

const TEAM_SLUG_MAP: Record<string, string> = {
  KAG: "kathmandu-gurkhas",
  JAB: "janakpur-bolts",
  CHR: "chitwan-rhinos",
  KAY: "karnali-yaks",
  LUL: "lumbini-lions",
  POA: "pokhara-avengers",
  BIK: "biratnagar-kings",
  SPR: "sudurpaschim-royals",
};

export async function GET() {
  try {
    // 1. Fetch Teams with active Players
    const teams = await prisma.team.findMany({
      include: {
        franchise: true,
        players: {
          where: { isActive: true },
          orderBy: [{ isCaptain: "desc" }, { displayName: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    });

    // 2. Fetch Season 3 (2026) Matches or active tournament matches
    const activeTournament = await prisma.tournament.findFirst({
      where: { season: "2026" },
    });

    const rawMatches = await prisma.match.findMany({
      where: activeTournament ? { tournamentId: activeTournament.id } : undefined,
      orderBy: [{ id: "asc" }],
      include: {
        homeTeam: true,
        awayTeam: true,
        tournament: true,
        toss: {
          include: { winnerTeam: true },
        },
        innings: {
          orderBy: { inningsNumber: "asc" },
        },
      },
    });

    // Use the same canonical fixture selection as Score Entry. This prevents
    // legacy aliases (e.g. Match 2 vs Season3-M2) from racing the broadcast
    // controller with different player/stat records.
    const matches = dedupeMatchAliases(rawMatches);

    // 3. Fetch Tournament Standings (Points Table) - deduplicated by distinct franchise
    const activeTournamentId = activeTournament?.id || 3;
    let rawStandings = await prisma.tournamentTeam.findMany({
      where: { tournamentId: activeTournamentId },
      orderBy: [{ points: "desc" }, { netRunRate: "desc" }],
      include: {
        team: true,
      },
    });

    // If active tournament has no standings records yet, create clean 0-played standings for all 8 franchises
    if (!rawStandings.length) {
      const allTeams = await prisma.team.findMany({
        take: 8,
        orderBy: { name: "asc" },
      });
      rawStandings = allTeams.map((t, idx) => ({
        id: idx + 1,
        tournamentId: activeTournamentId,
        teamId: t.id,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        noResult: 0,
        points: 0,
        netRunRate: 0.0,
        team: t,
      })) as any;
    }

    // Deduplicate by team code to prevent any duplicate franchise entries
    const seenTeamCodes = new Set<string>();
    const standings: typeof rawStandings = [];
    for (const s of rawStandings) {
      const code = s.team?.shortName || s.team?.name;
      if (code && !seenTeamCodes.has(code)) {
        seenTeamCodes.add(code);
        standings.push(s);
      }
    }

    // Build enriched payload
    const enrichedTeams = teams.map((t) => {
      const brand = Object.values(NPL_FRANCHISE_BRANDS).find(
        (b) => b.code === t.shortName || b.name.toLowerCase() === t.name.toLowerCase()
      );
      const code = brand?.code || t.shortName || "KAG";
      const slug = TEAM_SLUG_MAP[code] || t.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const logoUrl = `/images/teams/${slug}/logo.png`;

      const players = t.players.map((p) => {
        const playerSlug = p.displayName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const localPhoto = p.imageUrl || `/images/teams/${slug}/players/${playerSlug}.webp`;
        return {
          id: p.id,
          name: p.displayName.toUpperCase(),
          displayName: p.displayName,
          role: p.role,
          battingStyle: p.battingStyle || "Right-hand bat",
          bowlingStyle: p.bowlingStyle || "Right-arm medium",
          jerseyNumber: p.jerseyNumber || 0,
          isCaptain: p.isCaptain,
          isWicketKeeper: p.isWicketKeeper,
          imageUrl: localPhoto,
        };
      });

      return {
        id: t.id,
        name: t.name,
        code,
        shortName: t.shortName,
        slug,
        primaryColor: brand?.primaryColor || t.primaryColor || "#1d4ed8",
        secondaryColor: brand?.secondaryColor || t.secondaryColor || "#f59e0b",
        logoUrl,
        players,
      };
    });

    return NextResponse.json({
      success: true,
      teams: enrichedTeams,
      matches: matches.map((m) => {
        const inn1 = m.innings.find((i) => i.inningsNumber === 1);
        const inn2 = m.innings.find((i) => i.inningsNumber === 2);
        const homeInnings = m.innings.find((i) => i.teamId === m.homeTeamId);
        const awayInnings = m.innings.find((i) => i.teamId === m.awayTeamId);
        const inningsStarted = (innings: typeof inn1) => Boolean(innings && (
          innings.status !== "NOT_STARTED"
          || innings.runs > 0
          || innings.wickets > 0
          || innings.balls > 0
        ));
        const activeInnings = m.innings.find((i) => i.status === "LIVE")
          || (inningsStarted(inn2) ? inn2 : inn1);
        const effectiveStatus = m.innings.some((i) => i.status === "LIVE") ? "LIVE" : m.status;
        const scoreText = (innings: typeof inn1) => innings
          ? `${innings.runs}/${innings.wickets} (${Math.floor(innings.balls / 6)}.${innings.balls % 6} ov)`
          : null;
        const inningsData = (innings: typeof inn1) => innings ? {
          runs: innings.runs,
          wickets: innings.wickets,
          balls: innings.balls,
          overs: `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`,
          target: innings.target,
          status: innings.status,
          teamId: innings.teamId,
          teamCode: innings.teamId === m.homeTeamId ? m.homeTeam.shortName : m.awayTeam.shortName,
          teamName: innings.teamId === m.homeTeamId ? m.homeTeam.name : m.awayTeam.name,
        } : null;
        return {
          id: m.id,
          name: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
          title: m.title || `${m.homeTeam.name} vs ${m.awayTeam.name}`,
          matchNumber: m.matchNumber || `M${m.id}`,
          stage: m.stage,
          homeTeam: m.homeTeam.name,
          homeTeamCode: m.homeTeam.shortName,
          awayTeam: m.awayTeam.name,
          awayTeamCode: m.awayTeam.shortName,
          venue: m.venue || "TU Cricket Ground, Kirtipur",
          startTime: m.startTime,
          status: effectiveStatus,
          storedStatus: m.status,
          tossWinner: m.toss?.winnerTeam?.name || null,
          tossDecision: m.toss?.decision || null,
          homeScore: scoreText(homeInnings),
          awayScore: scoreText(awayInnings),
          activeInningsNumber: activeInnings?.inningsNumber || 1,
          inn1Data: inningsData(inn1),
          inn2Data: inningsData(inn2),
          resultText: m.resultText || null,
        };
      }),
      standings: standings.map((s, idx) => ({
        position: idx + 1,
        teamName: s.team.name,
        teamCode: s.team.shortName,
        played: s.played,
        won: s.won,
        lost: s.lost,
        points: s.points,
        netRunRate: s.netRunRate.toFixed(3),
      })),
    });
  } catch (error) {
    console.error("GET /api/broadcast/npl-data error:", error);
    return NextResponse.json(
      { error: "Failed to load NPL broadcast data" },
      { status: 500 }
    );
  }
}

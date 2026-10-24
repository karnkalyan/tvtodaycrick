import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NPL_FRANCHISE_BRANDS } from "@/lib/npl-franchises";

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

    // Deduplicate and sort matches strictly by Match Number (Match 1, Match 2, ... Match 30)
    function parseMatchNum(str?: string | null): number {
      if (!str) return 999;
      const m = str.match(/M(\d+)/i) || str.match(/Match\s*(\d+)/i) || str.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 999;
    }

    const seenNums = new Set<number>();
    const matches: typeof rawMatches = [];
    for (const m of rawMatches) {
      const num = parseMatchNum(m.matchNumber);
      if (!seenNums.has(num)) {
        seenNums.add(num);
        matches.push(m);
      }
    }
    matches.sort((a, b) => parseMatchNum(a.matchNumber) - parseMatchNum(b.matchNumber));

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
          status: m.status,
          tossWinner: m.toss?.winnerTeam?.name || null,
          tossDecision: m.toss?.decision || null,
          homeScore: inn1 ? `${inn1.runs}/${inn1.wickets} (${inn1.balls > 0 ? `${Math.floor(inn1.balls / 6)}.${inn1.balls % 6}` : '20.0'} ov)` : null,
          awayScore: inn2 ? `${inn2.runs}/${inn2.wickets} (${inn2.balls > 0 ? `${Math.floor(inn2.balls / 6)}.${inn2.balls % 6}` : '18.3'} ov)` : null,
          inn1Data: inn1 ? {
            runs: inn1.runs,
            wickets: inn1.wickets,
            balls: inn1.balls,
            overs: inn1.balls > 0 ? `${Math.floor(inn1.balls / 6)}.${inn1.balls % 6}` : "20.0",
            target: inn1.target,
          } : null,
          inn2Data: inn2 ? {
            runs: inn2.runs,
            wickets: inn2.wickets,
            balls: inn2.balls,
            overs: inn2.balls > 0 ? `${Math.floor(inn2.balls / 6)}.${inn2.balls % 6}` : "18.3",
            target: inn2.target,
          } : null,
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

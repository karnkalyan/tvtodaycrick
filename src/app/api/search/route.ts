import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!q) {
      // Return top quick suggestions
      const recentMatches = await prisma.match.findMany({
        take: 4,
        orderBy: { startTime: "asc" },
        include: {
          tournament: true,
        },
      });

      const topTeams = await prisma.team.findMany({
        take: 8,
        orderBy: { name: "asc" },
      });

      return ok({
        players: [],
        matches: recentMatches.map((m) => ({
          id: m.id,
          title: m.title,
          matchNumber: m.matchNumber || `M#${m.id}`,
          status: m.status,
          venue: m.venue,
          startTime: m.startTime,
        })),
        teams: topTeams.map((t) => ({
          id: t.id,
          name: t.name,
          shortName: t.shortName,
          primaryColor: t.primaryColor,
          logoUrl: t.logoUrl,
        })),
      });
    }

    // Dynamic search across Players, Matches, and Teams
    const [players, matches, teams] = await Promise.all([
      prisma.player.findMany({
        where: {
          OR: [
            { displayName: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { nationality: { contains: q } },
          ],
        },
        take: 8,
        include: {
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
              primaryColor: true,
            },
          },
        },
      }),

      prisma.match.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { matchNumber: { contains: q } },
            { venue: { contains: q } },
            { notes: { contains: q } },
          ],
        },
        take: 6,
        orderBy: { startTime: "asc" },
      }),

      prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { shortName: { contains: q } },
            { city: { contains: q } },
            { slogan: { contains: q } },
          ],
        },
        take: 6,
      }),
    ]);

    return ok({
      players: players.map((p) => ({
        id: p.id,
        name: p.displayName,
        role: p.role,
        jerseyNumber: p.jerseyNumber,
        imageUrl: p.imageUrl,
        teamName: p.team?.name,
        teamColor: p.team?.primaryColor,
      })),
      matches: matches.map((m) => ({
        id: m.id,
        title: m.title,
        matchNumber: m.matchNumber || `M#${m.id}`,
        status: m.status,
        venue: m.venue,
        startTime: m.startTime,
      })),
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        primaryColor: t.primaryColor,
        logoUrl: t.logoUrl,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCricNepalLiveMatch, applyCricNepalMatchToDb } from "@/lib/cricnepal-live";
import { ok } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const matchId = Number(id);
    if (!matchId || Number.isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true, tournament: true },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine
    }

    // Determine CricNepal Source URL
    let sourceUrl = typeof body?.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    if (!sourceUrl && match.notes) {
      const matchUrlLine = match.notes.match(/Source:\s*(https:\/\/[^\s]+cricnepal\.com\/match\/[^\s]+)/i);
      if (matchUrlLine) {
        sourceUrl = matchUrlLine[1].trim();
      }
    }

    // Default for Match 1 if not set
    if (!sourceUrl) {
      if (
        (match.title.toLowerCase().includes("lumbini") && match.title.toLowerCase().includes("sudurpaschim")) ||
        match.matchNumber === "Season3-M1" ||
        match.matchNumber === "Match 1"
      ) {
        sourceUrl =
          "https://www.cricnepal.com/match/lumbini-lions-vs-sudurpaschim-royals-match-1-nepal-premier-league-2026";
      }
    }

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "No CricNepal match URL found in match notes or request body" },
        { status: 400 }
      );
    }

    // Fetch live match payload from CricNepal
    const parsedData = await fetchCricNepalLiveMatch(sourceUrl);
    if (!parsedData) {
      return NextResponse.json(
        { error: `Could not parse live match details from ${sourceUrl}` },
        { status: 502 }
      );
    }

    // Apply to database without touching asset images or deleting history
    const forceOverwrite = body?.forceOverwrite === true;
    const updatedMatch = await applyCricNepalMatchToDb(matchId, parsedData, { forceOverwrite });

    return ok({
      success: true,
      sourceUrl,
      match: updatedMatch,
      toss: updatedMatch?.toss,
      innings: updatedMatch?.innings,
      parsed: {
        status: parsedData.status,
        toss: parsedData.toss,
        innings: parsedData.innings,
        liveSummary: parsedData.liveSummary,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

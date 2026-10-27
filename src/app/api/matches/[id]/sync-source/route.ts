import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchCricNepalLiveMatch,
  applyCricNepalMatchToDb,
  getCricNepalUrlsForMatch,
  reconcileWithCricNepalScorecard,
} from "@/lib/cricnepal-live";
import { fetchOnlineKhabarLiveMatch, getOnlineKhabarUrlForMatch } from "@/lib/onlinekhabar-live";
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

    // Determine Source URL (CricNepal or OnlineKhabar)
    const explicitSourceUrl = typeof body?.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    let sourceUrl = explicitSourceUrl;
    if (!sourceUrl && match.notes) {
      const matchUrlLine = match.notes.match(/Source:\s*(https?:\/\/[^\s]+(?:cricnepal\.com|onlinekhabar\.com)\/[^\s]+)/i);
      if (matchUrlLine) {
        sourceUrl = matchUrlLine[1].trim();
      }
    }

    // Fallback URLs
    const matchNum = match.matchNumber || "";
    const ordinal = Number(matchNum.match(/(\d+)$/)?.[1]);
    const okFallbackUrl = getOnlineKhabarUrlForMatch(matchNum) || "";
    const isSeasonThreeFixture = /^Season3-M\d+$/i.test(matchNum);
    // Season 3 has a stable OnlineKhabar sequence: Match 1 = 315,
    // Match 2 = 316, Match 3 = 317, etc. Old CricNepal URLs in fixture notes
    // must not silently override that current source mapping.
    if (!explicitSourceUrl && isSeasonThreeFixture && okFallbackUrl) {
      sourceUrl = okFallbackUrl;
    }
    const cnCandidateUrls = getCricNepalUrlsForMatch({
      matchNumber: match.matchNumber,
      homeTeamName: match.homeTeam?.name,
      awayTeamName: match.awayTeam?.name,
      notes: match.notes,
    });
    const cnFallbackUrl = cnCandidateUrls[0] || "";

    let parsedData: any = null;
    let usedUrl = sourceUrl || cnFallbackUrl || okFallbackUrl;

    if (sourceUrl.includes("onlinekhabar.com")) {
      try {
        parsedData = await fetchOnlineKhabarLiveMatch(sourceUrl);
      } catch {
        // fallback to CricNepal below
      }
      if (cnCandidateUrls.length > 0) {
        const reconciled = await reconcileWithCricNepalScorecard(parsedData, cnCandidateUrls);
        parsedData = reconciled.data;
        if (reconciled.usedUrl) usedUrl = reconciled.usedUrl;
      }
    } else if (sourceUrl.includes("cricnepal.com")) {
      parsedData = await fetchCricNepalLiveMatch(sourceUrl);
    } else {
      // Try CricNepal first, fallback to OnlineKhabar
      if (cnCandidateUrls.length > 0) {
        const reconciled = await reconcileWithCricNepalScorecard(null, cnCandidateUrls);
        parsedData = reconciled.data;
        if (reconciled.usedUrl) usedUrl = reconciled.usedUrl;
      }
      if (!parsedData && okFallbackUrl) {
        try {
          parsedData = await fetchOnlineKhabarLiveMatch(okFallbackUrl);
          usedUrl = okFallbackUrl;
        } catch {
          // fallback
        }
      }
    }

    if (!parsedData) {
      return NextResponse.json(
        { error: `Could not parse live match details from source (${usedUrl || "no source URL"})` },
        { status: 502 }
      );
    }

    // Apply to database without touching asset images or deleting history
    const forceOverwrite = body?.forceOverwrite === true;
    const updatedMatch = await applyCricNepalMatchToDb(matchId, parsedData, {
      forceOverwrite,
      forceBroadcast: true,
    });
    const broadcastRecord = await (prisma as any).broadcastState.findUnique({
      where: { id: "current" },
    });

    return ok({
      success: true,
      sourceUrl: usedUrl,
      match: updatedMatch,
      toss: updatedMatch?.toss,
      innings: updatedMatch?.innings,
      broadcastState: broadcastRecord?.state || null,
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

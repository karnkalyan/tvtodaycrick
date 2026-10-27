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
    const okFallbackUrl = getOnlineKhabarUrlForMatch(matchNum) || "";
    const isSeasonThreeFixture = /^Season3-M\d+$/i.test(matchNum);
    if (!explicitSourceUrl && isSeasonThreeFixture && okFallbackUrl) {
      sourceUrl = okFallbackUrl;
    }

    const discoveryParams = {
      matchNumber: match.matchNumber,
      homeTeamName: match.homeTeam?.name,
      awayTeamName: match.awayTeam?.name,
      title: match.title,
      stage: match.stage,
      notes: match.notes,
    };
    const cnCandidateUrls = getCricNepalUrlsForMatch(discoveryParams);
    const cnFallbackUrl = cnCandidateUrls[0] || "";

    let parsedData: any = null;
    let usedUrl = explicitSourceUrl || cnFallbackUrl || sourceUrl || okFallbackUrl;

    if (explicitSourceUrl && explicitSourceUrl.includes("cricnepal.com")) {
      parsedData = await fetchCricNepalLiveMatch(explicitSourceUrl);
      usedUrl = explicitSourceUrl;
    } else if (explicitSourceUrl && explicitSourceUrl.includes("onlinekhabar.com")) {
      try {
        parsedData = await fetchOnlineKhabarLiveMatch(explicitSourceUrl);
        usedUrl = explicitSourceUrl;
      } catch {
        // fallback to CricNepal below
      }
      const reconciled = await reconcileWithCricNepalScorecard(parsedData, cnCandidateUrls, discoveryParams);
      parsedData = reconciled.data;
      if (reconciled.usedUrl) usedUrl = reconciled.usedUrl;
    } else {
      // Primary: CricNepal authoritative CN Engine scorecard first
      const cnResult = await reconcileWithCricNepalScorecard(null, cnCandidateUrls, discoveryParams);
      if (cnResult.data) {
        parsedData = cnResult.data;
        if (cnResult.usedUrl) usedUrl = cnResult.usedUrl;
      }

      // Fallback / cross-check with OnlineKhabar if CricNepal is unreachable or has not started scoring yet
      const cnHasActivity =
        parsedData &&
        Array.isArray(parsedData.innings) &&
        parsedData.innings.some((i: any) => i.balls > 0 || i.runs > 0 || i.wickets > 0);

      if (!cnHasActivity && (okFallbackUrl || sourceUrl.includes("onlinekhabar.com"))) {
        const targetOkUrl = okFallbackUrl || sourceUrl;
        try {
          const okData = await fetchOnlineKhabarLiveMatch(targetOkUrl);
          if (okData) {
            const reconciled = parsedData
              ? await reconcileWithCricNepalScorecard(okData, cnCandidateUrls, discoveryParams)
              : { data: okData, usedUrl: targetOkUrl };
            parsedData = reconciled.data;
            usedUrl = reconciled.usedUrl || targetOkUrl;
          }
        } catch {
          // keep CricNepal scheduled state if available
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

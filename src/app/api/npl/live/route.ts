import { NextResponse } from "next/server";
import { fetchNplT20LiveSnapshot } from "@/lib/nplt20-api";
import { syncLiveScoresOnly } from "@/services/npl.service";
import { requestSeason } from "@/lib/npl-seasons";
import { ok } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const season = requestSeason(req);
    const [snapshot, syncResult] = await Promise.all([
      fetchNplT20LiveSnapshot().catch(() => null),
      syncLiveScoresOnly(season),
    ]);

    return ok({
      season,
      live: syncResult.live || (snapshot?.matches?.length || 0) > 0,
      matches: snapshot?.matches || [],
      seriesName: snapshot?.seriesName || "Nepal Premier League 2026",
      updatedAt: syncResult.timestamp,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

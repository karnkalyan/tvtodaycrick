import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  mergeBroadcastState,
  DEFAULT_BROADCAST_STATE,
  buildBroadcastStateFromMatch,
  syncMatchToBroadcastDb,
} from "@/lib/broadcast-state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const matchIdParam = Number(url.searchParams.get("matchId"));
    const shouldSync = url.searchParams.get("sync") === "1";

    if (matchIdParam && !Number.isNaN(matchIdParam)) {
      const match = await prisma.match.findUnique({
        where: { id: matchIdParam },
        include: {
          tournament: true,
          homeTeam: { include: { players: true, franchise: true } },
          awayTeam: { include: { players: true, franchise: true } },
          toss: { include: { winnerTeam: true } },
          innings: { include: { team: true }, orderBy: { inningsNumber: "asc" } },
          stats: { include: { player: true, team: true } },
          scoreEvents: { orderBy: { id: "asc" } },
        },
      });
      if (match) {
        const state = shouldSync
          ? await syncMatchToBroadcastDb(prisma, match)
          : buildBroadcastStateFromMatch(match);
        if (shouldSync && typeof (global as any).__npl_ws_broadcast === "function") {
          try {
            (global as any).__npl_ws_broadcast(
              JSON.stringify({
                action: "updateData",
                type: "updateData",
                payload: state,
                timestamp: Date.now(),
              }),
            );
          } catch {}
        }
        return NextResponse.json(
          { state, updatedAt: new Date().toISOString() },
          { headers: { "Cache-Control": "no-store, max-age=0" } },
        );
      }
    }

    const record = await (prisma as any).broadcastState.findUnique({
      where: { id: "current" },
    });

    if (!record || !record.state) {
      return NextResponse.json(
        { state: DEFAULT_BROADCAST_STATE, isReset: true, updatedAt: new Date().toISOString() },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return NextResponse.json(
      { state: record.state, updatedAt: record.updatedAt },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("GET /api/broadcast/state error:", error);
    return NextResponse.json({ error: "Failed to fetch broadcast state" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { state, action, layer } = body;

    if (!state) {
      return NextResponse.json({ error: "State payload required" }, { status: 400 });
    }

    const isResetAction = action === "reset" || action === "resetMatch" || body.reset === true;

    // Score entry and the broadcast director own different parts of the same
    // document. Merge partial writes so one client cannot erase another
    // client's recent deliveries, players, standings, or UI settings.
    const saved = await prisma.$transaction(async (tx) => {
      const existing = await (tx as any).broadcastState.findUnique({
        where: { id: "current" },
      });
      const mergedState = isResetAction ? state : mergeBroadcastState(existing?.state, state);
      return (tx as any).broadcastState.upsert({
        where: { id: "current" },
        create: { id: "current", state: mergedState },
        update: { state: mergedState },
      });
    });

    // Log the event to BroadcastEvent table
    if (action) {
      await (prisma as any).broadcastEvent.create({
        data: {
          action: String(action),
          layer: layer ? String(layer) : null,
          payload: body.payload || null,
        },
      });
    }

    if (typeof (global as any).__npl_ws_broadcast === "function") {
      try {
        if (isResetAction) {
          (global as any).__npl_ws_broadcast(
            JSON.stringify({
              action: "reset",
              type: "reset",
              state: saved.state,
              timestamp: Date.now(),
            }),
          );
        } else if (
          !action ||
          action === "updateData" ||
          action === "dataUpdated" ||
          action === "scoreUpdate" ||
          action === "autoSync"
        ) {
          (global as any).__npl_ws_broadcast(
            JSON.stringify({
              action: "updateData",
              type: "updateData",
              payload: saved.state,
              timestamp: Date.now(),
            }),
          );
        }
      } catch {}
    }

    return NextResponse.json({ success: true, state: saved.state, updatedAt: saved.updatedAt });
  } catch (error) {
    console.error("POST /api/broadcast/state error:", error);
    return NextResponse.json({ error: "Failed to save broadcast state" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergeBroadcastState, DEFAULT_BROADCAST_STATE } from "@/lib/broadcast-state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    return NextResponse.json({ success: true, updatedAt: saved.updatedAt });
  } catch (error) {
    console.error("POST /api/broadcast/state error:", error);
    return NextResponse.json({ error: "Failed to save broadcast state" }, { status: 500 });
  }
}

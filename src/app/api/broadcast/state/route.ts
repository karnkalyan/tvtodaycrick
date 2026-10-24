import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const record = await (prisma as any).broadcastState.findUnique({
      where: { id: "current" },
    });

    if (!record) {
      return NextResponse.json({ state: null });
    }

    return NextResponse.json({ state: record.state, updatedAt: record.updatedAt });
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

    // Upsert current state in MySQL
    const saved = await (prisma as any).broadcastState.upsert({
      where: { id: "current" },
      create: {
        id: "current",
        state,
      },
      update: {
        state,
      },
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

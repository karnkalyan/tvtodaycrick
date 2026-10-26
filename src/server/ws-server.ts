import { WebSocketServer, WebSocket } from "ws";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_BROADCAST_STATE } from "../lib/broadcast-state";

const prisma = new PrismaClient();
const PORT = Number(process.env.WS_PORT || 3001);

let latestState: any = structuredClone(DEFAULT_BROADCAST_STATE);
let persistQueue: Promise<void> = Promise.resolve();

const deliveryTokens: Record<string, { token: string; legal: boolean }> = {
  dot: { token: "0", legal: true },
  run1: { token: "1", legal: true },
  run2: { token: "2", legal: true },
  run3: { token: "3", legal: true },
  four: { token: "4", legal: true },
  six: { token: "6", legal: true },
  wicket: { token: "W", legal: true },
  wide: { token: "WD", legal: false },
  noBall: { token: "NB", legal: false },
};

function updateRecentDeliveries(actionName: string) {
  if (!latestState.score) latestState.score = {};
  const current = Array.isArray(latestState.score.recent) ? latestState.score.recent : [];
  if (actionName === "undoDelivery") {
    latestState.score.recent = current.slice(0, -1);
    return;
  }
  const delivery = deliveryTokens[actionName];
  if (!delivery) return;
  const ballsInOver = Number(String(latestState.score.overs || "0.0").split(".")[1]) || 0;
  latestState.score.recent = delivery.legal && ballsInOver === 5
    ? []
    : [...current, delivery.token];
}

async function initDbState() {
  try {
    const record = await (prisma as any).broadcastState.findUnique({
      where: { id: "current" },
    });
    if (record?.state) {
      latestState = record.state;
      console.log("[NPL WebSocket] Loaded initial broadcast state from MySQL database");
    } else {
      latestState = structuredClone(DEFAULT_BROADCAST_STATE);
    }
  } catch (err) {
    console.warn("[NPL WebSocket] Could not load state from DB on startup:", err);
  }
}

function persistState(action: string, layer?: string, payload?: any) {
  if (!latestState) return;
  const stateSnapshot = structuredClone(latestState);
  const payloadSnapshot = payload == null ? null : structuredClone(payload);
  // WebSocket messages are ordered. Keep database writes in that same order so
  // a slower delivery/action write cannot overwrite the scoreUpdate after it.
  persistQueue = persistQueue.then(async () => {
    try {
      await (prisma as any).broadcastState.upsert({
        where: { id: "current" },
        create: { id: "current", state: stateSnapshot },
        update: { state: stateSnapshot },
      });

      await (prisma as any).broadcastEvent.create({
        data: {
          action,
          layer: layer || null,
          payload: payloadSnapshot,
        },
      });
    } catch (err) {
      console.error("[NPL WebSocket] Error persisting state to DB:", err);
    }
  });
}

export function startWebSocketServer(port = PORT): WebSocketServer {
  initDbState();

  const wss = new WebSocketServer({ port }, () => {
    console.log(`[NPL WebSocket] Broadcast server running on ws://localhost:${port}`);
  });

  (global as any).__npl_ws_broadcast = (text: string) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    });
  };

  (global as any).__npl_ws_reset = () => {
    latestState = structuredClone(DEFAULT_BROADCAST_STATE);
    const text = JSON.stringify({
      action: "reset",
      type: "reset",
      state: latestState,
      timestamp: Date.now(),
    });
    (global as any).__npl_ws_broadcast(text);
  };

  // Poll database broadcastState periodically so auto-synced match updates from
  // Next.js or background sync immediately broadcast to all connected graphics
  let lastDbTimestamp = 0;
  const pollTimer = setInterval(async () => {
    try {
      const record = await (prisma as any).broadcastState.findUnique({
        where: { id: "current" },
      });
      if (record?.state && record.updatedAt) {
        const time = new Date(record.updatedAt).getTime();
        if (lastDbTimestamp === 0) {
          lastDbTimestamp = time;
          latestState = record.state;
        } else if (time > lastDbTimestamp) {
          lastDbTimestamp = time;
          latestState = record.state;
          const msg = JSON.stringify({
            action: "updateData",
            type: "updateData",
            payload: record.state,
            timestamp: time,
          });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(msg);
            }
          });
        }
      }
    } catch {}
  }, 1000);

  wss.on("close", () => clearInterval(pollTimer));

  wss.on("connection", async (ws: WebSocket) => {
    // Always refresh latest state directly from MySQL database so clients never receive stale state
    try {
      const record = await (prisma as any).broadcastState.findUnique({
        where: { id: "current" },
      });
      if (record?.state) {
        latestState = record.state;
      } else {
        latestState = structuredClone(DEFAULT_BROADCAST_STATE);
      }
    } catch (err) {
      console.warn("[NPL WebSocket] Error reading fresh DB state on client connection:", err);
    }

    // Send welcome & latest state
    if (latestState) {
      ws.send(JSON.stringify({ type: "init", state: latestState, timestamp: Date.now() }));
    }

    ws.on("message", (raw: Buffer | string) => {
      try {
        const text = raw.toString();
        const msg = JSON.parse(text);
        const actionType = msg.action || msg.type;

        if (actionType === "reset" || actionType === "resetMatch") {
          latestState = structuredClone(msg.state || DEFAULT_BROADCAST_STATE);
          persistState("reset", undefined, msg);
        } else {
          if (!latestState) latestState = structuredClone(DEFAULT_BROADCAST_STATE);
          if (!latestState.ui) latestState.ui = {};
        }


        // Track and persist layer / graphics states
        if (actionType === "show") {
          const graphicId = msg.id || msg.data?.id;
          if (graphicId === "scorebar" || graphicId === "compactBug") {
            latestState.ui.scoreMode = graphicId;
          } else {
            latestState.ui.graphic = graphicId;
          }
          persistState("show", graphicId, msg);
        } else if (actionType === "stopAll" || actionType === "clear") {
          latestState.ui.graphic = null;
          if (msg.clearScores || msg.stopScores) {
            latestState.ui.scoreMode = "hidden";
          }
          persistState("stopAll", "all", msg);
        } else if (actionType === "stopLayer") {
          const graphicId = msg.id || msg.layer;
          if (graphicId === "scorebar" || graphicId === "compactBug") {
            latestState.ui.scoreMode = "hidden";
          } else if (latestState.ui.graphic === graphicId) {
            latestState.ui.graphic = null;
          }
          persistState("stopLayer", graphicId, msg);
        } else if (actionType === "scoreMode") {
          latestState.ui.scoreMode = msg.mode || msg.data?.mode;
          persistState("scoreMode", latestState.ui.scoreMode, msg);
        } else if (actionType === "hideScores") {
          latestState.ui.scoreMode = "hidden";
          persistState("hideScores", "scoreMode", msg);
        } else if (actionType === "updateData" || actionType === "dataUpdated") {
          const payload = msg.payload || msg.data || {};
          latestState = {
            ...(latestState || {}),
            ...payload,
            score: { ...(latestState?.score || {}), ...(payload.score || {}) },
            live: { ...(latestState?.live || {}), ...(payload.live || {}) },
            match: { ...(latestState?.match || {}), ...(payload.match || {}) },
          };
          if (payload.fow !== undefined) latestState.fow = payload.fow;
          persistState("updateData", undefined, msg);
        } else if (actionType === "scoreUpdate") {
          latestState.score = { ...(latestState?.score || {}), ...(msg.data || msg.payload) };
          persistState("scoreUpdate", undefined, msg);
        } else if (actionType === "action") {
          updateRecentDeliveries(msg.name || msg.data?.name || "");
          persistState("action", msg.name, msg);
        } else if (actionType === "stinger") {
          persistState("stinger", msg.event, msg);
        }

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(text);
          }
        });
      } catch (err) {
        console.error("[NPL WebSocket] Error parsing message:", err);
      }
    });

    ws.on("error", (err) => {
      console.warn("[NPL WebSocket] Client error:", err.message);
    });
  });

  wss.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.log(`[NPL WebSocket] Port ${port} is already active and serving connections.`);
    } else {
      console.error("[NPL WebSocket] Server error:", err);
    }
  });

  return wss;
}

// If run directly via tsx
if (process.argv[1]?.includes("ws-server")) {
  startWebSocketServer();
}

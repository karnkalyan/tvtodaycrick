export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureIpv4Dispatcher } = await import("./lib/fetch-network");
      ensureIpv4Dispatcher();
    } catch {
      // Ignore undici / dns setup in non-compatible environments
    }

    // In production, scripts/start-production.mjs manages the dedicated WebSocket process on port 3212.
    // In local development (npm run dev), Next.js instrumentation boots the WebSocket server.
    if (process.env.NODE_ENV !== "production") {
      try {
        if (!(global as any).__npl_ws_started) {
          (global as any).__npl_ws_started = true;
          const { startWebSocketServer } = await import("./server/ws-server");
          const port = Number(process.env.WS_PORT) || 3001;
          startWebSocketServer(port);
        }
      } catch {
        // Ignore if port is already active
      }
    }
  }
}


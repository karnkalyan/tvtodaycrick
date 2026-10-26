export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureIpv4Dispatcher } = await import("./lib/fetch-network");
      ensureIpv4Dispatcher();
    } catch {
      // Ignore undici / dns setup in non-compatible environments
    }

    try {
      if (!(global as any).__npl_ws_started) {
        (global as any).__npl_ws_started = true;
        const { startWebSocketServer } = await import("./server/ws-server");
        startWebSocketServer(3001);
      }
    } catch {
      // Ignore if port is already active
    }
  }
}


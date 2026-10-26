export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const dns = await import("node:dns");
      if (dns && typeof dns.setDefaultResultOrder === "function") {
        dns.setDefaultResultOrder("ipv4first");
      }
      const { Agent, setGlobalDispatcher } = await import("undici");
      setGlobalDispatcher(
        new Agent({
          connect: {
            autoSelectFamily: true,
            autoSelectFamilyAttemptTimeout: 250,
            timeout: 8000,
          },
        })
      );
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


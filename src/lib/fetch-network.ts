import dns from "node:dns";

let configured = false;

/**
 * Enforces IPv4-only resolution across Undici and Node global fetch.
 * This completely eliminates IPv6 connect timeouts on Docker bridge networks
 * where IPv6 default gateway routes are not provisioned.
 */
export function ensureIpv4Dispatcher() {
  if (configured) return;
  configured = true;

  try {
    if (dns && typeof dns.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
  } catch {
    // Ignore if not supported
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const undici = require("undici");
    if (undici && undici.Agent && undici.setGlobalDispatcher) {
      const agent = new undici.Agent({
        connect: {
          lookup: (hostname: string, options: any, callback: any) => {
            dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
          },
          timeout: 15000,
        },
      });
      undici.setGlobalDispatcher(agent);
    }
  } catch {
    // Undici dispatcher setup optional in non-Node environments
  }
}

// Auto-run when imported in Node.js
if (typeof process !== "undefined" && process.versions && process.versions.node) {
  ensureIpv4Dispatcher();
}

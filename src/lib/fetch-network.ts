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
          lookup: (hostname: string, options: any, callback?: any) => {
            const cb = typeof options === "function" ? options : callback;
            const opts = typeof options === "object" && options !== null ? options : {};

            dns.lookup(hostname, { ...opts, family: 4 }, (err, addresses, family) => {
              if (err) return cb(err);
              if (opts.all) {
                const arr = Array.isArray(addresses)
                  ? addresses
                  : [{ address: addresses as string, family: family || 4 }];
                return cb(null, arr);
              }
              const addr = Array.isArray(addresses) ? addresses[0]?.address : addresses;
              return cb(null, addr, family || 4);
            });
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

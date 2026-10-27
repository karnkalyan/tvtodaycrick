import { spawn } from "node:child_process";
import dns from "node:dns";

if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

try {
  const { Agent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(
    new Agent({
      connect: {
        lookup: (hostname, options, callback) => {
          const cb = typeof options === "function" ? options : callback;
          const opts = typeof options === "object" && options !== null ? options : {};

          dns.lookup(hostname, { ...opts, family: 4 }, (err, addresses, family) => {
            if (err) return cb(err);
            if (opts.all) {
              const arr = Array.isArray(addresses)
                ? addresses
                : [{ address: addresses, family: family || 4 }];
              return cb(null, arr);
            }
            const addr = Array.isArray(addresses) ? addresses[0]?.address : addresses;
            return cb(null, addr, family || 4);
          });
        },
        timeout: 15000,
      },
    })
  );
} catch {
  // Undici dispatcher setup optional
}

process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
  ? `${process.env.NODE_OPTIONS} --dns-result-order=ipv4first`
  : "--dns-result-order=ipv4first";

console.log("==================================================================");
console.log("   TV TODAY NPL CRICKET MANAGEMENT SYSTEM — PRODUCTION ENGINE");
console.log("==================================================================");
console.log(`• Node Environment : ${process.env.NODE_ENV || "production"}`);
console.log(`• Site URL         : ${process.env.NEXT_PUBLIC_SITE_URL || "https://cricket.tvtoday.com.np"}`);
console.log(`• App Port         : ${process.env.PORT || 3211}`);
console.log(`• WS Broadcast Port: ${process.env.WS_PORT || 3212}`);
console.log("------------------------------------------------------------------");

function runCommand(cmd, args, env = process.env) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ Running: ${cmd} ${args.join(" ")}`);
    const proc = spawn(cmd, args, { stdio: "inherit", shell: true, env });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

async function boot() {
  try {
    // 1. Ensure Prisma Client & Database Schema are in sync
    console.log("\n[1/4] Synchronizing MySQL database schema...");
    await runCommand("npx", ["prisma", "db", "push", "--skip-generate"]);

    // 2a. One-time match data reset (clears runs/innings/stats/toss, keeps teams/players/franchises).
    //     Runs only once per RESET_MATCH_DATA_TOKEN value; change the token to reset again.
    const resetToken = (process.env.RESET_MATCH_DATA_TOKEN || "").trim();
    if (resetToken) {
      console.log(`\n[2/4] Checking one-time match data reset (token: ${resetToken})...`);
      try {
        const resetArgs = ["run", "db:reset:matches", "--", `--once=${resetToken}`];
        if (process.env.SEED_DATABASE === "true") resetArgs.push("--skip-seed");
        await runCommand("npm", resetArgs);
      } catch (err) {
        console.warn("Notice: Match data reset failed:", err.message);
      }
    }

    // 2. Run initial seed if configured
    if (process.env.SEED_DATABASE === "true") {
      console.log("\n[2/4] Running production database seed (SEED_MATCH_SCORES=false)...");
      try {
        await runCommand("npm", ["run", "db:seed:production"]);
      } catch (err) {
        console.warn("Notice: Seed completed or already initialized:", err.message);
      }
    } else {
      console.log("\n[2/4] Skipping database seed (SEED_DATABASE != true).");
    }

    // 3. Start Broadcast WebSocket Server on port 3212
    const wsPort = process.env.WS_PORT || "3212";
    console.log("\n[3/4] Launching WebSocket broadcast engine on port " + wsPort + "...");
    const wsProcess = spawn("npx", ["tsx", "src/server/ws-server.ts"], {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, WS_PORT: wsPort, PORT: wsPort },
    });

    // 4. Start Next.js Production Web Server on port 3211
    console.log("\n[4/4] Launching Next.js production server on port " + (process.env.PORT || 3211) + "...");
    const nextProcess = spawn("npx", ["next", "start", "-p", process.env.PORT || "3211"], {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

    const shutdown = () => {
      console.log("\nStopping TV Today Cricket services...");
      try { wsProcess.kill("SIGTERM"); } catch {}
      try { nextProcess.kill("SIGTERM"); } catch {}
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    nextProcess.on("close", (code) => {
      console.log(`Next.js process exited with code ${code}`);
      shutdown();
    });
  } catch (err) {
    console.error("✘ Boot failed:", err);
    process.exit(1);
  }
}

boot();

import { spawn } from "node:child_process";

console.log("==================================================================");
console.log("   TV TODAY NPL CRICKET MANAGEMENT SYSTEM — PRODUCTION ENGINE");
console.log("==================================================================");
console.log(`• Node Environment : ${process.env.NODE_ENV || "production"}`);
console.log(`• Site URL         : ${process.env.NEXT_PUBLIC_SITE_URL || "https://cricket.tvtoday.com.np"}`);
console.log(`• App Port         : ${process.env.PORT || 3000}`);
console.log(`• WS Broadcast Port: ${process.env.WS_PORT || 3001}`);
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

    // 3. Start Broadcast WebSocket Server on port 3001
    console.log("\n[3/4] Launching WebSocket broadcast engine on port " + (process.env.WS_PORT || 3001) + "...");
    const wsProcess = spawn("npx", ["tsx", "src/server/ws-server.ts"], {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, PORT: process.env.WS_PORT || "3001" },
    });

    // 4. Start Next.js Production Web Server on port 3000
    console.log("\n[4/4] Launching Next.js production server on port " + (process.env.PORT || 3000) + "...");
    const nextProcess = spawn("npx", ["next", "start", "-p", process.env.PORT || "3000"], {
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

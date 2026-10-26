import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { mapRole, mapBatting, mapBowling } from "../src/lib/nplt20-api";
import { downloadAsset, downloadTeamLogo, downloadPlayerImage } from "../src/lib/npl-asset-manager";
import { detectProvider } from "../src/services/npl-settings.service";

test("nplt20-api maps cricket roles properly", () => {
  assert.equal(mapRole("Batsman"), "BATSMAN");
  assert.equal(mapRole("Bowler"), "BOWLER");
  assert.equal(mapRole("All-Rounder"), "ALL_ROUNDER");
  assert.equal(mapRole("Wicketkeeper-Batsman"), "WICKET_KEEPER");
  assert.equal(mapRole("Captain, All-Rounder"), "ALL_ROUNDER");
});

test("nplt20-api maps batting and bowling styles properly", () => {
  assert.equal(mapBatting("Right-handed"), "RIGHT_HAND");
  assert.equal(mapBatting("Left-handed"), "LEFT_HAND");
  assert.equal(mapBowling("Right-arm off-break"), "OFF_SPIN");
  assert.equal(mapBowling("Left-arm orthodox"), "LEFT_ARM_ORTHODOX");
  assert.equal(mapBowling("Right-arm fast-medium"), "RIGHT_ARM_MEDIUM");
  assert.equal(mapBowling("Right-arm fast"), "RIGHT_ARM_FAST");
});

test("detectProvider correctly distinguishes nplt20league from cricnepal", () => {
  assert.equal(detectProvider("https://nplt20league.com"), "nplt20league");
  assert.equal(detectProvider("https://nplt20league.com/teams/"), "nplt20league");
  assert.equal(detectProvider("https://www.cricnepal.com/tournament/nepal-premier-league-2026-207"), "cricnepal");
  assert.equal(detectProvider(null), "cricnepal");
});

test("local asset engine checks cached files in public directory", () => {
  const teamLogo = path.join(process.cwd(), "public", "images", "teams", "karnali-yaks", "logo.png");
  assert.ok(fs.existsSync(teamLogo), "Karnali Yaks logo should be saved locally");
  const stats = fs.statSync(teamLogo);
  assert.ok(stats.size > 1000, "Logo file should be non-empty");
});

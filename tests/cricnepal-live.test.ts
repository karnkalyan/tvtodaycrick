import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  oversStringToBalls,
  parseCricNepalMatchHtml,
  type CricNepalParsedLiveMatch,
} from "../src/lib/cricnepal-live";

test("oversStringToBalls accurately converts overs to total balls", () => {
  assert.equal(oversStringToBalls("0.0"), 0);
  assert.equal(oversStringToBalls("0.1"), 1);
  assert.equal(oversStringToBalls("1.0"), 6);
  assert.equal(oversStringToBalls("9.1"), 55);
  assert.equal(oversStringToBalls("10.3"), 63);
  assert.equal(oversStringToBalls("20.0"), 120);
  assert.equal(oversStringToBalls("20"), 120);
  assert.equal(oversStringToBalls(undefined), 0);
});

test("parseCricNepalMatchHtml extracts live match, toss, innings, and player stats", () => {
  // Read saved CricNepal match fixture
  const samplePath = "C:\\Users\\karnk\\.gemini\\antigravity-ide\\brain\\f8631197-ec0a-4b89-90d1-b005e326f089\\.system_generated\\steps\\326\\content.md";
  if (!fs.existsSync(samplePath)) return;

  const html = fs.readFileSync(samplePath, "utf8");
  const result = parseCricNepalMatchHtml(
    html,
    "https://www.cricnepal.com/match/lumbini-lions-vs-sudurpaschim-royals-match-1-nepal-premier-league-2026"
  );

  assert.ok(result, "Parsed result should not be null");
  assert.equal(result.status, "LIVE");
  assert.ok(result.title.includes("Lumbini Lions vs Sudurpaschim Royals"));

  // Check Toss
  assert.ok(result.toss, "Toss details must be extracted");
  assert.equal(result.toss?.winnerName, "Lumbini Lions");
  assert.equal(result.toss?.decision, "BOWL");

  // Check Innings
  assert.ok(result.innings.length > 0, "Innings details should be present");
  const inn1 = result.innings[0];
  assert.equal(inn1.inningsNumber, 1);
  assert.equal(inn1.runs, 56);
  assert.equal(inn1.wickets, 5);
  assert.equal(inn1.balls, 55);
  assert.equal(inn1.extras.total, 8);
  assert.equal(inn1.extras.wides, 3);
  assert.equal(inn1.extras.legByes, 5);

  // Check Live Summary
  assert.ok(result.liveSummary, "Live summary must be present");
  assert.ok(result.liveSummary.currentBatters.length >= 2, "Current batters should be extracted");
  const striker = result.liveSummary.currentBatters.find((b) => b.isStriker);
  assert.ok(striker, "Striker should be identified");
  assert.equal(striker.name, "Sherfane Rutherford");
  assert.equal(striker.runs, 1);

  assert.ok(result.liveSummary.currentBowler, "Current bowler should be extracted");
  assert.equal(result.liveSummary.currentBowler.name, "Sher Malla");
  assert.equal(result.liveSummary.currentBowler.overs, "2.1");
  assert.equal(result.liveSummary.currentBowler.wickets, 1);
});

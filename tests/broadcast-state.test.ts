import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mergeBroadcastState, buildBroadcastStateFromMatch } from "../src/lib/broadcast-state";

test("partial broadcast writes preserve state owned by other clients", () => {
  const current = {
    score: { runs: 29, wickets: 1, overs: "3.4", recent: ["1", "4"] },
    live: { strikerName: "ROHIT", bowlerName: "ABINASH" },
    points: [["1", "SPR"]],
  };
  const incoming = {
    score: { runs: 30, overs: "3.5" },
    live: { strikerName: "AAKASH" },
  };

  assert.deepEqual(mergeBroadcastState(current, incoming), {
    score: { runs: 30, wickets: 1, overs: "3.5", recent: ["1", "4"] },
    live: { strikerName: "AAKASH", bowlerName: "ABINASH" },
    points: [["1", "SPR"]],
  });
});

test("stingers and event lower-thirds are independently dispatched", () => {
  const script = readFileSync(new URL("../public/broadcast/app.js", import.meta.url), "utf8");
  const stingerReceiver = script.slice(script.indexOf("case 'stinger':"), script.indexOf("case 'eventLowerThird':"));
  const lowerThirdReceiver = script.slice(script.indexOf("case 'eventLowerThird':"), script.indexOf("case 'scoreMode':"));
  const lowerThirdFunction = script.slice(script.indexOf("function triggerMasterEventLowerThird"), script.indexOf("let ltEventTimer"));

  assert.match(stingerReceiver, /playStinger\(evt, false\)/);
  assert.doesNotMatch(stingerReceiver, /triggerMasterEventLowerThird/);
  assert.match(lowerThirdReceiver, /triggerMasterEventLowerThird\(evt, isPersist\)/);
  assert.doesNotMatch(lowerThirdReceiver, /playStinger/);
  assert.doesNotMatch(lowerThirdFunction, /playStinger/);
  assert.match(script, /stingerActive=true;\s*hideNonStingerLayers\(\)/);
});

test("remote score and data updates do not persist receiver state back to the server", () => {
  const script = readFileSync(new URL("../public/broadcast/app.js", import.meta.url), "utf8");
  const scoreReceiver = script.slice(script.indexOf("case 'scoreUpdate':"), script.indexOf("case 'updateData':"));
  const dataReceiver = script.slice(script.indexOf("case 'updateData':"), script.indexOf("case 'replay':"));

  assert.doesNotMatch(scoreReceiver, /saveState/);
  assert.doesNotMatch(dataReceiver, /saveState/);
});

test("the director score action does not automatically send a lower-third", () => {
  const page = readFileSync(new URL("../src/app/(dashboard)/broadcast/page.tsx", import.meta.url), "utf8");
  const handler = page.slice(page.indexOf("const handleScoreAction"), page.indexOf("// Fixture selector handler"));

  assert.match(handler, /sendCue\("action", \{ name: actionName \}\)/);
  assert.doesNotMatch(handler, /eventLowerThird/);
});

test("clean graphics poll persisted state when WebSocket delivery is unavailable", () => {
  const script = readFileSync(new URL("../public/broadcast/app.js", import.meta.url), "utf8");

  assert.match(script, /async function refreshStateFromDb/);
  assert.match(script, /fetch\('\/api\/broadcast\/state\?live=' \+ Date\.now\(\), \{ cache: 'no-store' \}\)/);
  assert.match(script, /setInterval\(refreshStateFromDb, 1500\)/);
});

test("broadcast director preserves incoming swapped teams instead of stale local teams", () => {
  const page = readFileSync(new URL("../src/app/(dashboard)/broadcast/page.tsx", import.meta.url), "utf8");
  const sender = page.slice(page.indexOf("const sendCue"), page.indexOf("// Cue functions"));
  const loader = page.slice(page.indexOf("// Fetch NPL Database"), page.indexOf("// Helper to retrieve roster"));

  assert.match(sender, /persistedMatch = \{ teamA, teamB, \.\.\.\(incoming\.match \|\| \{\}\) \}/);
  assert.match(sender, /\.\.\.incoming,/);
  assert.doesNotMatch(loader, /handleSelectFixture\(/);
});

test("broadcast match feed exposes innings team assignments and real zero-over scores", () => {
  const route = readFileSync(new URL("../src/app/api/broadcast/npl-data/route.ts", import.meta.url), "utf8");

  assert.match(route, /teamCode: innings\.teamId === m\.homeTeamId/);
  assert.match(route, /activeInningsNumber: activeInnings\?\.inningsNumber \|\| 1/);
  assert.match(route, /homeScore: scoreText\(homeInnings\)/);
  assert.doesNotMatch(route, /inn1\.balls > 0[\s\S]{0,120}'20\.0'/);
});

test("graphics controller and score entry share one pinned default match", () => {
  const controller = readFileSync(new URL("../src/app/(dashboard)/broadcast/page.tsx", import.meta.url), "utf8");
  const scoreEntry = readFileSync(new URL("../src/app/(dashboard)/score-entry/page.tsx", import.meta.url), "utf8");

  assert.match(controller, /readSelectedMatchId\(\)/);
  assert.match(controller, /handleSelectFixture\(defaultMatch\.id, matches, teams, false\)/);
  assert.match(controller, /selectedMatchId\s*\?\s*\(dbData\.matches \|\| \[\]\)\.find/);
  assert.doesNotMatch(controller, /find\(\(x: any\) => x\.id === selectedMatchId\) \|\| dbData\.matches\?\.\[0\]/);
  assert.match(scoreEntry, /defaultMatchId = readSelectedMatchId\(\)/);
  assert.match(scoreEntry, /writeSelectedMatchId\(m\.id\)/);
  assert.match(scoreEntry, /matchId: sourceMatch\.id/);
});

test("clean reset wipes lingering match runs and displays NPL logo without audio gate", () => {
  const outputCode = readFileSync(new URL("../src/app/kashtrix/output/kashtrix-output.tsx", import.meta.url), "utf8");
  const appJs = readFileSync(new URL("../public/broadcast/app.js", import.meta.url), "utf8");

  // NPL official logo used instead of Trophy
  assert.match(outputCode, /src="\/images\/npl-logo\.png"/);
  assert.match(outputCode, /styles\.nplBrandLogo/);
  assert.match(outputCode, /styles\.nplBrandLogoArena/);
  assert.doesNotMatch(outputCode, /<Trophy/);

  // Audio gate button removed
  assert.doesNotMatch(outputCode, /ENABLE STADIUM AUDIO/);
  assert.doesNotMatch(outputCode, /audioGate/);

  // Reset cue receiver in app.js
  assert.match(appJs, /case 'reset':/);
  assert.match(appJs, /state = deepClone\(defaults\)/);

  // Reset handling in kashtrix-output.tsx
  assert.match(outputCode, /action === "reset"/);
  assert.match(outputCode, /isResetIncoming/);
  assert.match(outputCode, /playCricketSfx/);
});

test("broadcast output feed does not auto-play or forcefully trigger anchor master", () => {
  const appJs = readFileSync(new URL("../public/broadcast/app.js", import.meta.url), "utf8");

  // Output path should never force anchorMaster or any layer into state or show calls
  assert.doesNotMatch(appJs, /location\.pathname\.includes\('\/output'\)[\s\S]{0,100}anchorMaster/);
  assert.doesNotMatch(appJs, /refreshStateFromDb[\s\S]{0,300}anchorMaster/);
});

test("buildBroadcastStateFromMatch accurately reflects completed match score, FOW, and overs to graphics", async () => {
  const { buildBroadcastStateFromMatch } = await import("../src/lib/broadcast-state");

  const mockMatch = {
    id: 85,
    title: "Lumbini Lions vs Sudurpaschim Royals",
    matchNumber: "Match 1",
    status: "COMPLETED",
    resultText: "Lumbini Lions won by 7 wickets",
    venue: "TU Cricket Ground, Kirtipur",
    homeTeamId: 6,
    awayTeamId: 8,
    homeTeam: { id: 6, name: "Lumbini Lions", shortName: "LL" },
    awayTeam: { id: 8, name: "Sudurpaschim Royals", shortName: "SR" },
    innings: [
      { id: 101, inningsNumber: 1, teamId: 8, runs: 87, wickets: 10, balls: 104, extras: 6, status: "COMPLETED" },
      { id: 102, inningsNumber: 2, teamId: 6, runs: 88, wickets: 3, balls: 59, extras: 4, status: "COMPLETED", target: 88 },
    ],
    toss: { winnerTeamId: 6, decision: "BOWL" },
    stats: [
      { id: 1, innings: 2, teamId: 6, isOut: true, runs: 19, ballsFaced: 10, fours: 3, sixes: 0, player: { displayName: "Aasif Sheikh" } },
      { id: 2, innings: 2, teamId: 6, isOut: true, runs: 20, ballsFaced: 14, fours: 2, sixes: 1, player: { displayName: "Abhishesh Gautam" } },
      { id: 3, innings: 2, teamId: 6, isOut: true, runs: 18, ballsFaced: 12, fours: 1, sixes: 1, player: { displayName: "Ajay Chauhan" } },
      { id: 4, innings: 2, teamId: 6, isOut: false, runs: 24, ballsFaced: 18, fours: 2, sixes: 0, player: { displayName: "Rohit Paudel" } },
      { id: 5, innings: 2, teamId: 8, isOut: false, ballsBowled: 12, runsConceded: 16, wickets: 1, maidens: 0, player: { displayName: "Abinash Bohara" } },
    ],
  };

  const parsedLive = {
    recentDeliveries: ["W", "0", "1", "1", "4"],
    resultSummary: "Lumbini won by 7 wickets",
    fowByInnings: {
      2: [
        ["1/19", "AASIF SHEIKH", "1.4 OV"],
        ["2/39", "ABHISHESH GAUTAM", "3.6 OV"],
        ["3/57", "AJAY CHAUHAN", "5.9 OV"],
      ],
    },
  };

  const state = buildBroadcastStateFromMatch(mockMatch, parsedLive);
  const matchObj = state.match as any;
  const scoreObj = state.score as any;
  const liveObj = state.live as any;
  const fow = state.fow as any[];

  assert.equal(matchObj.matchId, 85);
  assert.equal(matchObj.teamA, "LUL");
  assert.equal(matchObj.teamB, "SPR");
  assert.equal(scoreObj.runs, 88);
  assert.equal(scoreObj.wickets, 3);
  assert.equal(scoreObj.overs, "9.5");
  assert.deepEqual(scoreObj.recent, ["W", "0", "1", "1", "4"]);
  assert.equal(liveObj.rateText, "FINAL RESULT");
  assert.equal(fow.length, 3);
  assert.equal(fow[0][0], "1/19");
  assert.equal(fow[1][0], "2/39");
  assert.equal(fow[2][0], "3/57");
});

test("buildBroadcastStateFromMatch preserves all-ball events without 6-ball cutoff and populates bowler extras", () => {
  const mockMatch = {
    id: 191,
    title: "Biratnagar Kings vs Chitwan Rhinos",
    matchNumber: "Season3-M2",
    status: "LIVE",
    homeTeamId: 1,
    awayTeamId: 2,
    homeTeam: { id: 1, name: "Biratnagar Kings", shortName: "BIK" },
    awayTeam: { id: 2, name: "Chitwan Rhinos", shortName: "CHR" },
    innings: [
      { id: 1, inningsNumber: 1, teamId: 2, runs: 45, wickets: 2, balls: 28, extras: 5, status: "LIVE" },
    ],
  };

  const parsedLive = {
    // 8 deliveries in the over due to 2 extras
    recentDeliveries: ["1", "WD", "0", "NB", "4", "1", "2", "0"],
    liveSummary: {
      currentBowler: {
        name: "Abinash Bohara",
        wickets: 1,
        runs: 18,
        overs: "2.0",
        noBalls: 1,
        wides: 1,
      },
    },
  };

  const state = buildBroadcastStateFromMatch(mockMatch, parsedLive);
  const scoreObj = state.score as any;
  const liveObj = state.live as any;
  const matchObj = state.match as any;

  // Recent deliveries should NOT be sliced to 6
  assert.equal(scoreObj.recent.length, 8);
  assert.deepEqual(scoreObj.recent, ["1", "WD", "0", "NB", "4", "1", "2", "0"]);

  // Bowler extras should be populated
  assert.equal(liveObj.bowlerNoBalls, "1");
  assert.equal(liveObj.bowlerWides, "1");

  // Separate teams
  assert.equal(matchObj.teamA, "CHR");
  assert.equal(matchObj.teamB, "BIK");
  assert.notEqual(matchObj.teamA, matchObj.teamB);
});

test("graphics templates and app.js include bowler no-balls and wides bindings", () => {
  const outputPage = readFileSync(new URL("../src/app/broadcast/output/page.tsx", import.meta.url), "utf8");
  const appJs = readFileSync(new URL("../public/broadcast/app.js", import.meta.url), "utf8");

  assert.match(outputPage, /id="masterBowlerNoBalls"/);
  assert.match(outputPage, /id="masterBowlerWides"/);
  assert.match(outputPage, /id="anchorMasterBowlerNoBalls"/);
  assert.match(outputPage, /id="anchorMasterBowlerWides"/);

  assert.match(appJs, /masterBowlerNoBalls:\s*bNoBalls/);
  assert.match(appJs, /masterBowlerWides:\s*bWides/);
  assert.match(appJs, /anchorMasterBowlerNoBalls:\s*bNoBalls/);
  assert.match(appJs, /anchorMasterBowlerWides:\s*bWides/);
});

test("selected fixture auto-sync refreshes its authoritative source and persists automation settings", () => {
  const controller = readFileSync(new URL("../src/app/(dashboard)/broadcast/page.tsx", import.meta.url), "utf8");

  assert.match(controller, /`\/api\/matches\/\$\{selectedMatchId\}\/sync-source`/);
  assert.match(controller, /forceOverwrite:\s*true/);
  assert.match(controller, /broadcastState/);
  assert.match(controller, /const isAutoMode = season\.autoSync/);
  assert.match(controller, /if \(selectedMatchId && isAutoMode\) void syncAutoFeed\(\)/);
  assert.match(controller, /if \(!isAutoMode && !manual\) return/);
  assert.doesNotMatch(controller, /ENABLE AUTO SYNC/);
});

test("every data-backed graphic receives canonical arrays and full current-over deliveries", () => {
  const script = readFileSync(new URL("../public/broadcast/app.js", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/broadcast/output/page.tsx", import.meta.url), "utf8");

  assert.match(script, /Object\.assign\(state\.match, p\.match\)/);
  assert.match(script, /state\.profile = p\.profile/);
  assert.match(script, /state\.compare = p\.compare/);
  assert.match(script, /overSummaryBalls\.innerHTML = html/);
  assert.match(page, /id="overSummaryBalls"/);
  assert.match(page, /id="partnershipStriker"/);
  assert.match(page, /id="resultAScore"/);
});

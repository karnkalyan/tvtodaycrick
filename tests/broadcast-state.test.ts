import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mergeBroadcastState } from "../src/lib/broadcast-state";

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
  assert.match(script, /fetch\('\/api\/broadcast\/state', \{ cache: 'no-store' \}\)/);
  assert.match(script, /setInterval\(refreshStateFromDb, 1500\)/);
});

test("broadcast director preserves incoming swapped teams instead of stale local teams", () => {
  const page = readFileSync(new URL("../src/app/(dashboard)/broadcast/page.tsx", import.meta.url), "utf8");
  const sender = page.slice(page.indexOf("const sendCue"), page.indexOf("// Cue functions"));
  const loader = page.slice(page.indexOf("// Fetch NPL Database"), page.indexOf("// Helper to retrieve roster"));

  assert.match(sender, /persistedMatch = \{ teamA, teamB, \.\.\.\(incoming\.match \|\| \{\}\) \}/);
  assert.match(sender, /incoming\.fow !== undefined/);
  assert.doesNotMatch(loader, /handleSelectFixture\(/);
});

test("broadcast match feed exposes innings team assignments and real zero-over scores", () => {
  const route = readFileSync(new URL("../src/app/api/broadcast/npl-data/route.ts", import.meta.url), "utf8");

  assert.match(route, /teamCode: innings\.teamId === m\.homeTeamId/);
  assert.match(route, /activeInningsNumber: activeInnings\?\.inningsNumber \|\| 1/);
  assert.match(route, /homeScore: scoreText\(homeInnings\)/);
  assert.doesNotMatch(route, /inn1\.balls > 0[\s\S]{0,120}'20\.0'/);
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



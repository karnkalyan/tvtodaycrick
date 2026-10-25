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

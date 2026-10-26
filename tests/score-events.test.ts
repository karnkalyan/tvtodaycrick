import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyCustomExtra, applyQuickBall, QUICK_BALL_EVENTS } from "../src/lib/score-events";

test("every quick-score button has a unique delivery and broadcast action", () => {
  assert.equal(new Set(QUICK_BALL_EVENTS.map((event) => event.type)).size, QUICK_BALL_EVENTS.length);
  assert.equal(new Set(QUICK_BALL_EVENTS.map((event) => event.broadcastAction)).size, QUICK_BALL_EVENTS.length);
});

test("one-run click records one run and maps to the single-run broadcast action", () => {
  const result = applyQuickBall({ runs: 0, wickets: 0, balls: 0, extras: 0 }, "1");
  assert.deepEqual(
    { runs: result.runs, wickets: result.wickets, balls: result.balls, extras: result.extras, action: result.event.broadcastAction },
    { runs: 1, wickets: 0, balls: 1, extras: 0, action: "run1" },
  );
});

test("all quick-score outcomes apply the expected totals", () => {
  const base = { runs: 10, wickets: 2, balls: 5, extras: 1 };
  const expected = {
    "0": [10, 2, 6, 1], "1": [11, 2, 6, 1], "2": [12, 2, 6, 1], "3": [13, 2, 6, 1],
    "4": [14, 2, 6, 1], "6": [16, 2, 6, 1], wicket: [10, 3, 6, 1],
    wide: [11, 2, 5, 2], wd1: [12, 2, 5, 3], noball: [11, 2, 5, 2], nb1: [12, 2, 5, 3], nb4: [15, 2, 5, 6],
    "1lb": [11, 2, 6, 2], "2lb": [12, 2, 6, 3], "3lb": [13, 2, 6, 4], "4lb": [14, 2, 6, 5], "1b": [11, 2, 6, 2],
  } as const;
  for (const event of QUICK_BALL_EVENTS) {
    const result = applyQuickBall(base, event.type);
    assert.deepEqual([result.runs, result.wickets, result.balls, result.extras], expected[event.type]);
  }
});

test("custom extras apply user-specified runs without counting against batsmen", () => {
  const base = { runs: 50, wickets: 3, balls: 20, extras: 4 };
  const customLb = applyCustomExtra(base, { category: "LB", runs: 3 });
  assert.equal(customLb.runs, 53);
  assert.equal(customLb.extras, 7);
  assert.equal(customLb.balls, 21); // legal ball
  assert.equal(customLb.isLegal, true);

  const customPen = applyCustomExtra(base, { category: "PEN", runs: 5, isLegal: false });
  assert.equal(customPen.runs, 55);
  assert.equal(customPen.extras, 9);
  assert.equal(customPen.balls, 20); // penalty does not advance ball
  assert.equal(customPen.isLegal, false);
});

test("broadcast receiver does not turn ordinary runs into the FOUR fallback banner", () => {
  const script = readFileSync(new URL("../public/broadcast/app.js", import.meta.url), "utf8");
  const actionReceiver = script.slice(script.indexOf("case 'action':"), script.indexOf("case 'scoreUpdate':"));
  assert.match(actionReceiver, /action\(name, false\)/);
  assert.doesNotMatch(actionReceiver, /triggerMasterEventLowerThird\(name\)/);
  assert.match(script, /case'run3':add\('3',3,true,false,persist\)/);
});

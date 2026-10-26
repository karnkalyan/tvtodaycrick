import assert from "node:assert/strict";
import test from "node:test";
import { nepaliEventAnnouncement, nepaliEventSpeechCue, normalizeNepaliSpeech } from "../src/lib/nepali-tts";

test("normalizes cricket abbreviations and digits for Nepali speech", () => {
  assert.equal(
    normalizeNepaliSpeech("CRR 8/2 | NB"),
    "हालको रन रेट आठ दुई नो बल",
  );
});

test("provides natural Nepali announcements for every scoring event", () => {
  const events = ["dot", "run1", "run2", "run3", "four", "six", "wicket", "wide", "noBall"] as const;
  for (const event of events) {
    const announcement = nepaliEventAnnouncement(event);
    assert.ok(announcement.length > 3);
    assert.match(announcement, /[\u0900-\u097F]/);
  }
  assert.equal(nepaliEventAnnouncement("six"), "छक्का! शानदार प्रहार!");
  assert.equal(nepaliEventAnnouncement("wicket"), "आउट! विकेट गयो!");
});

test("rotates human expressions and gives major events more dramatic delivery", () => {
  const firstSix = nepaliEventSpeechCue("six", 0);
  const secondSix = nepaliEventSpeechCue("six", 1);
  const dot = nepaliEventSpeechCue("dot", 0);
  const wicket = nepaliEventSpeechCue("wicket", 0);

  assert.notEqual(firstSix.text, secondSix.text);
  assert.ok(firstSix.text.includes("छक्का"));
  assert.ok(wicket.rate < dot.rate);
  assert.ok(wicket.pitch < dot.pitch);
  assert.ok(wicket.crowdVolume < dot.crowdVolume);
});

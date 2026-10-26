import assert from "node:assert/strict";
import test from "node:test";
import { nepaliEventAnnouncement, normalizeNepaliSpeech } from "../src/lib/nepali-tts";

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

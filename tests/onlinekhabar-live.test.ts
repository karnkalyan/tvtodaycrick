import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import {
  getOnlineKhabarUrlForMatch,
  slugToPlayerOrTeamName,
  cleanPlayerDisplayName,
  parseOnlineKhabarData,
} from "../src/lib/onlinekhabar-live";

test("getOnlineKhabarUrlForMatch maps match numbers to onlinekhabar 314 + N match IDs", () => {
  assert.equal(getOnlineKhabarUrlForMatch("Match 1"), "https://www.onlinekhabar.com/cricket-match/315");
  assert.equal(getOnlineKhabarUrlForMatch("Season3-M1"), "https://www.onlinekhabar.com/cricket-match/315");
  assert.equal(getOnlineKhabarUrlForMatch("M2"), "https://www.onlinekhabar.com/cricket-match/316");
  assert.equal(getOnlineKhabarUrlForMatch("Match 3"), "https://www.onlinekhabar.com/cricket-match/317");
  assert.equal(getOnlineKhabarUrlForMatch("Match 32"), "https://www.onlinekhabar.com/cricket-match/346");
  assert.equal(getOnlineKhabarUrlForMatch("Friendly"), null);
});

test("Season 3 source sync prefers deterministic OnlineKhabar IDs over legacy fixture notes", () => {
  const route = fs.readFileSync(new URL("../src/app/api/matches/[id]/sync-source/route.ts", import.meta.url), "utf8");
  assert.match(route, /isSeasonThreeFixture/);
  assert.match(route, /!explicitSourceUrl && isSeasonThreeFixture && okFallbackUrl/);
  assert.match(route, /sourceUrl = okFallbackUrl/);
});

test("slugToPlayerOrTeamName converts hyphens and handles particles properly", () => {
  assert.equal(slugToPlayerOrTeamName("lumbini-lions-2026"), "Lumbini Lions");
  assert.equal(slugToPlayerOrTeamName("sudurpaschim-royals-2026"), "Sudurpaschim Royals");
  assert.equal(slugToPlayerOrTeamName("biratnagar-kings-2026"), "Biratnagar Kings");
  assert.equal(slugToPlayerOrTeamName("dipendra-singh-airee"), "Dipendra Singh Airee");
  assert.equal(slugToPlayerOrTeamName("shadley-van-schalkwyk"), "Shadley van Schalkwyk");
});

test("parseOnlineKhabarData keeps wides and no-balls as extra deliveries beyond six", () => {
  const score = `<section class="npl-score" data-match-state="live">
    <div class="npl-team"><a class="npl-team-link" href="/cricket-team/biratnagar-kings-2026/"></a><p class="npl-team__score">65/2 7.5 overs</p></div>
    <p class="npl-score__innings">2nd Innings</p>
    <div class="npl-team"><a class="npl-team-link" href="/cricket-team/chitwan-rhinos-2026/"></a><p class="npl-team__score">157/3 20 overs</p></div>
    <div class="npl-score__live"><div class="npl-score__group"><span class="npl-score__player"><span class="npl-icon-bat"></span><a class="npl-player-link" href="/cricket-player/385">नरेन साउद</a> 2(2b)</span></div></div>
    <div class="npl-score__rates">CRR: 8.30 RRR: 8.00</div>
  </section>`;
  const over = `<table class="npl-sc-table--overs"><tbody><tr>
    <td class="npl-overs__no">Ov 8</td><td class="npl-overs__score">65/2</td>
    <td><ul class="npl-overs__balls"><li>1</li><li>1w</li><li>0</li><li>2nb</li><li>4</li><li>1</li><li>2</li><li>W</li></ul></td>
  </tr></tbody></table>`;
  const batting1 = `<table><tbody></tbody></table><p>Total: 157/3 (20 overs)</p>`;
  const batting2 = `<table><tbody><tr><td><img src="https://example.com/Naren-Saud.jpg"><span class="npl-sc-player__name"><a class="npl-player-link" href="/cricket-player/385">नरेन साउद</a></span></td><td>Not out</td><td>2</td><td>2</td><td>0</td><td>0</td><td>100.00</td></tr></tbody></table><p>Total: 65/2 (7.5 overs)</p>`;
  const parsed = parseOnlineKhabarData({
    match_id: 316,
    current: 2,
    state: "live",
    regions: {
      score: { html: score },
      "batting-1": { html: batting1 },
      "bowling-1": { html: "<table></table>" },
      "batting-2": { html: batting2 },
      "bowling-2": { html: "<table></table>" },
      "overs-2": { html: over },
    },
  });

  assert.equal(parsed.currentInningsNumber, 2);
  assert.equal(parsed.innings[0].battingTeamName, "Chitwan Rhinos");
  assert.equal(parsed.innings[1].battingTeamName, "Biratnagar Kings");
  assert.deepEqual(parsed.recentDeliveries, ["1", "1WD", "0", "2NB", "4", "1", "2", "W"]);
  assert.equal(parsed.liveSummary?.crr, 8.3);
  assert.equal(parsed.liveSummary?.currentBatters[0]?.name, "Naren Saud");
});

test("parseOnlineKhabarData parses toss, innings, extras and player performances", () => {
  const samplePath = "scratch/ok_315_live.json";
  if (!fs.existsSync(samplePath)) return;

  const rawJson = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  const result = parseOnlineKhabarData(rawJson, "https://www.onlinekhabar.com/cricket-match/315");

  assert.ok(result, "Result should not be null");
  assert.equal(result.status, "LIVE");
  assert.equal(result.title, "Lumbini Lions vs Sudurpaschim Royals");
  assert.equal(result.homeTeam.name, "Lumbini Lions");
  assert.equal(result.awayTeam.name, "Sudurpaschim Royals");

  // Toss
  assert.ok(result.toss, "Toss details should exist");
  assert.equal(result.toss?.winnerName, "Lumbini Lions");
  assert.equal(result.toss?.decision, "BOWL");

  // Innings 1
  assert.ok(result.innings.length > 0, "Innings should be parsed");
  const inn1 = result.innings[0];
  assert.equal(inn1.inningsNumber, 1);
  assert.equal(inn1.battingTeamName, "Sudurpaschim Royals");
  assert.equal(inn1.runs, 87);
  assert.equal(inn1.wickets, 10);
  assert.equal(inn1.overs, "17.2");
  assert.equal(inn1.extras.wides, 3);
  assert.equal(inn1.extras.legByes, 6);

  // Live Summary
  assert.ok(result.liveSummary, "Live summary should exist");
  assert.equal(result.liveSummary.crr, 5.02);
  assert.ok(result.liveSummary.currentBatters.length > 0, "Batters should exist");
  assert.equal(result.liveSummary.currentBatters[0].name, "Anil Kharel");
  assert.equal(result.liveSummary.currentBowler?.name, "Rohit Kumar Paudel");
  assert.equal(result.liveSummary.currentBowler?.wickets, 1);
  assert.equal(result.liveSummary.currentBowler?.runs, 10);

  // Player Performances
  assert.ok(Array.isArray(result.playerPerformances), "Player performances should be an array");
  assert.ok((result.playerPerformances?.length || 0) > 10, "Should have batters and bowlers");
  const aarif = result.playerPerformances?.find((p) => p.name === "Aarif Sheikh");
  assert.ok(aarif, "Aarif Sheikh should be parsed");
  assert.equal(aarif?.batting?.runs, 0);
  assert.equal(aarif?.batting?.balls, 6);

  const dipendra = result.playerPerformances?.find((p) => p.name === "Dipendra Singh Airee");
  assert.ok(dipendra, "Dipendra Singh Airee should be parsed");
  assert.equal(dipendra?.batting?.runs, 27);
  assert.equal(dipendra?.batting?.balls, 23);
  assert.equal(dipendra?.batting?.fours, 2);

  const kishore = result.playerPerformances?.find((p) => p.name === "Kishore Mahato");
  assert.ok(kishore, "Kishore Mahato should be parsed");
  assert.equal(kishore?.bowling?.wickets, 4);
  assert.equal(kishore?.bowling?.runs, 23);
});

test("parseOnlineKhabarData resolves PHP uniqid player image hashes and sorts reverse overs chronologically", () => {
  assert.equal(cleanPlayerDisplayName("Players 6756e7f8a2d3ajimmy"), "James Neesham");
  assert.equal(cleanPlayerDisplayName("जिमी नीशम"), "James Neesham");
  assert.equal(cleanPlayerDisplayName("हर्मीत सिंह"), "Harmeet Singh");
  assert.equal(cleanPlayerDisplayName("दिपक डुम्रे"), "Deepak Dumre");

  const score = `<section class="npl-score" data-match-state="live">
    <div class="npl-team"><a class="npl-team-link" href="/cricket-team/karnali-yaks-2026/"></a><p class="npl-team__score">37/2 5 overs</p></div>
    <p class="npl-score__innings">1st Innings</p>
    <div class="npl-team"><a class="npl-team-link" href="/cricket-team/janakpur-bolts-2026/"></a><p class="npl-team__score">0/0 0 overs</p></div>
    <div class="npl-score__live">
      <div class="npl-score__group">
        <span class="npl-score__player"><span class="npl-icon-bat"></span><a class="npl-player-link" href="/cricket-player/ariful-islam">Ariful Islam</a> 19(8b)</span>
        <span class="npl-score__player"><a class="npl-player-link" href="/cricket-player/hussain-talat">Hussain Talat</a> 3(10b)</span>
      </div>
      <div class="npl-score__group npl-score__group--over">
        <span class="npl-score__player"><span class="npl-icon-ball"></span><a class="npl-player-link" href="/cricket-player/295">जिमी नीशम</a> 0/8 (1.2)</span>
      </div>
    </div>
  </section>`;

  const bowling1 = `<table><tbody><tr>
    <td><img src="https://www.onlinekhabar.com/wp-content/uploads/2024/12/players-6756e7f8a2d3ajimmy.jpg"><span class="npl-sc-player__name"><a class="npl-player-link" href="/cricket-player/295">जिमी नीशम</a></span></td>
    <td>1.2</td><td>0</td><td>8</td><td>0</td><td>6.00</td>
  </tr></tbody></table>`;

  // OnlineKhabar lists newest overs first (Ov 5 down to Ov 1)
  const overs1 = `<table class="npl-sc-table--overs"><tbody>
    <tr><td class="npl-overs__no">Ov 5</td><td class="npl-overs__score">37/2</td><td><ul class="npl-overs__balls"><li>1</li><li>1</li><li>1</li><li>0</li><li>1</li><li>6</li></ul></td></tr>
    <tr><td class="npl-overs__no">Ov 1</td><td class="npl-overs__score">4/1</td><td><ul class="npl-overs__balls"><li>0</li><li>0</li><li>1</li><li>3</li><li>0</li><li>W</li></ul></td></tr>
  </tbody></table>`;

  const parsed = parseOnlineKhabarData({
    match_id: 317,
    current: 1,
    state: "live",
    regions: {
      score: { html: score },
      "batting-1": { html: "<table><tbody></tbody></table><p>Total: 37/2 (5 overs)</p>" },
      "bowling-1": { html: bowling1 },
      "overs-1": { html: overs1 },
    },
  });

  assert.equal(parsed.liveSummary?.currentBowler?.name, "James Neesham");
  assert.equal(parsed.playerPerformances?.[0]?.name, "James Neesham");
  assert.deepEqual(
    parsed.oversByInnings?.["1"]?.map((o) => o.overNo),
    ["Ov 1", "Ov 5"],
    "overs should be sorted in ascending order (Ov 1 -> Ov 5)",
  );
  assert.deepEqual(
    parsed.recentDeliveries,
    ["1", "1", "1", "0", "1", "6"],
    "recentDeliveries should come from Ov 5, not Ov 1",
  );
});

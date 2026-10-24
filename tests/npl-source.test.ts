import test from "node:test";
import assert from "node:assert/strict";
import { parseFixtures, parseSquad, parseTeam, sourceUrl } from "../src/lib/npl-source";

function fixturePage(status="upcoming",score="—") {
 const matchesItems=Array.from({length:28},(_,i)=>({id:i+1,url:`https://www.cricnepal.com/match/source-${i}`,ts:1793011500+i*86400,tournament_slug:"nepal-premier-league-2026-207",match_stage:`Match ${i+1}`,venue:"Source ground",status_key:status,teams:[{name:"Home",score},{name:"Away",score:"—"}],footer:status==="upcoming"?"Match yet to begin":"Home won by 2 runs"}));
 const payload=`1:${JSON.stringify(["$","fixture-list",null,{matchesItems}])}\n`;
 return `<script>self.__next_f.push(${JSON.stringify([1,payload.slice(0,100)])})</script><script>self.__next_f.push(${JSON.stringify([1,payload.slice(100)])})</script>`;
}
test("reads hidden fixture cards across split JSON chunks, converts Nepal time and leaves missing scores unavailable",()=>{const matches=parseFixtures(fixturePage());assert.equal(matches.length,28);assert.equal(matches[0].startTime,"2026-10-26T10:45:00.000Z");assert.equal(matches[0].homeScore,null);assert.equal(matches[0].result,null);assert.equal(matches[0].status,"SCHEDULED");});
test("retains a published score and actual result rather than creating zero innings",()=>{const matches=parseFixtures(fixturePage("completed","182/6 (20)"));assert.equal(matches[0].homeScore,"182/6 (20)");assert.equal(matches[0].awayScore,null);assert.equal(matches[0].status,"COMPLETED");assert.equal(matches[0].result,"Home won by 2 runs");});
test("rejects missing data and unexpected source origins",()=>{assert.throws(()=>parseFixtures("<html>maintenance</html>"),/Incomplete/);assert.throws(()=>sourceUrl("https://example.com/match/1"),/Unexpected/);assert.throws(()=>parseSquad("<h1>2025</h1>"),/Invalid/);});
test("does not execute remote scripts",()=>{parseFixtures(fixturePage()+"<script>throw new Error('must not run')</script>");});
test("extracts ownership from the profile body rather than the heading's immediate parent",()=>{const team=parseTeam('<script type="application/ld+json">{"@type":"SportsTeam","name":"Source Team","logo":"https://media.cricnepal.com/logo.webp"}</script><main><div><h2>About Source Team</h2></div><p>Based in Source City, the team is owned by Source Owner.</p></main>');assert.equal(team.ownerName,"Source Owner");assert.equal(team.city,"Source City");});

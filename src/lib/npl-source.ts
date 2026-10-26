import { load } from "cheerio";
import dns from "node:dns";
import type { NplFixture, NplPlayer } from "../types/npl";

if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

export const NPL_SOURCE = "https://www.cricnepal.com/tournament/nepal-premier-league-2026-207";
export const SECONDARY_SCHEDULE = "https://nplt20league.com/schedule/";
const origin = "https://www.cricnepal.com";
export function sourceUrl(path: string) { const url = new URL(path, origin); if (url.origin !== origin) throw new Error("Unexpected cricket source URL"); return url.href; }
export async function fetchSource(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: url.includes("/wp-json/") ? "application/json" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}: ${url}`);
  return response.text();
}
export function structured(html: string): Record<string, any>[] {
  const $ = load(html), result: Record<string, any>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => { try { const parsed = JSON.parse($(el).text()); result.push(...(Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed])); } catch { /* unrelated invalid metadata */ } });
  return result;
}
// Read the source's public server-rendered props, including cards hidden by Load More.
// Parse JSON only; never execute scripts returned by a remote website.
export function publicProps(html: string): unknown[] {
  const $ = load(html); let flight = "";
  $('script:not([src])').each((_, el) => { const text = $(el).text(); const prefix = "self.__next_f.push("; if (text.startsWith(prefix)) { try { const entry = JSON.parse(text.slice(prefix.length, text.lastIndexOf(")"))); if (typeof entry[1] === "string") flight += entry[1]; } catch { /* not a data chunk */ } } });
  return flight.split("\n").flatMap(line => { try { return [JSON.parse(line.slice(line.indexOf(":") + 1))]; } catch { return []; } });
}
export function parseFixtures(html: string, seriesUrl = NPL_SOURCE): NplFixture[] {
  const cards = new Map<string, any>();
  const slug = new URL(seriesUrl).pathname.split("/").pop();
  function walk(value: any) { if (!value || typeof value !== "object") return; if (value.url?.includes("/match/") && value.ts && Array.isArray(value.teams) && value.tournament_slug === slug) cards.set(String(value.id), value); for (const child of Object.values(value)) walk(child); }
  publicProps(html).forEach(walk);
  const score = (value?: string) => value && !/^(?:—|-|yet to bat)$/i.test(value.trim()) ? value : null;
  const result = [...cards.values()].map((card): NplFixture => ({ sourceId: String(card.id), number: card.match_stage || "Match", stage: /final/i.test(card.match_stage) ? "Final" : /eliminator/i.test(card.match_stage) ? "Eliminator" : /qualifier/i.test(card.match_stage) ? card.match_stage : "League", home: card.teams[0]?.name || "TBA", away: card.teams[1]?.name || "TBA", homeScore: score(card.teams[0]?.score), awayScore: score(card.teams[1]?.score), startTime: new Date(card.ts * 1000).toISOString(), venue: card.venue, status: card.status_key === "upcoming" ? "SCHEDULED" : /live|innings_break|interrupted/.test(card.status_key) ? "LIVE" : /abandon|cancel/.test(card.status_key) ? "ABANDONED" : card.status_key === "completed" || card.status_key === "result" ? "COMPLETED" : "UNKNOWN", result: card.footer && !/yet to begin/i.test(card.footer) ? card.footer : null, sourceUrl: sourceUrl(card.url) }));
  if (result.length < 28 || result.some(f => !f.home || !f.away || !f.venue || Number.isNaN(Date.parse(f.startTime)))) throw new Error("Incomplete or invalid 2026 fixture source; previous data preserved");
  return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export function parsePlayoffs(html: string, venue: string): NplFixture[] {
  const $ = load(html), result: NplFixture[] = [];
  $('a[aria-label^="Open scorecard"]').each((_, el) => {
    const card = $(el).parent(), text = card.text().replace(/\s+/g, " ");
    const number = Number(text.match(/(\d+)(?:st|nd|rd|th)\s*Match/)?.[1]);
    if (number < 29 || number > 32) return;
    const date = text.match(/(\d{1,2})\s+(\w{3})\s+'(\d{2})/), time = text.match(/(\d{2}):(\d{2})\s*(AM|PM)/);
    if (!date || !time || date[3] !== "26") throw new Error("Invalid reported playoff date");
    const hour = Number(time[1]) % 12 + (time[3] === "PM" ? 12 : 0);
    const startTime = new Date(`${date[2]} ${date[1]}, 20${date[3]} ${String(hour).padStart(2,"0")}:${time[2]}:00 GMT+0545`).toISOString();
    result.push({ sourceId: `reported-playoff-${number}`, number: `Match ${number}`, stage: number === 29 ? "Qualifier 1" : number === 30 ? "Eliminator" : number === 31 ? "Qualifier 2" : "Final", home: "TBA", away: "TBA", startTime, venue, status: "SCHEDULED", homeScore: null, awayScore: null, result: null, sourceUrl: SECONDARY_SCHEDULE, secondarySource: true });
  });
  if (result.length !== 4) throw new Error("Reported playoff schedule incomplete");
  return result;
}
export function squadLinks(html: string, seriesUrl = NPL_SOURCE) { const $ = load(html); return [...new Set($('a[href]').map((_, el) => $(el).attr("href")!).get().filter(h => h.startsWith(new URL(seriesUrl).pathname + "/squads/")))].map(sourceUrl); }
export function parseSquad(html: string): { name: string; players: NplPlayer[] } {
  const $ = load(html); const name = $("h1").map((_, el) => $(el).text()).get().find(t => / Squad$/.test(t))?.replace(/ Squad$/, "");
  const players: NplPlayer[] = [];
  $("h3").each((_, el) => { const heading = $(el), anchor = heading.closest('a[href^="/player/"]'); if (!anchor.length) return; const section = anchor.closest("section"), role = section.find("h2").first().text(); const text = anchor.text().replace(/\s+/g," "); const playerName = heading.find(".cn-identifier").first().text().trim(); if (!playerName) return; players.push({ name: playerName, sourceUrl: sourceUrl(anchor.attr("href")!), role: /wicket/i.test(role) ? "WICKET_KEEPER" : /allround|all.round/i.test(role) ? "ALL_ROUNDER" : /bowl/i.test(role) ? "BOWLER" : "BATSMAN", batting: text.match(/Batting:\s*([^:]+?)(?:Bowling:|$)/)?.[1]?.trim() || "", bowling: text.match(/Bowling:\s*(.+)$/)?.[1]?.trim() || "", imageUrl: anchor.find("img").attr("src") || null, nationality: null, isCaptain: /captain/i.test(heading.html() || "") || /\(c\)/i.test(heading.text()), isOverseas: !!heading.find('[title="Overseas player"]').length }); });
  const unique = [...new Map(players.map(p=>[p.sourceUrl,p])).values()];
  if (!name || unique.length < 8) throw new Error("Invalid squad source; previous roster preserved");
  return { name, players: unique };
}
export function parseTeam(html: string) { const $ = load(html), data = structured(html).find(x => x["@type"] === "SportsTeam"); if (!data) throw new Error("Team metadata unavailable"); const text = $("main").text(); return { name: data.name as string, logoUrl: (data.logo || null) as string | null, city: text.match(/based in ([^,.]+)[,.]/i)?.[1]?.trim() || null, ownerName: text.match(/owned by ([^.]+)\./i)?.[1]?.trim() || null }; }
export function parsePlayerProfile(html: string) { const $=load(html),person = structured(html).find(x => x["@type"] === "ProfilePage")?.mainEntity; if (!person?.name) throw new Error("Player profile unavailable");const field=(label:string)=>$("dt").filter((_,el)=>$(el).text()===label).next("dd").text();const roleText=$("main").text().match(/Playing Role(Batting allrounder|Bowling allrounder|Allrounder|Wicketkeeper|Wicketkeeper batter|Bowler|Batter)/i)?.[1]||"";return { name:person.name as string,jerseyNumber:Number($("main").text().match(/Jersey Number#(\d+)/)?.[1])||null,dateOfBirth:field("Date of Birth")&&!Number.isNaN(Date.parse(field("Date of Birth")))?new Date(field("Date of Birth")+" UTC").toISOString():null,nationality: typeof person.nationality === "string" ? person.nationality : null, imageUrl: typeof person.image === "string" ? person.image : null, batting:field("Batting Style"),bowling:field("Bowling Style"),role:roleText?/allround/i.test(roleText)?"ALL_ROUNDER":/wicket/i.test(roleText)?"WICKET_KEEPER":/bowl/i.test(roleText)?"BOWLER":"BATSMAN":null }; }
export function tournamentNewsUrl(html:string){let id:number|undefined;function walk(x:any){if(!x||typeof x!=="object")return;if(typeof x.tournamentId==="number")id=x.tournamentId;for(const child of Object.values(x))walk(child);}publicProps(html).forEach(walk);if(!id)throw new Error("Tournament news ID unavailable");return sourceUrl(`/wp-json/cricnepal/v1/tournament/${id}/news?per_page=50&page=1`);}
export function announcedPlayerLinks(html:string,headline:string){const $=load(html);return $('article a[href*="/player/"]').map((_,el)=>({name:$(el).text().trim(),url:sourceUrl($(el).attr("href")!)})).get().filter(p=>p.name&&headline.toLowerCase().includes(p.name.toLowerCase()));}

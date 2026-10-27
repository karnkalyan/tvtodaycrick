import { load } from "cheerio";
import dns from "node:dns";
import type { CricNepalParsedLiveMatch } from "./cricnepal-live";

import { ensureIpv4Dispatcher } from "./fetch-network";
ensureIpv4Dispatcher();

interface FailureBackoff {
  at: number;
  error: string;
}

const urlFailureBackoffs = new Map<string, FailureBackoff>();
const liveMatchCache = new Map<string, { at: number; data: CricNepalParsedLiveMatch }>();
const BACKOFF_COOLDOWN_MS = 30000;
const CACHE_TTL_MS = 3000;
const SOURCE_TIMEOUT_MS = 45000;

export const OK_BASE_MATCH_ID = 314; // Match 1 = 315, Match 2 = 316, etc.

/**
 * Returns OnlineKhabar match URL given a match number (e.g. "Match 1", "Season3-M1", "M2").
 */
export function getOnlineKhabarUrlForMatch(matchNumber: string): string | null {
  const m = matchNumber.match(/(\d+)$/);
  if (!m) return null;
  const ordinal = parseInt(m[1], 10);
  if (ordinal < 1 || ordinal > 40) return null;
  const matchId = OK_BASE_MATCH_ID + ordinal;
  return `https://www.onlinekhabar.com/cricket-match/${matchId}`;
}

const NEPALI_PLAYER_NAME_MAP: Record<string, string> = {
  "जिमी नीशम": "James Neesham",
  "जेम्स नीशम": "James Neesham",
  "जिमी निसम": "James Neesham",
  "जेम्स निसम": "James Neesham",
  "हर्मीत सिंह": "Harmeet Singh",
  "हरमीत सिंह": "Harmeet Singh",
  "मौसम ढकाल": "Mousom Dhakal",
  "श्याम ढकाल": "Mousom Dhakal",
  "नरेन साउद": "Naren Saud",
  "लोकेश बम": "Lokesh Bam",
  "सन्दीप लामिछाने": "Sandeep Lamichhane",
  "रञ्जित कुमार": "Ranjeet Kumar",
  "कमल सिंह ऐरी": "Kamal Singh Airee",
  "कमल ऐरी": "Kamal Singh Airee",
  "हुसेन तलत": "Hussain Talat",
  "अरिफुल इस्लाम": "Ariful Islam",
  "मोइन अली": "Moeen Ali",
  "ललित राजवंशी": "Lalit Rajbanshi",
  "राहुल यादव": "Rahul Yadav",
  "दीपेन्द्र रावत": "Dipendra Rawat",
  "मार्क वाट": "Mark Watt",
  "दीपक डुम्रे": "Deepak Dumre",
  "दिपक डुम्रे": "Deepak Dumre",
  "आसिफ शेख": "Aasif Sheikh",
  "अनिल साह": "Anil Sah",
  "कुशल मल्ल": "Kushal Malla",
  "कुशल भुर्तेल": "Kushal Bhurtel",
  "रोहित पौडेल": "Rohit Paudel",
  "सोमपाल कामी": "Sompal Kami",
  "दीपेन्द्र सिंह ऐरी": "Dipendra Singh Airee",
  "करण केसी": "Karan KC",
  "गुलशन झा": "Gulshan Jha",
  "भीम सार्की": "Bhim Sharki",
  "आरिफ शेख": "Aarif Sheikh",
  "अविनाश बोहरा": "Abinash Bohara",
  "सागर ढकाल": "Sagar Dhakal",
  "प्रतिश जिसी": "Pratis GC",
  "सूर्य तामाङ": "Surya Tamang",
  "आकाश चन्द": "Aakash Chand",
  "रिजन ढकाल": "Rijan Dhakal",
  "शेर मल्ल": "Sher Malla",
  "बसिर अहमद": "Basir Ahamad",
  "सन्दीप जोरा": "Sundeep Jora",
  "दिलिप नाथ": "Dilip Nath",
  "अर्जुन साउद": "Arjun Saud",
  "विनोद भण्डारी": "Binod Bhandari",
  "पवन सर्राफ": "Pawan Sarraf",
  "साहब आलम": "Shahab Alam",
  "विवेक यादव": "Bibek Yadav",
  "देव खनाल": "Dev Khanal",
  "राशिद खान": "Rashid Khan",
  "किशोर महतो": "Kishore Mahato",
  "नन्दन यादव": "Nandan Yadav",
  "बिपिन शर्मा": "Bipin Sharma",
  "विपिन शर्मा": "Bipin Sharma",
  "युवराज खत्री": "Yuvraj Khatri",
  "बेन माइक": "Ben Mike",
  "मोहम्मद मोहसिन": "Mohammad Mohsin",
  "आकाश त्रिपाठी": "Aakash Tripathi",
  "मयन यादव": "Mayan Yadav",
  "शुभ कंसाकार": "Shubh Kansakar",
  "विलियम बोसिस्टो": "William Bosisto",
  "जीशान मकसूद": "Zeeshan Maqsood",
  "अर्जुन घर्ती": "Arjun Gharti",
  "युनिश सिंह ठकुरी": "Unish Singh",
  "अभिषेक तिवारी": "Abhishek Tiwari",
  "आदित्य महता": "Aditya Mahat",
  "तृत राज दास": "Trit Raj Das",
  "कुसल परेरा": "Kusal Perera",
  "अकबर अली": "Akbar Ali",
};

const PLAYER_ALIAS_MAP: Record<string, string> = {
  "gulsan jha": "Gulshan Jha",
  "unish birkam singh": "Unish Singh",
  "unish bikram singh": "Unish Singh",
  "unish singh thakuri": "Unish Singh",
  "anil kumar sah": "Anil Sah",
  "aaditya mahata": "Aditya Mahat",
  "akbar ali": "Akbar Ali",
};

const IMAGE_NICKNAME_MAP: Record<string, string> = {
  jimmy: "James Neesham",
  neesham: "James Neesham",
  "jimmy-neesham": "James Neesham",
  moeen: "Moeen Ali",
  harmeet: "Harmeet Singh",
  talat: "Hussain Talat",
  ariful: "Ariful Islam",
  sandeep: "Sandeep Lamichhane",
  lokesh: "Lokesh Bam",
  mousom: "Mousom Dhakal",
  naren: "Naren Saud",
  ranjeet: "Ranjeet Kumar",
  kamal: "Kamal Singh Airee",
  lalit: "Lalit Rajbanshi",
  rahul: "Rahul Yadav",
  dipendra: "Dipendra Singh Airee",
  sompal: "Sompal Kami",
  rohit: "Rohit Paudel",
  aasif: "Aasif Sheikh",
  anil: "Anil Sah",
  "anil-kumar-sah": "Anil Sah",
  "aaditya-mahata": "Aditya Mahat",
  "gulsan-jha": "Gulshan Jha",
  "unish-birkam-singh": "Unish Singh",
  "unish-bikram-singh": "Unish Singh",
  pawan: "Pawan Sarraf",
  watt: "Mark Watt",
  deepak: "Deepak Dumre",
};

export function cleanPlayerDisplayName(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (NEPALI_PLAYER_NAME_MAP[trimmed]) {
    return NEPALI_PLAYER_NAME_MAP[trimmed];
  }
  const aliasMatch = PLAYER_ALIAS_MAP[trimmed.toLowerCase()];
  if (aliasMatch) {
    return aliasMatch;
  }
  const strippedHash = trimmed.replace(/^(?:players?[-_\s]+)?[0-9a-f]{10,16}[-_\s]*/i, "").trim();
  const lowerKey = strippedHash.toLowerCase().replace(/\s+/g, "-");
  if (IMAGE_NICKNAME_MAP[lowerKey]) {
    return IMAGE_NICKNAME_MAP[lowerKey];
  }
  if (strippedHash && strippedHash !== trimmed) {
    const resolved = slugToPlayerOrTeamName(lowerKey);
    return PLAYER_ALIAS_MAP[resolved.toLowerCase()] || resolved;
  }
  return trimmed;
}

export function slugToPlayerOrTeamName(slug: string): string {
  if (!slug) return "";
  const clean = slug
    .replace(/^(?:players?[-_]+)?[0-9a-f]{10,16}[-_]*/i, "")
    .replace(/-\d{4}$/, "")
    .replace(/-\d+$/, "");
  if (IMAGE_NICKNAME_MAP[clean.toLowerCase()]) {
    return IMAGE_NICKNAME_MAP[clean.toLowerCase()];
  }
  const formatted = clean
    .split("-")
    .map((w) => {
      const lower = w.toLowerCase();
      if (lower === "van" || lower === "de" || lower === "la") return lower;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
  return PLAYER_ALIAS_MAP[formatted.toLowerCase()] || formatted;
}

function extractNameFromImageFile(imageFile: string): string {
  if (!imageFile || /^\d+$/.test(imageFile)) return "";
  const stripped = imageFile.replace(/^(?:players?[-_]+)?[0-9a-f]{10,16}[-_]*/i, "").trim();
  if (!stripped || /^\d+$/.test(stripped)) return "";
  if (/^(?:img|image|photo|whatsapp|avatar|placeholder|default|user|logo|icon|blank|no[-_]?image)/i.test(stripped)) {
    return "";
  }
  if (/[0-9a-f]{7,}/i.test(stripped)) return "";
  const lower = stripped.toLowerCase();
  if (IMAGE_NICKNAME_MAP[lower]) return IMAGE_NICKNAME_MAP[lower];
  if (/^[a-z]+(?:-[a-z]+)+$/i.test(stripped)) return slugToPlayerOrTeamName(stripped);
  return "";
}

function sourcePlayerName(rawName: string, link: string, imageUrl = ""): string {
  const cleanRaw = cleanPlayerDisplayName(rawName || "");
  if (cleanRaw && NEPALI_PLAYER_NAME_MAP[cleanRaw]) {
    return NEPALI_PLAYER_NAME_MAP[cleanRaw];
  }
  const slug = link.match(/\/cricket-player\/([^/?#]+)/)?.[1] || "";
  if (slug && !/^\d+$/.test(slug)) return slugToPlayerOrTeamName(slug);
  if (cleanRaw && !/[^\x00-\x7F]/.test(cleanRaw)) {
    return cleanRaw;
  }
  const imageFile = imageUrl.split("/").pop()?.split("?")[0]?.replace(/\.[^.]+$/, "") || "";
  const fromImage = extractNameFromImageFile(imageFile);
  if (fromImage) return fromImage;
  return NEPALI_PLAYER_NAME_MAP[cleanRaw] || cleanRaw;
}

function parseScoreStr(str: string): { runs: number; wickets: number; overs: string; balls: number } {
  let runs = 0;
  let wickets = 0;
  let overs = "0.0";
  let balls = 0;

  const m = str.match(/(\d+)(?:\/(\d+))?/);
  if (m) {
    runs = parseInt(m[1], 10) || 0;
    wickets = m[2] !== undefined ? parseInt(m[2], 10) || 0 : 0;
  }
  const ovMatch = str.match(/([\d.]+)\s*overs?/i);
  if (ovMatch) {
    overs = ovMatch[1];
    const parts = overs.split(".");
    balls = (parseInt(parts[0], 10) || 0) * 6 + (parseInt(parts[1], 10) || 0);
  }
  return { runs, wickets, overs, balls };
}

function parseExtrasStr(text: string) {
  let total = 0;
  let wides = 0;
  let noBalls = 0;
  let byes = 0;
  let legByes = 0;
  let penalties = 0;

  const totMatch = text.match(/Extras:\s*(\d+)/i);
  if (totMatch) total = parseInt(totMatch[1], 10) || 0;
  const wMatch = text.match(/wide\s*(\d+)/i);
  if (wMatch) wides = parseInt(wMatch[1], 10) || 0;
  const nbMatch = text.match(/no_ball\s*(\d+)/i);
  if (nbMatch) noBalls = parseInt(nbMatch[1], 10) || 0;
  const bMatch = text.match(/bye\s*(\d+)/i);
  if (bMatch) byes = parseInt(bMatch[1], 10) || 0;
  const lbMatch = text.match(/leg_bye\s*(\d+)/i);
  if (lbMatch) legByes = parseInt(lbMatch[1], 10) || 0;
  const pMatch = text.match(/other\s*(\d+)/i);
  if (pMatch) penalties = parseInt(pMatch[1], 10) || 0;

  return { total, wides, noBalls, byes, legByes, penalties };
}

/** Preserve every delivery and normalize compact extra notation for graphics. */
function parseBallToken(text: string, title = "", className = ""): string {
  const raw = text.trim();
  if (!raw && (/dot/i.test(className) || /Dot|नो रन/i.test(title))) return "0";
  if (!raw && (/wicket/i.test(className) || /Wicket|आउट/i.test(title))) return "W";
  if (!raw) return ".";

  const lower = raw.toLowerCase();
  if (lower === "w") return "W";
  if (/^\d*w$/.test(lower)) return `${lower.slice(0, -1) || "1"}WD`;
  if (/^\d*nb$/.test(lower)) return `${lower.slice(0, -2) || "1"}NB`;
  if (/^\d*lb$/.test(lower)) return `${lower.slice(0, -2) || "1"}LB`;
  if (/^\d*b$/.test(lower)) return `${lower.slice(0, -1) || "1"}B`;
  return raw === "." ? "0" : raw.toUpperCase();
}

/**
 * Parses OnlineKhabar match JSON payload (from wp-json/okcm/v1/matches/:id/live)
 * into a standardized CricNepalParsedLiveMatch object.
 */
export function parseOnlineKhabarData(data: any, sourceUrl = ""): CricNepalParsedLiveMatch {
  const scoreHtml = data.regions?.score?.html || "";
  const $score = load(scoreHtml);

  const stateAttr = ($score("section.npl-score").attr("data-match-state") || data.state || "").toLowerCase();
  const status: "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED" =
    stateAttr === "live"
      ? "LIVE"
      : stateAttr === "completed" || stateAttr === "result" || stateAttr === "finished"
      ? "COMPLETED"
      : stateAttr === "upcoming"
      ? "SCHEDULED"
      : (data.state === "finished" || data.state === "completed" ? "COMPLETED" : "SCHEDULED");

  const venue = "TU Cricket Ground, Kirtipur";

  // Result summary if completed
  let resultSummary: string | undefined = undefined;
  const tossOrResult = $score(".npl-score__toss").text().trim();
  const directResult = $score(".npl-score__result").text().trim();
  if (tossOrResult && /won by|tied|no result/i.test(tossOrResult)) {
    resultSummary = tossOrResult;
  } else if (directResult) {
    resultSummary = directResult;
  }

  // Teams
  const teamEls = $score(".npl-team");
  const teams: any[] = [];
  teamEls.each((i, el) => {
    const rawName = $score(el).find(".npl-team__name").text().trim();
    const link = $score(el).find(".npl-team-link").attr("href") || "";
    const slugMatch = link.match(/\/cricket-team\/([^\/]+)/);
    const slug = slugMatch ? slugMatch[1] : "";
    const englishName = slugToPlayerOrTeamName(slug) || rawName;
    const scoreText = $score(el).find(".npl-team__score").text().trim();
    const statusText = $score(el).find(".npl-team__status").text().trim();
    const parsed = parseScoreStr(scoreText);

    teams.push({
      name: englishName,
      rawName,
      slug,
      link,
      scoreText,
      statusText,
      ...parsed,
    });
  });

  const homeTeam = teams[0] || { name: "Home Team" };
  const awayTeam = teams[1] || { name: "Away Team" };

  // Toss
  const tossText = $score(".npl-score__toss").text().trim();
  let toss: { winnerName: string; decision: "BAT" | "BOWL"; notes?: string } | null = null;
  if (tossText && !tossText.includes("not taken place")) {
    const isBowl = /chose bowling|opted to bowl/i.test(tossText);
    const winnerName =
      teams.find((t) => tossText.includes(t.rawName) || tossText.includes(t.name))?.name || homeTeam.name;
    toss = {
      winnerName,
      decision: isBowl ? "BOWL" : "BAT",
      notes: tossText,
    };
  }

  // Fall of Wickets (by innings)
  const fowByInnings: Record<number, Array<[string, string, string]>> = {};
  [1, 2].forEach((innNum) => {
    const fowHtml = data.regions?.[`fow-${innNum}`]?.html;
    if (!fowHtml) return;
    const $fow = load(fowHtml);
    const rows: Array<[string, string, string]> = [];
    $fow("table.npl-sc-table--fow tbody tr").each((_, tr) => {
      const playerLink = $fow(tr).find(".npl-player-link").attr("href") || "";
      const rawName = $fow(tr).find(".npl-sc-player__name").text().trim();
      const playerName = sourcePlayerName(rawName, playerLink, $fow(tr).find("img").attr("src") || "");
      const score = $fow(tr).find("td:nth-child(2)").text().trim();
      const over = $fow(tr).find("td:nth-child(3)").text().trim();
      if (score && over) {
        const formattedScore = score.includes("-") ? score.replace("-", "/") : score;
        rows.push([formattedScore, playerName, `${over} OV`]);
      }
    });
    if (rows.length > 0) {
      fowByInnings[innNum] = rows;
    }
  });

  // Overs Summary with ball-by-ball deliveries
  const oversByInnings: Record<number, Array<{ overNo: string; score: string; balls: string[] }>> = {};
  let recentDeliveries: string[] = [];
  [1, 2].forEach((innNum) => {
    const oversHtml = data.regions?.[`overs-${innNum}`]?.html;
    if (!oversHtml) return;
    const $ov = load(oversHtml);
    const oversList: Array<{ overNo: string; score: string; balls: string[] }> = [];
    $ov("table.npl-sc-table--overs tbody tr").each((_, tr) => {
      const overNo = $ov(tr).find(".npl-overs__no").text().trim();
      const score = $ov(tr).find(".npl-overs__score").text().trim();
      const balls: string[] = [];
      $ov(tr).find(".npl-overs__balls li").each((_, li) => {
        const text = $ov(li).text().trim();
        const title = $ov(li).attr("title") || $ov(li).find("img").attr("alt") || "";
        balls.push(parseBallToken(text, title, $ov(li).attr("class") || ""));
      });
      if (balls.length > 0) {
        oversList.push({ overNo, score, balls });
      }
    });
    if (oversList.length > 0) {
      oversList.sort((a, b) => {
        const numA = Number(a.overNo.match(/\d+/)?.[0] || 0);
        const numB = Number(b.overNo.match(/\d+/)?.[0] || 0);
        return numA - numB;
      });
      oversByInnings[innNum] = oversList;
      if (recentDeliveries.length === 0 && oversList.at(-1)?.balls) {
        recentDeliveries = oversList.at(-1)!.balls;
      }
    }
  });

  // Innings and Player Performances
  const innings: CricNepalParsedLiveMatch["innings"] = [];
  const playerPerformances: any[] = [];
  const currentInnings = Number(data.current)
    || (/2nd Innings/i.test($score(".npl-score__innings").text()) ? 2 : 1);

  [1, 2].forEach((innNum) => {
    const batHtml = data.regions?.[`batting-${innNum}`]?.html || "";
    const bowlHtml = data.regions?.[`bowling-${innNum}`]?.html || "";
    if (!batHtml && !bowlHtml) return;

    const $bat = load(batHtml);
    const $bowl = load(bowlHtml);
    const isEmptyInningsTable = $bat(".npl-match-empty").length > 0 || $bat("tbody tr").length === 0;
    const extras = parseExtrasStr($bat.root().text());

    const totalMatch = $bat.root().text().match(/Total:\s*(\d+)\/(\d+)/i);
    const totalRuns = totalMatch ? Number(totalMatch[1]) : null;
    const totalWickets = totalMatch ? Number(totalMatch[2]) : null;
    const scoreMatchedTeam = teams.find((team) =>
      totalRuns !== null && team.runs === totalRuns && team.wickets === totalWickets
    );
    const positionalTeam = innNum === currentInnings ? teams[0] : teams[1];
    const battingTeamName = scoreMatchedTeam?.name
      || positionalTeam?.name
      || (innNum === 1 ? homeTeam.name : awayTeam.name);
    const bowlingTeamName = battingTeamName === homeTeam.name ? awayTeam.name : homeTeam.name;

    const innTeam = teams.find((t) => t.name === battingTeamName);
    const innRuns = totalRuns !== null ? totalRuns : (innTeam?.runs || 0);
    const innWickets = totalWickets !== null ? totalWickets : (innTeam?.wickets || 0);
    const innBalls = innTeam?.balls || 0;
    const innOvers = innTeam?.overs || "0.0";

    if (innNum === 2 && currentInnings === 1 && isEmptyInningsTable && innBalls === 0 && innRuns === 0 && innWickets === 0) {
      return;
    }

    const isLive = status === "LIVE" && innNum === currentInnings;
    const target = innNum === 2 && innings[0] ? (innings[0].runs || 0) + 1 : null;

    innings.push({
      inningsNumber: innNum,
      battingTeamName,
      bowlingTeamName,
      runs: innRuns,
      wickets: innWickets,
      balls: innBalls,
      overs: innOvers,
      extras,
      target,
      status: isLive ? "LIVE" : (innBalls > 0 || innRuns > 0 || innWickets > 0 || !isEmptyInningsTable) ? "COMPLETED" : "NOT_STARTED",
    });

    // Batters
    $bat("tbody tr").each((_, tr) => {
      const tds = $bat(tr).find("td");
      if (tds.length < 5) return;
      const rawPName = $bat(tds[0]).find(".npl-sc-player__name").text().trim();
      const pLink = $bat(tds[0]).find(".npl-player-link").attr("href") || "";
      const playerName = sourcePlayerName(rawPName, pLink, $bat(tds[0]).find("img").attr("src") || "");
      const how = $bat(tds[1]).text().trim();
      const isNotOut = /not out/i.test(how);
      const runs = parseInt($bat(tds[2]).text().trim(), 10) || 0;
      const balls = parseInt($bat(tds[3]).text().trim(), 10) || 0;
      const fours = parseInt($bat(tds[4]).text().trim(), 10) || 0;
      const sixes = parseInt($bat(tds[5]).text().trim(), 10) || 0;
      const strikeRate = parseFloat($bat(tds[6]).text().trim()) || 0;

      playerPerformances.push({
        name: playerName,
        teamName: battingTeamName,
        innings: innNum,
        type: "BATSMAN",
        batting: {
          runs,
          balls,
          fours,
          sixes,
          strikeRate,
          dismissal: isNotOut ? "not out" : how,
          isNotOut,
        },
      });
    });

    // Bowlers
    $bowl("tbody tr").each((_, tr) => {
      const tds = $bowl(tr).find("td");
      if (tds.length < 5) return;
      const rawPName = $bowl(tds[0]).find(".npl-sc-player__name").text().trim();
      const pLink = $bowl(tds[0]).find(".npl-player-link").attr("href") || "";
      const playerName = sourcePlayerName(rawPName, pLink, $bowl(tds[0]).find("img").attr("src") || "");
      const overs = $bowl(tds[1]).text().trim();
      const maidens = parseInt($bowl(tds[2]).text().trim(), 10) || 0;
      const runs = parseInt($bowl(tds[3]).text().trim(), 10) || 0;
      const wickets = parseInt($bowl(tds[4]).text().trim(), 10) || 0;
      const economy = parseFloat($bowl(tds[5]).text().trim()) || 0;

      playerPerformances.push({
        name: playerName,
        teamName: bowlingTeamName,
        innings: innNum,
        type: "BOWLER",
        bowling: {
          overs,
          maidens,
          runs,
          wickets,
          economy,
        },
      });
    });
  });

  // Live Summary
  const crrText = $score(".npl-score__rates").text().trim();
  const crr = parseFloat(crrText.match(/CRR:\s*([\d.]+)/i)?.[1] || "0") || 0;

  const activeInnNum = innings.find((i) => i.status === "LIVE")?.inningsNumber || (innings.length > 1 && status === "COMPLETED" ? 2 : (innings[0]?.inningsNumber || 1));
  const activeOvers = oversByInnings[activeInnNum] || [];

  const headerOverBalls: string[] = [];
  $score(".npl-score__group--over ul.npl-chips li").each((_, li) => {
    const text = $score(li).text().trim();
    const title = $score(li).attr("title") || $score(li).find("img").attr("alt") || "";
    headerOverBalls.push(parseBallToken(text, title, $score(li).attr("class") || ""));
  });

  if (headerOverBalls.length > 0) {
    recentDeliveries = headerOverBalls;
  } else if (activeOvers.at(-1)?.balls?.length) {
    recentDeliveries = activeOvers.at(-1)!.balls;
  }

  const scoreHeaderBatters: Array<{ name: string; runs: number; balls: number; isStriker: boolean }> = [];
  $score(".npl-score__live .npl-score__group:not(.npl-score__group--over) .npl-score__player").each((_, el) => {
    const link = $score(el).find(".npl-player-link").attr("href") || "";
    const rawName = $score(el).find(".npl-player-link").text().trim();
    const figures = $score(el).text().match(/(\d+)\s*\(\s*(\d+)b\s*\)/i);
    if (!figures) return;
    const runs = Number(figures[1]);
    const balls = Number(figures[2]);
    const matchingPerformance = playerPerformances.find((p) =>
      p.innings === activeInnNum && p.type === "BATSMAN"
      && p.batting?.runs === runs && p.batting?.balls === balls
    );
    const resolvedName = sourcePlayerName(rawName, link);
    scoreHeaderBatters.push({
      name: (!/[^\x00-\x7F]/.test(resolvedName) && resolvedName ? resolvedName : matchingPerformance?.name) || resolvedName || rawName,
      runs,
      balls,
      isStriker: $score(el).find(".npl-icon-bat").length > 0,
    });
  });

  const currentBatters = scoreHeaderBatters.length
    ? scoreHeaderBatters
        .sort((a, b) => Number(b.isStriker) - Number(a.isStriker))
        .map((batter) => {
          const performance = playerPerformances.find((p) =>
            p.innings === activeInnNum && p.type === "BATSMAN" && p.name === batter.name
          );
          return {
            ...batter,
            fours: performance?.batting?.fours || 0,
            sixes: performance?.batting?.sixes || 0,
            strikeRate: performance?.batting?.strikeRate
              || (batter.balls ? (batter.runs * 100) / batter.balls : 0),
          };
        })
    : playerPerformances
        .filter((p) => p.innings === activeInnNum && p.type === "BATSMAN" && p.batting?.isNotOut)
        .map((p, idx) => ({
          name: p.name,
          runs: p.batting!.runs,
          balls: p.batting!.balls,
          fours: p.batting!.fours,
          sixes: p.batting!.sixes,
          strikeRate: p.batting!.strikeRate,
          isStriker: idx === 0,
        }));

  let currentBowler: NonNullable<CricNepalParsedLiveMatch["liveSummary"]>["currentBowler"] = null;
  const bowlerEl = $score(".npl-score__player--bowler, .npl-score__group--over .npl-score__player").first();
  if (bowlerEl.length) {
    const rawName = bowlerEl.find(".npl-player-link").text().trim();
    const link = bowlerEl.find(".npl-player-link").attr("href") || "";
    const text = bowlerEl.text().replace(rawName, "").trim();
    const m = text.match(/(\d+)\/(\d+)\s*\(([\d.]+)\)/);
    if (m) {
      const matchingPerformance = playerPerformances.find((p) =>
        p.innings === activeInnNum && p.type === "BOWLER"
        && p.bowling?.wickets === Number(m[1]) && p.bowling?.runs === Number(m[2])
        && p.bowling?.overs === m[3]
      );
      const resolvedName = sourcePlayerName(rawName, link);
      currentBowler = {
        name: (!/[^\x00-\x7F]/.test(resolvedName) && resolvedName ? resolvedName : matchingPerformance?.name) || resolvedName || rawName,
        wickets: parseInt(m[1], 10) || 0,
        runs: parseInt(m[2], 10) || 0,
        overs: m[3],
        maidens: matchingPerformance?.bowling?.maidens || 0,
        economy: matchingPerformance?.bowling?.economy || 0,
      };
    }
  }

  return {
    sourceId: String(data.match_id || ""),
    sourceUrl,
    title: `${homeTeam.name} vs ${awayTeam.name}`,
    status,
    resultSummary,
    venue,
    homeTeam: { name: homeTeam.name },
    awayTeam: { name: awayTeam.name },
    toss,
    currentInningsNumber: activeInnNum,
    innings,
    liveSummary: {
      currentBatters,
      currentBowler,
      crr,
    },
    playerPerformances,
    fowByInnings,
    oversByInnings,
    recentDeliveries,
  };
}

/**
 * Fetches and parses an OnlineKhabar live match from URL or match ID.
 * Returns null if network fails or circuit breaker is active.
 */
export async function fetchOnlineKhabarLiveMatch(urlOrId: string | number): Promise<CricNepalParsedLiveMatch | null> {
  let matchId = 0;
  let targetUrl = "";

  if (typeof urlOrId === "number") {
    matchId = urlOrId;
    targetUrl = `https://www.onlinekhabar.com/cricket-match/${matchId}`;
  } else {
    targetUrl = String(urlOrId).trim();
    const numMatch = targetUrl.match(/\/cricket-match\/(\d+)/);
    if (numMatch) {
      matchId = parseInt(numMatch[1], 10);
    }
  }

  // Cache check
  const cacheKey = `ok-${matchId || targetUrl}`;
  const cached = liveMatchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  // Circuit breaker check
  const failure = urlFailureBackoffs.get(cacheKey);
  if (failure && Date.now() - failure.at < BACKOFF_COOLDOWN_MS) {
    return cached?.data || null;
  }

  try {
    let jsonEndpoint = matchId ? `https://www.onlinekhabar.com/wp-json/okcm/v1/matches/${matchId}/live` : "";

    // If we only have a named slug URL without numeric ID, fetch HTML first to discover matchId
    if (!jsonEndpoint) {
      const pageRes = await fetch(targetUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const idMatch = html.match(/window\.okcmNplMatch\s*=\s*\{[^}]*"matchId"\s*:\s*(\d+)/);
        if (idMatch) {
          matchId = parseInt(idMatch[1], 10);
          jsonEndpoint = `https://www.onlinekhabar.com/wp-json/okcm/v1/matches/${matchId}/live`;
        }
      }
    }

    if (!jsonEndpoint) {
      return null;
    }

    const res = await fetch(jsonEndpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${jsonEndpoint}`);
    }

    const json = await res.json();
    const parsed = parseOnlineKhabarData(json, targetUrl);
    if (parsed) {
      urlFailureBackoffs.delete(cacheKey);
      liveMatchCache.set(cacheKey, { at: Date.now(), data: parsed });
    }
    return parsed;
  } catch (err) {
    const errorMsg = (err as any)?.cause?.message || (err instanceof Error ? err.message : String(err));
    urlFailureBackoffs.set(cacheKey, { at: Date.now(), error: errorMsg });
    if (cached?.data) return cached.data;
    throw err;
  }
}

type BroadcastState = Record<string, unknown>;

function isPlainObject(value: unknown): value is BroadcastState {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Merge partial broadcast updates without deleting data owned by another
 * screen (for example recent deliveries, points, or player details).
 * Arrays are complete values and are replaced rather than index-merged.
 */
export function mergeBroadcastState(current: unknown, incoming: unknown): BroadcastState {
  const base = isPlainObject(current) ? current : {};
  if (!isPlainObject(incoming)) return { ...base };

  const merged: BroadcastState = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      merged[key] = mergeBroadcastState(base[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export const DEFAULT_BROADCAST_STATE: BroadcastState = {
  match: {
    teamA: "LUL",
    teamB: "SPR",
    teamAName: "Lumbini Lions",
    teamBName: "Sudurpaschim Royals",
    inningsNumber: 1,
  },
  score: {
    runs: 0,
    wickets: 0,
    overs: "0.0",
    recent: ["-", "-", "-", "-", "-", "-"],
    target: null,
  },
  live: {
    innings: "MATCH SCHEDULED",
    rateText: "MATCH NOT STARTED",
    strikerName: "BATTER",
    strikerRuns: "0",
    strikerBalls: "0",
    nonStrikerName: "NON-STRIKER",
    nonStrikerRuns: "0",
    nonStrikerBalls: "0",
    bowlerName: "BOWLER",
    bowlerFigures: "0/0",
    bowlerOvers: "0.0",
    requirement: "MATCH SCHEDULED",
    matchLabel: "NEPAL PREMIER LEAGUE",
    venue: "TU INTERNATIONAL CRICKET GROUND, KIRTIPUR",
    tossText: "TOSS NOT YET RECORDED",
    target: "-",
  },
  fow: [],
  ui: {
    graphic: null,
    scoreMode: "hidden",
  },
};


import { z } from "zod";

const matchFields = z.object({
  tournamentId: z.coerce.number().int().positive().optional().nullable(),
  matchNumber: z.string().max(50).optional().nullable(),
  title: z.string().min(2).max(160),
  stage: z.enum(["LEAGUE", "QUALIFIER", "ELIMINATOR", "FINAL", "FRIENDLY"]).default("LEAGUE"),
  venue: z.string().max(160).optional().nullable(),
  startTime: z.coerce.date(),
  status: z.enum(["SCHEDULED", "LIVE", "COMPLETED", "ABANDONED"]).default("SCHEDULED"),
  overs: z.coerce.number().int().min(1).max(100).default(20),
  homeTeamId: z.coerce.number().int().positive(),
  awayTeamId: z.coerce.number().int().positive(),
  winnerTeamId: z.coerce.number().int().positive().optional().nullable(),
  resultText: z.string().max(300).optional().nullable(),
  playerOfMatch: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const matchSchema = matchFields.refine(v => v.homeTeamId !== v.awayTeamId, {
  message: "Teams must be different",
  path: ["awayTeamId"],
});

export const matchUpdateSchema = matchFields.partial().refine(
  v => v.homeTeamId === undefined || v.awayTeamId === undefined || v.homeTeamId !== v.awayTeamId,
  { message: "Teams must be different", path: ["awayTeamId"] },
);

export const tossSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  winnerTeamId: z.coerce.number().int().positive(),
  decision: z.enum(["BAT", "BOWL"]),
  notes: z.string().max(500).optional().nullable(),
});

export const statSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  playerId: z.coerce.number().int().positive(),
  teamId: z.coerce.number().int().positive(),
  innings: z.coerce.number().int().min(1).max(4).default(1),
  runs: z.coerce.number().int().min(0).default(0),
  ballsFaced: z.coerce.number().int().min(0).default(0),
  fours: z.coerce.number().int().min(0).default(0),
  sixes: z.coerce.number().int().min(0).default(0),
  wickets: z.coerce.number().int().min(0).max(10).default(0),
  ballsBowled: z.coerce.number().int().min(0).default(0),
  runsConceded: z.coerce.number().int().min(0).default(0),
  maidens: z.coerce.number().int().min(0).default(0),
  catches: z.coerce.number().int().min(0).default(0),
  stumpings: z.coerce.number().int().min(0).default(0),
  runOuts: z.coerce.number().int().min(0).default(0),
  isOut: z.boolean().default(false),
  dismissal: z.string().max(200).optional().nullable(),
});

export const inningsSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  teamId: z.coerce.number().int().positive(),
  inningsNumber: z.coerce.number().int().min(1).max(4),
  runs: z.coerce.number().int().min(0).default(0),
  wickets: z.coerce.number().int().min(0).max(10).default(0),
  balls: z.coerce.number().int().min(0).default(0),
  extras: z.coerce.number().int().min(0).default(0),
  target: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(["NOT_STARTED", "LIVE", "COMPLETED"]).default("NOT_STARTED"),
});

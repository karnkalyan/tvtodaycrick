import { matchService } from "@/services/match.service";
import { inningsSchema, matchSchema, matchUpdateSchema, statSchema, tossSchema } from "@/validators/match.validator";

export const matchController = {
  list: () => matchService.list(),
  get: (id: number) => matchService.get(id),
  create: (body: unknown) => matchService.create(matchSchema.parse(body)),
  update: (id: number, body: unknown) => matchService.update(id, matchUpdateSchema.parse(body)),
  remove: (id: number) => matchService.remove(id),
  saveToss: async (body: unknown) => {
    const data = tossSchema.parse(body);
    const match = await matchService.get(data.matchId);
    if (!match) throw new Error("Match not found");
    if (![match.homeTeamId, match.awayTeamId].includes(data.winnerTeamId)) throw new Error("Toss winner must be one of the match teams");
    return matchService.saveToss(data);
  },
  saveStat: async (body: unknown) => {
    const data = statSchema.parse(body);
    const match = await matchService.get(data.matchId);
    if (!match) throw new Error("Match not found");
    if (![match.homeTeamId, match.awayTeamId].includes(data.teamId)) throw new Error("Stat team must be part of the match");
    const player = [...match.homeTeam.players, ...match.awayTeam.players].find(p => p.id === data.playerId);
    if (!player || player.teamId !== data.teamId) throw new Error("Player must belong to the selected match team");
    return matchService.saveStat(data);
  },
  saveInnings: async (body: unknown) => {
    const data = inningsSchema.parse(body);
    const match = await matchService.get(data.matchId);
    if (!match) throw new Error("Match not found");
    if (![match.homeTeamId, match.awayTeamId].includes(data.teamId)) throw new Error("Innings team must be part of the match");
    return matchService.saveInnings(data);
  },
};

import { tournamentService } from "@/services/tournament.service";
import { tournamentSchema, tournamentUpdateSchema } from "@/validators/tournament.validator";

export const tournamentController = {
  list: () => tournamentService.list(),
  get: (id: number) => tournamentService.get(id),
  create: (body: unknown) => tournamentService.create(tournamentSchema.parse(body)),
  update: (id: number, body: unknown) => tournamentService.update(id, tournamentUpdateSchema.parse(body)),
  remove: (id: number) => tournamentService.remove(id),
};

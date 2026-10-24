import { teamService } from "@/services/team.service";
import { teamSchema, teamUpdateSchema } from "@/validators/team.validator";

export const teamController = {
  list: () => teamService.list(),
  get: (id: number) => teamService.get(id),
  create: (body: unknown) => teamService.create(teamSchema.parse(body)),
  update: (id: number, body: unknown) => teamService.update(id, teamUpdateSchema.parse(body)),
  remove: (id: number) => teamService.remove(id),
};

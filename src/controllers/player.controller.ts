import { playerService } from "@/services/player.service";
import { playerSchema, playerUpdateSchema } from "@/validators/player.validator";

export const playerController = {
  list: (teamId?: number, q?: string) => playerService.list(teamId, q),
  get: (id: number) => playerService.get(id),
  create: (body: unknown) => playerService.create(playerSchema.parse(body)),
  update: (id: number, body: unknown) => playerService.update(id, playerUpdateSchema.parse(body)),
  remove: (id: number) => playerService.remove(id),
};

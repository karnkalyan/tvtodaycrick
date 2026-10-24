import { franchiseService } from "@/services/franchise.service";
import { franchiseSchema, franchiseUpdateSchema } from "@/validators/franchise.validator";

export const franchiseController = {
  list: () => franchiseService.list(),
  get: (id: number) => franchiseService.get(id),
  create: (body: unknown) => franchiseService.create(franchiseSchema.parse(body)),
  update: (id: number, body: unknown) => franchiseService.update(id, franchiseUpdateSchema.parse(body)),
  remove: (id: number) => franchiseService.remove(id),
};

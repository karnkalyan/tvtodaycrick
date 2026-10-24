import { z } from "zod";
export const standingSchema=z.object({
  tournamentId:z.coerce.number().int().positive(),teamId:z.coerce.number().int().positive(),position:z.coerce.number().int().positive().optional().nullable(),played:z.coerce.number().int().min(0).default(0),won:z.coerce.number().int().min(0).default(0),lost:z.coerce.number().int().min(0).default(0),tied:z.coerce.number().int().min(0).default(0),noResult:z.coerce.number().int().min(0).default(0),points:z.coerce.number().int().min(0).default(0),netRunRate:z.coerce.number().default(0)
});

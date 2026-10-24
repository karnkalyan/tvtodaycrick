import { standingService } from "@/services/standing.service";
import { standingSchema } from "@/validators/standing.validator";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";
export async function POST(req:Request){try{return ok(await standingService.save(standingSchema.parse(await req.json())))}catch(e){return handleApiError(e)}}
export async function DELETE(req:Request){try{const u=new URL(req.url);return ok(await standingService.remove(Number(u.searchParams.get("tournamentId")),Number(u.searchParams.get("teamId"))))}catch(e){return handleApiError(e)}}

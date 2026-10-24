import { matchController } from "@/controllers/match.controller";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";
export async function POST(req:Request){try{return ok(await matchController.saveToss(await req.json()))}catch(e){return handleApiError(e)}}

import { seasonTournaments } from "@/services/season-records.service";
import { requestSeason } from "@/lib/npl-seasons";
import { tournamentController } from "@/controllers/tournament.controller";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";
export async function GET(req:Request){try{const u=new URL(req.url);return ok(await seasonTournaments(requestSeason(req)));}catch(e){return handleApiError(e)}}
export async function POST(req:Request){try{return ok(await tournamentController.create(await req.json()),201)}catch(e){return handleApiError(e)}}

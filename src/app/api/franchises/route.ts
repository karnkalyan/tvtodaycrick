import { seasonFranchises } from "@/services/season-records.service";
import { requestSeason } from "@/lib/npl-seasons";
import { franchiseController } from "@/controllers/franchise.controller";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";

export async function GET(req:Request){try{const u=new URL(req.url);return ok(await seasonFranchises(requestSeason(req)));}catch(e){return handleApiError(e)}}
export async function POST(req: Request) { try { return ok(await franchiseController.create(await req.json()), 201); } catch (e) { return handleApiError(e); } }

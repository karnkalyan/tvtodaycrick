import { requestSeason } from "@/lib/npl-seasons";
import { matchService } from "@/services/match.service";
import { matchController } from "@/controllers/match.controller";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";
export async function GET(req:Request){try{const u=new URL(req.url);let rows=await matchService.list(requestSeason(req));const team=Number(u.searchParams.get("teamId"));const status=u.searchParams.get("status");rows=rows.filter(m=>(!team||m.homeTeamId===team||m.awayTeamId===team)&&(!status||m.status===status));if(u.searchParams.get("paged")==="1"){const page=Math.max(1,Number(u.searchParams.get("page"))||1),limit=8;return ok({items:rows.slice((page-1)*limit,page*limit),total:rows.length,totalPages:Math.max(1,Math.ceil(rows.length/limit))});}return ok(rows)}catch(e){return handleApiError(e)}}
export async function POST(req:Request){try{return ok(await matchController.create(await req.json()),201)}catch(e){return handleApiError(e)}}

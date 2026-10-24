import { seasonPlayers } from "@/services/season-records.service";
import { requestSeason } from "@/lib/npl-seasons";
import { playerController } from "@/controllers/player.controller";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";
export async function GET(req:Request){try{const u=new URL(req.url);const rows=await seasonPlayers(requestSeason(req),Number(u.searchParams.get("teamId"))||undefined,u.searchParams.get("q")||"");if(u.searchParams.get("paged")==="1"){const page=Math.max(1,Number(u.searchParams.get("page"))||1);return ok({items:rows.slice((page-1)*12,page*12),totalPages:Math.max(1,Math.ceil(rows.length/12)),total:rows.length});}return ok(rows);}catch(e){return handleApiError(e)}}
export async function POST(req:Request){try{return ok(await playerController.create(await req.json()),201)}catch(e){return handleApiError(e)}}

import { requestSeason } from "@/lib/npl-seasons";
import { seasonTeams,seasonPlayers } from "@/services/season-records.service";
import { teamController } from "@/controllers/team.controller";
import { handleApiError } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
type Ctx={params:Promise<{id:string}>};
export async function GET(req:Request,{params}:Ctx){try{const id=Number((await params).id),year=requestSeason(req);const x=(await seasonTeams(year)).find(t=>t.id===id);if(x)return ok({...x,players:await seasonPlayers(year,id)});return x?ok(x):fail("Team not found",404)}catch(e){return handleApiError(e)}}
export async function PATCH(req:Request,{params}:Ctx){try{return ok(await teamController.update(Number((await params).id),await req.json()))}catch(e){return handleApiError(e)}}
export async function DELETE(_:Request,{params}:Ctx){try{return ok(await teamController.remove(Number((await params).id)))}catch(e){return handleApiError(e)}}

import { requestSeason } from "@/lib/npl-seasons";
import { seasonPlayers } from "@/services/season-records.service";
import { playerController } from "@/controllers/player.controller";
import { handleApiError } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
type Ctx={params:Promise<{id:string}>};
export async function GET(req:Request,{params}:Ctx){try{const id=Number((await params).id);const x=(await seasonPlayers(requestSeason(req))).find(p=>p?.id===id);return x?ok(x):fail("Player not found",404)}catch(e){return handleApiError(e)}}
export async function PATCH(req:Request,{params}:Ctx){try{return ok(await playerController.update(Number((await params).id),await req.json()))}catch(e){return handleApiError(e)}}
export async function DELETE(_:Request,{params}:Ctx){try{return ok(await playerController.remove(Number((await params).id)))}catch(e){return handleApiError(e)}}

export const runtime = "nodejs";
import { mediaService } from "@/services/media.service";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";
type Ctx={params:Promise<{id:string}>};
export async function DELETE(_:Request,{params}:Ctx){try{return ok(await mediaService.remove(Number((await params).id)))}catch(e){return handleApiError(e)}}

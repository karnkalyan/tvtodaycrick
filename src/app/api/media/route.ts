export const runtime = "nodejs";
import { mediaService } from "@/services/media.service";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";
export async function GET(){try{return ok(await mediaService.list())}catch(e){return handleApiError(e)}}
export async function POST(req:Request){try{const form=await req.formData();const file=form.get("file");if(!(file instanceof File))throw new Error("File is required");return ok(await mediaService.upload(file,String(form.get("altText")||"")),201)}catch(e){return handleApiError(e)}}

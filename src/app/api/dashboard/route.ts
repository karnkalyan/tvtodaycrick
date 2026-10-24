import { requestSeason } from "@/lib/npl-seasons";
import { dashboardService } from "@/services/dashboard.service";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";
export async function GET(req:Request){try{return ok(await dashboardService.get(requestSeason(req)))}catch(e){return handleApiError(e)}}

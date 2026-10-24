import { getNpl, syncNpl, seasonSlice } from "@/services/npl.service";
import { requestSeason } from "@/lib/npl-seasons";
import { ok } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
export const dynamic = "force-dynamic";
export async function GET(req:Request) { try { return ok(seasonSlice(await getNpl(requestSeason(req)),new URL(req.url).searchParams)); } catch (error) { return handleApiError(error); } }
export async function POST(req:Request) { try { return ok(seasonSlice(await syncNpl(true,requestSeason(req)),new URL(req.url).searchParams)); } catch (error) { return handleApiError(error); } }

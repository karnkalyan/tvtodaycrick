import { matchController } from "@/controllers/match.controller";
import { handleApiError } from "@/lib/errors";
import { ok } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    const u = new URL(req.url);
    const season = u.searchParams.get("season") || undefined;
    const result = await matchController.truncateMatchData(season);
    return ok(result);
  } catch (e) {
    return handleApiError(e);
  }
}

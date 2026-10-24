import { getSourceSettings, saveSourceSettings } from "@/services/npl-settings.service";
import { requestSeason } from "@/lib/npl-seasons";
import { ok } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    return ok(await getSourceSettings(requestSeason(req)));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    return ok(await saveSourceSettings(requestSeason(req), body));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return ok(await saveSourceSettings(requestSeason(req), body));
  } catch (e) {
    return handleApiError(e);
  }
}

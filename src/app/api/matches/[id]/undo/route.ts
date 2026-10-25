import { matchController } from "@/controllers/match.controller";
import { handleApiError } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";

type Ctx = { params: Promise<{ id: string }> };

const matchId = async (params: Ctx["params"]) => {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** GET: recent undoable score-entry actions for a match (newest first). */
export async function GET(_: Request, { params }: Ctx) {
  try {
    const id = await matchId(params);
    if (!id) return fail("Invalid match id", 400);
    return ok(await matchController.undoHistory(id));
  } catch (e) {
    return handleApiError(e);
  }
}

/** POST: undo the most recent score-entry action for a match. */
export async function POST(_: Request, { params }: Ctx) {
  try {
    const id = await matchId(params);
    if (!id) return fail("Invalid match id", 400);
    return ok(await matchController.undoLast(id));
  } catch (e) {
    return handleApiError(e);
  }
}

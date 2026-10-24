import { franchiseController } from "@/controllers/franchise.controller";
import { handleApiError } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";

type Ctx = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Ctx) { try { const x = await franchiseController.get(Number((await params).id)); return x ? ok(x) : fail("Franchise not found", 404); } catch(e){ return handleApiError(e); } }
export async function PATCH(req: Request, { params }: Ctx) { try { return ok(await franchiseController.update(Number((await params).id), await req.json())); } catch(e){ return handleApiError(e); } }
export async function DELETE(_: Request, { params }: Ctx) { try { return ok(await franchiseController.remove(Number((await params).id))); } catch(e){ return handleApiError(e); } }

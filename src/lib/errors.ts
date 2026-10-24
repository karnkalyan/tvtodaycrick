import { ZodError } from "zod";
import { fail } from "./api-response";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten());
  }
  if (error instanceof Error) {
    console.error(error);
    return fail(error.message || "Internal server error", 500);
  }
  return fail("Internal server error", 500);
}

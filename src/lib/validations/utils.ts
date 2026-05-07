import { z } from "zod";
import type { ZodError } from "zod";

export function flattenFieldErrors(error: ZodError) {
  return z.flattenError(error).fieldErrors;
}

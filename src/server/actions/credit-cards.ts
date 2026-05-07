"use server";

import { revalidatePath } from "next/cache";
import { cache } from "react";
import { requireUser } from "@/lib/auth/requite-user";
import { ok, Errors, type Result } from "@/lib/result";
import {
  createCreditCardSchema,
  updateCreditCardSchema,
} from "@/lib/validations/credit-cards";
import {
  insertCreditCard,
  updateCreditCard,
  deleteCreditCard,
  findCreditCardById,
  findCreditCardsByUser,
  countTransactionsByCreditCard,
  setCreditCardActive,
} from "@/server/db/repositories/credit-cards";

export async function createCreditCardAction(
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());

  const parsed = createCreditCardSchema.safeParse(raw);
  if (!parsed.success) return Errors.validation(parsed.error);

  const inserted = await insertCreditCard({ ...parsed.data, userId: user.id });
  if (!inserted) return Errors.dbError();

  revalidatePath("/credit-cards");
  return ok({ id: inserted.id });
}

export async function updateCreditCardAction(
  id: string,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());

  const parsed = updateCreditCardSchema.safeParse(raw);
  if (!parsed.success) return Errors.validation(parsed.error);

  const updated = await updateCreditCard(id, user.id, parsed.data);
  if (!updated) return Errors.notFound("Tarjeta de Crédito");

  revalidatePath("/credit-cards");
  return ok({ id: updated.id });
}

export async function deleteCreditCardAction(
  id: string,
): Promise<Result<{ archived: boolean }>> {
  const user = await requireUser();

  const card = await findCreditCardById(id, user.id);
  if (!card) return Errors.notFound("Tarjeta de Crédito");

  if (Number(card.currentBalance) > 0) {
    return Errors.conflict(
      "Tarjeta de Crédito",
      "No se puede eliminar una tarjeta con deuda pendiente",
    );
  }

  const txCount = await countTransactionsByCreditCard(id, user.id);
  const hasTransactions = txCount > 0;

  if (hasTransactions) {
    // Soft delete — mantiene integridad referencial
    const archived = await setCreditCardActive(id, user.id, false);
    if (!archived) return Errors.dbError();
  } else {
    // Hard delete — tarjeta limpia
    await deleteCreditCard(id, user.id);
  }

  revalidatePath("/credit-cards");
  return ok({ archived: hasTransactions });
}

export const getCreditCardsByUser = cache(async () => {
  const user = await requireUser();
  return findCreditCardsByUser(user.id);
});

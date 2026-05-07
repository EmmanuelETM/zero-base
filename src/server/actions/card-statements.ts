"use server";

import { revalidatePath } from "next/cache";
import { cache } from "react";
import { requireUser } from "@/lib/auth/requite-user";
import { ok, Errors, type Result } from "@/lib/result";
import { insertCardStatementSchema } from "@/server/db/types";
import type { NewCardStatement } from "@/server/db/types";
import {
  insertCardStatement,
  findLatestStatementByCardId,
} from "@/server/db/repositories/card-statements";
import { findCreditCardById } from "@/server/db/repositories/credit-cards";

// ======================================================
//                      Mutations
// ======================================================

export async function createCardStatementAction(
  data: NewCardStatement,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();

  const parsed = insertCardStatementSchema.safeParse(data);
  if (!parsed.success) return Errors.validation(parsed.error);

  // Verificar que la tarjeta pertenezca al usuario
  const card = await findCreditCardById(parsed.data.cardId, user.id);
  if (!card) return Errors.notFound("Tarjeta de Crédito");

  const inserted = await insertCardStatement(parsed.data);
  if (!inserted) return Errors.dbError();

  revalidatePath("/credit-cards");
  return ok({ id: inserted.id });
}

// ======================================================
//                      Queries
// ======================================================

export const getLatestStatement = cache(async (cardId: string) => {
  const user = await requireUser();

  // Verificar que la tarjeta pertenezca al usuario
  const card = await findCreditCardById(cardId, user.id);
  if (!card) return null;

  return findLatestStatementByCardId(cardId);
});

export const getCardBalances = cache(async (cardId: string) => {
  const user = await requireUser();

  const card = await findCreditCardById(cardId, user.id);
  if (!card) return null;

  const latestStatement = await findLatestStatementByCardId(cardId);

  return {
    currentBalance: Number(card.currentBalance),
    balanceAtCut: latestStatement ? Number(latestStatement.balanceAtCut) : 0,
    dueDate: latestStatement?.dueDate ?? null,
    minimumPayment: latestStatement?.minimumPayment
      ? Number(latestStatement.minimumPayment)
      : 0,
    isPaid: latestStatement?.isPaid ?? false,
  };
});

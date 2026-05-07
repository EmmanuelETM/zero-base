"use server";

import { revalidatePath } from "next/cache";
import { cache } from "react";
import { requireUser } from "@/lib/auth/requite-user";
import { ok, Errors, type Result } from "@/lib/result";
import {
  adjustBalanceSchema,
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validations/accounts";
import {
  insertAccount,
  updateAccount,
  deleteAccount,
  setAccountArchived,
  findAccountById,
  findActiveAccountsByUser,
  findArchivedAccountsByUser,
  findNonOperationalAccountIds,
  countTransactionsByAccount,
  calcAccountCashFlow,
  getSystemCategoryForAdjustment,
} from "@/server/db/repositories/accounts";
import { insertTransferTransaction } from "../db/repositories/transactions";

// ======================================================
//                       Helpers
// ======================================================

function parseIsOperational(raw: Record<string, FormDataEntryValue>) {
  return raw.isOperational === "on" || raw.isOperational === "true";
}

// ======================================================
//                      Mutations
// ======================================================

export async function createAccountAction(
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());

  const parsed = createAccountSchema.safeParse({
    ...raw,
    isOperational: parseIsOperational(raw),
  });
  if (!parsed.success) return Errors.validation(parsed.error);

  const inserted = await insertAccount({ ...parsed.data, userId: user.id });
  if (!inserted) return Errors.dbError();

  revalidatePath("/accounts");
  return ok({ id: inserted.id });
}

export async function updateAccountAction(
  id: string,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());

  const parsed = updateAccountSchema.safeParse({
    ...raw,
    isOperational: parseIsOperational(raw),
  });

  if (!parsed.success) return Errors.validation(parsed.error);

  const updated = await updateAccount(id, user.id, parsed.data);
  if (!updated) return Errors.notFound("Cuenta");

  revalidatePath("/accounts");
  return ok({ id: updated.id });
}

export async function deleteAccountAction(
  id: string,
): Promise<Result<{ archived: boolean }>> {
  const user = await requireUser();

  const account = await findAccountById(id, user.id);
  if (!account) return Errors.notFound("Cuenta");

  const txCount = await countTransactionsByAccount(id, user.id);
  const hasTransactions = txCount > 0;

  if (hasTransactions) {
    // Soft delete — mantiene integridad referencial
    const archived = await setAccountArchived(id, user.id, true);
    if (!archived) return Errors.dbError();
  } else {
    // Hard delete — cuenta limpia
    await deleteAccount(id, user.id);
  }

  revalidatePath("/accounts");
  return ok({ archived: hasTransactions });
}

export async function archiveAccountAction(
  id: string,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();

  const account = await findAccountById(id, user.id);
  if (!account) return Errors.notFound("Cuenta");

  if (account.isArchived) return Errors.conflict("Cuenta", "Ya está archivada");

  const updated = await setAccountArchived(id, user.id, true);
  if (!updated) return Errors.dbError();

  revalidatePath("/accounts");
  return ok({ id: updated.id });
}

export async function unarchiveAccountAction(
  id: string,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();

  const account = await findAccountById(id, user.id);
  if (!account) return Errors.notFound("Cuenta");

  if (!account.isArchived)
    return Errors.conflict("Cuenta", "No está archivada");

  const updated = await setAccountArchived(id, user.id, false);
  if (!updated) return Errors.dbError();

  revalidatePath("/accounts");
  return ok({ id: updated.id });
}

export async function adjustAccountBalanceAction(
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();

  const parsed = adjustBalanceSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return Errors.validation(parsed.error);

  const { accountId, targetBalance, reason } = parsed.data;

  // 1. Calcular balance actual real
  const account = await findAccountById(accountId, user.id);
  if (!account) return Errors.notFound("Cuenta");

  const cashFlow = await calcAccountCashFlow(accountId, user.id);
  const currentBalance = Number(account.balance) + cashFlow;

  // 2. Calcular la diferencia
  const difference = targetBalance - currentBalance;

  if (difference === 0) return ok({ id: accountId });

  // 3. Registrar el ajuste como transacción
  const adjustmentCategory = await getSystemCategoryForAdjustment();
  if (!adjustmentCategory) return Errors.dbError();

  const inserted = await insertTransferTransaction({
    userId: user.id,
    accountId,
    amount: String(Math.abs(difference)),
    type: difference > 0 ? "income" : "expense",
    date: new Date(),
    description: reason ?? "Ajuste de balance",
    isAdjustment: true,
    categoryId: adjustmentCategory.id,
  });

  if (!inserted) return Errors.dbError();

  revalidatePath("/accounts");
  return ok({ id: inserted.id });
}

// ======================================================
//                      Queries
// ======================================================

export const getAccountsByUser = cache(async () => {
  const user = await requireUser();
  return findActiveAccountsByUser(user.id);
});

export const getArchivedAccountsByUser = cache(async () => {
  const user = await requireUser();
  return findArchivedAccountsByUser(user.id);
});

export const getAccountBalance = cache(async (accountId: string) => {
  const user = await requireUser();

  const account = await findAccountById(accountId, user.id);
  if (!account) return 0;

  const cashFlow = await calcAccountCashFlow(accountId, user.id);
  return Number(account.balance) + cashFlow;
});

export const getTotalActiveBalance = cache(async () => {
  const user = await requireUser();

  const activeAccounts = await findNonOperationalAccountIds(user.id);

  // Se ejecutan en paralelo en vez de secuencialmente
  const balances = await Promise.all(
    activeAccounts.map((acc) => calcAccountCashFlow(acc.id, user.id)),
  );

  return balances.reduce((sum, flow) => sum + flow, 0);
});

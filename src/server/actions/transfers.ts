"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requite-user";
import { ok, Errors, type Result } from "@/lib/result";
import { createTransferSchema } from "@/lib/validations/transfers";
import {
  findAccountById,
  calcAccountCashFlow,
} from "@/server/db/repositories/accounts";
import {
  insertTransferTransaction,
  getSystemCategoryForTransfer,
  getSystemCategoryForFee,
} from "@/server/db/repositories/transactions";
import type { NewTransaction } from "@/server/db/types";

export async function createTransferAction(
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());

  const parsed = createTransferSchema.safeParse({
    ...raw,
    applyCommission:
      raw.applyCommission === "on" || raw.applyCommission === "true",
  });
  if (!parsed.success) return Errors.validation(parsed.error);

  const {
    fromAccountId,
    toAccountId,
    amount,
    applyCommission,
    commissionAmount,
    description,
  } = parsed.data;

  // 1. Validar propiedad de las cuentas
  const fromAccount = await findAccountById(fromAccountId, user.id);
  const toAccount = await findAccountById(toAccountId, user.id);

  if (!fromAccount || !toAccount) {
    return Errors.notFound("Cuenta de origen o destino");
  }

  // 2. Validar balance suficiente
  const currentCashFlow = await calcAccountCashFlow(fromAccountId, user.id);
  const currentBalance = Number(fromAccount.balance) + currentCashFlow;

  const totalDeduction =
    Number(amount) + (applyCommission ? Number(commissionAmount ?? "0") : 0);

  if (currentBalance < totalDeduction) {
    return Errors.conflict(
      "Cuenta",
      "Balance insuficiente en la cuenta de origen para realizar la transferencia.",
    );
  }

  // 3. Obtener categorías del sistema
  const transferCategory = await getSystemCategoryForTransfer();
  if (!transferCategory) return Errors.dbError(); // Debería existir por el seed

  const transferData: NewTransaction = {
    userId: user.id,
    amount: amount,
    type: "transfer",
    date: new Date(),
    description: description,
    categoryId: transferCategory.id,
    accountId: fromAccountId,
    destinationAccountId: toAccountId,
  };

  let feeData: NewTransaction | null = null;
  if (applyCommission) {
    const feeCategory = await getSystemCategoryForFee();
    if (feeCategory) {
      feeData = {
        userId: user.id,
        amount: commissionAmount || "100.00",
        type: "expense",
        date: new Date(),
        description: `Comisión por ${description}`,
        isFee: true,
        categoryId: feeCategory.id,
        accountId: fromAccountId,
      };
    }
  }

  // 4. Ejecutar transacción atómica
  const result = await insertTransferTransaction(transferData, feeData);
  if (!result) return Errors.dbError();

  revalidatePath("/accounts");
  return ok({ id: result.id });
}

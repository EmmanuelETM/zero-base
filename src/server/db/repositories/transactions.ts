import { db } from "@/server/db";
import { transactions, categories } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import type { NewTransaction } from "@/server/db/types";

// ======================================================
//                      Queries
// ======================================================

export async function getSystemCategoryForTransfer() {
  return db.query.categories.findFirst({
    where: and(eq(categories.isSystem, true), eq(categories.type, "transfer")),
  });
}

export async function getSystemCategoryForFee() {
  return db.query.categories.findFirst({
    where: and(
      eq(categories.isSystem, true),
      eq(categories.isFeeCategory, true),
    ),
  });
}

// ======================================================
//                      Mutations
// ======================================================

/**
 * Registra una transferencia atómicamente.
 * Opcionalmente registra el gasto por comisión.
 */
export async function insertTransferTransaction(
  transferData: NewTransaction,
  feeData?: NewTransaction | null,
) {
  return db.transaction(async (tx) => {
    // 1. Insertar la transferencia principal
    const [insertedTransfer] = await tx
      .insert(transactions)
      .values(transferData)
      .returning();

    if (!insertedTransfer) {
      tx.rollback();
      return null;
    }

    // 2. Insertar la comisión si existe
    if (feeData) {
      const [insertedFee] = await tx
        .insert(transactions)
        .values(feeData)
        .returning();

      if (!insertedFee) {
        tx.rollback();
        return null;
      }
    }

    return insertedTransfer;
  });
}

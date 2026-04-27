"use server";

import { revalidatePath } from "next/cache";
import { cache } from "react";
import { db } from "@/server/db";
import { accounts, transactions } from "@/server/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { createServerClient } from "@/server/supabase/server";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validations/accounts";

export async function createAccountAction(formData: FormData) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  // Extraer datos del FormData y validar con Zod
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createAccountSchema.safeParse({
    ...rawData,
    isOperational:
      rawData.isOperational === "on" || rawData.isOperational === "true",
  });

  if (!parsed.success) {
    return { error: "Datos inválidos", details: parsed.error.flatten() };
  }

  await db.insert(accounts).values({
    ...parsed.data,
    userId: user.id,
  });

  revalidatePath("/accounts");
  return { success: true };
}

export async function updateAccountAction(id: string, formData: FormData) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateAccountSchema.safeParse({
    ...rawData,
    isOperational:
      rawData.isOperational === "on" || rawData.isOperational === "true",
  });

  if (!parsed.success) {
    return { error: "Datos inválidos", details: parsed.error.flatten() };
  }

  await db
    .update(accounts)
    .set(parsed.data)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  revalidatePath("/accounts");
  return { success: true };
}

export async function deleteAccountAction(id: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  // 1. Verificar si la cuenta tiene transacciones asociadas
  const txCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        sql`(${transactions.accountId} = ${id} OR ${transactions.destinationAccountId} = ${id})`,
      ),
    );

  const hasTransactions = Number(txCount[0]?.count || 0) > 0;

  if (hasTransactions) {
    // Soft Delete: La ocultamos pero mantenemos la integridad de datos
    await db
      .update(accounts)
      .set({ isArchived: true })
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
  } else {
    // Hard Delete: Cuenta limpia, la borramos sin piedad
    await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
  }

  revalidatePath("/accounts");
  return { success: true };
}

export const getAccountsByUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  return await db.query.accounts.findMany({
    where: and(eq(accounts.userId, user.id), eq(accounts.isArchived, false)),
    orderBy: asc(accounts.name),
  });
});

export const getArchivedAccountsByUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  return await db.query.accounts.findMany({
    where: and(eq(accounts.userId, user.id), eq(accounts.isArchived, true)),
    orderBy: asc(accounts.name),
  });
});

export const getAccountBalance = cache(async (accountId: string) => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  // 1. Calcular el flujo de caja neto (Entradas - Salidas)
  const [result] = await db
    .select({
      realBalance: sql<number>`
        COALESCE(SUM(
          CASE 
            WHEN ${transactions.type} = 'income' AND ${transactions.accountId} = ${accountId} THEN ${transactions.amount}
            WHEN ${transactions.type} = 'transfer' AND ${transactions.destinationAccountId} = ${accountId} THEN ${transactions.amount}
            WHEN ${transactions.type} = 'expense' AND ${transactions.accountId} = ${accountId} THEN -${transactions.amount}
            WHEN ${transactions.type} = 'transfer' AND ${transactions.accountId} = ${accountId} THEN -${transactions.amount}
            WHEN ${transactions.type} = 'card_payment' AND ${transactions.accountId} = ${accountId} THEN -${transactions.amount}
            ELSE 0
          END
        ), 0)
      `,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        sql`(${transactions.accountId} = ${accountId} OR ${transactions.destinationAccountId} = ${accountId})`,
      ),
    );

  // 2. Obtener el balance inicial (con el que se registró la cuenta)
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, accountId), eq(accounts.userId, user.id)),
    columns: { balance: true },
  });

  const initialBalance = account ? Number(account.balance) : 0;

  // 3. Balance de la Realidad Absoluta = Inicial + Flujo de Caja
  return initialBalance + Number(result?.realBalance ?? 0);
});

export async function archiveAccountAction(id: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  await db
    .update(accounts)
    .set({ isArchived: true })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  revalidatePath("/accounts");
  return { success: true };
}

export async function unarchiveAccountAction(id: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  await db
    .update(accounts)
    .set({ isArchived: false })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  revalidatePath("/accounts");
  return { success: true };
}

export const getTotalActiveBalance = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const activeAccounts = await db.query.accounts.findMany({
    where: and(eq(accounts.userId, user.id), eq(accounts.isArchived, false), eq(accounts.isOperational, false)),
    columns: { id: true },
  });

  let total = 0;
  for (const acc of activeAccounts) {
    const bal = await getAccountBalance(acc.id);
    total += bal;
  }
  
  return total;
});

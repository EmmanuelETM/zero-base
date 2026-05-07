import { db } from "@/server/db";
import { accounts, transactions } from "@/server/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";

/**
 * Accounts repository - operations sobre cuentas bancarias y activos del usuario
 * Todo con RLS y optimización de cache con React.cache()
 */

// ======================================================
//                        Types
// ======================================================

export type AccountInsert = typeof accounts.$inferInsert;
export type AccountUpdate = Partial<
  Pick<AccountInsert, "name" | "type" | "balance" | "isOperational">
>;

// ======================================================
//                        Queries
// ======================================================

export async function findActiveAccountsByUser(userId: string) {
  return db.query.accounts.findMany({
    where: and(eq(accounts.userId, userId), eq(accounts.isArchived, false)),
    orderBy: asc(accounts.name),
  });
}

export async function findArchivedAccountsByUser(userId: string) {
  return db.query.accounts.findMany({
    where: and(eq(accounts.userId, userId), eq(accounts.isArchived, true)),
    orderBy: asc(accounts.name),
  });
}

export async function findAccountById(id: string, userId: string) {
  return (
    db.query.accounts.findFirst({
      where: and(eq(accounts.id, id), eq(accounts.userId, userId)),
    }) ?? null
  );
}

export async function findNonOperationalAccountIds(userId: string) {
  return db.query.accounts.findMany({
    where: and(
      eq(accounts.userId, userId),
      eq(accounts.isArchived, false),
      eq(accounts.isOperational, false),
    ),
    columns: { id: true },
  });
}

export async function countTransactionsByAccount(
  accountId: string,
  userId: string,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`(${transactions.accountId} = ${accountId} OR ${transactions.destinationAccountId} = ${accountId})`,
      ),
    );
  return Number(row?.count ?? 0);
}

export async function calcAccountCashFlow(accountId: string, userId: string) {
  const [row] = await db
    .select({
      flow: sql<number>`
        COALESCE(SUM(
          CASE
            WHEN ${transactions.type} = 'income'       AND ${transactions.accountId}            = ${accountId} THEN  ${transactions.amount}
            WHEN ${transactions.type} = 'transfer'     AND ${transactions.destinationAccountId} = ${accountId} THEN  ${transactions.amount}
            WHEN ${transactions.type} = 'expense'      AND ${transactions.accountId}            = ${accountId} THEN -${transactions.amount}
            WHEN ${transactions.type} = 'transfer'     AND ${transactions.accountId}            = ${accountId} THEN -${transactions.amount}
            WHEN ${transactions.type} = 'card_payment' AND ${transactions.accountId}            = ${accountId} THEN -${transactions.amount}
            ELSE 0
          END
        ), 0)
      `,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`(${transactions.accountId} = ${accountId} OR ${transactions.destinationAccountId} = ${accountId})`,
      ),
    );
  return Number(row?.flow ?? 0);
}

// ======================================================
//                        Mutations
// ======================================================

export async function insertAccount(data: AccountInsert) {
  const [inserted] = await db.insert(accounts).values(data).returning();
  return inserted ?? null;
}

export async function updateAccount(
  id: string,
  userId: string,
  data: AccountUpdate,
) {
  const [updated] = await db
    .update(accounts)
    .set(data)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function setAccountArchived(
  id: string,
  userId: string,
  isArchived: boolean,
) {
  const [updated] = await db
    .update(accounts)
    .set({ isArchived })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteAccount(id: string, userId: string) {
  await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
}

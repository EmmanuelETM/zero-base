import { db } from "@/server/db";
import { creditCards, transactions } from "@/server/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";
import type { NewCreditCard, UpdateCreditCard } from "@/server/db/types";

// ======================================================
//                      Queries
// ======================================================

export async function findCreditCardsByUser(userId: string) {
  return db.query.creditCards.findMany({
    where: and(eq(creditCards.userId, userId), eq(creditCards.isActive, true)),
    orderBy: asc(creditCards.name),
  });
}

export async function findCreditCardById(id: string, userId: string) {
  return (
    db.query.creditCards.findFirst({
      where: and(eq(creditCards.id, id), eq(creditCards.userId, userId)),
    }) ?? null
  );
}

export async function countTransactionsByCreditCard(
  cardId: string,
  userId: string,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.cardId, cardId)),
    );
  return Number(row?.count ?? 0);
}

// ======================================================
//                      Mutations
// ======================================================

export async function insertCreditCard(data: NewCreditCard) {
  const [inserted] = await db.insert(creditCards).values(data).returning();
  return inserted ?? null;
}

export async function updateCreditCard(
  id: string,
  userId: string,
  data: UpdateCreditCard,
) {
  const [updated] = await db
    .update(creditCards)
    .set(data)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteCreditCard(id: string, userId: string) {
  await db
    .delete(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));
}

export async function setCreditCardActive(
  id: string,
  userId: string,
  isActive: boolean,
) {
  const [updated] = await db
    .update(creditCards)
    .set({ isActive })
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)))
    .returning();
  return updated ?? null;
}

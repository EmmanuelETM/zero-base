import { db } from "@/server/db";
import { cardStatements } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import type { NewCardStatement, UpdateCardStatement } from "@/server/db/types";

// ======================================================
//                      Queries
// ======================================================

export async function findLatestStatementByCardId(cardId: string) {
  return (
    db.query.cardStatements.findFirst({
      where: eq(cardStatements.cardId, cardId),
      orderBy: [desc(cardStatements.cutDate)],
    }) ?? null
  );
}

// ======================================================
//                      Mutations
// ======================================================

export async function insertCardStatement(data: NewCardStatement) {
  const [inserted] = await db.insert(cardStatements).values(data).returning();
  return inserted ?? null;
}

export async function updateCardStatement(
  id: string,
  data: UpdateCardStatement,
) {
  const [updated] = await db
    .update(cardStatements)
    .set(data)
    .where(eq(cardStatements.id, id))
    .returning();
  return updated ?? null;
}

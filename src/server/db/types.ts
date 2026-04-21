import { z } from "zod";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";

import {
  transactions,
  accounts,
  profiles,
  budgets,
  appSettings,
  userPreferences,
  creditCards,
  cardStatements,
  automationRules,
  webhookEvents,
  categories,
  tags,
  transactionTags,
  auditLog,
  recurringTransactions,
  notifications,
  netWorthSnapshots,
  budgetGoals,
} from "./schema";

// ============================================================
// 1. ZOD SCHEMAS (Validadores para API y Formularios)
// ============================================================

// --- Profiles ---
export const selectProfileSchema = createSelectSchema(profiles);
export const insertProfileSchema = createInsertSchema(profiles);
export const updateProfileSchema = createUpdateSchema(profiles);

// --- Accounts ---
export const selectAccountSchema = createSelectSchema(accounts);
export const insertAccountSchema = createInsertSchema(accounts);
export const updateAccountSchema = createUpdateSchema(accounts);

// --- Transactions ---
export const selectTransactionSchema = createSelectSchema(transactions);
export const insertTransactionSchema = createInsertSchema(transactions, {
  amount: (schema) =>
    schema.min(0.01, { message: "El monto debe ser mayor a cero" }),
  description: (schema) =>
    schema.min(1, { message: "La descripción es obligatoria" }),
  date: (schema) =>
    schema.refine((date) => date <= new Date(), {
      message: "La fecha no puede ser futura",
    }),
}).omit({
  id: true,
  createdAt: true,
  webhookEventId: true,
  rawPayload: true,
});
export const updateTransactionSchema = createUpdateSchema(transactions);

// --- Budgets ---
export const selectBudgetSchema = createSelectSchema(budgets);
export const insertBudgetSchema = createInsertSchema(budgets);
export const updateBudgetSchema = createUpdateSchema(budgets);

// --- App Settings & User Preferences ---
export const selectAppSettingsSchema = createSelectSchema(appSettings);
export const insertAppSettingsSchema = createInsertSchema(appSettings);
export const updateAppSettingsSchema = createUpdateSchema(appSettings);

export const selectUserPreferencesSchema = createSelectSchema(userPreferences);
export const insertUserPreferencesSchema = createInsertSchema(userPreferences);
export const updateUserPreferencesSchema = createUpdateSchema(userPreferences);

// --- Credit Cards & Statements ---
export const selectCreditCardSchema = createSelectSchema(creditCards);
export const insertCreditCardSchema = createInsertSchema(creditCards);
export const updateCreditCardSchema = createUpdateSchema(creditCards);

export const selectCardStatementSchema = createSelectSchema(cardStatements);
export const insertCardStatementSchema = createInsertSchema(cardStatements);
export const updateCardStatementSchema = createUpdateSchema(cardStatements);

// --- Automation & Webhooks (n8n) ---
export const selectAutomationRuleSchema = createSelectSchema(automationRules);
export const insertAutomationRuleSchema = createInsertSchema(automationRules);
export const updateAutomationRuleSchema = createUpdateSchema(automationRules);

export const selectWebhookEventSchema = createSelectSchema(webhookEvents);
export const insertWebhookEventSchema = createInsertSchema(webhookEvents);
export const updateWebhookEventSchema = createUpdateSchema(webhookEvents);

// --- Categories & Tags ---
export const selectCategorySchema = createSelectSchema(categories);
export const insertCategorySchema = createInsertSchema(categories);
export const updateCategorySchema = createUpdateSchema(categories);

export const selectTagSchema = createSelectSchema(tags);
export const insertTagSchema = createInsertSchema(tags);
export const updateTagSchema = createUpdateSchema(tags);

export const selectTransactionTagSchema = createSelectSchema(transactionTags);
export const insertTransactionTagSchema = createInsertSchema(transactionTags);
export const updateTransactionTagSchema = createUpdateSchema(transactionTags);

// --- Audit Log ---
export const selectAuditLogSchema = createSelectSchema(auditLog);
export const insertAuditLogSchema = createInsertSchema(auditLog);
export const updateAuditLogSchema = createUpdateSchema(auditLog);

// --- Recurring Transactions ---
export const selectRecurringTransactionSchema = createSelectSchema(
  recurringTransactions,
);
export const insertRecurringTransactionSchema = createInsertSchema(
  recurringTransactions,
);
export const updateRecurringTransactionSchema = createUpdateSchema(
  recurringTransactions,
);

// --- Notifications ---
export const selectNotificationSchema = createSelectSchema(notifications);
export const insertNotificationSchema = createInsertSchema(notifications);
export const updateNotificationSchema = createUpdateSchema(notifications);

// --- Net Worth & Goals ---
export const selectNetWorthSnapshotSchema =
  createSelectSchema(netWorthSnapshots);
export const insertNetWorthSnapshotSchema =
  createInsertSchema(netWorthSnapshots);
export const updateNetWorthSnapshotSchema =
  createUpdateSchema(netWorthSnapshots);

export const selectBudgetGoalSchema = createSelectSchema(budgetGoals);
export const insertBudgetGoalSchema = createInsertSchema(budgetGoals);
export const updateBudgetGoalSchema = createUpdateSchema(budgetGoals);

// ============================================================
// 2. TYPESCRIPT TYPES (Inferidos automáticamente desde Zod)
// ============================================================

// --- Select Models (Lectura) ---
export type Profile = z.infer<typeof selectProfileSchema>;
export type Account = z.infer<typeof selectAccountSchema>;
export type Transaction = z.infer<typeof selectTransactionSchema>;
export type Budget = z.infer<typeof selectBudgetSchema>;
export type AppSettings = z.infer<typeof selectAppSettingsSchema>;
export type UserPreferences = z.infer<typeof selectUserPreferencesSchema>;
export type CreditCard = z.infer<typeof selectCreditCardSchema>;
export type CardStatement = z.infer<typeof selectCardStatementSchema>;
export type AutomationRule = z.infer<typeof selectAutomationRuleSchema>;
export type WebhookEvent = z.infer<typeof selectWebhookEventSchema>;
export type Category = z.infer<typeof selectCategorySchema>;
export type Tag = z.infer<typeof selectTagSchema>;
export type TransactionTag = z.infer<typeof selectTransactionTagSchema>;
export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type RecurringTransaction = z.infer<
  typeof selectRecurringTransactionSchema
>;
export type Notification = z.infer<typeof selectNotificationSchema>;
export type NetWorthSnapshot = z.infer<typeof selectNetWorthSnapshotSchema>;
export type BudgetGoal = z.infer<typeof selectBudgetGoalSchema>;

// --- Insert Models (Escritura/Creación) ---
export type NewProfile = z.infer<typeof insertProfileSchema>;
export type NewAccount = z.infer<typeof insertAccountSchema>;
export type NewTransaction = z.infer<typeof insertTransactionSchema>;
export type NewBudget = z.infer<typeof insertBudgetSchema>;
export type NewAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type NewUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type NewCreditCard = z.infer<typeof insertCreditCardSchema>;
export type NewCardStatement = z.infer<typeof insertCardStatementSchema>;
export type NewAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type NewWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type NewCategory = z.infer<typeof insertCategorySchema>;
export type NewTag = z.infer<typeof insertTagSchema>;
export type NewTransactionTag = z.infer<typeof insertTransactionTagSchema>;
export type NewAuditLog = z.infer<typeof insertAuditLogSchema>;
export type NewRecurringTransaction = z.infer<
  typeof insertRecurringTransactionSchema
>;
export type NewNotification = z.infer<typeof insertNotificationSchema>;
export type NewNetWorthSnapshot = z.infer<typeof insertNetWorthSnapshotSchema>;
export type NewBudgetGoal = z.infer<typeof insertBudgetGoalSchema>;

// --- Update Models (Edición Parcial) ---
// Extra: Generamos los tipos Partial para cuando solo quieres actualizar un par de campos
export type UpdateAccount = z.infer<typeof updateAccountSchema>;
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;

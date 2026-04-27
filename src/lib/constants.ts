export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "investment",
  "cooperative",
  "cash",
] as const;

export const CATEGORY_TYPES = ["income", "expense", "transfer"] as const;

export const TRANSACTION_TYPES = [
  "income",
  "expense",
  "transfer",
  "card_payment",
] as const;

export const NOTIFICATION_TYPES = [
  "info",
  "alert",
  "reminder",
  "system",
] as const;

export const RECURRENCE_FREQUENCIES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export const AUTOMATION_RULE_FIELDS = [
  "description",
  "merchant",
  "amount",
] as const;

export const AUTOMATION_RULE_OPERATORS = [
  "contains",
  "equals",
  "starts_with",
  "greater_than",
  "less_than",
] as const;

export const BUDGET_STATUS = ["draft", "balanced", "closed"] as const;

export const WEBHOOK_STATUS = [
  "pending",
  "processed",
  "failed",
  "ignored",
] as const;

export const AUDIT_ACTIONS = ["insert", "update", "delete"] as const;

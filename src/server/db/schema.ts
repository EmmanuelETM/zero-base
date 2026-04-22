import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
  pgEnum,
  boolean,
  jsonb,
  check,
  index,
  uniqueIndex,
  primaryKey,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// 1. ENUMS
// ============================================================

export const accountTypeEnum = pgEnum("account_type", [
  "checking",
  "savings",
  "investment",
  "cooperative",
]);

export const categoryTypeEnum = pgEnum("category_type", [
  "income",
  "fixed_expense",
  "variable_expense",
  "transfer",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
  "card_payment",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "info",
  "alert",
  "reminder",
  "system",
]);

export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "yearly",
]);

export const automationRuleFieldEnum = pgEnum("automation_rule_field", [
  "description",
  "merchant",
  "amount",
]);

export const automationRuleOperatorEnum = pgEnum("automation_rule_operator", [
  "contains",
  "equals",
  "starts_with",
  "greater_than",
  "less_than",
]);

// FIX: Nuevo enum para estados del presupuesto (Módulo 3 — ZBB)
export const budgetStatusEnum = pgEnum("budget_status", [
  "draft", // En construcción, dinero sin asignar > 0
  "balanced", // Dinero sin asignar = 0 (base-cero logrado)
  "closed", // Período cerrado, ya no se puede editar
]);

// FIX: Nuevo enum para estado de webhooks entrantes (Módulo 4)
export const webhookStatusEnum = pgEnum("webhook_status", [
  "pending",
  "processed",
  "failed",
  "ignored", // Llegó pero no matcheó ninguna regla
]);

// FIX: Nuevo enum para acción en audit log
export const auditActionEnum = pgEnum("audit_action", [
  "insert",
  "update",
  "delete",
]);

const createdAt = timestamp("created_at").notNull().defaultNow();
const updatedAt = timestamp("updated_at")
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

// ============================================================
// 2. CONFIGURACIÓN GLOBAL DEL SISTEMA
// ============================================================

/**
 * Configuraciones globales del sistema (ej. maintenance_mode, feature flags).
 * Usar JSONB en `value` permite guardar strings, booleans u objetos complejos.
 */
export const appSettings = pgTable(
  "app_settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    description: text("description"),
    createdAt,
    updatedAt,
  },
  (t) => [
    pgPolicy("Cualquier usuario autenticado puede leer settings", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`true`,
    }),
  ],
).enableRLS();

// ============================================================
// 3. USUARIOS Y PREFERENCIAS
// ============================================================

/**
 * Espeja auth.users de Supabase. El ID es el mismo UUID que Supabase asigna.
 * No almacenar email ni password aquí — eso vive en auth.users.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    avatarUrl: text("avatar_url"),
    currency: text("currency").default("DOP").notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    pgPolicy("Usuarios ven su propio perfil", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.id}`,
    }),
    pgPolicy("Usuarios modifican su propio perfil", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.id}`,
      withCheck: sql`auth.uid() = ${t.id}`,
    }),
  ],
).enableRLS();

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    pgPolicy("Lectura de roles para usuarios autenticados", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`true`,
    }),
  ],
).enableRLS();

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    description: text("description"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("idx_action_resource").on(t.action, t.resource),
    pgPolicy("Lectura de permisos para usuarios autenticados", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`true`,
    }),
  ],
).enableRLS();

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    pgPolicy("Usuarios ven sus propios roles", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    pgPolicy("Lectura de mapa de permisos", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`true`,
    }),
  ],
).enableRLS();

/**
 * Relación 1-a-1 con users. Una fila por usuario, nunca más.
 * PK = FK garantiza unicidad sin índice adicional.
 */
export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    theme: text("theme").default("system").notNull(),
    dashboardLayout: jsonb("dashboard_layout"),
    enablePushNotifications: boolean("enable_push_notifications")
      .default(true)
      .notNull(),
    enableEmailNotifications: boolean("enable_email_notifications")
      .default(false)
      .notNull(),
    telegramChatId: text("telegram_chat_id"),
    lowBalanceThreshold: decimal("low_balance_threshold", {
      precision: 12,
      scale: 2,
    }).default("5000.00"),

    createdAt,
    updatedAt,
  },
  (t) => [
    // RLS: El usuario gestiona sus propias preferencias
    pgPolicy("Usuarios ven sus preferencias", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("Usuarios modifican sus preferencias", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 4. ACTIVOS — CUENTAS BANCARIAS
// ============================================================

/**
 * "Bolsillos" del usuario: nómina, ahorros, cooperativa, etc.
 * `balance` es el saldo actual.
 *
 * IMPORTANTE: La actualización del balance DEBE ocurrir en la misma
 * transacción de BD que la inserción en `transactions`. Nunca actualizar
 * el balance de forma independiente — un fallo de red puede desincronizarlos.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    balance: decimal("balance", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    isOperational: boolean("is_operational").default(false).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),

    color: text("color"),
    icon: text("icon"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("idx_accounts_user").on(t.userId),
    // RLS
    pgPolicy("Usuarios gestionan sus cuentas", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 5. PASIVOS — TARJETAS DE CRÉDITO
// ============================================================

/**
 * Perfil de cada tarjeta. `currentBalance` es la deuda acumulada en el ciclo actual.
 *
 * FIX: Se añaden check constraints en cutDay y paymentDay para garantizar
 * valores válidos a nivel de BD (no solo en la aplicación).
 */
export const creditCards = pgTable(
  "credit_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).notNull(),
    currentBalance: decimal("current_balance", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    cutDay: integer("cut_day").notNull(),
    paymentDay: integer("payment_day").notNull(),
    color: text("color"),
    icon: text("icon"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    check("cut_day_valid", sql`${t.cutDay} BETWEEN 1 AND 28`),
    check("payment_day_valid", sql`${t.paymentDay} BETWEEN 1 AND 28`),
    index("idx_credit_cards_user").on(t.userId),
    // RLS
    pgPolicy("Usuarios gestionan sus tarjetas", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

/**
 * Histórico de cortes de tarjeta (estados de cuenta).
 * Requerido para el Simulador de Pagos del Módulo 2.
 *
 * FIX: Se añade uniqueIndex en (cardId, cutDate) — no pueden existir
 * dos cortes el mismo día para la misma tarjeta.
 */
export const cardStatements = pgTable(
  "card_statements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .references(() => creditCards.id, { onDelete: "cascade" })
      .notNull(),
    cutDate: timestamp("cut_date").notNull(),
    dueDate: timestamp("due_date").notNull(),
    balanceAtCut: decimal("balance_at_cut", {
      precision: 12,
      scale: 2,
    }).notNull(),
    minimumPayment: decimal("minimum_payment", { precision: 12, scale: 2 }),
    isPaid: boolean("is_paid").default(false).notNull(),
    paidAt: timestamp("paid_at"),
    paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("idx_card_statements_card_cut").on(t.cardId, t.cutDate),

    check("due_date_after_cut_date", sql`${t.dueDate} > ${t.cutDate}`),

    pgPolicy("Usuarios gestionan los cortes de sus tarjetas", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = (SELECT user_id FROM credit_cards WHERE id = ${t.cardId})`,
      withCheck: sql`auth.uid() = (SELECT user_id FROM credit_cards WHERE id = ${t.cardId})`,
    }),
  ],
).enableRLS();

// ============================================================
// 6. CATEGORÍAS DE TRANSACCIONES
// ============================================================

/**
 * Categorías globales (userId = null) y personalizadas (userId = <uuid>).
 * `isFixed` diferencia obligaciones de gastos de estilo de vida (Módulo 3).
 *
 * FIX: Se añade `isFeeCategory` para marcar la categoría reservada del sistema
 * que agrupa comisiones bancarias y retenciones (Reporte de Fugas — Módulo 5).
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: categoryTypeEnum("type").notNull(),
    isFixed: boolean("is_fixed").default(false).notNull(),
    isFeeCategory: boolean("is_fee_category").default(false).notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    color: text("color"),
    icon: text("icon"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("idx_categories_user").on(t.userId),
    pgPolicy("Lectura de categorías: Sistema + Propias", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`${t.isSystem} = true OR auth.uid() = ${t.userId}`,
    }),
    pgPolicy("Usuarios modifican solo sus categorías personalizadas", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`${t.isSystem} = false AND auth.uid() = ${t.userId}`,
      withCheck: sql`${t.isSystem} = false AND auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 7. TAGS (ETIQUETAS PERSONALIZADAS)
// ============================================================

/**
 * NEW: Etiquetas libres para agrupar transacciones sin romper la jerarquía
 * de categorías. Útil para el Sankey Diagram (Módulo 5) y para filtros ad-hoc.
 * Ejemplos: "Viaje Punta Cana", "Emergencia médica", "Quinceaños".
 */
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    color: text("color"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("idx_tags_user_name").on(t.userId, t.name),
    // RLS Simple
    pgPolicy("Usuarios gestionan sus tags", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

export const transactionTags = pgTable(
  "transaction_tags",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    transactionId: uuid("transaction_id")
      .references(() => transactions.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index("idx_transaction_tags_tag").on(t.tagId),
    pgPolicy("Usuarios gestionan los tags de sus transacciones", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 8. PRESUPUESTO BASE CERO
// ============================================================

export const budgetPeriods = pgTable(
  "budget_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    period: text("period").notNull(), // ej. "2026-04"
    totalIncome: decimal("total_income", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    status: budgetStatusEnum("status").default("draft").notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("idx_budget_periods_user_period").on(t.userId, t.period),
    // RLS
    pgPolicy("Usuarios gestionan sus periodos de presupuesto", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

/**
 * FIX: Tabla Hija. Los "Sobres" de dinero para un mes específico.
 * Ahora está perfectamente normalizada.
 */
export const budgetAllocations = pgTable(
  "budget_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    budgetPeriodId: uuid("budget_period_id")
      .references(() => budgetPeriods.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id")
      .references(() => categories.id)
      .notNull(),
    allocatedAmount: decimal("allocated_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    spentAmount: decimal("spent_amount", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    // FIX: Garantiza que no asigne dos veces la misma categoría en el mismo mes
    uniqueIndex("idx_budget_allocations_period_category").on(
      t.budgetPeriodId,
      t.categoryId,
    ),
    // RLS
    pgPolicy("Usuarios gestionan sus asignaciones", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 9. TRANSACCIONES
// ============================================================

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    feeAmount: decimal("fee_amount", { precision: 12, scale: 2 }).default(
      "0.00",
    ),

    // FIX ARCH: Soporte para compras internacionales (Amazon, Spotify, etc.)
    originalCurrency: text("original_currency").default("DOP").notNull(),
    originalAmount: decimal("original_amount", { precision: 12, scale: 2 }),
    exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }),

    type: transactionTypeEnum("type").notNull(),
    date: timestamp("date").notNull(),
    description: text("description").notNull(),
    isFee: boolean("is_fee").default(false).notNull(),

    categoryId: uuid("category_id")
      .references(() => categories.id)
      .notNull(),
    budgetId: uuid("budget_id").references(() => budgetPeriods.id),

    accountId: uuid("account_id").references(() => accounts.id),
    cardId: uuid("card_id").references(() => creditCards.id),
    destinationAccountId: uuid("destination_account_id").references(
      () => accounts.id,
    ),

    isAutomatic: boolean("is_automatic").default(false).notNull(),
    automationRuleId: uuid("automation_rule_id").references(
      () => automationRules.id,
      { onDelete: "set null" },
    ),
    webhookEventId: uuid("webhook_event_id").references(
      () => webhookEvents.id,
      { onDelete: "set null" },
    ),

    rawPayload: jsonb("raw_payload"),
    createdAt,
    updatedAt,
  },
  (t) => [
    check("amount_positive", sql`${t.amount} > 0`),

    // FIX ARCH: Evita transacciones "fantasma" sin origen ni destino.
    check(
      "valid_transaction_source_dest",
      sql`
      (${t.type} = 'income' AND ${t.accountId} IS NOT NULL) OR
      (${t.type} = 'expense' AND (${t.accountId} IS NOT NULL OR ${t.cardId} IS NOT NULL)) OR
      (${t.type} = 'transfer' AND ${t.accountId} IS NOT NULL AND ${t.destinationAccountId} IS NOT NULL) OR
      (${t.type} = 'card_payment' AND ${t.accountId} IS NOT NULL AND ${t.cardId} IS NOT NULL)
    `,
    ),

    index("idx_transactions_user_date").on(t.userId, t.date),
    index("idx_transactions_budget").on(t.budgetId),
    index("idx_transactions_account").on(t.accountId),
    index("idx_transactions_card").on(t.cardId),
    index("idx_transactions_automation_rule").on(t.automationRuleId),

    // RLS
    pgPolicy("Usuarios gestionan sus transacciones", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 10. TRANSACCIONES RECURRENTES (GASTOS FIJOS)
// ============================================================

export const recurringTransactions = pgTable(
  "recurring_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    frequency: recurrenceFrequencyEnum("frequency").notNull(),
    categoryId: uuid("category_id")
      .references(() => categories.id)
      .notNull(),
    accountId: uuid("account_id").references(() => accounts.id),
    cardId: uuid("card_id").references(() => creditCards.id),
    isFixed: boolean("is_fixed").default(false).notNull(),
    startDate: timestamp("start_date").notNull(),
    nextDueDate: timestamp("next_due_date").notNull(),
    endDate: timestamp("end_date"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("idx_recurring_user_next_due").on(t.userId, t.nextDueDate),
    // RLS
    pgPolicy("Usuarios gestionan sus transacciones recurrentes", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 11. REGLAS DE AUTOMATIZACIÓN (CLASIFICADOR n8n)
// ============================================================

export const automationRules = pgTable(
  "automation_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    priority: integer("priority").default(0).notNull(),
    field: automationRuleFieldEnum("field").notNull(),
    operator: automationRuleOperatorEnum("operator").notNull(),
    value: text("value").notNull(),
    assignCategoryId: uuid("assign_category_id").references(
      () => categories.id,
    ),
    assignAccountId: uuid("assign_account_id").references(() => accounts.id),
    assignCardId: uuid("assign_card_id").references(() => creditCards.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("idx_automation_rules_user_priority").on(t.userId, t.priority),
    // RLS
    pgPolicy("Usuarios gestionan sus reglas de automatización", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 12. WEBHOOKS DE ENTRADA (Módulo 4 — n8n)
// ============================================================

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),

    source: text("source").notNull(),
    status: webhookStatusEnum("status").default("pending").notNull(),
    payload: jsonb("payload").notNull(),
    errorMessage: text("error_message"),
    matchedRuleId: uuid("matched_rule_id").references(
      () => automationRules.id,
      { onDelete: "set null" },
    ),
    idempotencyKey: text("idempotency_key"),
    processedAt: timestamp("processed_at"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_webhook_events_status").on(t.status),
    index("idx_webhook_events_source").on(t.source),
    index("idx_webhook_events_user").on(t.userId),
    uniqueIndex("idx_webhook_events_idempotency").on(t.idempotencyKey),

    // RLS: Un usuario solo puede ver los eventos de webhooks vinculados a él
    pgPolicy("Usuarios ven sus propios eventos de webhook", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
    }),
    // N8N (Server Action no autenticada directamente por el usuario de UI)
    // será el encargado de hacer el INSERT bypaseando el RLS temporalmente usando el secret key.
  ],
).enableRLS();

// ============================================================
// 13. NOTIFICACIONES
// ============================================================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: notificationTypeEnum("type").default("info").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata"),
    createdAt,
    updatedAt,
  },
  (t) => [
    // FIX ARCH: Índice compuesto optimizado para el Dropdown de "No leídas más recientes"
    index("idx_notifications_user_unread").on(t.userId, t.isRead, t.createdAt),
    // RLS
    pgPolicy("Usuarios gestionan sus notificaciones", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 14. SNAPSHOTS DE PATRIMONIO NETO (NET WORTH)
// ============================================================

export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    period: text("period").notNull(),
    date: timestamp("date").notNull(),
    totalAssets: decimal("total_assets", { precision: 12, scale: 2 }).notNull(),
    totalLiabilities: decimal("total_liabilities", {
      precision: 12,
      scale: 2,
    }).notNull(),
    netWorth: decimal("net_worth", { precision: 12, scale: 2 }).notNull(),
    accountsSnapshot: jsonb("accounts_snapshot"),
    cardsSnapshot: jsonb("cards_snapshot"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("idx_net_worth_user_period").on(t.userId, t.period),
    // RLS: Generalmente el usuario solo las lee, el CRON las genera.
    pgPolicy("Usuarios ven y administran sus snapshots", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 15. OBJETIVOS FINANCIEROS (BUDGET GOALS)
// ============================================================

export const budgetGoals = pgTable(
  "budget_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    targetAmount: decimal("target_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    currentAmount: decimal("current_amount", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    targetDate: timestamp("target_date"),

    linkedAccountId: uuid("linked_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    linkedCardId: uuid("linked_card_id").references(() => creditCards.id, {
      onDelete: "set null",
    }),

    isCompleted: boolean("is_completed").default(false).notNull(),
    color: text("color"),
    icon: text("icon"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("idx_budget_goals_user").on(t.userId),

    // FIX ARCH: Reglas de consistencia duras en la BD
    check("target_amount_positive", sql`${t.targetAmount} > 0`),
    check(
      "exclusive_link",
      sql`(${t.linkedAccountId} IS NULL OR ${t.linkedCardId} IS NULL)`,
    ),

    // RLS
    pgPolicy("Usuarios gestionan sus metas financieras", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 16. AUDIT LOG
// ============================================================

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    tableName: text("table_name").notNull(),
    recordId: uuid("record_id").notNull(),
    action: auditActionEnum("action").notNull(),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    clientInfo: text("client_info"),

    createdAt,
  },
  (t) => [
    index("idx_audit_log_table_record").on(t.tableName, t.recordId),
    index("idx_audit_log_user").on(t.userId),
    index("idx_audit_log_created_at").on(t.createdAt),

    // RLS: ESTRICTAMENTE SOLO LECTURA. Ningún usuario ni admin puede borrar logs.
    pgPolicy("Usuarios ven sus propios logs de auditoría", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

// ============================================================
// 17. RELACIONES (Drizzle Query API)
// ============================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  accounts: many(accounts),
  creditCards: many(creditCards),
  categories: many(categories),
  tags: many(tags),
  budgetPeriods: many(budgetPeriods),
  budgetAllocations: many(budgetAllocations),
  budgetGoals: many(budgetGoals),
  transactions: many(transactions),
  recurringTransactions: many(recurringTransactions),
  automationRules: many(automationRules),
  webhookEvents: many(webhookEvents),
  notifications: many(notifications),
  netWorthSnapshots: many(netWorthSnapshots),
  userRoles: many(userRoles),
  transactionTags: many(transactionTags),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactions: many(transactions, { relationName: "outgoing_transactions" }),
  incomingTransfers: many(transactions, {
    relationName: "incoming_transactions",
  }),
  budgetGoals: many(budgetGoals),
}));

export const creditCardsRelations = relations(creditCards, ({ one, many }) => ({
  user: one(users, {
    fields: [creditCards.userId],
    references: [users.id],
  }),
  statements: many(cardStatements),
  transactions: many(transactions),
  budgetGoals: many(budgetGoals),
}));

export const cardStatementsRelations = relations(cardStatements, ({ one }) => ({
  card: one(creditCards, {
    fields: [cardStatements.cardId],
    references: [creditCards.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgetAllocations: many(budgetAllocations),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  transactionTags: many(transactionTags),
}));

export const transactionTagsRelations = relations(
  transactionTags,
  ({ one }) => ({
    user: one(users, {
      fields: [transactionTags.userId],
      references: [users.id],
    }),
    transaction: one(transactions, {
      fields: [transactionTags.transactionId],
      references: [transactions.id],
    }),
    tag: one(tags, {
      fields: [transactionTags.tagId],
      references: [tags.id],
    }),
  }),
);

export const budgetPeriodsRelations = relations(
  budgetPeriods,
  ({ one, many }) => ({
    user: one(users, {
      fields: [budgetPeriods.userId],
      references: [users.id],
    }),
    allocations: many(budgetAllocations),
    transactions: many(transactions),
  }),
);

export const budgetAllocationsRelations = relations(
  budgetAllocations,
  ({ one }) => ({
    user: one(users, {
      fields: [budgetAllocations.userId],
      references: [users.id],
    }),
    period: one(budgetPeriods, {
      fields: [budgetAllocations.budgetPeriodId],
      references: [budgetPeriods.id],
    }),
    category: one(categories, {
      fields: [budgetAllocations.categoryId],
      references: [categories.id],
    }),
  }),
);

export const budgetGoalsRelations = relations(budgetGoals, ({ one }) => ({
  user: one(users, {
    fields: [budgetGoals.userId],
    references: [users.id],
  }),
  linkedAccount: one(accounts, {
    fields: [budgetGoals.linkedAccountId],
    references: [accounts.id],
  }),
  linkedCard: one(creditCards, {
    fields: [budgetGoals.linkedCardId],
    references: [creditCards.id],
  }),
}));

export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [transactions.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
    }),
    budgetPeriod: one(budgetPeriods, {
      fields: [transactions.budgetId],
      references: [budgetPeriods.id],
    }),
    card: one(creditCards, {
      fields: [transactions.cardId],
      references: [creditCards.id],
    }),
    account: one(accounts, {
      fields: [transactions.accountId],
      references: [accounts.id],
      relationName: "outgoing_transactions",
    }),
    destinationAccount: one(accounts, {
      fields: [transactions.destinationAccountId],
      references: [accounts.id],
      relationName: "incoming_transactions",
    }),
    automationRule: one(automationRules, {
      fields: [transactions.automationRuleId],
      references: [automationRules.id],
    }),
    webhookEvent: one(webhookEvents, {
      fields: [transactions.webhookEventId],
      references: [webhookEvents.id],
    }),
    tags: many(transactionTags),
  }),
);

export const recurringTransactionsRelations = relations(
  recurringTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [recurringTransactions.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [recurringTransactions.categoryId],
      references: [categories.id],
    }),
    account: one(accounts, {
      fields: [recurringTransactions.accountId],
      references: [accounts.id],
    }),
    card: one(creditCards, {
      fields: [recurringTransactions.cardId],
      references: [creditCards.id],
    }),
  }),
);

export const automationRulesRelations = relations(
  automationRules,
  ({ one, many }) => ({
    user: one(users, {
      fields: [automationRules.userId],
      references: [users.id],
    }),
    assignCategory: one(categories, {
      fields: [automationRules.assignCategoryId],
      references: [categories.id],
    }),
    assignAccount: one(accounts, {
      fields: [automationRules.assignAccountId],
      references: [accounts.id],
    }),
    assignCard: one(creditCards, {
      fields: [automationRules.assignCardId],
      references: [creditCards.id],
    }),
    transactions: many(transactions),
    webhookEvents: many(webhookEvents),
  }),
);

export const webhookEventsRelations = relations(
  webhookEvents,
  ({ one, many }) => ({
    user: one(users, {
      fields: [webhookEvents.userId],
      references: [users.id],
    }),
    matchedRule: one(automationRules, {
      fields: [webhookEvents.matchedRuleId],
      references: [automationRules.id],
    }),
    transactions: many(transactions),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const netWorthSnapshotsRelations = relations(
  netWorthSnapshots,
  ({ one }) => ({
    user: one(users, {
      fields: [netWorthSnapshots.userId],
      references: [users.id],
    }),
  }),
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

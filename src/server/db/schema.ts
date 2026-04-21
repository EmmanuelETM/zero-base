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

// ============================================================
// 2. CONFIGURACIÓN GLOBAL DEL SISTEMA
// ============================================================

/**
 * Configuraciones globales del sistema (ej. maintenance_mode, feature flags).
 * Usar JSONB en `value` permite guardar strings, booleans u objetos complejos.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// 3. USUARIOS Y PREFERENCIAS
// ============================================================

/**
 * Espeja auth.users de Supabase. El ID es el mismo UUID que Supabase asigna.
 * No almacenar email ni password aquí — eso vive en auth.users.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  currency: text("currency").default("DOP").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // ej. "Administrador"
  slug: text("slug").notNull().unique(), // ej. "admin" (para usar en código)
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    action: text("action").notNull(), // ej. "create", "read", "update", "delete"
    resource: text("resource").notNull(), // ej. "transactions", "accounts", "system"
    description: text("description"),
  },
  (t) => [
    uniqueIndex("idx_action_resource").on(t.action, t.resource), // Evita duplicar el mismo permiso
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }), // PK compuesta
  ],
);

// 5. Pivot: Roles <-> Permissions
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }), // PK compuesta
  ],
);

/**
 * Relación 1-a-1 con users. Una fila por usuario, nunca más.
 * PK = FK garantiza unicidad sin índice adicional.
 */
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  // UI / UX
  theme: text("theme").default("system").notNull(),
  dashboardLayout: jsonb("dashboard_layout"),

  // Notificaciones
  enablePushNotifications: boolean("enable_push_notifications")
    .default(true)
    .notNull(),
  enableEmailNotifications: boolean("enable_email_notifications")
    .default(false)
    .notNull(),
  telegramChatId: text("telegram_chat_id"),

  // Umbrales de alerta (Módulo 4)
  lowBalanceThreshold: decimal("low_balance_threshold", {
    precision: 12,
    scale: 2,
  }).default("5000.00"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

    color: text("color"),
    icon: text("icon"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_accounts_user").on(t.userId)],
);

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
  },
  (t) => [
    // FIX: Constraints de rango para días (1-28 evita problemas con febrero)
    check("cut_day_valid", sql`${t.cutDay} BETWEEN 1 AND 28`),
    check("payment_day_valid", sql`${t.paymentDay} BETWEEN 1 AND 28`),
    index("idx_credit_cards_user").on(t.userId),
  ],
);

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

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // FIX: Unicidad real de cortes + índice para lookup del corte más reciente
    uniqueIndex("idx_card_statements_card_cut").on(t.cardId, t.cutDate),
  ],
);

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
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),

    name: text("name").notNull(),
    type: categoryTypeEnum("type").notNull(),
    isFixed: boolean("is_fixed").default(false).notNull(),

    // FIX: Permite filtrar con precisión en el Reporte de Fugas (Módulo 5)
    isFeeCategory: boolean("is_fee_category").default(false).notNull(),

    color: text("color"),
    icon: text("icon"),
  },
  (t) => [index("idx_categories_user").on(t.userId)],
);

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
  },
  (t) => [uniqueIndex("idx_tags_user_name").on(t.userId, t.name)],
);

/**
 * NEW: Tabla de unión many-to-many entre transactions y tags.
 */
export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id")
      .references(() => transactions.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    uniqueIndex("idx_transaction_tags_pk").on(t.transactionId, t.tagId),
    index("idx_transaction_tags_tag").on(t.tagId),
  ],
);

// ============================================================
// 8. PRESUPUESTO BASE CERO
// ============================================================

/**
 * Asignación mensual de dinero por categoría (Zero-Based Budgeting — Módulo 3).
 *
 * FIX 1: Se añade `status` para saber si el presupuesto está balanceado.
 * FIX 2: Se añade `totalIncome` para poder calcular "dinero sin asignar"
 *         (= totalIncome - SUM(allocatedAmount)), que debe llegar a cero.
 * FIX 3: Se añade uniqueIndex en (userId, categoryId, period) — no pueden
 *         existir dos asignaciones para la misma categoría en el mismo mes.
 * FIX 4: `spentAmount` se mantiene como cache, pero la aplicación DEBE
 *         actualizarlo dentro de la misma transacción de BD que modifica
 *         una `transaction`. Usar un trigger de PostgreSQL es lo ideal.
 */
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id")
      .references(() => categories.id)
      .notNull(),

    period: text("period").notNull(),

    // FIX: Ingreso total del período para calcular el "dinero sin asignar"
    totalIncome: decimal("total_income", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),

    allocatedAmount: decimal("allocated_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),

    // Cache del gasto real. DEBE actualizarse transaccionalmente con cada
    // INSERT/UPDATE/DELETE en `transactions` que afecte este budget.
    spentAmount: decimal("spent_amount", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),

    // FIX: Estado del presupuesto
    status: budgetStatusEnum("status").default("draft").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    // FIX: Una sola asignación por categoría por período por usuario
    uniqueIndex("idx_budgets_user_category_period").on(
      t.userId,
      t.categoryId,
      t.period,
    ),
  ],
);

// ============================================================
// 9. TRANSACCIONES
// ============================================================

/**
 * Registro central de todos los movimientos de dinero.
 *
 * Reglas de negocio por `type`:
 *   - "income":       accountId (destino) requerido. cardId y destinationAccountId = null.
 *   - "expense":      accountId O cardId requerido (origen). destinationAccountId = null.
 *   - "transfer":     accountId (origen) y destinationAccountId requeridos. cardId = null.
 *   - "card_payment": accountId (origen) y cardId (destino/pasivo a saldar) requeridos.
 *
 * `amount` siempre positivo. La dirección la determina `type`.
 * `feeAmount` captura comisiones bancarias (ej. RD$100 LBTR).
 *
 * FIX: Se añade FK real a automation_rules (resuelve la referencia lazy).
 * FIX: Se añaden índices para las queries más frecuentes del sistema.
 * FIX: Se añade `isFee` para marcar comisiones y poder filtrarlas en el
 *      Reporte de Fugas sin depender solo de la categoría.
 */
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
    type: transactionTypeEnum("type").notNull(),
    date: timestamp("date").notNull(),
    description: text("description").notNull(),

    // FIX: Flag explícito para el Reporte de Fugas (Módulo 5)
    isFee: boolean("is_fee").default(false).notNull(),

    // Referencias
    categoryId: uuid("category_id")
      .references(() => categories.id)
      .notNull(),
    budgetId: uuid("budget_id").references(() => budgets.id),

    // Origen
    accountId: uuid("account_id").references(() => accounts.id),
    cardId: uuid("card_id").references(() => creditCards.id),

    // Destino (solo para transfers y card_payments)
    destinationAccountId: uuid("destination_account_id").references(
      () => accounts.id,
    ),

    // Trazabilidad (Módulo 4 — n8n)
    isAutomatic: boolean("is_automatic").default(false).notNull(),

    // FIX: FK real a automation_rules (antes era lazy sin integridad referencial)
    automationRuleId: uuid("automation_rule_id").references(
      () => automationRules.id,
      { onDelete: "set null" },
    ),

    // FIX: FK al evento de webhook que originó esta transacción (trazabilidad completa)
    webhookEventId: uuid("webhook_event_id").references(
      () => webhookEvents.id,
      { onDelete: "set null" },
    ),

    rawPayload: jsonb("raw_payload"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    check("amount_positive", sql`${t.amount} > 0`),
    // FIX: Índices para las queries más frecuentes
    index("idx_transactions_user_date").on(t.userId, t.date),
    index("idx_transactions_budget").on(t.budgetId),
    index("idx_transactions_account").on(t.accountId),
    index("idx_transactions_card").on(t.cardId),
    index("idx_transactions_automation_rule").on(t.automationRuleId),
  ],
);

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

    // FIX: Explícito para el widget "Días de Supervivencia" — no inferir de categoría
    isFixed: boolean("is_fixed").default(false).notNull(),

    startDate: timestamp("start_date").notNull(),
    nextDueDate: timestamp("next_due_date").notNull(),
    endDate: timestamp("end_date"),
    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_recurring_user_next_due").on(t.userId, t.nextDueDate)],
);

// ============================================================
// 11. REGLAS DE AUTOMATIZACIÓN (CLASIFICADOR n8n — Módulo 4)
// ============================================================

/**
 * Reglas que n8n evalúa al parsear correos bancarios para clasificar
 * transacciones automáticamente.
 *
 * Las reglas se evalúan en orden ascendente de `priority` (menor = mayor prioridad).
 *
 * Ejemplo: field="description", operator="contains", value="Apple.com"
 *          → asignar categoryId = <Suscripciones> y cardId = <Visa BHD>
 */
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_automation_rules_user_priority").on(t.userId, t.priority)],
);

// ============================================================
// 12. WEBHOOKS DE ENTRADA (Módulo 4 — n8n)
// ============================================================

/**
 * - Permite debuggear cuando n8n envía algo que no matchea ninguna regla.
 * - Permite reintentar el procesamiento de eventos fallidos.
 * - Cierra la cadena de trazabilidad: webhook_event → transaction.
 * - Protege contra procesamiento duplicado (idempotencyKey).
 *
 * `source` identifica el flujo de n8n (ej. "email_parser", "bank_sms").
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    source: text("source").notNull(),
    status: webhookStatusEnum("status").default("pending").notNull(),

    payload: jsonb("payload").notNull(),
    errorMessage: text("error_message"),

    // FK al automation_rule que procesó este evento (si aplica)
    matchedRuleId: uuid("matched_rule_id").references(
      () => automationRules.id,
      {
        onDelete: "set null",
      },
    ),

    // Previene procesamiento duplicado si n8n reenvía el mismo evento
    idempotencyKey: text("idempotency_key"),

    processedAt: timestamp("processed_at"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_webhook_events_status").on(t.status),
    index("idx_webhook_events_source").on(t.source),
    uniqueIndex("idx_webhook_events_idempotency").on(t.idempotencyKey),
  ],
);

// ============================================================
// 13. NOTIFICACIONES
// ============================================================

/**
 * Centro de alertas (Módulo 4). Se crea desde n8n o desde la app.
 * `metadata` guarda contexto estructurado para la acción del frontend.
 * Ej: { cardId: "...", daysUntilCut: 3, balanceAtCut: 15000 }
 */
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

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // FIX: Índice para el inbox del usuario (solo no leídas)
    index("idx_notifications_user_unread").on(t.userId, t.isRead),
  ],
);

// ============================================================
// 14. SNAPSHOTS DE PATRIMONIO NETO (NET WORTH — Módulo 5)
// ============================================================

/**
 * Fotografía mensual del patrimonio para graficar su crecimiento.
 * Se genera automáticamente al cierre de cada mes.
 *
 * Net Worth = totalAssets - totalLiabilities
 *
 * FIX: Se añade uniqueIndex en (userId, period) — un solo snapshot por mes.
 */
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

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // FIX: Un solo snapshot por período por usuario
    uniqueIndex("idx_net_worth_user_period").on(t.userId, t.period),
  ],
);

// ============================================================
// 15. OBJETIVOS FINANCIEROS (BUDGET GOALS — Módulo 5)
// ============================================================

/**
 * NEW: Objetivos de ahorro o pago a largo plazo.
 * Distintos de `budgets` (asignación mensual) — estos son metas plurimensuales.
 *
 * Ejemplos:
 *   - "Fondo de emergencia: RD$200,000 para diciembre 2025"
 *   - "Pago total Visa BHD: RD$50,000"
 *
 * `linkedAccountId` permite vincular el goal a una cuenta de ahorros específica
 * para calcular el progreso real desde el balance de esa cuenta.
 */
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

    // Cuenta de ahorros asociada para calcular progreso automáticamente
    linkedAccountId: uuid("linked_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),

    // Tarjeta asociada (si el goal es saldar una deuda)
    linkedCardId: uuid("linked_card_id").references(() => creditCards.id, {
      onDelete: "set null",
    }),

    isCompleted: boolean("is_completed").default(false).notNull(),
    color: text("color"),
    icon: text("icon"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_budget_goals_user").on(t.userId)],
);

// ============================================================
// 16. AUDIT LOG
// ============================================================

/**
 * Tablas que DEBEN estar cubiertas:
 *   - transactions (cualquier INSERT / UPDATE / DELETE)
 *   - accounts (cambios de balance)
 *   - credit_cards (cambios de límite o balance)
 *   - budgets (cambios de allocatedAmount)
 *
 * Implementación recomendada: triggers de PostgreSQL que insertan aquí
 * automáticamente. No confiar solo en la capa de aplicación.
 *
 * `oldValues` y `newValues` guardan el snapshot completo del registro
 * antes y después del cambio, respectivamente.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Quién hizo el cambio (null solo si fue un proceso automático/cron)
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    tableName: text("table_name").notNull(),
    recordId: uuid("record_id").notNull(),
    action: auditActionEnum("action").notNull(),

    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),

    // IP o identificador del cliente (útil para detectar accesos sospechosos)
    clientInfo: text("client_info"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_audit_log_table_record").on(t.tableName, t.recordId),
    index("idx_audit_log_user").on(t.userId),
    index("idx_audit_log_created_at").on(t.createdAt),
  ],
);

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
  budgets: many(budgets),
  budgetGoals: many(budgetGoals),
  transactions: many(transactions),
  recurringTransactions: many(recurringTransactions),
  automationRules: many(automationRules),
  notifications: many(notifications),
  netWorthSnapshots: many(netWorthSnapshots),
  userRoles: many(userRoles),
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
  profile: one(users, {
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
  profile: one(users, {
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
  profile: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  profile: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  transactionTags: many(transactionTags),
}));

export const transactionTagsRelations = relations(
  transactionTags,
  ({ one }) => ({
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

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  profile: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
  transactions: many(transactions),
}));

export const budgetGoalsRelations = relations(budgetGoals, ({ one }) => ({
  profile: one(users, {
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
    profile: one(users, {
      fields: [transactions.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
    }),
    budget: one(budgets, {
      fields: [transactions.budgetId],
      references: [budgets.id],
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
    // FIX: Relación real (antes lazy sin FK)
    automationRule: one(automationRules, {
      fields: [transactions.automationRuleId],
      references: [automationRules.id],
    }),
    // FIX: Relación con webhook de origen
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
    profile: one(users, {
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
    profile: one(users, {
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
    matchedRule: one(automationRules, {
      fields: [webhookEvents.matchedRuleId],
      references: [automationRules.id],
    }),
    transactions: many(transactions),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  profile: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const netWorthSnapshotsRelations = relations(
  netWorthSnapshots,
  ({ one }) => ({
    profile: one(users, {
      fields: [netWorthSnapshots.userId],
      references: [users.id],
    }),
  }),
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  profile: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

CREATE TYPE "public"."account_type" AS ENUM('checking', 'savings', 'investment', 'cooperative');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('insert', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."automation_rule_field" AS ENUM('description', 'merchant', 'amount');--> statement-breakpoint
CREATE TYPE "public"."automation_rule_operator" AS ENUM('contains', 'equals', 'starts_with', 'greater_than', 'less_than');--> statement-breakpoint
CREATE TYPE "public"."budget_status" AS ENUM('draft', 'balanced', 'closed');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('income', 'fixed_expense', 'variable_expense', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'alert', 'reminder', 'system');--> statement-breakpoint
CREATE TYPE "public"."recurrence_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer', 'card_payment');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('pending', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"is_operational" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"color" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"client_info" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"field" "automation_rule_field" NOT NULL,
	"operator" "automation_rule_operator" NOT NULL,
	"value" text NOT NULL,
	"assign_category_id" uuid,
	"assign_account_id" uuid,
	"assign_card_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_period_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"allocated_amount" numeric(12, 2) NOT NULL,
	"spent_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(12, 2) NOT NULL,
	"current_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"target_date" timestamp,
	"linked_account_id" uuid,
	"linked_card_id" uuid,
	"is_completed" boolean DEFAULT false NOT NULL,
	"color" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "target_amount_positive" CHECK ("budget_goals"."target_amount" > 0),
	CONSTRAINT "exclusive_link" CHECK (("budget_goals"."linked_account_id" IS NULL OR "budget_goals"."linked_card_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "budget_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"total_income" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" "budget_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_periods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "card_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"cut_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"balance_at_cut" numeric(12, 2) NOT NULL,
	"minimum_payment" numeric(12, 2),
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"paid_amount" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "due_date_after_cut_date" CHECK ("card_statements"."due_date" > "card_statements"."cut_date")
);
--> statement-breakpoint
ALTER TABLE "card_statements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"type" "category_type" NOT NULL,
	"is_fixed" boolean DEFAULT false NOT NULL,
	"is_fee_category" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"color" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"credit_limit" numeric(12, 2) NOT NULL,
	"current_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cut_day" integer NOT NULL,
	"payment_day" integer NOT NULL,
	"color" text,
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cut_day_valid" CHECK ("credit_cards"."cut_day" BETWEEN 1 AND 28),
	CONSTRAINT "payment_day_valid" CHECK ("credit_cards"."payment_day" BETWEEN 1 AND 28)
);
--> statement-breakpoint
ALTER TABLE "credit_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "net_worth_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"date" timestamp NOT NULL,
	"total_assets" numeric(12, 2) NOT NULL,
	"total_liabilities" numeric(12, 2) NOT NULL,
	"net_worth" numeric(12, 2) NOT NULL,
	"accounts_snapshot" jsonb,
	"cards_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "net_worth_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"action_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"frequency" "recurrence_frequency" NOT NULL,
	"category_id" uuid NOT NULL,
	"account_id" uuid,
	"card_id" uuid,
	"is_fixed" boolean DEFAULT false NOT NULL,
	"start_date" timestamp NOT NULL,
	"next_due_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_tags_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "transaction_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"fee_amount" numeric(12, 2) DEFAULT '0.00',
	"original_currency" text DEFAULT 'DOP' NOT NULL,
	"original_amount" numeric(12, 2),
	"exchange_rate" numeric(10, 4),
	"type" "transaction_type" NOT NULL,
	"date" timestamp NOT NULL,
	"description" text NOT NULL,
	"is_fee" boolean DEFAULT false NOT NULL,
	"category_id" uuid NOT NULL,
	"budget_id" uuid,
	"account_id" uuid,
	"card_id" uuid,
	"destination_account_id" uuid,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"automation_rule_id" uuid,
	"webhook_event_id" uuid,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "amount_positive" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "valid_transaction_source_dest" CHECK (
      ("transactions"."type" = 'income' AND "transactions"."account_id" IS NOT NULL) OR
      ("transactions"."type" = 'expense' AND ("transactions"."account_id" IS NOT NULL OR "transactions"."card_id" IS NOT NULL)) OR
      ("transactions"."type" = 'transfer' AND "transactions"."account_id" IS NOT NULL AND "transactions"."destination_account_id" IS NOT NULL) OR
      ("transactions"."type" = 'card_payment' AND "transactions"."account_id" IS NOT NULL AND "transactions"."card_id" IS NOT NULL)
    )
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"dashboard_layout" jsonb,
	"enable_push_notifications" boolean DEFAULT true NOT NULL,
	"enable_email_notifications" boolean DEFAULT false NOT NULL,
	"telegram_chat_id" text,
	"low_balance_threshold" numeric(12, 2) DEFAULT '5000.00',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"avatar_url" text,
	"currency" text DEFAULT 'DOP' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"source" text NOT NULL,
	"status" "webhook_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"matched_rule_id" uuid,
	"idempotency_key" text,
	"processed_at" timestamp,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_assign_category_id_categories_id_fk" FOREIGN KEY ("assign_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_assign_account_id_accounts_id_fk" FOREIGN KEY ("assign_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_assign_card_id_credit_cards_id_fk" FOREIGN KEY ("assign_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_goals" ADD CONSTRAINT "budget_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_goals" ADD CONSTRAINT "budget_goals_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_goals" ADD CONSTRAINT "budget_goals_linked_card_id_credit_cards_id_fk" FOREIGN KEY ("linked_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_statements" ADD CONSTRAINT "card_statements_card_id_credit_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_card_id_credit_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."credit_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_id_budget_periods_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budget_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_credit_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."credit_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_account_id_accounts_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_automation_rule_id_automation_rules_id_fk" FOREIGN KEY ("automation_rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_webhook_event_id_webhook_events_id_fk" FOREIGN KEY ("webhook_event_id") REFERENCES "public"."webhook_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_matched_rule_id_automation_rules_id_fk" FOREIGN KEY ("matched_rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_table_record" ON "audit_log" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_user" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_user_priority" ON "automation_rules" USING btree ("user_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_budget_allocations_period_category" ON "budget_allocations" USING btree ("budget_period_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_budget_goals_user" ON "budget_goals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_budget_periods_user_period" ON "budget_periods" USING btree ("user_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_card_statements_card_cut" ON "card_statements" USING btree ("card_id","cut_date");--> statement-breakpoint
CREATE INDEX "idx_categories_user" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_credit_cards_user" ON "credit_cards" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_net_worth_user_period" ON "net_worth_snapshots" USING btree ("user_id","period");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_action_resource" ON "permissions" USING btree ("action","resource");--> statement-breakpoint
CREATE INDEX "idx_recurring_user_next_due" ON "recurring_transactions" USING btree ("user_id","next_due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tags_user_name" ON "tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "idx_transaction_tags_tag" ON "transaction_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_date" ON "transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_transactions_budget" ON "transactions" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_account" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_card" ON "transactions" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_automation_rule" ON "transactions" USING btree ("automation_rule_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_status" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_source" ON "webhook_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_user" ON "webhook_events" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_webhook_events_idempotency" ON "webhook_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus cuentas" ON "accounts" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "accounts"."user_id") WITH CHECK (auth.uid() = "accounts"."user_id");--> statement-breakpoint
CREATE POLICY "Cualquier usuario autenticado puede leer settings" ON "app_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Usuarios ven sus propios logs de auditoría" ON "audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = "audit_log"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus reglas de automatización" ON "automation_rules" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "automation_rules"."user_id") WITH CHECK (auth.uid() = "automation_rules"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus asignaciones" ON "budget_allocations" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "budget_allocations"."user_id") WITH CHECK (auth.uid() = "budget_allocations"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus metas financieras" ON "budget_goals" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "budget_goals"."user_id") WITH CHECK (auth.uid() = "budget_goals"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus periodos de presupuesto" ON "budget_periods" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "budget_periods"."user_id") WITH CHECK (auth.uid() = "budget_periods"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan los cortes de sus tarjetas" ON "card_statements" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = (SELECT user_id FROM credit_cards WHERE id = "card_statements"."card_id")) WITH CHECK (auth.uid() = (SELECT user_id FROM credit_cards WHERE id = "card_statements"."card_id"));--> statement-breakpoint
CREATE POLICY "Lectura de categorías: Sistema + Propias" ON "categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("categories"."is_system" = true OR auth.uid() = "categories"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios modifican solo sus categorías personalizadas" ON "categories" AS PERMISSIVE FOR ALL TO "authenticated" USING ("categories"."is_system" = false AND auth.uid() = "categories"."user_id") WITH CHECK ("categories"."is_system" = false AND auth.uid() = "categories"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus tarjetas" ON "credit_cards" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "credit_cards"."user_id") WITH CHECK (auth.uid() = "credit_cards"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios ven y administran sus snapshots" ON "net_worth_snapshots" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "net_worth_snapshots"."user_id") WITH CHECK (auth.uid() = "net_worth_snapshots"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus notificaciones" ON "notifications" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "notifications"."user_id") WITH CHECK (auth.uid() = "notifications"."user_id");--> statement-breakpoint
CREATE POLICY "Lectura de permisos para usuarios autenticados" ON "permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus transacciones recurrentes" ON "recurring_transactions" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "recurring_transactions"."user_id") WITH CHECK (auth.uid() = "recurring_transactions"."user_id");--> statement-breakpoint
CREATE POLICY "Lectura de mapa de permisos" ON "role_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Lectura de roles para usuarios autenticados" ON "roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus tags" ON "tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "tags"."user_id") WITH CHECK (auth.uid() = "tags"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan los tags de sus transacciones" ON "transaction_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "transaction_tags"."user_id") WITH CHECK (auth.uid() = "transaction_tags"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios gestionan sus transacciones" ON "transactions" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "transactions"."user_id") WITH CHECK (auth.uid() = "transactions"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios ven sus preferencias" ON "user_preferences" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = "user_preferences"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios modifican sus preferencias" ON "user_preferences" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = "user_preferences"."user_id") WITH CHECK (auth.uid() = "user_preferences"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios ven sus propios roles" ON "user_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = "user_roles"."user_id");--> statement-breakpoint
CREATE POLICY "Usuarios ven su propio perfil" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = "users"."id");--> statement-breakpoint
CREATE POLICY "Usuarios modifican su propio perfil" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = "users"."id") WITH CHECK (auth.uid() = "users"."id");--> statement-breakpoint
CREATE POLICY "Usuarios ven sus propios eventos de webhook" ON "webhook_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = "webhook_events"."user_id");
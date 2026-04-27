# ✅ ERP Financiero Personal — Checklist Maestro de Desarrollo

> Stack: Next.js 16 · React 19 · Supabase · Drizzle ORM · TypeScript · Tailwind v4 · shadcn/ui  
> Filosofía: App Router, Server Components por defecto, Server Actions para mutaciones, zero waterfalls.

---

## 🏗️ FASE 0 — Fundamentos del Proyecto

### 0.1 Estructura de Carpetas (Next.js App Router)

- [x] Definir estructura de carpetas siguiendo la convención `app/` de Next.js 16

```
src/
	app/  → Pages
		(auth)/ → login, register, forgot-password
		(dashboard)/ → layout protegido con sidebar
			 accounts/
			 transactions/
			 budget/
			 cards/
			 analytics/
			 settings/
	api/
		webhooks/   → endpoints para n8n
	server/
		db/               → drizzle client + queries
		supabase/
		actions/          → server actions agrupadas por dominio
	components/
		ui/  → shadcn primitives
		features/         → componentes de dominio
	lib/
	utils/
	types/              → re-exports de los types de Zod
```

- [x] Configurar path aliases en `tsconfig.json` (`@/components`, `@/lib`, `@/types`)
- [x] Crear `middleware.ts` en la raíz para protección de rutas con Supabase SSR

### 0.2 Autenticación (Supabase + `@supabase/ssr`)

- [x] Configurar cliente Supabase server-side (`createServerClient`) en `server/supabase/server.ts`
- [x] Configurar cliente Supabase browser-side (`createBrowserClient`) en `server/supabase/client.ts`
- [x] Implementar `middleware.ts` que refresca el session cookie en cada request
- [x] Crear páginas de auth: Login, Register, Forgot Password, Reset Password
- [x] Proteger el layout `(dashboard)` verificando sesión en el Server Component raíz
- [x] Vincular `auth.users` de Supabase con la tabla `users` al momento del registro (trigger o Server Action)
- [x] Configurar variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`

### 0.3 Base de Datos & ORM

- [x] Confirmar que el schema de Drizzle está completo y sincronizado con Supabase (todas las tablas de los types)
- [x] Configurar `drizzle.config.ts` apuntando al `DATABASE_URL`
- [x] Crear script de seed con datos iniciales (categorías por defecto, configuraciones de app)
- [x] Habilitar Row Level Security (RLS) en Supabase para todas las tablas sensibles
- [x] Crear políticas RLS: `user_id = auth.uid()` en todas las tablas de usuario
- [x] Centralizar el cliente Drizzle en `lib/db/index.ts` (singleton, no instanciar por request)

### 0.4 Infraestructura de Calidad

- [x] Configurar ESLint con `eslint-config-next`
- [x] Agregar `prettier` + `prettier-plugin-tailwindcss` para ordenar clases
- [x] Configurar `husky` + `lint-staged` para pre-commit hooks
- [x] Definir convención de commits (Conventional Commits)
- [x] Agregar validación de variables de entorno con Zod al arrancar (ej. `@t3-oss/env-nextjs`)

---

## 🔐 FASE 1 — Autenticación & Perfil de Usuario

- [x] Página de Login (`/login`) con form de email + password
- [x] Página de Registro (`/register`) con validación Zod client-side
- [ ] Flujo de recuperación de contraseña (email → reset link → nueva contraseña)
- [x] Server Action `createProfile` que inicializa `profiles`, `app_settings` y `user_preferences` en el primer login
- [x] Página de Perfil (`/settings/profile`): editar nombre, avatar (Supabase Storage), moneda base
- [x] Página de Preferencias (`/settings/preferences`): tema (dark/light), idioma, formato de fecha
- [x] Seed de categorías por defecto al crear cuenta (Supermercados, Combustible, Suscripciones, etc.)

---

## 💼 FASE 2 — Módulo 1: Gestión de Cuentas (Activos)

### 2.1 CRUD de Cuentas (`Account`)

- [x] Server Action `createAccount(data: NewAccount)` — con validación Zod
- [x] Server Action `updateAccount(id, data: UpdateAccount)`
- [x] Server Action `deleteAccount(id)` — soft delete o bloquear si tiene transacciones
- [x] Server Action `archiveAccount(id)` — soft delete o bloquear si tiene transacciones
- [x] Server Action `unarchiveAccount(id)` — soft delete o bloquear si tiene transacciones
- [x] Query `getAccountsByUser(userId)` — usando `React.cache()` para deduplicar por request
- [x] Query `getAccountBalance(accountId)` — calculado desde transacciones reales, no campo redundante

### 2.2 UI de Cuentas

- [ ] Página `/accounts` con lista de "Bolsillos" (Nómina, Ahorros Corrientes, Ahorros LP, Cooperativa)
- [ ] Card por cuenta mostrando: nombre, tipo, balance actual, última actividad
- [ ] Modal/Drawer para crear cuenta nueva (formulario responsivo)
- [ ] Modal/Drawer para editar cuenta existente
- [ ] Confirmación antes de eliminar cuenta
- [ ] Balance total consolidado de todos los activos visible en la cabecera

### 2.3 Transferencias Interbancarias

- [ ] Server Action `createTransfer(fromAccount, toAccount, amount, commission?)` — registra dos transacciones atómicamente (débito + crédito) y una de gasto si hay comisión
- [ ] UI: Formulario de transferencia con selector de origen/destino, monto y toggle "aplicar comisión LBTR (RD$100)"
- [ ] Validación: no permitir origen = destino, balance suficiente en cuenta origen
- [ ] Tipo de transacción `transfer` diferenciado en la BD para no contaminar el flujo de caja

---

## 💳 FASE 3 — Módulo 2: Tarjetas de Crédito (Pasivos)

### 3.1 CRUD de Tarjetas (`CreditCard`)

- [ ] Server Action `createCreditCard(data: NewCreditCard)`
- [ ] Server Action `updateCreditCard(id, data)`
- [ ] Server Action `deleteCreditCard(id)` — verificar que no tenga deuda pendiente
- [ ] Query `getCreditCardsByUser(userId)`

### 3.2 Estados de Cuenta (`CardStatement`)

- [ ] Server Action `createCardStatement(data: NewCardStatement)` — al registrar el corte
- [ ] Query `getLatestStatement(cardId)` — para mostrar balance al corte
- [ ] Cálculo automático de "balance al corte" vs "balance actual" de la tarjeta

### 3.3 UI de Tarjetas

- [ ] Página `/cards` con lista de tarjetas, límite, balance actual y fecha de próximo corte
- [ ] Indicador de % de utilización del crédito por tarjeta (barra de progreso)
- [ ] Modal de pago de tarjeta con el validador: muestra "balance al corte" vs "balance actual" y aviso si el pago es menor al corte

### 3.4 Smart Switch (Recomendador de Tarjeta)

- [ ] Lógica de cálculo: cruzar fecha actual con fecha de corte de cada tarjeta → calcular días de financiamiento gratuito disponibles
- [ ] Widget en Dashboard: "Usa esta tarjeta hoy → X días sin intereses" con indicador visual de la tarjeta recomendada
- [ ] Actualización automática del recomendador a medianoche (revalidación de caché de Next.js)

---

## 📝 FASE 4 — Módulo 3: Presupuesto y Transacciones

### 4.1 Quick Entry (Ingreso Ágil)

- [ ] Formulario flotante/modal accesible desde cualquier pantalla (botón FAB)
- [ ] Campos mínimos: Monto, Categoría (combobox con búsqueda), Método de Pago (cuenta o tarjeta)
- [ ] Campos opcionales colapsables: Descripción, Comercio, Tags, Fecha (default: hoy)
- [ ] Optimistic UI: la transacción aparece en la lista inmediatamente sin esperar al servidor (`useOptimistic`)
- [ ] Validación client-side con Zod antes de disparar Server Action
- [ ] Acceso por teclado completo + soporte mobile (bottom sheet en móvil)
- [ ] Meta: completable en < 10 segundos

### 4.2 CRUD de Transacciones (`Transaction`)

- [ ] Server Action `createTransaction(data: NewTransaction)` — recalcula balance de cuenta/tarjeta
- [ ] Server Action `updateTransaction(id, data: UpdateTransaction)`
- [ ] Server Action `deleteTransaction(id)` — con confirmación y rollback de balance
- [ ] Server Action `createBulkTransactions(data: NewTransaction[])` — para importación masiva
- [ ] Query `getTransactionsByUser(filters)` — con paginación cursor-based (no offset)

### 4.3 Lista de Transacciones

- [ ] Página `/transactions` con lista paginada (infinite scroll o paginación)
- [ ] Filtros: rango de fechas, categoría, cuenta/tarjeta, tipo (gasto/ingreso/transferencia), monto mín/máx
- [ ] Búsqueda por comercio/descripción
- [ ] Agrupación por fecha (hoy, ayer, esta semana, etc.)
- [ ] Edición inline o modal de transacción existente
- [ ] Indicadores visuales: icono de categoría, color por tipo, badge de método de pago

### 4.4 Presupuesto Base Cero (`Budget`, `BudgetGoal`)

- [ ] Flujo de asignación quincenal: al registrar ingreso, disparar wizard de distribución
- [ ] Interfaz para asignar cada peso a un "trabajo" (Cooperativa, Ahorros LP, Pago TC, topes de categoría)
- [ ] Contador de "Dinero Sin Asignar" que debe llegar a cero antes de confirmar
- [ ] Server Action `createBudget(data: NewBudget)` con sus `BudgetGoal` asociados

### 4.5 Topes por Categoría

- [ ] Query `getBudgetProgress(userId, period)` — suma de gastos por categoría vs tope asignado
- [ ] Componente `<CategoryProgressBar>` reutilizable
- [ ] Página `/budget` con vista de todos los topes del periodo actual
- [ ] Alerta visual cuando una categoría supera el 80% del tope
- [ ] Historial de ejecución presupuestal mes a mes

### 4.6 Gestión de Categorías (`Category`)

- [ ] CRUD de categorías personalizadas (nombre, ícono de HugeIcons, color, tipo fijo/variable)
- [ ] Categorías sistema no editables (seed) vs categorías de usuario
- [ ] Página `/settings/categories`

### 4.7 Tags (`Tag`, `TransactionTag`)

- [ ] CRUD de tags libres
- [ ] Asignación múltiple de tags a transacciones desde el formulario Quick Entry
- [ ] Filtrado de transacciones por tag en la lista

---

## ⚙️ FASE 5 — Módulo 4: Automatización (n8n + Webhooks)

### 5.1 Webhooks de Entrada

- [ ] Endpoint `POST /api/webhooks/transaction` — recibe payload de n8n y crea transacción
- [ ] Endpoint `POST /api/webhooks/bank-email` — recibe datos parseados de correo bancario
- [ ] Autenticación de webhooks con `WEBHOOK_SECRET` en header (`x-webhook-secret`)
- [ ] Validación del payload con Zod antes de insertar en BD
- [ ] Registro de cada evento en tabla `webhook_events` con status (pending/processed/failed)
- [ ] Idempotencia: campo `external_id` en transacciones para evitar duplicados

### 5.2 Motor de Reglas de Clasificación (`AutomationRule`)

- [ ] CRUD de reglas: palabras clave → categoría asignada + tarjeta/cuenta asignada
- [ ] Motor de matching: al crear transacción vía webhook, buscar regla aplicable por comercio/descripción
- [ ] Prioridad de reglas: reglas más específicas primero
- [ ] Página `/settings/automation` para gestionar reglas
- [ ] UI de prueba de regla: ingresar nombre de comercio → ver qué regla aplica

### 5.3 Transacciones Recurrentes (`RecurringTransaction`)

- [ ] CRUD de transacciones recurrentes (suscripciones, nómina, seguros)
- [ ] Frecuencia: diaria, semanal, quincenal, mensual, anual
- [ ] Cron job (n8n o Supabase Edge Functions) que genera la transacción real en la fecha programada
- [ ] Vista de calendario de próximas transacciones recurrentes en `/budget`

### 5.4 Centro de Alertas y Notificaciones (`Notification`)

- [ ] Server Action `createNotification(data: NewNotification)`
- [ ] Tipos de alerta: corte próximo (3 días antes), balance bajo (umbral configurable), presupuesto al límite
- [ ] Panel de notificaciones en el dashboard (badge con contador de no leídas)
- [ ] Integración con Telegram Bot (via n8n): envío de mensaje al chatid del usuario
- [ ] Configuración de alertas en `/settings/notifications` (qué alertas activar, umbrales)

---

## 📊 FASE 6 — Módulo 5: Dashboard & Analítica

### 6.1 Dashboard Principal

- [ ] Layout de dashboard con sidebar colapsable (desktop) y bottom nav (móvil)
- [ ] Widget: **Balance General (Net Worth)** — Activos totales - Pasivos totales
- [ ] Widget: **Smart Switch** — Tarjeta recomendada para usar hoy
- [ ] Widget: **Burn Rate** — velocímetro de consumo de liquidez operativa
- [ ] Widget: **Días de Supervivencia** — liquidez disponible ÷ gasto fijo diario promedio
- [ ] Widget: **Transacciones Recientes** — últimas 5, con acceso rápido a editar
- [ ] Widget: **Topes por Categoría** — barras de progreso de las top 4 categorías
- [ ] Widget: **Alertas Activas** — lista de notificaciones no leídas
- [ ] Carga paralela de todos los widgets con `Promise.all()` en el Server Component del dashboard
- [ ] Suspense boundary independiente por widget (fallo aislado, skeleton individual)

### 6.2 Analítica — Flujo de Caja

- [ ] Página `/analytics` con filtro de periodo (mes actual, mes anterior, quincena, rango custom)
- [ ] **Estado de Resultados:** tabla Ingresos vs Egresos con Margen de Ahorro calculado
- [ ] **Margen de Ahorro:** badge verde si > 10%, amarillo 5-10%, rojo < 5%
- [ ] Gráfico de barras: ingresos vs gastos por mes (últimos 6 meses)
- [ ] Gráfico de línea: evolución del Net Worth mes a mes (desde `net_worth_snapshots`)

### 6.3 Diagrama de Sankey (Flujo de Efectivo)

- [ ] Instalar librería de Sankey compatible con React 19 (ej. `d3-sankey`)
- [ ] Query que agrega: Nómina → [Ahorros, Pago TC, Categorías de Gasto]
- [ ] Render del Sankey como Client Component cargado con `dynamic(() => import(...), { ssr: false })`
- [ ] Filtro por quincena/mes con `useTransition` para no bloquear la UI
- [ ] Fallback de carga con Suspense boundary

### 6.4 Balance General (Net Worth) — Historia

- [ ] Snapshot automático de Net Worth al final de cada mes (cron o trigger Supabase)
- [ ] Server Action `createNetWorthSnapshot(data: NewNetWorthSnapshot)`
- [ ] Gráfico de área acumulativa mostrando crecimiento del patrimonio
- [ ] Tabla detalle: desglose de activos y pasivos en un punto del tiempo

### 6.5 Reporte de Fugas (Comisiones)

- [ ] Query que agrupa transacciones de tipo "comisión/fee" por mes
- [ ] Widget dedicado en analytics: total perdido en comisiones este mes
- [ ] Categorías de fuga: LBTR, comisiones bancarias, retenciones, seguros obligatorios
- [ ] Comparación mes vs mes anterior

### 6.6 Burn Rate Indicator

- [ ] Cálculo: promedio de gasto diario operativo (últimos 30 días) vs liquidez operativa actual
- [ ] Visualización tipo velocímetro (SVG animado) con zonas verde/amarillo/rojo
- [ ] Proyección: "A este ritmo, tu cuenta operativa dura X días"

---

## 🧪 FASE 7 — Calidad, Performance y Seguridad

### 7.1 Performance (según AGENTS.md)

- [ ] Todas las queries de datos en Server Components — cero fetches en `useEffect`
- [ ] Usar `React.cache()` para deduplicar queries llamadas desde múltiples componentes en el mismo request
- [ ] Datos independientes cargados con `Promise.all()` en paralelo — cero waterfalls
- [ ] Suspense boundaries estratégicos por widget del dashboard
- [ ] `loading.tsx` por segmento de ruta para skeleton screens automáticos
- [ ] `error.tsx` por segmento para error boundaries granulares
- [ ] Componentes pesados (Sankey, gráficos) cargados con `dynamic(() => import(...), { ssr: false })`
- [ ] Evitar barrel files — importar directamente del módulo específico
- [ ] Usar `useTransition` para actualizaciones no urgentes (filtros, búsqueda)
- [ ] Optimistic updates en Quick Entry y acciones frecuentes con `useOptimistic`
- [ ] Usar `after()` de Next.js para operaciones post-response no bloqueantes (ej. escribir en `audit_logs`)

### 7.2 Seguridad

- [ ] Validar `userId` dentro de CADA Server Action (no confiar en el cliente)
- [ ] Autenticar todas las Server Actions como si fueran API Routes (`getUser()` al inicio de cada una)
- [ ] RLS activado en Supabase para todas las tablas — segunda capa de defensa
- [ ] Webhook endpoints protegidos con `WEBHOOK_SECRET` en header
- [ ] Variables de entorno sensibles nunca expuestas al cliente (sin `NEXT_PUBLIC_` en secretos)
- [ ] Rate limiting en endpoints de webhooks (middleware o Supabase)
- [ ] Sanitizar inputs de texto libre antes de guardar
- [ ] Configurar `Content-Security-Policy` y otros security headers en `next.config.ts`
- [ ] Registrar en `AuditLog` las operaciones críticas: borrado de transacciones, cambios de cuenta

### 7.3 Manejo de Errores

- [ ] Tipado de retorno de Server Actions: patrón `{ data, error }` consistente en todo el proyecto
- [ ] Toast de error global (Sonner) conectado a los retornos de Server Actions
- [ ] `not-found.tsx` para recursos no encontrados
- [ ] Logging de errores en servidor (Sentry o logging estructurado)

### 7.4 Testing

- [ ] Tests unitarios para lógica crítica: cálculo de balance, días de supervivencia, Smart Switch
- [ ] Tests de integración para Server Actions principales (crear transacción, transferencia)
- [ ] Tests E2E mínimos para flujos críticos: login, quick entry, pago de tarjeta

---

## 📱 FASE 8 — UX / UI Responsivo

- [ ] Layout responsivo: sidebar en desktop, bottom navigation en móvil
- [ ] Bottom sheet en móvil para el Quick Entry Form (en lugar de modal flotante)
- [ ] Soporte PWA: `manifest.json`, íconos, `theme-color` para instalación en home screen
- [ ] `viewport` configurado correctamente en el metadata de Next.js
- [ ] Fonts cargados con `next/font` para zero layout shift
- [ ] Dark mode: configurar con `next-themes`, persistido en `user_preferences`
- [ ] Skeleton screens para todos los estados de carga
- [ ] Accesibilidad: focus trap en modales/drawers, `aria-label` en íconos de acción, contraste WCAG AA

---

## 🚀 FASE 9 — Despliegue & Operaciones

- [ ] Configurar proyecto en Vercel (u hosting equivalente)
- [ ] Variables de entorno configuradas en el proveedor de hosting
- [ ] Dominio y HTTPS configurado
- [ ] Configurar Supabase para producción (proyecto separado del de desarrollo)
- [ ] Ejecutar migraciones de Drizzle en producción antes del primer deploy
- [ ] Configurar cron de Net Worth Snapshot (Supabase Cron o n8n schedule)
- [ ] Configurar flujos de n8n en producción con URL del webhook de producción
- [ ] Monitoreo básico: Vercel Analytics y Sentry para errores
- [ ] `robots.txt` configurado para bloquear indexación (app privada)

---

## 📦 Dependencias Adicionales Recomendadas

> No están en tu `package.json` actual pero serán necesarias:

| Paquete           | Para qué                                                    |
| ----------------- | ----------------------------------------------------------- |
| `next-themes`     | Dark/light mode con hidratación correcta                    |
| `sonner`          | Toasts elegantes (compatible con shadcn)                    |
| `react-hook-form` | Wizard de presupuesto base cero                             |
| `date-fns`        | Cálculo de cortes, días de financiamiento                   |
| `recharts`        | Gráficos de barras, líneas y área                           |
| `d3-sankey`       | Diagrama de Sankey de flujo de efectivo                     |
| `lru-cache`       | Caching cross-request en Server Components                  |
| `@dnd-kit/core`   | Drag-and-drop en el wizard de presupuesto                   |
| `swr`             | Revalidación client-side de datos (balances en tiempo real) |

---

## 🗓️ Orden de Implementación Sugerido

```
Fase 0 → Fase 1 → Fase 2 (cuentas) → Fase 4.1 (Quick Entry) →
Fase 4.2-4.3 (transacciones) → Fase 3 (tarjetas + Smart Switch) →
Fase 4.4-4.5 (presupuesto) → Fase 6.1 (dashboard) →
Fase 5 (automatización) → Fase 6.2-6.6 (analítica completa) →
Fase 7-8-9 (calidad, UX, deploy)
```

> El Quick Entry (Fase 4.1) se implementa temprano porque es el flujo más usado y genera valor percibido desde el día 1.

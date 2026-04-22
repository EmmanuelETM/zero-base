import { db } from "./index";
import { roles, permissions, rolePermissions, categories } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Iniciando el proceso de Seed de la Base de Datos...");

  // =========================================================================
  // 1. ROLES BASE
  // =========================================================================
  const baseRoles = [
    {
      name: "Propietario",
      slug: "owner",
      description: "Control total del sistema",
      isSystem: true,
    },
    {
      name: "Administrador",
      slug: "admin",
      description: "Control financiero total",
      isSystem: true,
    },
    {
      name: "Colaborador",
      slug: "member",
      description: "Operador de transacciones",
      isSystem: true,
    },
    {
      name: "Auditor",
      slug: "viewer",
      description: "Acceso de solo lectura",
      isSystem: true,
    },
    {
      name: "Usuario Regular",
      slug: "user",
      description: "Rol por defecto al registrarse",
      isSystem: true,
    },
  ];

  console.log("⏳ [1/4] Insertando Roles...");
  for (const role of baseRoles) {
    await db
      .insert(roles)
      .values(role)
      .onConflictDoNothing({ target: roles.slug });
  }

  // =========================================================================
  // 2. PERMISOS DEL SISTEMA
  // =========================================================================
  const basePermissions = [
    {
      action: "manage",
      resource: "system",
      description: "Modificar ajustes globales y roles",
    },
    {
      action: "manage",
      resource: "automations",
      description: "Modificar webhooks y reglas",
    },
    {
      action: "manage",
      resource: "accounts",
      description: "Crear/Borrar cuentas y tarjetas",
    },
    {
      action: "manage",
      resource: "budgets",
      description: "Reasignar presupuesto base cero",
    },
    {
      action: "delete",
      resource: "transactions",
      description: "Borrar registros históricos",
    },
    {
      action: "create",
      resource: "transactions",
      description: "Usar Quick Entry",
    },
    {
      action: "update",
      resource: "transactions",
      description: "Editar transacciones",
    },
    {
      action: "read",
      resource: "reports",
      description: "Ver dashboards y analítica",
    },
  ];

  console.log("⏳ [2/4] Insertando Permisos...");
  for (const perm of basePermissions) {
    await db
      .insert(permissions)
      .values(perm)
      .onConflictDoNothing({
        target: [permissions.action, permissions.resource],
      });
  }

  // =========================================================================
  // 3. VINCULACIÓN RBAC (Matriz de Permisos)
  // =========================================================================
  const allRoles = await db.select().from(roles);
  const allPerms = await db.select().from(permissions);

  const getRoleId = (slug: string) => allRoles.find((r) => r.slug === slug)?.id;
  const getPermId = (action: string, resource: string) =>
    allPerms.find((p) => p.action === action && p.resource === resource)?.id;

  const roleBindings = [
    // Owner: Tiene absolutamente todo
    ...basePermissions.map((p) => ({
      roleSlug: "owner",
      action: p.action,
      resource: p.resource,
    })),
    // Admin
    { roleSlug: "admin", action: "manage", resource: "accounts" },
    { roleSlug: "admin", action: "manage", resource: "budgets" },
    { roleSlug: "admin", action: "delete", resource: "transactions" },
    { roleSlug: "admin", action: "create", resource: "transactions" },
    { roleSlug: "admin", action: "update", resource: "transactions" },
    { roleSlug: "admin", action: "read", resource: "reports" },
    // Member
    { roleSlug: "member", action: "create", resource: "transactions" },
    { roleSlug: "member", action: "update", resource: "transactions" },
    { roleSlug: "member", action: "read", resource: "reports" },
    // Viewer
    { roleSlug: "viewer", action: "read", resource: "reports" },
  ];

  console.log("⏳ [3/4] Vinculando Matriz de Roles y Permisos...");
  for (const binding of roleBindings) {
    const roleId = getRoleId(binding.roleSlug);
    const permissionId = getPermId(binding.action, binding.resource);

    if (roleId && permissionId) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId })
        .onConflictDoNothing({
          target: [rolePermissions.roleId, rolePermissions.permissionId],
        });
    }
  }

  // =========================================================================
  // 4. CATEGORÍAS GLOBALES DEL SISTEMA
  // =========================================================================
  console.log("⏳ [4/4] Insertando Categorías del Sistema...");

  // Usamos as const para inferir los tipos exactos requeridos por tu schema
  const systemCategories = [
    {
      name: "Salario / Nómina",
      icon: "money",
      color: "#10b981",
      isSystem: true,
      type: "income",
      isFixed: true,
      isFeeCategory: false,
    },
    {
      name: "Supermercados",
      icon: "shopping-cart",
      color: "#3b82f6",
      isSystem: true,
      type: "expense",
      isFixed: false,
      isFeeCategory: false,
    },
    {
      name: "Combustible",
      icon: "gas-pump",
      color: "#f59e0b",
      isSystem: true,
      type: "expense",
      isFixed: false,
      isFeeCategory: false,
    },
    {
      name: "Suscripciones",
      icon: "repeat",
      color: "#8b5cf6",
      isSystem: true,
      type: "expense",
      isFixed: true,
      isFeeCategory: false,
    },
    {
      name: "Servicios Básicos",
      icon: "lightning",
      color: "#eab308",
      isSystem: true,
      type: "expense",
      isFixed: true,
      isFeeCategory: false,
    },
    {
      name: "Entretenimiento",
      icon: "popcorn",
      color: "#ec4899",
      isSystem: true,
      type: "expense",
      isFixed: false,
      isFeeCategory: false,
    },
    {
      name: "Ahorros",
      icon: "piggy-bank",
      color: "#14b8a6",
      isSystem: true,
      type: "transfer",
      isFixed: true,
      isFeeCategory: false,
    },
    {
      name: "Comisiones Bancarias",
      icon: "receipt",
      color: "#ef4444",
      isSystem: true,
      type: "expense",
      isFixed: false,
      isFeeCategory: true,
    },
  ] as const;

  // Obtenemos las categorías del sistema existentes para no duplicarlas
  const existingCategories = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.isSystem, true));

  const existingNames = new Set(existingCategories.map((c) => c.name));

  for (const cat of systemCategories) {
    if (!existingNames.has(cat.name)) {
      await db.insert(categories).values({
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isSystem: cat.isSystem,
        isFixed: cat.isFixed,
        isFeeCategory: cat.isFeeCategory,
      });
    }
  }

  console.log(
    "✅ Seed completado con éxito. ¡Todo está nítido y listo para producción! 🚀",
  );
}

main().catch((err) => {
  console.error("❌ Error durante el seed:", err);
  process.exit(1);
});

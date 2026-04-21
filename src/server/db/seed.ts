import { db } from "./index"; // Ajusta la ruta si tu instancia de Drizzle está en otro lado
import { roles, permissions, rolePermissions, categories } from "./schema";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("🌱 Iniciando el proceso de Seed para RBAC...");

  // 1. Definir los Roles Base
  const baseRoles = [
    {
      name: "Propietario",
      slug: "owner",
      description: "Control total del sistema",
    },
    {
      name: "Administrador",
      slug: "admin",
      description: "Control financiero total",
    },
    {
      name: "Colaborador",
      slug: "member",
      description: "Operador de transacciones",
    },
    { name: "Auditor", slug: "viewer", description: "Acceso de solo lectura" },
    {
      name: "Usuario Regular",
      slug: "user",
      description: "Rol por defecto al registrarse",
    },
  ];

  console.log("⏳ Insertando Roles...");
  for (const role of baseRoles) {
    await db
      .insert(roles)
      .values(role)
      .onConflictDoNothing({ target: roles.slug });
  }

  // 2. Definir los Permisos del Sistema
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

  console.log("⏳ Insertando Permisos...");
  for (const perm of basePermissions) {
    await db
      .insert(permissions)
      .values(perm)
      .onConflictDoNothing({
        target: [permissions.action, permissions.resource],
      });
  }

  // 3. Recuperar los IDs generados por Postgres
  const allRoles = await db.select().from(roles);
  const allPerms = await db.select().from(permissions);

  // Helper para encontrar IDs rápido
  const getRoleId = (slug: string) => allRoles.find((r) => r.slug === slug)?.id;
  const getPermId = (action: string, resource: string) =>
    allPerms.find((p) => p.action === action && p.resource === resource)?.id;

  // 4. Mapeo de Matriz de Permisos
  const roleBindings: { roleSlug: string; action: string; resource: string }[] =
    [
      // Owner: Tiene absolutamente todo
      ...basePermissions.map((p) => ({
        roleSlug: "owner",
        action: p.action,
        resource: p.resource,
      })),

      // Admin: Todo lo financiero, nada de sistema
      { roleSlug: "admin", action: "manage", resource: "accounts" },
      { roleSlug: "admin", action: "manage", resource: "budgets" },
      { roleSlug: "admin", action: "delete", resource: "transactions" },
      { roleSlug: "admin", action: "create", resource: "transactions" },
      { roleSlug: "admin", action: "update", resource: "transactions" },
      { roleSlug: "admin", action: "read", resource: "reports" },

      // Member: Solo operatividad diaria
      { roleSlug: "member", action: "create", resource: "transactions" },
      { roleSlug: "member", action: "update", resource: "transactions" },
      { roleSlug: "member", action: "read", resource: "reports" },

      // Viewer: Solo ver
      { roleSlug: "viewer", action: "read", resource: "reports" },
    ];

  console.log("⏳ Vinculando Roles y Permisos...");
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

  console.log("✅ Seed completado con éxito. El motor RBAC está listo.");

  // console.log("⏳ Insertando Categorías del Sistema...");
  // const systemCategories = [
  //   {
  //     name: "Supermercados",
  //     icon: "shopping-cart",
  //     color: "#3b82f6",
  //     isSystem: true,
  //     type: "variable",
  //   },
  //   {
  //     name: "Combustible",
  //     icon: "gas-pump",
  //     color: "#f59e0b",
  //     isSystem: true,
  //     type: "variable",
  //   },
  //   {
  //     name: "Suscripciones",
  //     icon: "repeat",
  //     color: "#8b5cf6",
  //     isSystem: true,
  //     type: "fijo",
  //   },
  //   {
  //     name: "Servicios Básicos",
  //     icon: "lightning",
  //     color: "#eab308",
  //     isSystem: true,
  //     type: "fijo",
  //   },
  //   {
  //     name: "Entretenimiento",
  //     icon: "popcorn",
  //     color: "#ec4899",
  //     isSystem: true,
  //     type: "variable",
  //   },
  //   {
  //     name: "Ahorros LP",
  //     icon: "piggy-bank",
  //     color: "#10b981",
  //     isSystem: true,
  //     type: "ahorro",
  //   },
  // ];

  // for (const cat of systemCategories) {
  //   await db
  //     .insert(categories)
  //     .values({
  //       name: cat.name,
  //       type:
  //         cat.type as
  //           | "income"
  //           | "fixed_expense"
  //           | "variable_expense"
  //           | "transfer"
  //           | "savings",
  //       icon: cat.icon,
  //       color: cat.color,
  //       isSystem: cat.isSystem,
  //     })
  //     .onConflictDoNothing({ target: categories.name });
  // }

  // console.log("✅ Seed de Categorías completado.");
}

main().catch((err) => {
  console.error("❌ Error durante el seed:", err);
  process.exit(1);
});

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

// Cacheamos la conexión en el objeto global de Node.js
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Usamos la conexión cacheada si existe, sino creamos una nueva
const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);

// En producción no necesitamos cachear porque no hay Hot Reload
if (env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

// Exportamos la instancia lista para usar con todo el esquema cargado
export const db = drizzle(conn, { schema });

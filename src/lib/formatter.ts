/**
 * Formatea un número como moneda RD$
 * @param amount El monto a formatear (string o number)
 * @returns String formateado como RD$ 10,000.00
 */
export function formatCurrency(amount: string | number): string {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return "RD$ 0.00";
  }

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    currencyDisplay: "symbol",
  }).format(numericAmount);
}

/**
 * Formatea una fecha en estilo dominicano (dd/mm/yyyy)
 * @param date La fecha a formatear (Date, string o number)
 * @returns String formateado como 06/05/2026, o "—" si la fecha es inválida
 */
export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Formatea una fecha con hora (dd/mm/yyyy, hh:mm am/pm)
 * @param date La fecha a formatear (Date, string o number)
 * @returns String formateado como 06/05/2026, 3:45 p. m.
 */
export function formatDateTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formatea una fecha de forma relativa al momento actual
 * @param date La fecha a formatear (Date, string o number)
 * @returns String como "hace 3 días", "en 2 horas", "hace 1 mes"
 */
export function formatRelativeDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return "—";

  const formatter = new Intl.RelativeTimeFormat("es-DO", { numeric: "auto" });
  const diffMs = d.getTime() - Date.now();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  if (Math.abs(diffSecs) < 60) return formatter.format(diffSecs, "second");
  if (Math.abs(diffMins) < 60) return formatter.format(diffMins, "minute");
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, "day");
  if (Math.abs(diffMonths) < 12) return formatter.format(diffMonths, "month");
  return formatter.format(diffYears, "year");
}

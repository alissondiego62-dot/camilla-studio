import { currencyFormatter } from "@/app/config/regions";

export function normalizeMoneyInput(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value.toFixed(2) : "0.00";
  const text = String(value ?? "").trim();
  if (!text) return "0.00";
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number.toFixed(2) : "0.00";
}

export function moneyToCents(value: string | number | null | undefined) {
  const normalized = normalizeMoneyInput(value);
  const [whole, fraction = "00"] = normalized.split(".");
  return BigInt(whole || "0") * BigInt(100) + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}

export function centsToMoney(value: bigint) {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const whole = absolute / BigInt(100);
  const fraction = absolute % BigInt(100);
  return `${negative ? "-" : ""}${whole}.${fraction.toString().padStart(2, "0")}`;
}

export function sumMoney(values: Array<string | number | null | undefined>) {
  return centsToMoney(values.reduce((total, value) => total + moneyToCents(value), BigInt(0)));
}

export function formatMoney(value: string | number | null | undefined, allowed = true) {
  if (!allowed) return "Valor protegido";
  return currencyFormatter.format(Number(normalizeMoneyInput(value)));
}

export function splitInstallments(total: string | number, count: number) {
  const safeCount = Math.max(1, Math.trunc(count));
  const cents = moneyToCents(total);
  const base = cents / BigInt(safeCount);
  let remainder = cents % BigInt(safeCount);
  return Array.from({ length: safeCount }, () => {
    const extra = remainder > BigInt(0) ? BigInt(1) : BigInt(0);
    if (remainder > BigInt(0)) remainder -= BigInt(1);
    return centsToMoney(base + extra);
  });
}

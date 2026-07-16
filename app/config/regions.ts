export const CAMILLA_LOCALE = "pt-BR";
export const CAMILLA_TIME_ZONE = "America/Boa_Vista";
export const CAMILLA_CURRENCY = "BRL";

export const currencyFormatter = new Intl.NumberFormat(CAMILLA_LOCALE, {
  style: "currency",
  currency: CAMILLA_CURRENCY,
  minimumFractionDigits: 2,
});

export const dateFormatter = new Intl.DateTimeFormat(CAMILLA_LOCALE, {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: CAMILLA_TIME_ZONE,
});

export const dateTimeFormatter = new Intl.DateTimeFormat(CAMILLA_LOCALE, {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  hour12: false, timeZone: CAMILLA_TIME_ZONE,
});

export function dateOnly(value: string | null | undefined) {
  if (!value) return "—";
  return dateFormatter.format(new Date(`${value.slice(0, 10)}T12:00:00-04:00`));
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return dateTimeFormatter.format(new Date(value));
}

export function localDateTimeToIso(value: string) {
  return new Date(`${value}:00-04:00`).toISOString();
}

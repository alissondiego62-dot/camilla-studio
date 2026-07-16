export const CAMILLA_TIME_ZONE = "America/Boa_Vista";
export const CAMILLA_LOCALE = "pt-BR";

export const currencyFormatter = new Intl.NumberFormat(CAMILLA_LOCALE, {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export const dateFormatter = new Intl.DateTimeFormat(CAMILLA_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: CAMILLA_TIME_ZONE,
});

export const dateTimeFormatter = new Intl.DateTimeFormat(CAMILLA_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: CAMILLA_TIME_ZONE,
});

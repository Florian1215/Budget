const CURRENCY_KEY = "budget_currency";

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "JPY"];

export function getCurrency() {
  try {
    return localStorage.getItem(CURRENCY_KEY) || "EUR";
  } catch {
    return "EUR";
  }
}

export function saveCurrency(c) {
  try {
    localStorage.setItem(CURRENCY_KEY, c);
  } catch {
    /* ignore */
  }
}

export function formatMoney(value, currency = getCurrency()) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value || 0));
}

const pad = (n) => String(n).padStart(2, "0");

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISO(new Date());

export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const monthRange = (month) => ({ start: toISO(startOfMonth(month)), end: toISO(endOfMonth(month)) });

export const monthLabel = (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** "This Month" / "Last Month" / "Next Month", otherwise "March 2026". */
export function relativeMonthLabel(d) {
  const now = startOfMonth(new Date());
  const diff = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
  return { 0: "This Month", [-1]: "Last Month", 1: "Next Month" }[diff] || monthLabel(d);
}

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const formatDayHeader = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });

export const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** Default date for a new transaction: today if it is in the viewed month, else the 1st of that month. */
export function defaultDateFor(month) {
  const now = new Date();
  if (now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth()) return toISO(now);
  return toISO(startOfMonth(month));
}

export const COLORS = ["#5b7fe0", "#f2a93b", "#9b5de5", "#ef5b5b", "#3dbe8b", "#2ec4b6", "#ff7aa8", "#f9844a", "#4cc9f0", "#8d99ae"];

export const FREQUENCIES = [
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

/** Options for a category <select>, expenses first. */
export function categoryOptions(categories) {
  return [...categories]
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "expense" ? -1 : 1))
    .map((c) => ({ id: c.id, label: c.name, group: c.kind === "income" ? "Income" : "Expenses" }));
}

/** Accept both "14,44" and "14.44": keep digits and a single decimal separator, normalized to ".". */
export function normalizeAmount(value) {
  const cleaned = String(value).replace(/,/g, ".").replace(/[^\d.]/g, "");
  const [int, ...rest] = cleaned.split(".");
  return rest.length ? `${int}.${rest.join("").slice(0, 2)}` : int;
}

/** Shared props for amount inputs (text input so the comma isn't rejected by the browser). */
export const AMOUNT_INPUT_PROPS = { type: "text", inputMode: "decimal", pattern: "\\d*\\.?\\d{0,2}", autoComplete: "off" };

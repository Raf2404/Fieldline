const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number) {
  // Pas de décimales pour les prix ronds : « 89 € » plutôt que « 89,00 € ».
  if (cents % 100 === 0) return fmt.format(cents / 100).replace(/,00/, "");
  return fmt.format(cents / 100);
}

/** « 89 », « 89,90 », « 89.9 » → 8990. Renvoie null si vide ou invalide. */
export function parseEuros(input: FormDataEntryValue | null | undefined): number | null {
  if (input == null) return null;
  const s = String(input).trim().replace(/\s|€/g, "").replace(",", ".");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");

export function discountPercent(price: number, compareAt: number | null) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round((1 - price / compareAt) * 100);
}

// Devises d'affichage. Les prix, les paiements et les contrats restent en FCFA :
// l'euro et le dollar ne servent qu'à donner une idée du montant au visiteur.

export type CurrencyCode = "XAF" | "EUR" | "USD";

/** Parité officielle fixe : 1 EUR = 655,957 FCFA. */
const FCFA_PER_EUR = 655.957;
/** Taux indicatif : 1 USD ≈ 565 FCFA. À mettre à jour de temps en temps. */
const FCFA_PER_USD = 565;

const STORAGE_KEY = "yd-cur";
const isCode = (v: unknown): v is CurrencyCode => v === "XAF" || v === "EUR" || v === "USD";

let current: CurrencyCode = "XAF";
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isCode(saved)) current = saved;
} catch {
  /* stockage indisponible : on garde le FCFA */
}

export const getCurrency = (): CurrencyCode => current;

export function setCurrency(code: string): void {
  if (!isCode(code)) return;
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignoré */
  }
}

/** Formate un montant exprimé en FCFA dans la devise demandée. */
export function formatIn(fcfa: number, code: CurrencyCode = current): string {
  if (code === "EUR") return `${Math.round(fcfa / FCFA_PER_EUR).toLocaleString("fr-FR")} €`;
  if (code === "USD") return `$${Math.round(fcfa / FCFA_PER_USD).toLocaleString("en-US")}`;
  return `${fcfa.toLocaleString("fr-FR")} FCFA`;
}

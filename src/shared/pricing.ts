import type { Mode, Quote, Vehicle } from "./types.js";

export interface QuoteParams {
  mode: Mode;
  days: number;
  withDriver: boolean;
}

export const formatMoney = (n: number): string => `${n.toLocaleString("fr-FR")} FCFA`;

/**
 * Calcule le prix. Source unique de vérité : utilisée par le navigateur (affichage)
 * ET par le serveur (montant réellement enregistré et facturé).
 */
export function computeQuote(
  vehicle: Pick<Vehicle, "n" | "buy" | "rent">,
  params: QuoteParams,
  driverFeePerDay: number,
): Quote {
  if (params.mode === "buy") {
    return {
      mode: "buy",
      days: 0,
      lines: [{ label: `Achat : ${vehicle.n}`, amount: vehicle.buy }],
      total: vehicle.buy,
      currency: "FCFA",
    };
  }
  const days = Math.max(1, Math.floor(params.days));
  const lines = [
    { label: `Location : ${vehicle.n} (${days} × ${formatMoney(vehicle.rent)})`, amount: vehicle.rent * days },
  ];
  if (params.withDriver) {
    lines.push({ label: `Chauffeur (${days} × ${formatMoney(driverFeePerDay)})`, amount: driverFeePerDay * days });
  }
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { mode: "rent", days, lines, total, currency: "FCFA" };
}

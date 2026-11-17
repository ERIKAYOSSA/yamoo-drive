import { randomBytes } from "node:crypto";
import type { PaymentMethod, PaymentRecord, Reservation } from "../shared/types.js";

export interface ChargeRequest {
  reservation: Reservation;
  method: PaymentMethod;
  phone?: string;
}

/**
 * Point d'intégration du paiement en ligne.
 * Pour brancher un vrai prestataire (CinetPay, Flutterwave, Orange Money, MTN MoMo, Stripe…),
 * créez une classe qui implémente cette interface : créer la transaction chez le prestataire,
 * rediriger le client vers sa page de paiement, puis confirmer via le webhook du prestataire
 * (en vérifiant sa signature) AVANT de marquer la réservation comme payée.
 */
export interface PaymentProvider {
  readonly name: string;
  charge(req: ChargeRequest): Promise<PaymentRecord>;
}

const mask = (phone: string): string => phone.slice(0, -3).replace(/\d/g, "•") + phone.slice(-3);

/** Simulation : aucun argent n'est débité, aucune donnée bancaire n'est lue ni stockée. */
export class DemoProvider implements PaymentProvider {
  readonly name = "demo";

  async charge({ reservation, method, phone }: ChargeRequest): Promise<PaymentRecord> {
    await new Promise((resolve) => setTimeout(resolve, 600)); // simule la latence réseau
    const base = {
      id: `PAY-DEMO-${randomBytes(5).toString("hex").toUpperCase()}`,
      method,
      amount: reservation.quote.total,
      createdAt: new Date().toISOString(),
      demo: true as const,
    };
    if (method === "agency") return { ...base, status: "pending_agency" };
    return { ...base, status: "succeeded_demo", ...(phone ? { phoneMasked: mask(phone) } : {}) };
  }
}

export function getProvider(name: string): PaymentProvider {
  if (name !== "demo") {
    console.warn(`[payments] fournisseur "${name}" non implémenté : utilisation du mode démonstration.`);
  }
  return new DemoProvider();
}

// Notifications WhatsApp envoyées à VOTRE téléphone à chaque nouvelle réservation ou paiement.
// Deux fournisseurs : « callmebot » (gratuit, simple, idéal pour les tests) et « cloud » (API officielle Meta).
import { config } from "./config.js";
import { formatMoney } from "../shared/pricing.js";
import type { Reservation, Vehicle } from "../shared/types.js";

export interface Notifier {
  readonly provider: string;
  readonly configured: boolean;
  /** Numéro masqué pour l'affichage (ex. 2376•••••69). */
  readonly target: string;
  send(text: string): Promise<void>;
}

type NotifyConfig = typeof config.notify;

const mask = (digits: string): string => (digits.length > 6 ? `${digits.slice(0, 4)}•••••${digits.slice(-2)}` : digits ? "•••" : "");

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw new Error(`Le service WhatsApp a répondu ${res.status}.`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export function createNotifier(cfg: NotifyConfig = config.notify): Notifier {
  const phone = cfg.phone;

  if (cfg.provider === "callmebot" && phone && cfg.callmebotKey) {
    return {
      provider: "callmebot",
      configured: true,
      target: mask(phone),
      async send(text) {
        const q = `phone=${encodeURIComponent(`+${phone}`)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(cfg.callmebotKey)}`;
        await call(`${cfg.callmebotUrl}/whatsapp.php?${q}`);
      },
    };
  }

  if (cfg.provider === "cloud" && phone && cfg.cloudToken && cfg.cloudPhoneId) {
    return {
      provider: "cloud",
      configured: true,
      target: mask(phone),
      async send(text) {
        const body = cfg.cloudTemplate
          ? {
              messaging_product: "whatsapp",
              to: phone,
              type: "template",
              // Les paramètres d'un modèle ne peuvent pas contenir de retours à la ligne.
              template: {
                name: cfg.cloudTemplate,
                language: { code: cfg.cloudLang },
                components: [{ type: "body", parameters: [{ type: "text", text: text.replace(/\s*\n+\s*/g, " · ") }] }],
              },
            }
          : { messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } };
        await call(`${cfg.cloudUrl}/${cfg.cloudPhoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.cloudToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      },
    };
  }

  return {
    provider: "none",
    configured: false,
    target: "",
    async send() {
      throw new Error("Les notifications WhatsApp ne sont pas configurées.");
    },
  };
}

const fmtDate = (iso?: string): string => (iso ? iso.split("-").reverse().join("/") : "à convenir");

function summary(r: Reservation, v: Vehicle | undefined): string[] {
  const i = r.input;
  const lines = [
    `Client : ${i.customer.name} (${i.customer.phone})`,
    `Véhicule : ${v?.n ?? `n°${i.vehicleId}`} · ${i.mode === "rent" ? `location ${r.quote.days} j` : "achat"}`,
    `Montant : ${formatMoney(r.quote.total)}`,
    `Lieu : ${i.pickupPlace}`,
  ];
  if (i.landmark) lines.push(`Repère : ${i.landmark}`);
  if (i.mapLink) lines.push(`Position : ${i.mapLink}`);
  if (i.mode === "rent") lines.push(`Début : ${fmtDate(i.startDate)}${i.startTime ? ` à ${i.startTime.replace(":", "h")}` : ""}`);
  if (i.recipient?.name) lines.push(`Cadeau pour : ${i.recipient.name}`);
  return lines;
}

const link = (r: Reservation): string[] => (config.publicUrl ? [`Ouvrir : ${config.publicUrl}/admin#/reservations/${r.id}`] : []);

export const newReservationText = (r: Reservation, v: Vehicle | undefined): string =>
  [`Nouvelle réservation ${r.id}`, ...summary(r, v), ...link(r)].join("\n");

export const paymentText = (r: Reservation, v: Vehicle | undefined): string =>
  [
    r.status === "pay_at_agency" ? `Réservation ${r.id} : paiement à l'agence` : `Paiement reçu pour ${r.id}`,
    ...summary(r, v),
    ...link(r),
  ].join("\n");

export const newAccountText = (u: { name: string; phone: string; email?: string }): string =>
  [`Nouveau compte client : ${u.name}`, `Téléphone : ${u.phone}`, ...(u.email ? [`E-mail : ${u.email}`] : []), ...(config.publicUrl ? [`Voir : ${config.publicUrl}/admin#/clients`] : [])].join("\n");

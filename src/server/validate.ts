import type { PaymentMethod, PaymentRequest, ReservationInput } from "../shared/types.js";

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const DECORATIONS = ["Fleurs de mariage", "Grand ruban cadeau"];
const METHODS: PaymentMethod[] = ["card", "orange_money", "mtn_momo", "agency"];

function cleanText(
  src: Record<string, unknown>,
  key: string,
  label: string,
  max: number,
  errors: string[],
  required = false,
): string {
  const v = src[key];
  if (v === undefined || v === null || v === "") {
    if (required) errors.push(`${label} est obligatoire.`);
    return "";
  }
  if (typeof v !== "string") {
    errors.push(`${label} est invalide.`);
    return "";
  }
  // eslint-disable-next-line no-control-regex
  const t = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (t.length > max) {
    errors.push(`${label} est trop long (${max} caractères maximum).`);
    return t.slice(0, max);
  }
  if (required && t.length < 2) errors.push(`${label} est trop court.`);
  return t;
}

/** Retourne le numéro nettoyé, ou null s'il est invalide. */
export function normalizePhone(raw: string): string | null {
  const t = raw.replace(/[\s().-]/g, "");
  return /^\+?\d{8,15}$/.test(t) ? t : null;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function validDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || isoDate(d) !== s ? null : d;
}

export interface ReservationContext {
  vehicleCount: number;
  driverCount: number;
  now: Date;
}

export function validateReservationInput(raw: unknown, ctx: ReservationContext): Validation<ReservationInput> {
  if (!isRecord(raw)) return { ok: false, errors: ["Requête invalide."] };
  const errors: string[] = [];

  const vehicleId = raw.vehicleId;
  if (typeof vehicleId !== "number" || !Number.isInteger(vehicleId) || vehicleId < 0 || vehicleId >= ctx.vehicleCount) {
    errors.push("Véhicule inconnu.");
  }

  const mode = raw.mode;
  if (mode !== "buy" && mode !== "rent") errors.push("Le type d’opération est invalide.");

  let days: number | undefined;
  if (mode === "rent") {
    if (typeof raw.days !== "number" || !Number.isInteger(raw.days) || raw.days < 1 || raw.days > 60) {
      errors.push("La durée doit être comprise entre 1 et 60 jours.");
    } else {
      days = raw.days;
    }
  }

  let startDate: string | undefined;
  if (typeof raw.startDate === "string" && raw.startDate !== "") {
    const d = validDate(raw.startDate);
    const yesterday = new Date(ctx.now.getTime() - 86_400_000);
    const limit = new Date(ctx.now.getTime() + 366 * 86_400_000);
    if (!d) errors.push("La date de début est invalide.");
    else if (d < new Date(`${isoDate(yesterday)}T00:00:00Z`)) errors.push("La date de début est déjà passée.");
    else if (d > limit) errors.push("La date de début est trop éloignée.");
    else startDate = raw.startDate;
  }

  const times: { startTime?: string; endTime?: string } = {};
  if (mode === "rent") {
    for (const [key, label] of [["startTime", "L’heure de réception"], ["endTime", "L’heure de retour"]] as const) {
      const v = raw[key];
      if (typeof v === "string" && v !== "") {
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) times[key] = v;
        else errors.push(`${label} est invalide.`);
      }
    }
  }

  const withDriver = raw.withDriver === true && mode === "rent";
  let driverId: number | undefined;
  if (withDriver) {
    if (
      typeof raw.driverId !== "number" ||
      !Number.isInteger(raw.driverId) ||
      raw.driverId < 0 ||
      raw.driverId >= ctx.driverCount
    ) {
      errors.push("Choisissez un chauffeur.");
    } else {
      driverId = raw.driverId;
    }
  }

  let customerName = "";
  let customerPhone = "";
  if (!isRecord(raw.customer)) {
    errors.push("Les informations du client sont manquantes.");
  } else {
    customerName = cleanText(raw.customer, "name", "Le nom", 80, errors, true);
    const phoneRaw = cleanText(raw.customer, "phone", "Le téléphone", 30, errors);
    if (phoneRaw) {
      const p = normalizePhone(phoneRaw);
      if (p) customerPhone = p;
      else errors.push("Le numéro de téléphone est invalide.");
    }
  }

  const pickupPlace = cleanText(raw, "pickupPlace", "Le lieu de remise", 120, errors);

  let recipient: ReservationInput["recipient"];
  if (raw.recipient !== undefined && raw.recipient !== null) {
    if (!isRecord(raw.recipient)) {
      errors.push("Le bénéficiaire est invalide.");
    } else {
      const name = cleanText(raw.recipient, "name", "Le prénom du bénéficiaire", 60, errors, true);
      const message = cleanText(raw.recipient, "message", "Le message", 300, errors);
      recipient = { name, message };
    }
  }

  let decoration: string | undefined;
  if (typeof raw.decoration === "string" && raw.decoration !== "") {
    if (DECORATIONS.includes(raw.decoration)) decoration = raw.decoration;
    else errors.push("La décoration choisie est invalide.");
  }

  let referralCode: string | undefined;
  if (typeof raw.referralCode === "string" && raw.referralCode !== "") {
    const c = raw.referralCode.trim().toUpperCase();
    if (/^[A-Z0-9-]{3,24}$/.test(c)) referralCode = c;
    else errors.push("Le code parrain est invalide.");
  }

  if (errors.length > 0) return { ok: false, errors };

  const value: ReservationInput = {
    vehicleId: vehicleId as number,
    mode: mode as "buy" | "rent",
    withDriver,
    customer: { name: customerName, phone: customerPhone },
    pickupPlace,
  };
  if (days !== undefined) value.days = days;
  if (startDate !== undefined && mode === "rent") value.startDate = startDate;
  if (times.startTime) value.startTime = times.startTime;
  if (times.endTime) value.endTime = times.endTime;
  if (driverId !== undefined) value.driverId = driverId;
  if (recipient) value.recipient = recipient;
  if (decoration) value.decoration = decoration;
  if (referralCode) value.referralCode = referralCode;
  return { ok: true, value };
}

export const RESERVATION_ID = /^YD-[A-Z2-9]{10}$/;

export function validatePaymentRequest(raw: unknown): Validation<PaymentRequest> {
  if (!isRecord(raw)) return { ok: false, errors: ["Requête invalide."] };
  const errors: string[] = [];
  const id = raw.reservationId;
  if (typeof id !== "string" || !RESERVATION_ID.test(id)) errors.push("Référence de réservation invalide.");
  const method = raw.method;
  if (typeof method !== "string" || !METHODS.includes(method as PaymentMethod)) {
    errors.push("Moyen de paiement invalide.");
  }
  let phone: string | undefined;
  if (typeof raw.phone === "string" && raw.phone.trim() !== "") {
    const p = normalizePhone(raw.phone);
    if (p) phone = p;
    else errors.push("Le numéro de téléphone est invalide.");
  }
  if ((method === "orange_money" || method === "mtn_momo") && !phone) {
    errors.push("Indiquez le numéro Mobile Money à débiter.");
  }
  if (errors.length > 0) return { ok: false, errors };
  const value: PaymentRequest = { reservationId: id as string, method: method as PaymentMethod };
  if (phone) value.phone = phone;
  return { ok: true, value };
}

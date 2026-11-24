// Comptes clients (facultatifs) : stockage, mots de passe, niveaux de fidélité, export.
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import type { Reservation } from "../shared/types.js";
import { csv } from "./report.js";
import { normalizePhone } from "./validate.js";

// ---------------------------------------------------------------------------------------------
// Modèle
// ---------------------------------------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  /** Numéro normalisé (chiffres uniquement, avec l'indicatif : 237…). Sert d'identifiant de connexion. */
  phone: string;
  email?: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export const publicUser = (u: User): PublicUser => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  ...(u.email ? { email: u.email } : {}),
  createdAt: u.createdAt,
});

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomId = (prefix: string, len: number): string => {
  let id = prefix;
  for (const b of randomBytes(len)) id += ALPHABET[b % 32] ?? "A";
  return id;
};
export const newUserId = (): string => randomId("U-", 10);
export const tempPassword = (): string => randomId("", 10);

/** Numéro canonique : « 655 12 34 56 », « +237655123456 » et « 00237655123456 » donnent le même résultat. */
export function canonPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("6")) d = `237${d}`;
  return d;
}

// ---------------------------------------------------------------------------------------------
// Mots de passe (scrypt : intégré à Node, aucune dépendance)
// ---------------------------------------------------------------------------------------------
const N = 16384;
const scrypt = (pw: string, salt: Buffer, len: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCb(pw, salt, len, { N, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key)));
  });

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt:${N}:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, n, saltHex, keyHex] = stored.split(":");
  if (algo !== "scrypt" || Number(n) !== N || !saltHex || !keyHex) return false;
  const want = Buffer.from(keyHex, "hex");
  const got = await scrypt(pw, Buffer.from(saltHex, "hex"), want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}

let dummy: Promise<string> | undefined;
/** Vérification « à blanc » quand le numéro n'existe pas : même durée, pour ne rien révéler. */
export async function fakeVerify(pw: string): Promise<void> {
  dummy ??= hashPassword("yamoo-dummy-password");
  await verifyPassword(pw, await dummy);
}

// ---------------------------------------------------------------------------------------------
// Stockage (fichier JSON, comme les réservations)
// ---------------------------------------------------------------------------------------------
export class UserStore {
  private readonly map = new Map<string, User>();
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly file: string) {}

  async load(): Promise<void> {
    try {
      for (const u of JSON.parse(await fs.readFile(this.file, "utf8")) as User[]) this.map.set(u.id, u);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.warn("[users] lecture impossible, démarrage à vide :", (err as Error).message);
    }
  }

  get(id: string): User | undefined {
    return this.map.get(id);
  }

  getByPhone(phone: string): User | undefined {
    for (const u of this.map.values()) if (u.phone === phone) return u;
    return undefined;
  }

  list(): User[] {
    return [...this.map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  save(user: User): Promise<void> {
    this.map.set(user.id, user);
    return this.queue();
  }

  delete(id: string): Promise<void> {
    this.map.delete(id);
    return this.queue();
  }

  private queue(): Promise<void> {
    this.chain = this.chain.then(() => this.flush());
    return this.chain;
  }

  private async flush(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      // Droits 600 : le fichier contient les empreintes des mots de passe.
      await fs.writeFile(tmp, JSON.stringify([...this.map.values()], null, 2), { encoding: "utf8", mode: 0o600 });
      await fs.rename(tmp, this.file);
    } catch (err) {
      console.warn("[users] écriture impossible (données en mémoire seulement) :", (err as Error).message);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Validation des formulaires
// ---------------------------------------------------------------------------------------------
type Check<T> = { ok: true; value: T } | { ok: false; errors: string[] };
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
// eslint-disable-next-line no-control-regex
const clean = (s: string): string => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

export function checkName(raw: unknown, errors: string[]): string {
  const v = typeof raw === "string" ? clean(raw) : "";
  if (v.length < 2) errors.push("Le nom est obligatoire (2 caractères minimum).");
  else if (v.length > 80) errors.push("Le nom est trop long (80 caractères maximum).");
  return v;
}

export function checkEmail(raw: unknown, errors: string[]): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const v = typeof raw === "string" ? clean(raw).toLowerCase() : "";
  if (v.length > 120 || !/^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/.test(v)) {
    errors.push("L'adresse e-mail est invalide.");
    return undefined;
  }
  return v;
}

export function checkPassword(raw: unknown, errors: string[], label = "Le mot de passe"): string {
  const v = typeof raw === "string" ? raw : "";
  if (v.length < 8) errors.push(`${label} doit faire au moins 8 caractères.`);
  else if (v.length > 100) errors.push(`${label} est trop long (100 caractères maximum).`);
  return v;
}

export function checkPhone(raw: unknown, errors: string[]): string {
  const p = typeof raw === "string" ? normalizePhone(raw) : null;
  if (!p) {
    errors.push("Le numéro de téléphone est invalide.");
    return "";
  }
  return canonPhone(p);
}

export function validateRegistration(raw: unknown): Check<{ name: string; phone: string; email?: string; password: string }> {
  if (!isRecord(raw)) return { ok: false, errors: ["Données invalides."] };
  const errors: string[] = [];
  const name = checkName(raw.name, errors);
  const phone = checkPhone(raw.phone, errors);
  const email = checkEmail(raw.email, errors);
  const password = checkPassword(raw.password, errors);
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { name, phone, ...(email ? { email } : {}), password } };
}

// ---------------------------------------------------------------------------------------------
// Fidélité (vue de l'entreprise)
// ---------------------------------------------------------------------------------------------
export type Tier = "new" | "regular" | "loyal" | "vip";
export const TIER_LABEL: Record<Tier, string> = { new: "Nouveau", regular: "Régulier", loyal: "Fidèle", vip: "VIP" };

/** Nouveau : 0-1 réservation · Régulier : 2 · Fidèle : 3-4 · VIP : 5 et plus, ou 1 000 000 FCFA dépensés. */
export function tierOf(count: number, spent: number): Tier {
  if (count >= 5 || spent >= 1_000_000) return "vip";
  if (count >= 3) return "loyal";
  if (count >= 2) return "regular";
  return "new";
}

export interface AdminUser extends PublicUser {
  lastLoginAt?: string;
  reservations: number;
  rentals: number;
  purchases: number;
  rentDays: number;
  spent: number;
  lastReservationAt?: string;
  tier: Tier;
  reservationIds: string[];
}

/** Réservations d'un client = celles de son compte + celles faites avec son numéro (vue admin uniquement). */
export function buildAdminUsers(users: User[], reservations: Reservation[]): AdminUser[] {
  const byPhone = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const k = canonPhone(r.input.customer.phone);
    byPhone.set(k, [...(byPhone.get(k) ?? []), r]);
  }
  return users
    .map((u) => {
      const mine = new Map<string, Reservation>();
      for (const r of reservations) if (r.userId === u.id) mine.set(r.id, r);
      for (const r of byPhone.get(u.phone) ?? []) mine.set(r.id, r);
      const all = [...mine.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const act = all.filter((r) => (r.fulfillment ?? "new") !== "cancelled");
      const rent = act.filter((r) => r.input.mode === "rent");
      const spent = act.reduce((s, r) => s + r.quote.total, 0);
      return {
        ...publicUser(u),
        ...(u.lastLoginAt ? { lastLoginAt: u.lastLoginAt } : {}),
        reservations: act.length,
        rentals: rent.length,
        purchases: act.length - rent.length,
        rentDays: rent.reduce((s, r) => s + r.quote.days, 0),
        spent,
        ...(all[0] ? { lastReservationAt: all[0].createdAt } : {}),
        tier: tierOf(act.length, spent),
        reservationIds: all.map((r) => r.id),
      };
    })
    .sort((a, b) => b.spent - a.spent || b.reservations - a.reservations || b.createdAt.localeCompare(a.createdAt));
}

export function usersCsv(list: AdminUser[], tz: string): string {
  const day = (iso?: string): string => {
    if (!iso) return "";
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };
  return csv([
    ["Nom", "Téléphone", "E-mail", "Inscrit le", "Dernière connexion", "Réservations", "Locations", "Achats", "Jours loués", "Total dépensé (FCFA)", "Dernière réservation", "Niveau"],
    ...list.map((u) => [u.name, u.phone, u.email ?? "", day(u.createdAt), day(u.lastLoginAt), u.reservations, u.rentals, u.purchases, u.rentDays, u.spent, day(u.lastReservationAt), TIER_LABEL[u.tier]]),
  ]);
}

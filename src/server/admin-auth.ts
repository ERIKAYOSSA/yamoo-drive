// Connexion à la page admin : mot de passe unique + cookie de session signé.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { config } from "./config.js";

const COOKIE = "yd_admin";
export const SESSION_SECONDS = 7 * 24 * 3600; // 7 jours

export const adminEnabled = (): boolean => config.adminPassword.length > 0;

const secret = (): string =>
  config.sessionSecret || createHash("sha256").update(`yamoo-admin:${config.adminPassword}`).digest("hex");

const sign = (exp: number): string => createHmac("sha256", secret()).update(`admin:${exp}`).digest("hex");

const sha = (s: string): Buffer => createHash("sha256").update(s).digest();

/** Compare le mot de passe saisi au mot de passe configuré (temps constant). */
export function passwordOk(input: string): boolean {
  if (!adminEnabled()) return false;
  return timingSafeEqual(sha(input), sha(config.adminPassword));
}

export function makeSession(nowMs = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + SESSION_SECONDS;
  return `${exp}.${sign(exp)}`;
}

export function verifySession(value: string | undefined, nowMs = Date.now()): boolean {
  if (!adminEnabled() || !value) return false;
  const [expStr, sig] = value.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isInteger(exp) || exp * 1000 < nowMs) return false;
  const good = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return good.length === given.length && timingSafeEqual(good, given);
}

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  for (const part of String(req.headers.cookie ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function sessionCookie(value: string, secure: boolean, maxAge = SESSION_SECONDS): string {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export const clearCookie = (secure: boolean): string => sessionCookie("", secure, 0);

export const isHttps = (req: IncomingMessage): boolean => req.headers["x-forwarded-proto"] === "https";

/** Vrai si la requête vient d'une session admin valide (ou de l'ancien jeton Bearer). */
export function isAdmin(req: IncomingMessage): boolean {
  if (verifySession(readCookie(req, COOKIE))) return true;
  if (config.adminToken) {
    const auth = Buffer.from(String(req.headers.authorization ?? ""));
    const want = Buffer.from(`Bearer ${config.adminToken}`);
    return auth.length === want.length && timingSafeEqual(auth, want);
  }
  return false;
}

/** Protection CSRF supplémentaire : si le navigateur envoie « Origin », il doit être notre propre site. */
export function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(String(origin)).host === req.headers.host;
  } catch {
    return false;
  }
}

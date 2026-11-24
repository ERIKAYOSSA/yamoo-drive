// Connexion des clients (facultative) : cookie de session signé, séparé de celui de l'admin.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { IncomingMessage } from "node:http";
import { readCookie } from "./admin-auth.js";
import { config } from "./config.js";

const COOKIE = "yd_user";
export const USER_SESSION_SECONDS = 30 * 24 * 3600; // 30 jours
let secret = "";

/** Charge (ou crée une fois pour toutes) le secret qui signe les sessions. */
export async function initCustomerAuth(dataDir: string): Promise<void> {
  if (config.sessionSecret) {
    secret = config.sessionSecret;
    return;
  }
  const file = path.join(dataDir, ".session-secret");
  try {
    secret = (await fs.readFile(file, "utf8")).trim();
  } catch {
    /* premier démarrage */
  }
  if (secret.length < 32) {
    secret = randomBytes(32).toString("hex");
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(file, secret, { encoding: "utf8", mode: 0o600 });
    } catch (err) {
      console.warn("[auth] secret de session non sauvegardé (les clients devront se reconnecter après un redémarrage) :", (err as Error).message);
    }
  }
}

const sign = (userId: string, exp: number): string => createHmac("sha256", secret).update(`user:${userId}:${exp}`).digest("hex");

export function makeUserSession(userId: string, nowMs = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + USER_SESSION_SECONDS;
  return `${userId}.${exp}.${sign(userId, exp)}`;
}

/** Identifiant du client connecté (cookie valide), sinon undefined. */
export function userIdFromRequest(req: IncomingMessage, nowMs = Date.now()): string | undefined {
  const raw = readCookie(req, COOKIE);
  if (!raw || !secret) return undefined;
  const [userId, expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!userId || !sig || !Number.isInteger(exp) || exp * 1000 < nowMs) return undefined;
  const good = Buffer.from(sign(userId, exp));
  const given = Buffer.from(sig);
  return good.length === given.length && timingSafeEqual(good, given) ? userId : undefined;
}

export const userCookie = (value: string, secure: boolean, maxAge = USER_SESSION_SECONDS): string =>
  `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;

export const clearUserCookie = (secure: boolean): string => userCookie("", secure, 0);

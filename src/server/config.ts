import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = process.env;

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  root,
  port: num(env.PORT, 3000),
  publicDir: path.join(root, "public"),
  viewsDir: path.join(root, "views"),
  dataDir: env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(root, "data"),
  whatsapp: (env.WHATSAPP_NUMBER ?? "237656543469").replace(/\D/g, ""),
  driverFeePerDay: num(env.DRIVER_FEE_PER_DAY, 15000),
  adminToken: env.ADMIN_TOKEN ?? "",
  /** Mot de passe de la page /admin (laisser vide = page admin désactivée). */
  adminPassword: env.ADMIN_PASSWORD ?? "",
  /** Secret pour signer la session admin (facultatif : sinon dérivé du mot de passe). */
  sessionSecret: env.SESSION_SECRET ?? "",
  /** Adresse publique du site (https://...), utilisée dans les liens des notifications. */
  publicUrl: (env.PUBLIC_URL ?? "").replace(/\/+$/, ""),
  /** Conseiller virtuel (IA). Sans clé, le conseiller répond avec la FAQ uniquement. */
  ai: {
    apiKey: env.ANTHROPIC_API_KEY ?? "",
    model: env.AI_MODEL ?? "claude-haiku-5-5",
    baseUrl: (env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").replace(/\/+$/, ""),
    /** Nombre maximum de réponses IA par jour pour tout le site (maîtrise du coût). */
    dailyLimit: Number(env.AI_DAILY_LIMIT ?? 400) || 400,
    temperature: env.AI_TEMPERATURE ? Number(env.AI_TEMPERATURE) : undefined,
  },
  notify: {
    provider: (env.NOTIFY_PROVIDER ?? "none").toLowerCase(), // none | callmebot | cloud
    phone: (env.NOTIFY_PHONE ?? "").replace(/\D/g, ""), // votre numéro WhatsApp, avec l'indicatif (237...)
    callmebotKey: env.CALLMEBOT_APIKEY ?? "",
    callmebotUrl: env.CALLMEBOT_URL ?? "https://api.callmebot.com",
    cloudToken: env.WA_CLOUD_TOKEN ?? "",
    cloudPhoneId: env.WA_CLOUD_PHONE_ID ?? "",
    cloudTemplate: env.WA_CLOUD_TEMPLATE ?? "",
    cloudLang: env.WA_CLOUD_LANG ?? "fr",
    cloudUrl: env.WA_CLOUD_URL ?? "https://graph.facebook.com/v21.0",
  },
  timezone: env.TIMEZONE ?? "Africa/Douala",
  paymentProvider: env.PAYMENT_PROVIDER ?? "demo",
  /** Texte libre de la caution (facultatif : sinon la règle ci-dessous est appliquée). */
  depositText: env.DEPOSIT_TEXT ?? "",
  /** Caution d'une location SANS chauffeur, en % du montant de la location (aucune caution avec chauffeur). */
  depositPercent: Number(env.DEPOSIT_PERCENT ?? 25) || 25,
  company: {
    name: env.COMPANY_NAME ?? "Yamoo Drive",
    address: env.COMPANY_ADDRESS ?? "Adresse à compléter",
    phone: env.COMPANY_PHONE ?? "+237 656 54 34 69",
    registration: env.COMPANY_REGISTRATION ?? "",
  },
} as const;

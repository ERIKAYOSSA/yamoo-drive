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
  timezone: env.TIMEZONE ?? "Africa/Douala",
  paymentProvider: env.PAYMENT_PROVIDER ?? "demo",
  depositText: env.DEPOSIT_TEXT ?? "À convenir lors de la remise du véhicule",
  company: {
    name: env.COMPANY_NAME ?? "Yamoo Drive",
    address: env.COMPANY_ADDRESS ?? "Adresse à compléter",
    phone: env.COMPANY_PHONE ?? "+237 656 54 34 69",
    registration: env.COMPANY_REGISTRATION ?? "",
  },
} as const;

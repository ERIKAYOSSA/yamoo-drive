import http from "node:http";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "./config.js";
import { drivers, promos, vehicles } from "./data.js";
import { buildContractPdf } from "./contract.js";
import { getProvider } from "./payments.js";
import { ReservationStore, newReservationId } from "./store.js";
import { RESERVATION_ID, validatePaymentRequest, validateReservationInput } from "./validate.js";
import { PAGES, Views } from "./views.js";
import {
  HttpError,
  RateLimiter,
  applySecurityHeaders,
  clientIp,
  readJsonBody,
  send,
  sendJson,
  serveStatic,
} from "./http-utils.js";
import { computeQuote } from "../shared/pricing.js";
import type { Catalog, Reservation } from "../shared/types.js";

const views = new Views(config.viewsDir);
await views.load();
const store = new ReservationStore(path.join(config.dataDir, "reservations.json"));
await store.load();
const provider = getProvider(config.paymentProvider);
const limiter = new RateLimiter();

const catalog: Catalog = {
  vehicles,
  drivers,
  promos,
  config: { whatsapp: config.whatsapp, driverFeePerDay: config.driverFeePerDay, currency: "FCFA" },
};

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const method = req.method ?? "GET";
  const p = url.pathname;
  const ip = clientIp(req);

  if (!limiter.allow(`api:${ip}`, 120, 60_000)) {
    throw new HttpError(429, "Trop de requêtes. Réessayez dans une minute.", undefined, { "Retry-After": "60" });
  }

  if (method === "GET" && p === "/api/catalog") {
    sendJson(req, res, 200, catalog, { "Cache-Control": "public, max-age=60" });
    return;
  }

  if (method === "POST" && p === "/api/reservations") {
    if (!limiter.allow(`resa:${ip}`, 10, 60_000)) {
      throw new HttpError(429, "Trop de réservations en peu de temps. Réessayez dans une minute.", undefined, { "Retry-After": "60" });
    }
    const check = validateReservationInput(await readJsonBody(req), {
      vehicleCount: vehicles.length,
      driverCount: drivers.length,
      now: new Date(),
    });
    if (!check.ok) throw new HttpError(400, "Certaines informations sont à corriger.", check.errors);
    const input = check.value;
    const vehicle = vehicles[input.vehicleId];
    if (!vehicle) throw new HttpError(400, "Véhicule inconnu.");
    // Le prix est TOUJOURS recalculé côté serveur : on ne fait pas confiance au navigateur.
    const quote = computeQuote(vehicle, { mode: input.mode, days: input.days ?? 1, withDriver: input.withDriver }, config.driverFeePerDay);
    const reservation: Reservation = {
      id: newReservationId(),
      createdAt: new Date().toISOString(),
      input,
      quote,
      status: "pending_payment",
    };
    await store.save(reservation);
    sendJson(req, res, 201, { reservation });
    return;
  }

  const m = /^\/api\/reservations\/([A-Z0-9-]+)(\/contract)?$/.exec(p);
  if (method === "GET" && m) {
    const id = m[1] ?? "";
    const reservation = RESERVATION_ID.test(id) ? store.get(id) : undefined;
    if (!reservation) throw new HttpError(404, "Réservation introuvable.");
    if (m[2]) {
      const vehicle = vehicles[reservation.input.vehicleId];
      if (!vehicle) throw new HttpError(500, "Véhicule introuvable.");
      const driver = reservation.input.driverId !== undefined ? drivers[reservation.input.driverId] : undefined;
      const pdf = buildContractPdf(reservation, vehicle, driver);
      const kind = reservation.input.mode === "rent" ? "contrat-location" : "bon-de-commande";
      send(req, res, 200, pdf, "application/pdf", {
        "Content-Disposition": `attachment; filename="${kind}-${reservation.id}.pdf"`,
        "Cache-Control": "no-store",
      });
      return;
    }
    sendJson(req, res, 200, { reservation });
    return;
  }

  if (method === "POST" && p === "/api/payments") {
    if (!limiter.allow(`pay:${ip}`, 10, 60_000)) {
      throw new HttpError(429, "Trop de tentatives de paiement. Réessayez dans une minute.", undefined, { "Retry-After": "60" });
    }
    const check = validatePaymentRequest(await readJsonBody(req));
    if (!check.ok) throw new HttpError(400, "Certaines informations sont à corriger.", check.errors);
    const reservation = store.get(check.value.reservationId);
    if (!reservation) throw new HttpError(404, "Réservation introuvable.");
    if (reservation.payment) {
      sendJson(req, res, 200, { reservation }); // idempotent : déjà traité
      return;
    }
    if (reservation.input.mode === "rent" && !reservation.input.startDate) {
      throw new HttpError(409, "Complétez la date de début de location avant de payer.");
    }
    const payment = await provider.charge({
      reservation,
      method: check.value.method,
      ...(check.value.phone ? { phone: check.value.phone } : {}),
    });
    reservation.payment = payment;
    reservation.status = payment.status === "succeeded_demo" ? "paid_demo" : "pay_at_agency";
    await store.save(reservation);
    sendJson(req, res, 200, { reservation });
    return;
  }

  if (method === "GET" && p === "/api/admin/reservations") {
    const auth = String(req.headers.authorization ?? "");
    if (!config.adminToken || !safeEqual(auth, `Bearer ${config.adminToken}`)) {
      throw new HttpError(401, "Accès refusé.");
    }
    sendJson(req, res, 200, { reservations: store.list() });
    return;
  }

  throw new HttpError(404, "Route introuvable.");
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const method = req.method ?? "GET";
  applySecurityHeaders(req, res);

  if (url.pathname === "/health") {
    sendJson(req, res, 200, { ok: true });
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }
  if (method !== "GET" && method !== "HEAD") {
    throw new HttpError(405, "Méthode non autorisée.", undefined, { Allow: "GET, HEAD" });
  }

  if (await serveStatic(req, res, config.publicDir, url.pathname)) return;

  const clean = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "").replace(/\.html$/, "") : url.pathname;
  const page = PAGES[clean === "/index" ? "/" : clean];
  if (page) {
    send(req, res, 200, views.render(page), "text/html; charset=utf-8", { "Cache-Control": "no-cache" });
    return;
  }
  send(req, res, 404, views.renderNotFound(), "text/html; charset=utf-8", { "Cache-Control": "no-cache" });
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  res.on("finish", () => {
    if (req.url !== "/health") {
      console.log(JSON.stringify({ t: new Date().toISOString(), method: req.method, path: (req.url ?? "").split("?")[0], status: res.statusCode, ms: Date.now() - started }));
    }
  });
  handle(req, res).catch((err: unknown) => {
    if (res.headersSent) {
      res.end();
      return;
    }
    if (err instanceof HttpError) {
      const body = { error: err.message, ...(err.details ? { details: err.details } : {}) };
      if (req.url?.startsWith("/api/")) sendJson(req, res, err.status, body, err.headers);
      else send(req, res, err.status, err.message, "text/plain; charset=utf-8", err.headers);
      return;
    }
    console.error("[erreur]", err);
    if (req.url?.startsWith("/api/")) sendJson(req, res, 500, { error: "Erreur interne du serveur." });
    else send(req, res, 500, "Erreur interne du serveur.", "text/plain; charset=utf-8");
  });
});

server.listen(config.port, () => console.log(`Yamoo Drive : http://localhost:${config.port} (paiement : ${provider.name})`));

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    console.log(`${sig} reçu, arrêt...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

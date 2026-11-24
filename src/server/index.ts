import http from "node:http";
import path from "node:path";
import { promises as fs } from "node:fs";
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
import type { Catalog, Fulfillment, Reservation } from "../shared/types.js";
import { adminEnabled, clearCookie, isAdmin, isHttps, makeSession, passwordOk, sameOrigin, sessionCookie } from "./admin-auth.js";
import { createNotifier, newAccountText, newReservationText, paymentText } from "./notify.js";
import { clearUserCookie, initCustomerAuth, makeUserSession, userCookie, userIdFromRequest } from "./customer-auth.js";
import { UserStore, buildAdminUsers, canonPhone, checkEmail, checkName, checkPassword, fakeVerify, hashPassword, newUserId, publicUser, tempPassword, usersCsv, validateRegistration, verifyPassword } from "./users.js";
import { askAdvisor, faqVars, validateAdvisorInput, type AdvisorContext } from "./advisor.js";
import { publicFaq } from "./faq.js";
import { MONTH_RE, buildMonthReport, buildSeries, currentMonth, reportCsv, reportPdf, seriesCsv } from "./report.js";

const views = new Views(config.viewsDir);
await views.load();
const store = new ReservationStore(path.join(config.dataDir, "reservations.json"));
await store.load();
const users = new UserStore(path.join(config.dataDir, "users.json"));
await users.load();
await initCustomerAuth(config.dataDir);
const provider = getProvider(config.paymentProvider);
const limiter = new RateLimiter();
const adminHtml = await fs.readFile(path.join(config.viewsDir, "admin.html"), "utf8");
const notifier = createNotifier();

/** Envoie une notification WhatsApp sans jamais ralentir ni casser la réservation du client. */
function notifyAdmin(text: string): void {
  if (!notifier.configured) return;
  notifier.send(text).catch((err: unknown) => console.warn("[notify] échec :", (err as Error).message));
}

const catalog: Catalog = {
  vehicles,
  drivers,
  promos,
  config: { whatsapp: config.whatsapp, driverFeePerDay: config.driverFeePerDay, currency: "FCFA" },
};

const advisorContext = (): AdvisorContext => ({
  vehicles,
  drivers,
  promos,
  whatsapp: config.whatsapp,
  driverFee: config.driverFeePerDay,
  tz: config.timezone,
});

/** Réservation vue par son propriétaire : on retire les champs internes (note de l'admin). */
const ownerView = (r: Reservation): Reservation => {
  const { note: _note, ...rest } = r;
  return rest;
};

async function handleAccount(req: IncomingMessage, res: ServerResponse, url: URL, method: string, ip: string): Promise<void> {
  const p = url.pathname;
  const secure = isHttps(req);
  const guardPost = (): void => {
    if (!sameOrigin(req)) throw new HttpError(403, "Origine refusée.");
  };
  const tooMany = (): never => {
    throw new HttpError(429, "Trop de tentatives. Réessayez dans quelques minutes.", undefined, { "Retry-After": "600" });
  };

  if (method === "POST" && p === "/api/auth/register") {
    guardPost();
    if (!limiter.allow(`register:${ip}`, 6, 3_600_000)) tooMany();
    const v = validateRegistration(await readJsonBody(req, 5_000));
    if (!v.ok) throw new HttpError(400, "Données invalides.", v.errors);
    if (users.getByPhone(v.value.phone)) throw new HttpError(409, "Un compte existe déjà avec ce numéro. Connectez-vous.");
    const user = {
      id: newUserId(),
      name: v.value.name,
      phone: v.value.phone,
      ...(v.value.email ? { email: v.value.email } : {}),
      passwordHash: await hashPassword(v.value.password),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    await users.save(user);
    notifyAdmin(newAccountText(user));
    sendJson(req, res, 201, { user: publicUser(user) }, { "Set-Cookie": userCookie(makeUserSession(user.id), secure) });
    return;
  }

  if (method === "POST" && p === "/api/auth/login") {
    guardPost();
    const body = (await readJsonBody(req, 2_000)) as { phone?: unknown; password?: unknown } | null;
    const phone = typeof body?.phone === "string" ? canonPhone(body.phone) : "";
    const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
    if (!limiter.allow(`auth:${ip}`, 20, 600_000) || !limiter.allow(`authp:${phone}`, 8, 600_000)) tooMany();
    const user = phone ? users.getByPhone(phone) : undefined;
    const ok = user ? await verifyPassword(password, user.passwordHash) : (await fakeVerify(password), false);
    if (!user || !ok) throw new HttpError(401, "Numéro ou mot de passe incorrect.");
    user.lastLoginAt = new Date().toISOString();
    await users.save(user);
    sendJson(req, res, 200, { user: publicUser(user) }, { "Set-Cookie": userCookie(makeUserSession(user.id), secure) });
    return;
  }

  if (method === "POST" && p === "/api/auth/logout") {
    sendJson(req, res, 200, { ok: true }, { "Set-Cookie": clearUserCookie(secure) });
    return;
  }

  // Tout ce qui suit demande d'être connecté.
  const uid = userIdFromRequest(req);
  const me = uid ? users.get(uid) : undefined;

  if (method === "GET" && p === "/api/me") {
    sendJson(req, res, 200, me ? { user: publicUser(me), reservations: store.list().filter((r) => r.userId === me.id).map(ownerView) } : { user: null, reservations: [] });
    return;
  }
  if (!me) throw new HttpError(401, "Connectez-vous pour continuer.");

  if (method === "POST" && p === "/api/me") {
    guardPost();
    const body = (await readJsonBody(req, 3_000)) as { name?: unknown; email?: unknown } | null;
    const errors: string[] = [];
    const name = checkName(body?.name, errors);
    const email = checkEmail(body?.email, errors);
    if (errors.length) throw new HttpError(400, "Données invalides.", errors);
    me.name = name;
    if (email) me.email = email;
    else delete me.email;
    await users.save(me);
    sendJson(req, res, 200, { user: publicUser(me) });
    return;
  }

  if (method === "POST" && p === "/api/me/password") {
    guardPost();
    if (!limiter.allow(`pw:${me.id}`, 8, 600_000)) tooMany();
    const body = (await readJsonBody(req, 3_000)) as { current?: unknown; next?: unknown } | null;
    if (!(await verifyPassword(typeof body?.current === "string" ? body.current : "", me.passwordHash))) throw new HttpError(400, "Le mot de passe actuel est incorrect.");
    const errors: string[] = [];
    const next = checkPassword(body?.next, errors, "Le nouveau mot de passe");
    if (errors.length) throw new HttpError(400, "Données invalides.", errors);
    me.passwordHash = await hashPassword(next);
    await users.save(me);
    sendJson(req, res, 200, { ok: true });
    return;
  }

  if (method === "POST" && p === "/api/me/delete") {
    guardPost();
    if (!limiter.allow(`pw:${me.id}`, 8, 600_000)) tooMany();
    const body = (await readJsonBody(req, 2_000)) as { password?: unknown } | null;
    if (!(await verifyPassword(typeof body?.password === "string" ? body.password : "", me.passwordHash))) throw new HttpError(400, "Le mot de passe est incorrect.");
    for (const r of store.list()) {
      if (r.userId === me.id) {
        delete r.userId;
        await store.save(r);
      }
    }
    await users.delete(me.id);
    sendJson(req, res, 200, { ok: true }, { "Set-Cookie": clearUserCookie(secure) });
    return;
  }

  throw new HttpError(404, "Route introuvable.");
}

const FULFILLMENTS = new Set<string>(["new", "confirmed", "delivered", "completed", "cancelled"]);

const monthParam = (url: URL): string => {
  const m = url.searchParams.get("month") ?? currentMonth(config.timezone);
  if (!MONTH_RE.test(m)) throw new HttpError(400, "Mois invalide (format AAAA-MM).");
  return m;
};

const download = (req: IncomingMessage, res: ServerResponse, body: Buffer | string, type: string, filename: string): void =>
  send(req, res, 200, body, type, { "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" });

async function handleAdmin(req: IncomingMessage, res: ServerResponse, url: URL, method: string, ip: string): Promise<void> {
  const p = url.pathname;

  if (method === "POST" && p === "/api/admin/login") {
    if (!sameOrigin(req)) throw new HttpError(403, "Origine refusée.");
    if (!adminEnabled()) throw new HttpError(503, "L’espace admin n’est pas activé. Ajoutez ADMIN_PASSWORD dans les variables d’environnement.");
    if (!limiter.allow(`login:${ip}`, 6, 600_000)) {
      throw new HttpError(429, "Trop de tentatives. Réessayez dans quelques minutes.", undefined, { "Retry-After": "600" });
    }
    const body = (await readJsonBody(req, 2_000)) as { password?: unknown } | null;
    if (!passwordOk(typeof body?.password === "string" ? body.password : "")) throw new HttpError(401, "Mot de passe incorrect.");
    sendJson(req, res, 200, { ok: true }, { "Set-Cookie": sessionCookie(makeSession(), isHttps(req)) });
    return;
  }
  if (method === "POST" && p === "/api/admin/logout") {
    sendJson(req, res, 200, { ok: true }, { "Set-Cookie": clearCookie(isHttps(req)) });
    return;
  }

  if (!isAdmin(req)) throw new HttpError(401, "Accès refusé.");

  if (method === "GET" && p === "/api/admin/session") {
    sendJson(req, res, 200, {
      ok: true,
      timezone: config.timezone,
      payments: provider.name,
      publicUrl: config.publicUrl,
      notify: { provider: notifier.provider, configured: notifier.configured, target: notifier.target },
    });
    return;
  }

  if (method === "GET" && p === "/api/admin/reservations") {
    sendJson(req, res, 200, { reservations: store.list() });
    return;
  }

  const one = /^\/api\/admin\/reservations\/([A-Z0-9-]+)$/.exec(p);
  if (method === "POST" && one) {
    if (!sameOrigin(req)) throw new HttpError(403, "Origine refusée.");
    const reservation = store.get(one[1] ?? "");
    if (!reservation) throw new HttpError(404, "Réservation introuvable.");
    const body = (await readJsonBody(req, 5_000)) as { fulfillment?: unknown; note?: unknown } | null;
    if (body?.fulfillment !== undefined) {
      if (typeof body.fulfillment !== "string" || !FULFILLMENTS.has(body.fulfillment)) throw new HttpError(400, "Statut invalide.");
      reservation.fulfillment = body.fulfillment as Fulfillment;
    }
    if (body?.note !== undefined) {
      if (typeof body.note !== "string" || body.note.length > 1000) throw new HttpError(400, "La note doit faire 1000 caractères au maximum.");
      // eslint-disable-next-line no-control-regex
      const note = body.note.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
      if (note) reservation.note = note;
      else delete reservation.note;
    }
    reservation.updatedAt = new Date().toISOString();
    await store.save(reservation);
    sendJson(req, res, 200, { reservation });
    return;
  }

  if (method === "GET" && p === "/api/admin/report") {
    const month = monthParam(url);
    const all = store.list();
    sendJson(req, res, 200, {
      report: buildMonthReport(all, vehicles, drivers, month, config.timezone),
      series: buildSeries(all, month, 12, config.timezone),
    });
    return;
  }
  if (method === "GET" && p === "/api/admin/report.pdf") {
    const month = monthParam(url);
    const all = store.list();
    const pdf = reportPdf(
      buildMonthReport(all, vehicles, drivers, month, config.timezone),
      buildSeries(all, month, 12, config.timezone),
      { name: config.company.name, phone: config.company.phone },
      config.timezone,
    );
    download(req, res, pdf, "application/pdf", `rapport-${month}.pdf`);
    return;
  }
  if (method === "GET" && p === "/api/admin/report.csv") {
    const month = monthParam(url);
    download(req, res, reportCsv(buildMonthReport(store.list(), vehicles, drivers, month, config.timezone)), "text/csv; charset=utf-8", `reservations-${month}.csv`);
    return;
  }
  if (method === "GET" && p === "/api/admin/stats.csv") {
    const month = monthParam(url);
    download(req, res, seriesCsv(buildSeries(store.list(), month, 12, config.timezone)), "text/csv; charset=utf-8", `statistiques-12-mois-${month}.csv`);
    return;
  }

  if (method === "GET" && p === "/api/admin/users") {
    sendJson(req, res, 200, { users: buildAdminUsers(users.list(), store.list()) });
    return;
  }
  if (method === "GET" && p === "/api/admin/users.csv") {
    download(req, res, usersCsv(buildAdminUsers(users.list(), store.list()), config.timezone), "text/csv; charset=utf-8", "clients.csv");
    return;
  }
  const oneUser = /^\/api\/admin\/users\/(U-[A-Z0-9]+)\/(reset-password|delete)$/.exec(p);
  if (method === "POST" && oneUser) {
    if (!sameOrigin(req)) throw new HttpError(403, "Origine refusée.");
    const target = users.get(oneUser[1] ?? "");
    if (!target) throw new HttpError(404, "Compte introuvable.");
    if (oneUser[2] === "reset-password") {
      // Mot de passe provisoire à transmettre au client (il peut ensuite le changer dans « Mon compte »).
      const password = tempPassword();
      target.passwordHash = await hashPassword(password);
      await users.save(target);
      sendJson(req, res, 200, { password });
      return;
    }
    for (const r of store.list()) {
      if (r.userId === target.id) {
        delete r.userId;
        await store.save(r);
      }
    }
    await users.delete(target.id);
    sendJson(req, res, 200, { ok: true });
    return;
  }

  if (method === "POST" && p === "/api/admin/notify-test") {
    if (!sameOrigin(req)) throw new HttpError(403, "Origine refusée.");
    if (!notifier.configured) throw new HttpError(400, "Les notifications WhatsApp ne sont pas configurées.");
    try {
      await notifier.send("Test Yamoo Drive : les notifications fonctionnent.");
    } catch (err) {
      throw new HttpError(502, (err as Error).message);
    }
    sendJson(req, res, 200, { ok: true });
    return;
  }

  throw new HttpError(404, "Route introuvable.");
}

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
    // Compte facultatif : si le client est connecté, la réservation est rattachée à son compte.
    const uid = userIdFromRequest(req);
    if (uid && users.get(uid)) reservation.userId = uid;
    await store.save(reservation);
    notifyAdmin(newReservationText(reservation, vehicle));
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
    notifyAdmin(paymentText(reservation, vehicles[reservation.input.vehicleId]));
    sendJson(req, res, 200, { reservation });
    return;
  }

  if (method === "GET" && p === "/api/faq") {
    sendJson(req, res, 200, publicFaq(faqVars(advisorContext())), { "Cache-Control": "public, max-age=300" });
    return;
  }

  if (method === "POST" && p === "/api/advisor") {
    if (!sameOrigin(req)) throw new HttpError(403, "Origine refusée.");
    if (!limiter.allow(`adv:${ip}`, 15, 600_000) || !limiter.allow(`advd:${ip}`, 150, 86_400_000)) {
      throw new HttpError(429, "Trop de messages. Réessayez dans quelques minutes ou écrivez-nous sur WhatsApp.", undefined, { "Retry-After": "300" });
    }
    const input = validateAdvisorInput(await readJsonBody(req, 8_000));
    if (!input.ok) throw new HttpError(400, input.error);
    sendJson(req, res, 200, await askAdvisor(input.value, advisorContext()), { "Cache-Control": "no-store" });
    return;
  }

  if (p.startsWith("/api/admin/")) {
    await handleAdmin(req, res, url, method, ip);
    return;
  }
  if (p.startsWith("/api/auth/") || p === "/api/me" || p.startsWith("/api/me/")) {
    await handleAccount(req, res, url, method, ip);
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

  if (url.pathname === "/admin" || url.pathname === "/admin/") {
    send(req, res, 200, adminHtml, "text/html; charset=utf-8", { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    return;
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

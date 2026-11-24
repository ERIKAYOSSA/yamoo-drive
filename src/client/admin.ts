// Page /admin : tableau de bord, réservations, rapports mensuels, réglages.
// Écrite en JavaScript « simple » (aucune bibliothèque) ; tout texte venant des clients est échappé avant affichage.
import type { Catalog, Fulfillment, Reservation } from "../shared/types.js";

// ---------------------------------------------------------------------------------------------
// Types des réponses du serveur (voir src/server/report.ts)
// ---------------------------------------------------------------------------------------------
interface Totals { count: number; rentCount: number; buyCount: number; rentDays: number; revenue: number; paid: number; toCollect: number; cancelled: number; avgBasket: number; withDriver: number; gifts: number }
interface ReportRow { id: string; date: string; time: string; name: string; phone: string; vehicle: string; type: string; days: number; amount: number; payment: string; status: string; place: string }
interface MonthReport {
  month: string; label: string; generatedAt: string; totals: Totals;
  previous: { label: string; count: number; revenue: number; rentDays: number };
  byDay: { day: number; count: number; revenue: number }[];
  byVehicle: { id: number; name: string; count: number; days: number; revenue: number }[];
  byCity: { label: string; count: number; revenue: number }[];
  byPlace: { label: string; count: number; revenue: number }[];
  byPayment: { label: string; count: number; amount: number }[];
  byStatus: { key: Fulfillment; label: string; count: number }[];
  topCustomers: { name: string; phone: string; count: number; revenue: number }[];
  rows: ReportRow[];
}
interface MonthPoint { month: string; label: string; count: number; rentals: number; sales: number; rentDays: number; revenue: number }
interface Session { timezone: string; payments: string; publicUrl: string; notify: { provider: string; configured: boolean; target: string } }
type Tab = "accueil" | "reservations" | "clients" | "rapports" | "reglages";
type Tier = "new" | "regular" | "loyal" | "vip";
interface AdminUser {
  id: string; name: string; phone: string; email?: string; createdAt: string; lastLoginAt?: string;
  reservations: number; rentals: number; purchases: number; rentDays: number; spent: number;
  lastReservationAt?: string; tier: Tier; reservationIds: string[];
}
type Metric = "revenue" | "count" | "rentDays";

// ---------------------------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------------------------
const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const num = (n: number): string => Math.round(n).toLocaleString("fr-FR");
const money = (n: number): string => `${num(n)} FCFA`;
const compact = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} M` : n >= 10_000 ? `${Math.round(n / 1000)} k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")} k` : String(Math.round(n));

const ICONS: Record<string, string> = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  list: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1"/><path d="M9 11h6M9 15h6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.4c2 .7 3 2.6 3 5.6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v3h16v-3"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
};
const icon = (name: string): string => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
const paintIcons = (root: ParentNode = document): void => root.querySelectorAll<HTMLElement>("[data-i]").forEach((el) => { el.innerHTML = icon(el.dataset.i ?? ""); });

const FUL: Record<Fulfillment, { label: string; cls: string }> = {
  new: { label: "Nouvelle", cls: "new" },
  confirmed: { label: "Confirmée", cls: "confirmed" },
  delivered: { label: "Remise effectuée", cls: "delivered" },
  completed: { label: "Terminée", cls: "completed" },
  cancelled: { label: "Annulée", cls: "cancelled" },
};
const STEPS: { key: Fulfillment; label: string }[] = [
  { key: "new", label: "Nouvelle" },
  { key: "confirmed", label: "Confirmée" },
  { key: "delivered", label: "Remise faite" },
  { key: "completed", label: "Terminée" },
];
const TIERS: Record<Tier, { label: string; cls: string }> = {
  new: { label: "Nouveau", cls: "t-new" },
  regular: { label: "Régulier", cls: "info" },
  loyal: { label: "Fidèle", cls: "ok" },
  vip: { label: "VIP", cls: "t-vip" },
};
const METHOD: Record<string, string> = { card: "Carte bancaire", orange_money: "Orange Money", mtn_momo: "MTN Mobile Money", agency: "À l'agence" };
const ful = (r: Reservation): Fulfillment => r.fulfillment ?? "new";

// ---------------------------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------------------------
const S = {
  tab: "accueil" as Tab,
  session: null as Session | null,
  catalog: null as Catalog | null,
  reservations: [] as Reservation[],
  known: new Set<string>(),
  users: [] as AdminUser[],
  knownUsers: new Set<string>(),
  uFilter: "all" as "all" | Tier,
  uq: "",
  filter: "all" as "all" | Fulfillment,
  q: "",
  month: "",
  metric: "revenue" as Metric,
  dash: null as { report: MonthReport; series: MonthPoint[] } | null,
  rep: null as { report: MonthReport; series: MonthPoint[] } | null,
  poll: 0,
  audio: null as AudioContext | null,
};

const tz = (): string => S.session?.timezone ?? "Africa/Douala";
const vehicleName = (r: Reservation): string => S.catalog?.vehicles[r.input.vehicleId]?.n ?? `Véhicule n°${r.input.vehicleId}`;
const driverName = (r: Reservation): string => (r.input.driverId !== undefined ? (S.catalog?.drivers[r.input.driverId]?.n ?? "") : "");
const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
const fmtWhen = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat("fr-FR", { timeZone: tz(), day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
};
const fmtDay = (iso?: string): string => (iso ? iso.split("-").reverse().join("/") : "À convenir");
const ago = (iso: string): string => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 1440) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
};
const curMonth = (): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz(), year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
  } catch {
    return new Date().toISOString().slice(0, 7);
  }
};
const addMonths = (m: string, n: number): string => {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthName = (m: string): string => {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, 1)));
};
const delta = (cur: number, prev: number): { text: string; cls: string } => {
  if (prev === 0) return { text: cur > 0 ? "Nouveau ce mois-ci" : "Pas encore de données", cls: "" };
  const p = Math.round(((cur - prev) / prev) * 100);
  return { text: `${p > 0 ? "+" : ""}${p} % vs mois dernier`, cls: p > 0 ? "up" : p < 0 ? "down" : "" };
};

const waPhone = (p: string): string => {
  let d = p.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = `237${d}`;
  return d;
};
function waMessage(r: Reservation): string {
  const n = r.input.customer.name.split(" ")[0] ?? "";
  const v = vehicleName(r);
  switch (ful(r)) {
    case "confirmed":
      return `Bonjour ${n}, votre réservation ${r.id} (${v}) est confirmée.${r.input.startDate ? ` Début : ${fmtDay(r.input.startDate)}${r.input.startTime ? ` à ${r.input.startTime.replace(":", "h")}` : ""}.` : ""} Lieu : ${r.input.pickupPlace}. À très bientôt !`;
    case "delivered":
      return `Bonjour ${n}, merci d'avoir choisi Yamoo Drive. Bonne route ! Pour toute question sur ${r.id}, écrivez-nous ici.`;
    case "completed":
      return `Bonjour ${n}, merci pour votre confiance. N'hésitez pas à parrainer un ami : il profitera d'une réduction.`;
    case "cancelled":
      return `Bonjour ${n}, votre réservation ${r.id} a été annulée. Nous restons disponibles si besoin.`;
    default:
      return `Bonjour ${n}, nous avons bien reçu votre demande ${r.id} (${v}). Nous revenons vers vous très vite pour la confirmer.`;
  }
}
const waLink = (r: Reservation): string => `https://wa.me/${waPhone(r.input.customer.phone)}?text=${encodeURIComponent(waMessage(r))}`;

function payInfo(r: Reservation): { t: string; c: string } {
  if (r.status === "paid_demo") return { t: "Payée", c: "ok" };
  if (r.status === "pay_at_agency") return { t: "À payer à l'agence", c: "info" };
  return { t: "En attente de paiement", c: "wait" };
}

// ---------------------------------------------------------------------------------------------
// Réseau
// ---------------------------------------------------------------------------------------------
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401 && path !== "/api/admin/login") {
    showLogin();
    throw new Error("Session expirée.");
  }
  if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue.");
  return data as T;
}

function toast(msg: string, sub = "", bad = false): void {
  const el = document.createElement("div");
  el.className = `toast${bad ? " bad" : ""}`;
  el.innerHTML = `${esc(msg)}${sub ? `<small>${esc(sub)}</small>` : ""}`;
  $("toasts").append(el);
  setTimeout(() => el.remove(), 5200);
}

function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    S.audio = S.audio ?? new Ctx();
    const a = S.audio;
    const t = a.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(a.destination);
      g.gain.setValueAtTime(0.0001, t + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.22);
      o.start(t + i * 0.16);
      o.stop(t + i * 0.16 + 0.25);
    });
  } catch {
    /* son indisponible : ce n'est pas grave */
  }
}

// ---------------------------------------------------------------------------------------------
// Graphiques (SVG, sans bibliothèque)
// ---------------------------------------------------------------------------------------------
function bars(values: number[], labels: string[], fmt: (n: number) => string, highlightLast = false): string {
  const W = 640;
  const H = 190;
  const top = 22;
  const base = H - 26;
  const max = Math.max(...values, 1);
  const bw = W / Math.max(values.length, 1);
  const few = values.length <= 14;
  const every = values.length > 20 ? 5 : 1;
  let out = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graphique">`;
  out += `<line class="axis" x1="0" x2="${W}" y1="${base}" y2="${base}"/>`;
  values.forEach((v, i) => {
    const h = Math.max(v > 0 ? 3 : 0, (v / max) * (base - top));
    const x = i * bw + bw * 0.16;
    const w = bw * 0.68;
    const last = highlightLast && i === values.length - 1;
    out += `<rect class="bar${last ? " last" : ""}" x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="5"><title>${esc(labels[i])} : ${esc(fmt(v))}</title></rect>`;
    if (few && v > 0) out += `<text class="val" x="${(i * bw + bw / 2).toFixed(1)}" y="${(base - h - 6).toFixed(1)}" text-anchor="middle">${esc(compact(v))}</text>`;
    if (i % every === 0) out += `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(labels[i])}</text>`;
  });
  return `${out}</svg>`;
}

function hbars(rows: { label: string; value: number; right: string }[]): string {
  if (!rows.length) return `<p class="muted">Aucune donnée pour cette période.</p>`;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `<div class="hbar">${rows
    .map((r) => `<div class="hrow"><div class="hrow-top"><span>${esc(r.label)}</span><span>${esc(r.right)}</span></div><i><b style="width:${Math.max(3, (r.value / max) * 100).toFixed(0)}%"></b></i></div>`)
    .join("")}</div>`;
}

const kpi = (label: string, value: string, hint = "", cls = "", href = ""): string => {
  const inner = `<span class="kl">${esc(label)}</span><b class="kv">${value}</b>${hint ? `<span class="kd ${cls.replace("alert", "")}">${esc(hint)}</span>` : ""}`;
  return href ? `<a class="kpi ${cls.includes("alert") ? "alert" : ""}" href="${href}">${inner}</a>` : `<div class="kpi">${inner}</div>`;
};

// ---------------------------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------------------------
const TABS: { id: Tab; label: string; i: string }[] = [
  { id: "accueil", label: "Accueil", i: "home" },
  { id: "reservations", label: "Réservations", i: "list" },
  { id: "clients", label: "Clients", i: "users" },
  { id: "rapports", label: "Rapports", i: "chart" },
  { id: "reglages", label: "Réglages", i: "gear" },
];
const newCount = (): number => S.reservations.filter((r) => ful(r) === "new").length;

function paintNav(): void {
  const n = newCount();
  const link = (t: { id: Tab; label: string; i: string }): string =>
    `<a href="#/${t.id}" class="${S.tab === t.id ? "on" : ""}"><span data-i="${t.i}"></span><span>${t.label}</span>${t.id === "reservations" && n ? `<span class="badge">${n}</span>` : ""}</a>`;
  $("sideNav").innerHTML = TABS.map(link).join("");
  $("tabBar").innerHTML = TABS.map(link).join("");
  $("pageTitle").textContent = TABS.find((t) => t.id === S.tab)?.label ?? "";
  paintIcons($("sideNav"));
  paintIcons($("tabBar"));
  document.title = `${n ? `(${n}) ` : ""}Yamoo Admin`;
}

function parseHash(): { tab: Tab; id?: string } {
  const [, tab, id] = location.hash.split("/");
  const t = (TABS.find((x) => x.id === tab)?.id ?? "accueil") as Tab;
  return { tab: t, id: id ? decodeURIComponent(id) : undefined };
}

async function route(): Promise<void> {
  if (($("app") as HTMLElement).hidden) return;
  const { tab, id } = parseHash();
  S.tab = tab;
  paintNav();
  await renderTab();
  if (id) {
    if (S.tab === "clients") openUserDrawer(id);
    else openDrawer(id);
  } else closeDrawer();
}

async function renderTab(): Promise<void> {
  const view = $("view");
  try {
    if (S.tab === "accueil") await renderHome(view);
    else if (S.tab === "reservations") renderReservations(view);
    else if (S.tab === "clients") await renderClients(view);
    else if (S.tab === "rapports") await renderReports(view);
    else renderSettings(view);
  } catch (e) {
    if ((e as Error).message !== "Session expirée.") view.innerHTML = `<div class="empty"><b>Impossible de charger cette page</b>${esc((e as Error).message)}</div>`;
  }
  paintIcons(view);
}

// ---------------------------------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------------------------------
async function renderHome(view: HTMLElement): Promise<void> {
  if (!S.dash) view.innerHTML = `<p class="muted">Chargement…</p>`;
  const dash = await api<{ report: MonthReport; series: MonthPoint[] }>(`/api/admin/report?month=${curMonth()}`);
  S.dash = dash;
  const { report: rp, series } = dash;
  const t = rp.totals;
  const toDo = S.reservations.filter((r) => ful(r) === "new");
  await loadUsers(false);
  const newUsers = S.users.filter((u) => u.createdAt.slice(0, 7) === curMonth()).length;
  const d1 = delta(t.revenue, rp.previous.revenue);
  const d2 = delta(t.count, rp.previous.count);
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: tz(), weekday: "long", day: "numeric", month: "long" }).format(new Date());

  view.innerHTML = `
  <div class="page-head"><div><h2>Bonjour</h2><p class="cap1">${esc(day)}</p></div>
    <a class="btn primary" href="#/rapports">Voir le rapport du mois</a></div>

  <div class="kpis">
    ${kpi("Chiffre d'affaires", `${num(t.revenue)}<small>FCFA</small>`, d1.text, d1.cls)}
    ${kpi("Réservations", num(t.count), d2.text, d2.cls)}
    ${kpi("Jours de location", num(t.rentDays), `${num(t.rentCount)} location(s) · ${num(t.buyCount)} vente(s)`)}
    ${kpi("À traiter", String(toDo.length), toDo.length ? "Nouvelles réservations" : "Tout est à jour", toDo.length ? "alert" : "", "#/reservations")}
    ${kpi("Clients inscrits", num(S.users.length), newUsers ? `+${newUsers} ce mois-ci` : "Comptes facultatifs", newUsers ? "up" : "", "#/clients")}
  </div>

  <div class="grid2">
    <section class="card" id="newBox">
      <div class="card-h"><h3>À traiter</h3><a class="btn sm" href="#/reservations">Tout voir</a></div>
      ${toDo.length ? `<div class="list">${toDo.slice(0, 5).map(resCard).join("")}</div>` : `<div class="empty"><b>Rien à traiter</b>Les nouvelles réservations apparaîtront ici.</div>`}
    </section>

    <section class="card">
      <div class="card-h"><h3>Véhicules les plus demandés</h3></div>
      ${hbars(rp.byVehicle.slice(0, 5).map((v) => ({ label: v.name, value: v.revenue, right: `${v.count} résa · ${compact(v.revenue)}` })))}
    </section>
  </div>

  <section class="card" style="margin-top:18px">
    <div class="card-h"><h3>12 derniers mois</h3>
      <div class="seg" role="group" aria-label="Indicateur">
        ${(["revenue", "count", "rentDays"] as Metric[]).map((m) => `<button type="button" class="${S.metric === m ? "on" : ""}" data-act="metric" data-m="${m}">${m === "revenue" ? "Chiffre d'affaires" : m === "count" ? "Réservations" : "Jours loués"}</button>`).join("")}
      </div>
    </div>
    <div id="homeChart">${homeChart(series)}</div>
  </section>`;
}

function homeChart(series: MonthPoint[]): string {
  const fmt = S.metric === "revenue" ? money : num;
  return bars(series.map((s) => s[S.metric]), series.map((s) => s.label.replace(/\s\d{4}$/, "")), fmt, true);
}

// ---------------------------------------------------------------------------------------------
// Réservations
// ---------------------------------------------------------------------------------------------
function resCard(r: Reservation): string {
  const f = FUL[ful(r)];
  const p = payInfo(r);
  const i = r.input;
  const what = `${esc(vehicleName(r))} · ${i.mode === "rent" ? `location ${r.quote.days} j` : "achat"}`;
  return `<div class="res" role="button" tabindex="0" data-act="open-res" data-id="${esc(r.id)}">
    <div class="av">${esc(initials(i.customer.name))}</div>
    <div class="res-main">
      <div class="res-top"><span class="res-name">${esc(i.customer.name)}</span><span class="pill ${f.cls}">${f.label}</span></div>
      <div class="res-sub">${what}</div>
      <div class="res-meta"><span>${esc(r.id)}</span><span>·</span><span>${esc(ago(r.createdAt))}</span><span>·</span><span class="pill ${p.c}">${p.t}</span>${i.mapLink ? '<span>·</span><span class="pill info">Position GPS</span>' : ""}</div>
      ${ful(r) === "new" ? `<div class="quick"><button class="btn sm primary" type="button" data-act="quick-confirm" data-id="${esc(r.id)}">Confirmer</button><a class="btn sm wa" href="${esc(waLink(r))}" target="_blank" rel="noopener" data-act="stop">WhatsApp</a></div>` : ""}
    </div>
    <div class="res-amt"><b>${money(r.quote.total)}</b><span>${esc(i.pickupPlace)}</span></div>
  </div>`;
}

function matches(r: Reservation, q: string): boolean {
  if (!q) return true;
  const hay = `${r.id} ${r.input.customer.name} ${r.input.customer.phone} ${r.input.customer.phone.replace(/\D/g, "")} ${vehicleName(r)} ${r.input.pickupPlace}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

function renderReservations(view: HTMLElement): void {
  view.innerHTML = `
  <div class="page-head"><div><h2>Réservations</h2><p id="resCount"></p></div></div>
  <div class="toolbar">
    <div class="search"><span data-i="search"></span><input id="q" type="search" placeholder="Rechercher un nom, un numéro, une référence…" value="${esc(S.q)}" autocomplete="off"></div>
    <div class="chips" id="chips"></div>
  </div>
  <div class="list" id="resList"></div>`;
  paintRes();
}

function paintRes(): void {
  const chips = document.getElementById("chips");
  const list = document.getElementById("resList");
  if (!chips || !list) return;
  const count = (f: "all" | Fulfillment): number => S.reservations.filter((r) => f === "all" || ful(r) === f).length;
  const defs: { k: "all" | Fulfillment; l: string }[] = [{ k: "all", l: "Toutes" }, { k: "new", l: "Nouvelles" }, { k: "confirmed", l: "Confirmées" }, { k: "delivered", l: "Remises" }, { k: "completed", l: "Terminées" }, { k: "cancelled", l: "Annulées" }];
  chips.innerHTML = defs.map((d) => `<button type="button" class="chip ${S.filter === d.k ? "on" : ""}" data-act="filter" data-f="${d.k}">${d.l}<b>${count(d.k)}</b></button>`).join("");
  const rows = S.reservations
    .filter((r) => (S.filter === "all" || ful(r) === S.filter) && matches(r, S.q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  list.innerHTML = rows.length
    ? rows.map(resCard).join("")
    : `<div class="empty"><b>${S.reservations.length ? "Aucun résultat" : "Pas encore de réservation"}</b>${S.reservations.length ? "Essayez un autre mot ou un autre filtre." : "Elles apparaîtront ici dès qu'un client réservera."}</div>`;
  const c = document.getElementById("resCount");
  if (c) c.textContent = `${rows.length} sur ${S.reservations.length}`;
  paintIcons();
}

// ---------------------------------------------------------------------------------------------
// Fiche d'une réservation
// ---------------------------------------------------------------------------------------------
function openDrawer(id: string): void {
  const r = S.reservations.find((x) => x.id === id);
  const panel = $("drawerPanel");
  if (!r) {
    panel.innerHTML = `<div class="d-head"><h3>Réservation introuvable</h3><button class="icon-btn x" data-act="close-drawer" type="button" aria-label="Fermer"><span data-i="close"></span></button></div>`;
  } else {
    panel.innerHTML = drawerHtml(r);
  }
  paintIcons(panel);
  ($("drawer") as HTMLElement).hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDrawer(): void {
  ($("drawer") as HTMLElement).hidden = true;
  document.body.style.overflow = "";
}

function drawerHtml(r: Reservation): string {
  const i = r.input;
  const f = ful(r);
  const p = payInfo(r);
  const cur = STEPS.findIndex((s) => s.key === f);
  const method = r.payment ? METHOD[r.payment.method] ?? r.payment.method : "";
  const dl = (k: string, v: string): string => (v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : "");
  const mapHref = i.mapLink ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([i.landmark, i.pickupPlace, "Cameroun"].filter(Boolean).join(", "))}`;
  const acct = r.userId && S.users.some((u) => u.id === r.userId) ? ` · <a href="#/clients/${esc(r.userId)}" style="color:var(--brand);font-weight:600">Compte client</a>` : "";
  return `
  <div class="d-head"><div><h3>${esc(i.customer.name)}</h3><span class="muted">${esc(r.id)} · ${esc(fmtWhen(r.createdAt))}${acct}</span></div>
    <button class="icon-btn x" data-act="close-drawer" type="button" aria-label="Fermer"><span data-i="close"></span></button></div>
  <div class="d-body">
    <div class="d-actions">
      <a class="btn wa" href="${esc(waLink(r))}" target="_blank" rel="noopener"><span data-i="chat"></span>WhatsApp</a>
      <a class="btn" href="tel:+${esc(waPhone(i.customer.phone))}"><span data-i="phone"></span>Appeler</a>
    </div>

    <div class="d-sec"><h4>Suivi</h4>
      ${f === "cancelled" ? `<p><span class="pill cancelled">Annulée</span></p><button class="btn sm" type="button" data-act="set-ful" data-id="${esc(r.id)}" data-v="new">Rouvrir la réservation</button>` : `
      <div class="steps">${STEPS.map((s, k) => `<button type="button" class="step ${k < cur ? "done" : ""} ${k === cur ? "cur" : ""}" data-act="set-ful" data-id="${esc(r.id)}" data-v="${s.key}"><i>${k < cur ? "✓" : k + 1}</i>${s.label}</button>`).join("")}</div>
      <p style="margin:12px 0 0"><button class="btn sm danger" type="button" data-act="set-ful" data-id="${esc(r.id)}" data-v="cancelled" data-confirm="1">Annuler la réservation</button></p>`}
    </div>

    <div class="d-sec"><h4>Réservation</h4>
      <dl class="kv2">
        ${dl("Véhicule", vehicleName(r))}
        ${dl("Type", i.mode === "rent" ? `Location · ${r.quote.days} jour(s)` : "Achat")}
        ${i.mode === "rent" ? dl("Début", `${fmtDay(i.startDate)}${i.startTime ? ` à ${i.startTime.replace(":", "h")}` : ""}`) : ""}
        ${i.mode === "rent" ? dl("Retour", i.endTime ? i.endTime.replace(":", "h") : "") : ""}
        ${dl("Chauffeur", i.withDriver ? driverName(r) || "Oui" : "Sans chauffeur")}
        ${dl("Lieu de remise", i.pickupPlace)}
        ${dl("Repère", i.landmark ?? "")}
        ${dl("Décoration", i.decoration ?? "")}
        ${dl("Code parrain", i.referralCode ?? "")}
        ${dl("Téléphone", i.customer.phone)}
      </dl>
      <p style="margin:12px 0 0"><a class="btn sm" href="${esc(mapHref)}" target="_blank" rel="noopener"><span data-i="pin"></span>${i.mapLink ? "Itinéraire (position du client)" : "Voir le quartier sur Google Maps"}</a></p>
      ${i.recipient?.name ? `<div class="gift"><b>Cadeau pour ${esc(i.recipient.name)}</b>${i.recipient.message ? `<br>« ${esc(i.recipient.message)} »` : ""}</div>` : ""}
    </div>

    <div class="d-sec"><h4>Montant</h4>
      <div class="lines">${r.quote.lines.map((l) => `<div><span>${esc(l.label)}</span><span>${money(l.amount)}</span></div>`).join("")}<div><span>Total</span><span>${money(r.quote.total)}</span></div></div>
      <p style="margin:10px 0 0"><span class="pill ${p.c}">${p.t}</span> ${method ? `<span class="muted">${esc(method)}${r.payment?.demo ? " · démonstration" : ""}</span>` : ""}</p>
    </div>

    <div class="d-sec"><h4>Note interne</h4>
      <textarea class="field" id="noteBox" maxlength="1000" placeholder="Visible uniquement par vous (ex : client à rappeler jeudi)…">${esc(r.note ?? "")}</textarea>
      <p style="margin:10px 0 0"><button class="btn sm" type="button" data-act="save-note" data-id="${esc(r.id)}">Enregistrer la note</button></p>
    </div>

    <div class="d-actions">
      <a class="btn" href="/api/reservations/${esc(r.id)}/contract" target="_blank" rel="noopener"><span data-i="file"></span>Contrat PDF</a>
      <button class="btn" type="button" data-act="copy" data-text="${esc(r.id)}">Copier la référence</button>
    </div>
  </div>`;
}

async function setFulfillment(id: string, v: Fulfillment): Promise<void> {
  const { reservation } = await api<{ reservation: Reservation }>(`/api/admin/reservations/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ fulfillment: v }) });
  S.reservations = S.reservations.map((r) => (r.id === id ? reservation : r));
  S.dash = null;
  paintNav();
  toast(`Statut : ${FUL[v].label}`, reservation.input.customer.name);
  if (!($("drawer") as HTMLElement).hidden) {
    $("drawerPanel").innerHTML = drawerHtml(reservation);
    paintIcons($("drawerPanel"));
  }
  if (S.tab === "reservations") paintRes();
  else if (S.tab === "accueil") await renderTab();
}


// ---------------------------------------------------------------------------------------------
// Clients (comptes facultatifs)
// ---------------------------------------------------------------------------------------------
const fmtPhone = (d: string): string => (d.startsWith("237") && d.length === 12 ? `+237 ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)} ${d.slice(10)}` : `+${d}`);

function userCard(u: AdminUser): string {
  const t = TIERS[u.tier];
  return `<div class="res" role="button" tabindex="0" data-act="open-user" data-id="${esc(u.id)}">
    <div class="av">${esc(initials(u.name))}</div>
    <div class="res-main">
      <div class="res-top"><span class="res-name">${esc(u.name)}</span><span class="pill ${t.cls}">${t.label}</span></div>
      <div class="res-sub">${esc(fmtPhone(u.phone))}${u.email ? ` · ${esc(u.email)}` : ""}</div>
      <div class="res-meta"><span>${u.reservations} réservation${u.reservations > 1 ? "s" : ""}</span><span>·</span><span>${u.lastReservationAt ? `dernière ${esc(ago(u.lastReservationAt))}` : "pas encore de réservation"}</span></div>
    </div>
    <div class="res-amt"><b>${money(u.spent)}</b><span>inscrit ${esc(ago(u.createdAt))}</span></div>
  </div>`;
}

async function renderClients(view: HTMLElement): Promise<void> {
  if (!S.users.length) view.innerHTML = `<p class="muted">Chargement…</p>`;
  await loadUsers(false);
  const month = curMonth();
  const loyal = S.users.filter((u) => u.tier === "loyal" || u.tier === "vip").length;
  view.innerHTML = `
  <div class="page-head"><div><h2>Clients</h2><p>Les clients qui ont créé un compte (facultatif). Les plus fidèles apparaissent en premier.</p></div>
    <a class="btn" href="/api/admin/users.csv"><span data-i="download"></span>Excel (clients)</a></div>
  <div class="kpis" style="margin-bottom:18px">
    ${kpi("Comptes créés", num(S.users.length))}
    ${kpi("Nouveaux ce mois-ci", num(S.users.filter((u) => u.createdAt.slice(0, 7) === month).length))}
    ${kpi("Fidèles et VIP", num(loyal), "3 réservations ou plus")}
    ${kpi("Dépensé par les inscrits", money(S.users.reduce((s, u) => s + u.spent, 0)))}
  </div>
  <div class="toolbar">
    <div class="search"><span data-i="search"></span><input id="uq" type="search" placeholder="Rechercher un nom, un numéro, un e-mail…" value="${esc(S.uq)}" autocomplete="off"></div>
    <div class="chips" id="uchips"></div>
  </div>
  <div class="list" id="uList"></div>`;
  paintUsers();
}

function paintUsers(): void {
  const chips = document.getElementById("uchips");
  const list = document.getElementById("uList");
  if (!chips || !list) return;
  const count = (f: "all" | Tier): number => S.users.filter((u) => f === "all" || u.tier === f).length;
  const defs: { k: "all" | Tier; l: string }[] = [{ k: "all", l: "Tous" }, { k: "vip", l: "VIP" }, { k: "loyal", l: "Fidèles" }, { k: "regular", l: "Réguliers" }, { k: "new", l: "Nouveaux" }];
  chips.innerHTML = defs.map((d) => `<button type="button" class="chip ${S.uFilter === d.k ? "on" : ""}" data-act="ufilter" data-f="${d.k}">${d.l}<b>${count(d.k)}</b></button>`).join("");
  const q = S.uq.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = S.users.filter((u) => (S.uFilter === "all" || u.tier === S.uFilter) && q.every((w) => `${u.name} ${u.phone} ${u.email ?? ""} ${u.id}`.toLowerCase().includes(w)));
  list.innerHTML = rows.length
    ? rows.map(userCard).join("")
    : `<div class="empty"><b>${S.users.length ? "Aucun résultat" : "Aucun compte pour le moment"}</b>${S.users.length ? "Essayez un autre mot ou un autre filtre." : "Les clients qui créent un compte sur le site apparaîtront ici."}</div>`;
  paintIcons();
}

function userDrawerHtml(u: AdminUser, tempPw = ""): string {
  const t = TIERS[u.tier];
  const dl = (k: string, v: string): string => (v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : "");
  const first = u.name.split(/\s+/)[0] ?? u.name;
  const wa = `https://wa.me/${waPhone(u.phone)}?text=${encodeURIComponent(`Bonjour ${first}, c'est l'équipe Yamoo Drive. `)}`;
  const resv = u.reservationIds
    .map((id) => S.reservations.find((r) => r.id === id))
    .filter((r): r is Reservation => !!r)
    .map((r) => `<a class="res" href="#/reservations/${esc(r.id)}" style="grid-template-columns:minmax(0,1fr) auto;text-decoration:none"><div class="res-main"><div class="res-top"><span class="res-name">${esc(vehicleName(r))}</span><span class="pill ${FUL[ful(r)].cls}">${FUL[ful(r)].label}</span></div><div class="res-meta"><span>${esc(r.id)}</span><span>·</span><span>${esc(fmtWhen(r.createdAt))}</span></div></div><div class="res-amt"><b>${money(r.quote.total)}</b></div></a>`)
    .join("");
  const waPw = tempPw ? `https://wa.me/${waPhone(u.phone)}?text=${encodeURIComponent(`Bonjour ${first}, voici votre mot de passe provisoire Yamoo Drive : ${tempPw}\nVous pouvez le changer dans « Mon compte ».`)}` : "";
  return `
  <div class="d-head"><div><h3>${esc(u.name)}</h3><span class="muted">Client depuis le ${esc(fmtDay(u.createdAt.slice(0, 10)))}</span></div>
    <button class="icon-btn x" data-act="close-drawer" type="button" aria-label="Fermer"><span data-i="close"></span></button></div>
  <div class="d-body">
    <div class="d-actions">
      <a class="btn wa" href="${esc(wa)}" target="_blank" rel="noopener"><span data-i="chat"></span>WhatsApp</a>
      <a class="btn" href="tel:+${esc(waPhone(u.phone))}"><span data-i="phone"></span>Appeler</a>
    </div>

    <div class="d-sec"><h4>Fidélité</h4>
      <p style="margin:0 0 12px"><span class="pill ${t.cls}">${t.label}</span></p>
      <div class="kpis" style="grid-template-columns:1fr 1fr">
        ${kpi("Réservations", num(u.reservations))}${kpi("Total dépensé", money(u.spent))}
        ${kpi("Locations", `${num(u.rentals)}`, `${num(u.rentDays)} jour(s) loués`)}${kpi("Achats", num(u.purchases))}
      </div>
      <p class="muted" style="font-size:13px;margin:10px 0 0">Nouveau : 0 à 1 réservation · Régulier : 2 · Fidèle : 3 à 4 · VIP : 5 et plus, ou 1 000 000 FCFA dépensés. Les annulées ne comptent pas.</p>
    </div>

    <div class="d-sec"><h4>Coordonnées</h4>
      <dl class="kv2">
        ${dl("Téléphone", fmtPhone(u.phone))}${dl("E-mail", u.email ?? "")}
        ${dl("Dernière réservation", u.lastReservationAt ? fmtWhen(u.lastReservationAt) : "")}${dl("Dernière connexion", u.lastLoginAt ? fmtWhen(u.lastLoginAt) : "")}
      </dl>
    </div>

    <div class="d-sec"><h4>Réservations (${u.reservationIds.length})</h4>
      <div class="list">${resv || '<p class="muted" style="margin:0">Aucune réservation avec ce numéro pour le moment.</p>'}</div>
    </div>

    <div class="d-sec"><h4>Compte</h4>
      ${tempPw ? `<div class="gift" style="background:var(--okbg)"><b>Mot de passe provisoire : <span style="font:700 16px ui-monospace,Menlo,monospace">${esc(tempPw)}</span></b><br><small>Affiché une seule fois. Envoyez-le au client : il pourra le changer dans « Mon compte ».</small>
        <div class="d-actions" style="margin-top:10px"><button class="btn sm" type="button" data-act="copy" data-text="${esc(tempPw)}">Copier</button><a class="btn sm wa" href="${esc(waPw)}" target="_blank" rel="noopener">Envoyer sur WhatsApp</a></div></div>` : ""}
      <div class="d-actions">
        <button class="btn" type="button" data-act="reset-pw" data-id="${esc(u.id)}">Réinitialiser le mot de passe</button>
        <button class="btn danger" type="button" data-act="delete-user" data-id="${esc(u.id)}">Supprimer le compte</button>
      </div>
    </div>
  </div>`;
}

function openUserDrawer(id: string, tempPw = ""): void {
  const u = S.users.find((x) => x.id === id);
  const panel = $("drawerPanel");
  panel.innerHTML = u ? userDrawerHtml(u, tempPw) : `<div class="d-head"><h3>Client introuvable</h3><button class="icon-btn x" data-act="close-drawer" type="button" aria-label="Fermer"><span data-i="close"></span></button></div>`;
  paintIcons(panel);
  ($("drawer") as HTMLElement).hidden = false;
  document.body.style.overflow = "hidden";
}

// ---------------------------------------------------------------------------------------------
// Rapports
// ---------------------------------------------------------------------------------------------
async function renderReports(view: HTMLElement): Promise<void> {
  if (!S.month) S.month = curMonth();
  const now = curMonth();
  const options: string[] = [];
  for (let k = 0; k < 24; k++) options.push(addMonths(now, -k));
  if (!options.includes(S.month)) options.unshift(S.month);
  view.innerHTML = `
  <div class="page-head"><div><h2>Rapports</h2><p>Statistiques et rapport mensuel à imprimer ou télécharger.</p></div></div>
  <div class="rbar">
    <button class="icon-btn" type="button" data-act="month-prev" aria-label="Mois précédent"><span data-i="left"></span></button>
    <select class="sel" id="mSel" aria-label="Mois">${options.map((m) => `<option value="${m}" ${m === S.month ? "selected" : ""}>${esc(monthName(m))}</option>`).join("")}</select>
    <button class="icon-btn" type="button" data-act="month-next" aria-label="Mois suivant" ${S.month >= now ? "disabled" : ""}><span data-i="right"></span></button>
    <span class="spacer"></span>
    <button class="btn" type="button" data-act="print"><span data-i="print"></span>Imprimer</button>
    <a class="btn primary" href="/api/admin/report.pdf?month=${S.month}"><span data-i="download"></span>PDF</a>
    <a class="btn" href="/api/admin/report.csv?month=${S.month}"><span data-i="download"></span>Excel (réservations)</a>
    <a class="btn" href="/api/admin/stats.csv?month=${S.month}"><span data-i="download"></span>Excel (12 mois)</a>
  </div>
  <article class="sheet" id="sheet"><p class="muted">Chargement du rapport…</p></article>`;
  paintIcons(view);
  const wanted = S.month;
  const data = await api<{ report: MonthReport; series: MonthPoint[] }>(`/api/admin/report?month=${wanted}`);
  S.rep = data;
  if (S.month !== wanted || S.tab !== "rapports") return;
  $("sheet").innerHTML = sheetHtml(data.report, data.series);
}

function sheetHtml(rp: MonthReport, series: MonthPoint[]): string {
  const t = rp.totals;
  const p = rp.previous;
  const dRev = delta(t.revenue, p.revenue);
  const dCnt = delta(t.count, p.count);
  const dDays = delta(t.rentDays, p.rentDays);
  const best = rp.byVehicle[0];
  const gen = new Intl.DateTimeFormat("fr-FR", { timeZone: tz(), dateStyle: "long", timeStyle: "short" }).format(new Date(rp.generatedAt));
  const sum = [
    t.count === 0 ? "Aucune réservation enregistrée ce mois-ci." : `${num(t.count)} réservation(s) ce mois-ci (${num(t.rentCount)} location(s), ${num(t.buyCount)} vente(s)) pour ${money(t.revenue)}.`,
    best ? `Véhicule le plus rentable : ${best.name} (${num(best.count)} réservation(s), ${money(best.revenue)}).` : "",
    t.withDriver ? `${num(t.withDriver)} réservation(s) avec chauffeur.` : "",
    t.gifts ? `${num(t.gifts)} véhicule(s) offert(s) en cadeau.` : "",
  ].filter(Boolean).join(" ");
  const tbl = (head: { l: string; r?: boolean }[], rows: string[][]): string =>
    `<div class="tbl-wrap"><table><thead><tr>${head.map((h) => `<th class="${h.r ? "r" : ""}">${h.l}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${r.map((c, k) => `<td class="${head[k]?.r ? "r" : ""}">${c}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${head.length}" class="muted">Aucune donnée pour cette période.</td></tr>`}</tbody></table></div>`;

  return `
  <header class="sheet-head"><img src="/img/logo.webp" alt="Yamoo Drive"><div><h2>Rapport mensuel</h2><p>${esc(rp.label)}</p></div><div class="gen">Généré le ${esc(gen)}</div></header>

  <div class="kpis">
    ${kpi("Chiffre d'affaires", money(t.revenue), dRev.text, dRev.cls)}
    ${kpi("Réservations", num(t.count), dCnt.text, dCnt.cls)}
    ${kpi("Jours de location", num(t.rentDays), dDays.text, dDays.cls)}
    ${kpi("Panier moyen", money(t.avgBasket))}
    ${kpi("Locations", num(t.rentCount))}
    ${kpi("Ventes", num(t.buyCount))}
    ${kpi("Payé", money(t.paid))}
    ${kpi("À encaisser", money(t.toCollect), t.cancelled ? `${t.cancelled} annulée(s) non comptée(s)` : "")}
  </div>
  <p class="sum">${esc(sum)}</p>

  <section><h3>Chiffre d'affaires par jour</h3>${bars(rp.byDay.map((d) => d.revenue), rp.byDay.map((d) => String(d.day)), money)}</section>

  <section><h3>Véhicules</h3>${tbl([{ l: "Véhicule" }, { l: "Réserv.", r: true }, { l: "Jours loués", r: true }, { l: "Chiffre d'affaires", r: true }], rp.byVehicle.map((v) => [esc(v.name), num(v.count), num(v.days), money(v.revenue)]))}</section>

  <div class="cols">
    <section><h3>Lieux de remise</h3>${hbars([...rp.byCity.map((c) => ({ label: `Ville : ${c.label}`, value: c.count, right: `${c.count}` })), ...rp.byPlace.map((c) => ({ label: c.label, value: c.count, right: `${c.count}` }))])}</section>
    <section><h3>Paiements</h3>${tbl([{ l: "Moyen" }, { l: "Réserv.", r: true }, { l: "Montant", r: true }], rp.byPayment.map((x) => [esc(x.label), num(x.count), money(x.amount)]))}
      <h3 style="margin-top:20px">Suivi des réservations</h3>${tbl([{ l: "Statut" }, { l: "Nombre", r: true }], rp.byStatus.map((s) => [`<span class="pill ${FUL[s.key].cls}">${s.label}</span>`, num(s.count)]))}</section>
  </div>

  ${rp.topCustomers.length ? `<section><h3>Meilleurs clients du mois</h3>${tbl([{ l: "Client" }, { l: "Téléphone" }, { l: "Réserv.", r: true }, { l: "Montant", r: true }], rp.topCustomers.map((c) => [esc(c.name), esc(c.phone), num(c.count), money(c.revenue)]))}</section>` : ""}

  <section><h3>Évolution sur 12 mois</h3>${bars(series.map((s) => s.revenue), series.map((s) => s.label.replace(/\s\d{4}$/, "")), money, true)}
    <div style="margin-top:14px">${tbl([{ l: "Mois" }, { l: "Réserv.", r: true }, { l: "Locations", r: true }, { l: "Ventes", r: true }, { l: "Jours loués", r: true }, { l: "Chiffre d'affaires", r: true }], [...series].reverse().map((s) => [`<span style="text-transform:capitalize">${esc(monthName(s.month))}</span>`, num(s.count), num(s.rentals), num(s.sales), num(s.rentDays), money(s.revenue)]))}</div>
  </section>

  <section><h3>Détail des réservations (${rp.rows.length})</h3>${tbl([{ l: "Réf." }, { l: "Date" }, { l: "Client" }, { l: "Véhicule" }, { l: "Type" }, { l: "Montant", r: true }, { l: "Statut" }], rp.rows.map((r) => [esc(r.id), esc(fmtDay(r.date).slice(0, 5)), esc(r.name), esc(r.vehicle), esc(r.type === "Location" ? `Loc. ${r.days} j` : "Achat"), money(r.amount), esc(r.status)]))}</section>
  <p class="muted" style="font-size:12.5px;margin-top:18px">Les réservations annulées ne sont pas comptées dans les totaux. Rapport basé sur la date de la demande (fuseau ${esc(tz())}).</p>`;
}

// ---------------------------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------------------------
function renderSettings(view: HTMLElement): void {
  const n = S.session?.notify;
  view.innerHTML = `
  <div class="page-head"><div><h2>Réglages</h2><p>Notifications et état du site.</p></div></div>
  <div class="grid2" style="margin-top:0">
    <section class="card"><div class="card-h"><h3>Notifications WhatsApp</h3></div>
      <div class="set">
        <div class="row"><div><b>État</b><small>Message envoyé sur votre téléphone à chaque nouvelle réservation et chaque paiement.</small></div>
          <span class="pill ${n?.configured ? "ok" : "wait"}">${n?.configured ? "Activées" : "Non configurées"}</span></div>
        ${n?.configured ? `<div class="row"><div><b>Envoi vers</b><small>${esc(n.target)} · via ${n.provider === "callmebot" ? "CallMeBot" : "WhatsApp Cloud API"}</small></div>
          <button class="btn sm" type="button" data-act="notify-test" id="testBtn">Envoyer un message test</button></div>` : `
        <div><p class="muted" style="margin:0 0 10px">Pour recevoir les alertes sur WhatsApp, ajoutez ces lignes dans votre fichier <b>.env</b> puis redémarrez le serveur :</p>
        <div class="code">NOTIFY_PROVIDER=callmebot
NOTIFY_PHONE=237XXXXXXXXX
CALLMEBOT_APIKEY=votre_cle
PUBLIC_URL=https://votre-site.com</div>
        <p class="muted" style="margin:10px 0 0">Le guide pas à pas est dans <b>README_ADMIN.md</b>.</p></div>`}
      </div></section>

    <section class="card"><div class="card-h"><h3>Site</h3></div>
      <div class="set">
        <div class="row"><div><b>Paiements</b><small>${S.session?.payments === "demo" ? "Mode démonstration : aucun vrai paiement n'est encaissé." : esc(S.session?.payments ?? "")}</small></div><span class="pill ${S.session?.payments === "demo" ? "wait" : "ok"}">${S.session?.payments === "demo" ? "Démo" : "Actifs"}</span></div>
        <div class="row"><div><b>Fuseau horaire</b><small>${esc(tz())}</small></div></div>
        <div class="row"><div><b>Réservations enregistrées</b><small>Fichier JSON (phase de test)</small></div><b>${S.reservations.length}</b></div>
        <div class="row"><div><b>Session</b><small>Vous restez connecté 7 jours sur cet appareil.</small></div><button class="btn sm" type="button" data-act="logout">Se déconnecter</button></div>
      </div></section>
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Connexion / démarrage
// ---------------------------------------------------------------------------------------------
function showLogin(): void {
  ($("app") as HTMLElement).hidden = true;
  ($("login") as HTMLElement).hidden = false;
  closeDrawer();
  if (S.poll) window.clearInterval(S.poll);
  S.poll = 0;
  setTimeout(() => ($("pw") as HTMLInputElement).focus(), 50);
}

async function loadReservations(notify: boolean): Promise<void> {
  const { reservations } = await api<{ reservations: Reservation[] }>("/api/admin/reservations");
  const fresh = reservations.filter((r) => !S.known.has(r.id));
  S.reservations = reservations;
  if (notify && S.known.size >= 0 && fresh.length) {
    beep();
    const f = fresh[0] as Reservation;
    toast(fresh.length > 1 ? `${fresh.length} nouvelles réservations` : "Nouvelle réservation", `${f.input.customer.name} · ${vehicleName(f)} · ${money(f.quote.total)}`);
    S.dash = null;
  }
  reservations.forEach((r) => S.known.add(r.id));
  paintNav();
  if (notify && fresh.length) {
    if (S.tab === "reservations") paintRes();
    else if (S.tab === "accueil") await renderTab();
  }
}

async function loadUsers(notify: boolean): Promise<void> {
  const { users } = await api<{ users: AdminUser[] }>("/api/admin/users");
  const fresh = users.filter((u) => !S.knownUsers.has(u.id));
  S.users = users;
  users.forEach((u) => S.knownUsers.add(u.id));
  if (notify && fresh.length) {
    beep();
    toast(fresh.length > 1 ? `${fresh.length} nouveaux comptes clients` : "Nouveau compte client", fresh.map((u) => u.name).join(", "));
    if (S.tab === "clients") await renderTab();
  }
}

async function boot(): Promise<void> {
  try {
    S.session = await api<Session>("/api/admin/session");
  } catch {
    showLogin();
    return;
  }
  ($("login") as HTMLElement).hidden = true;
  ($("app") as HTMLElement).hidden = false;
  paintIcons();
  try {
    if (!S.catalog) S.catalog = await api<Catalog>("/api/catalog");
  } catch {
    /* le catalogue sert aux noms : on continue sans */
  }
  S.known.clear();
  S.knownUsers.clear();
  await loadReservations(false);
  await loadUsers(false).catch(() => undefined);
  S.month = curMonth();
  await route();
  if (S.poll) window.clearInterval(S.poll);
  S.poll = window.setInterval(() => {
    if (!document.hidden) {
      void loadReservations(true).catch(() => undefined);
      void loadUsers(true).catch(() => undefined);
    }
  }, 25_000);
}

// ---------------------------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------------------------
document.addEventListener("click", (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id ?? "";
  if (act === "stop") {
    ev.stopPropagation();
    return;
  }
  void (async () => {
    try {
      switch (act) {
        case "toggle-pw": {
          const i = $("pw") as HTMLInputElement;
          i.type = i.type === "password" ? "text" : "password";
          el.textContent = i.type === "password" ? "Afficher" : "Masquer";
          break;
        }
        case "open-res":
          location.hash = `#/reservations/${encodeURIComponent(id)}`;
          break;
        case "close-drawer":
          location.hash = `#/${S.tab}`;
          break;
        case "open-user":
          location.hash = `#/clients/${encodeURIComponent(id)}`;
          break;
        case "ufilter":
          S.uFilter = (el.dataset.f ?? "all") as "all" | Tier;
          paintUsers();
          break;
        case "reset-pw": {
          if (!confirm("Générer un nouveau mot de passe provisoire pour ce client ?")) break;
          const { password } = await api<{ password: string }>(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, { method: "POST", body: "{}" });
          openUserDrawer(id, password);
          break;
        }
        case "delete-user":
          if (!confirm("Supprimer ce compte ? Ses réservations restent enregistrées.")) break;
          await api(`/api/admin/users/${encodeURIComponent(id)}/delete`, { method: "POST", body: "{}" });
          S.users = S.users.filter((u) => u.id !== id);
          S.knownUsers.delete(id);
          S.dash = null;
          toast("Compte supprimé");
          location.hash = "#/clients";
          break;
        case "filter":
          S.filter = (el.dataset.f ?? "all") as "all" | Fulfillment;
          paintRes();
          break;
        case "metric":
          S.metric = (el.dataset.m ?? "revenue") as Metric;
          document.querySelectorAll<HTMLElement>("[data-act=metric]").forEach((b) => b.classList.toggle("on", b === el));
          if (S.dash) $("homeChart").innerHTML = homeChart(S.dash.series);
          break;
        case "set-ful":
          if (el.dataset.confirm && !confirm("Annuler cette réservation ?")) break;
          await setFulfillment(id, (el.dataset.v ?? "new") as Fulfillment);
          break;
        case "quick-confirm":
          await setFulfillment(id, "confirmed");
          break;
        case "save-note": {
          const note = ($("noteBox") as HTMLTextAreaElement).value;
          const { reservation } = await api<{ reservation: Reservation }>(`/api/admin/reservations/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ note }) });
          S.reservations = S.reservations.map((r) => (r.id === id ? reservation : r));
          toast("Note enregistrée");
          break;
        }
        case "copy":
          await navigator.clipboard?.writeText(el.dataset.text ?? "");
          toast("Référence copiée", el.dataset.text ?? "");
          break;
        case "month-prev":
        case "month-next": {
          const next = addMonths(S.month, act === "month-prev" ? -1 : 1);
          if (next > curMonth()) break;
          S.month = next;
          await renderTab();
          break;
        }
        case "print":
          window.print();
          break;
        case "refresh":
          await loadReservations(true);
          await loadUsers(true);
          S.dash = null;
          await renderTab();
          toast("Actualisé");
          break;
        case "notify-test": {
          (el as HTMLButtonElement).disabled = true;
          try {
            await api("/api/admin/notify-test", { method: "POST", body: "{}" });
            toast("Message de test envoyé", "Vérifiez votre WhatsApp.");
          } finally {
            (el as HTMLButtonElement).disabled = false;
          }
          break;
        }
        case "logout":
          await api("/api/admin/logout", { method: "POST", body: "{}" }).catch(() => undefined);
          S.known.clear();
          S.knownUsers.clear();
          S.users = [];
          S.dash = null;
          showLogin();
          break;
      }
    } catch (e) {
      if ((e as Error).message !== "Session expirée.") toast("Action impossible", (e as Error).message, true);
    }
  })();
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && !($("drawer") as HTMLElement).hidden) location.hash = `#/${S.tab}`;
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act="open-res"],[data-act="open-user"]');
  if (el && (ev.key === "Enter" || ev.key === " ") && (ev.target as HTMLElement) === el) {
    ev.preventDefault();
    el.click();
  }
});

document.addEventListener("input", (ev) => {
  const t = ev.target as HTMLElement;
  if (t.id === "q") {
    S.q = (t as HTMLInputElement).value;
    paintRes();
  } else if (t.id === "uq") {
    S.uq = (t as HTMLInputElement).value;
    paintUsers();
  }
});

document.addEventListener("change", (ev) => {
  const t = ev.target as HTMLSelectElement;
  if (t.id === "mSel") {
    S.month = t.value;
    void renderTab();
  }
});

$("loginForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const btn = $("loginBtn") as HTMLButtonElement;
  const err = $("loginErr");
  err.hidden = true;
  btn.disabled = true;
  btn.textContent = "Connexion…";
  void api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: ($("pw") as HTMLInputElement).value }) })
    .then(async () => {
      ($("pw") as HTMLInputElement).value = "";
      await boot();
    })
    .catch((e: Error) => {
      err.textContent = e.message;
      err.hidden = false;
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = "Se connecter";
    });
});

window.addEventListener("hashchange", () => void route());
// Un clic sur la page autorise le navigateur à jouer le petit son d'alerte.
document.addEventListener("pointerdown", () => { try { S.audio?.resume(); } catch { /* */ } }, { once: true });
void boot();

// Rapports et statistiques de la page admin : calculs, export CSV (Excel) et PDF.
import { COLORS, PdfDoc, textWidth } from "./pdf.js";
import type { Fulfillment, PaymentMethod, Reservation, Vehicle } from "../shared/types.js";

// ---------------------------------------------------------------------------------------------
// Libellés et dates
// ---------------------------------------------------------------------------------------------

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  new: "Nouvelle",
  confirmed: "Confirmée",
  delivered: "Remise effectuée",
  completed: "Terminée",
  cancelled: "Annulée",
};
const FULFILLMENT_ORDER: Fulfillment[] = ["new", "confirmed", "delivered", "completed", "cancelled"];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Carte bancaire",
  orange_money: "Orange Money",
  mtn_momo: "MTN Mobile Money",
  agency: "À l'agence",
};

export const fulfillmentOf = (r: Reservation): Fulfillment => r.fulfillment ?? "new";
const isActive = (r: Reservation): boolean => fulfillmentOf(r) !== "cancelled";

/** Date locale (AAAA-MM-JJ) d'un instant ISO, dans le fuseau de l'agence. */
export function localDate(iso: string, tz: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export const monthOf = (iso: string, tz: string): string => localDate(iso, tz).slice(0, 7);
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const monthLabel = (month: string, style: "long" | "short" = "long"): string => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat("fr-FR", { month: style, year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
};

const daysInMonth = (month: string): number => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export const currentMonth = (tz: string): string => monthOf(new Date().toISOString(), tz);

// ---------------------------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------------------------

export interface Totals {
  count: number; // réservations non annulées
  rentCount: number;
  buyCount: number;
  rentDays: number;
  revenue: number;
  paid: number;
  toCollect: number;
  cancelled: number;
  avgBasket: number;
  withDriver: number;
  gifts: number;
}

function totalsOf(list: Reservation[]): Totals {
  const act = list.filter(isActive);
  const rent = act.filter((r) => r.input.mode === "rent");
  const revenue = act.reduce((s, r) => s + r.quote.total, 0);
  const paid = act.filter((r) => r.status === "paid_demo").reduce((s, r) => s + r.quote.total, 0);
  return {
    count: act.length,
    rentCount: rent.length,
    buyCount: act.length - rent.length,
    rentDays: rent.reduce((s, r) => s + r.quote.days, 0),
    revenue,
    paid,
    toCollect: revenue - paid,
    cancelled: list.length - act.length,
    avgBasket: act.length ? Math.round(revenue / act.length) : 0,
    withDriver: act.filter((r) => r.input.withDriver).length,
    gifts: act.filter((r) => r.input.recipient?.name).length,
  };
}

export interface ReportRow {
  id: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  vehicle: string;
  type: "Location" | "Achat";
  days: number;
  start: string;
  startTime: string;
  endTime: string;
  driver: string;
  place: string;
  landmark: string;
  mapLink: string;
  decoration: string;
  gift: string;
  amount: number;
  payment: string;
  status: string;
  note: string;
}

export interface MonthReport {
  month: string;
  label: string;
  generatedAt: string;
  totals: Totals;
  previous: { month: string; label: string; count: number; revenue: number; rentDays: number };
  byDay: { day: number; count: number; revenue: number }[];
  byVehicle: { id: number; name: string; count: number; days: number; revenue: number }[];
  byCity: { label: string; count: number; revenue: number }[];
  byPlace: { label: string; count: number; revenue: number }[];
  byPayment: { label: string; count: number; amount: number }[];
  byStatus: { key: Fulfillment; label: string; count: number }[];
  topCustomers: { name: string; phone: string; count: number; revenue: number }[];
  rows: ReportRow[];
}

export interface MonthPoint {
  month: string;
  label: string;
  count: number;
  rentals: number;
  sales: number;
  rentDays: number;
  revenue: number;
}

function paymentLabel(r: Reservation): string {
  if (r.status === "pending_payment") return "En attente";
  return r.payment ? METHOD_LABEL[r.payment.method] : "À l'agence";
}

function toRow(r: Reservation, vehicles: Vehicle[], drivers: { n: string }[], tz: string): ReportRow {
  const i = r.input;
  const local = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(r.createdAt));
  const driver = i.withDriver && i.driverId !== undefined ? (drivers[i.driverId]?.n ?? "Oui") : "";
  return {
    id: r.id,
    date: localDate(r.createdAt, tz),
    time: local,
    name: i.customer.name,
    phone: i.customer.phone,
    vehicle: vehicles[i.vehicleId]?.n ?? `Véhicule ${i.vehicleId}`,
    type: i.mode === "rent" ? "Location" : "Achat",
    days: i.mode === "rent" ? r.quote.days : 0,
    start: i.startDate ?? "",
    startTime: i.startTime ?? "",
    endTime: i.endTime ?? "",
    driver,
    place: i.pickupPlace,
    landmark: i.landmark ?? "",
    mapLink: i.mapLink ?? "",
    decoration: i.decoration ?? "",
    gift: i.recipient?.name ?? "",
    amount: r.quote.total,
    payment: paymentLabel(r),
    status: FULFILLMENT_LABEL[fulfillmentOf(r)],
    note: r.note ?? "",
  };
}

export function buildMonthReport(all: Reservation[], vehicles: Vehicle[], drivers: { n: string }[], month: string, tz: string): MonthReport {
  const inMonth = all.filter((r) => monthOf(r.createdAt, tz) === month).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const act = inMonth.filter(isActive);
  const prevMonth = addMonths(month, -1);
  const prev = totalsOf(all.filter((r) => monthOf(r.createdAt, tz) === prevMonth));

  const byDay = Array.from({ length: daysInMonth(month) }, (_, k) => ({ day: k + 1, count: 0, revenue: 0 }));
  const veh = new Map<number, { count: number; days: number; revenue: number }>();
  const city = new Map<string, { count: number; revenue: number }>();
  const place = new Map<string, { count: number; revenue: number }>();
  const pay = new Map<string, { count: number; amount: number }>();
  const cust = new Map<string, { name: string; phone: string; count: number; revenue: number }>();

  for (const r of act) {
    const slot = byDay[Number(localDate(r.createdAt, tz).slice(8, 10)) - 1];
    if (slot) {
      slot.count += 1;
      slot.revenue += r.quote.total;
    }
    const v = veh.get(r.input.vehicleId) ?? { count: 0, days: 0, revenue: 0 };
    v.count += 1;
    v.days += r.input.mode === "rent" ? r.quote.days : 0;
    v.revenue += r.quote.total;
    veh.set(r.input.vehicleId, v);

    const pl = r.input.pickupPlace || "Non précisé";
    const c = pl.includes(" – ") ? (pl.split(" – ")[0] ?? "Autre").trim() : "Autre";
    for (const [map, key] of [[city, c], [place, pl]] as const) {
      const cur = map.get(key) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += r.quote.total;
      map.set(key, cur);
    }

    const pk = paymentLabel(r);
    const p = pay.get(pk) ?? { count: 0, amount: 0 };
    p.count += 1;
    p.amount += r.quote.total;
    pay.set(pk, p);

    const phoneKey = r.input.customer.phone.replace(/\D/g, "") || r.input.customer.name.toLowerCase();
    const cu = cust.get(phoneKey) ?? { name: r.input.customer.name, phone: r.input.customer.phone, count: 0, revenue: 0 };
    cu.name = r.input.customer.name;
    cu.count += 1;
    cu.revenue += r.quote.total;
    cust.set(phoneKey, cu);
  }

  return {
    month,
    label: monthLabel(month),
    generatedAt: new Date().toISOString(),
    totals: totalsOf(inMonth),
    previous: { month: prevMonth, label: monthLabel(prevMonth), count: prev.count, revenue: prev.revenue, rentDays: prev.rentDays },
    byDay,
    byVehicle: [...veh.entries()]
      .map(([id, v]) => ({ id, name: vehicles[id]?.n ?? `Véhicule ${id}`, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
    byCity: [...city.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count),
    byPlace: [...place.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count).slice(0, 8),
    byPayment: [...pay.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count),
    byStatus: FULFILLMENT_ORDER.map((key) => ({
      key,
      label: FULFILLMENT_LABEL[key],
      count: inMonth.filter((r) => fulfillmentOf(r) === key).length,
    })),
    topCustomers: [...cust.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    rows: inMonth.map((r) => toRow(r, vehicles, drivers, tz)),
  };
}

/** Une ligne par mois, sur les `count` derniers mois (le plus ancien d'abord). */
export function buildSeries(all: Reservation[], endMonth: string, count: number, tz: string): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let k = count - 1; k >= 0; k--) {
    const month = addMonths(endMonth, -k);
    const t = totalsOf(all.filter((r) => monthOf(r.createdAt, tz) === month));
    out.push({ month, label: monthLabel(month, "short"), count: t.count, rentals: t.rentCount, sales: t.buyCount, rentDays: t.rentDays, revenue: t.revenue });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// CSV (s'ouvre directement dans Excel : séparateur « ; », accents conservés)
// ---------------------------------------------------------------------------------------------

function cell(v: string | number): string {
  if (typeof v === "number") return String(v);
  // Neutralise les « formules » : un nom saisi par un client ne doit jamais s'exécuter dans Excel.
  let s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  if (/[";\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
export const csv = (rows: (string | number)[][]): string => `\uFEFF${rows.map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;

export function reportCsv(report: MonthReport): string {
  const head = ["Référence", "Date", "Heure", "Client", "Téléphone", "Type", "Véhicule", "Jours", "Début location", "Heure de remise", "Heure de retour", "Chauffeur", "Lieu", "Repère", "Lien Google Maps", "Décoration", "Cadeau pour", "Montant (FCFA)", "Paiement", "Statut", "Note"];
  const rows = report.rows.map((r) => [r.id, r.date, r.time, r.name, r.phone, r.type, r.vehicle, r.days, r.start, r.startTime, r.endTime, r.driver, r.place, r.landmark, r.mapLink, r.decoration, r.gift, r.amount, r.payment, r.status, r.note]);
  return csv([head, ...rows]);
}

export function seriesCsv(series: MonthPoint[]): string {
  return csv([
    ["Mois", "Réservations", "Locations", "Ventes", "Jours de location", "Chiffre d'affaires (FCFA)"],
    ...series.map((p) => [p.month, p.count, p.rentals, p.sales, p.rentDays, p.revenue]),
  ]);
}

// ---------------------------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------------------------

const num = (n: number): string => Math.round(n).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
const money = (n: number): string => `${num(n)} FCFA`;
const dmy = (iso: string): string => iso.split("-").reverse().join("/");

export const evolution = (cur: number, prev: number): string => {
  if (prev === 0) return cur > 0 ? "nouveau" : "—";
  const p = Math.round(((cur - prev) / prev) * 100);
  return `${p > 0 ? "+" : ""}${p} %`;
};

function fit(s: string, width: number, size: number, bold = false): string {
  if (textWidth(s, size, bold) <= width) return s;
  let out = s;
  while (out.length > 1 && textWidth(`${out}…`, size, bold) > width) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

interface Col {
  label: string;
  width: number;
  align?: "left" | "right";
}

function table(doc: PdfDoc, cols: Col[], rows: string[][], opts: { size?: number } = {}): void {
  const size = opts.size ?? 8.5;
  const rh = size + 8;
  const total = cols.reduce((s, c) => s + c.width, 0);
  const drawHead = (): void => {
    doc.ensure(rh * 2);
    doc.rect(doc.margin, doc.y, total, rh, { fill: COLORS.soft });
    let x = doc.margin;
    for (const c of cols) {
      doc.textAt(c.label, x + 4, doc.y + size + 3, { size, bold: true, color: COLORS.navy, width: c.width - 8, align: c.align ?? "left" });
      x += c.width;
    }
    doc.y += rh;
  };
  drawHead();
  if (rows.length === 0) {
    doc.textAt("Aucune donnée pour cette période.", doc.margin + 4, doc.y + size + 3, { size, color: COLORS.gray });
    doc.y += rh;
    return;
  }
  for (const row of rows) {
    const before = doc.y;
    doc.ensure(rh);
    if (doc.y < before) drawHead(); // nouvelle page : on répète l'en-tête
    let x = doc.margin;
    cols.forEach((c, k) => {
      const text = fit(row[k] ?? "", c.width - 8, size);
      doc.textAt(text, x + 4, doc.y + size + 3, { size, width: c.width - 8, align: c.align ?? "left" });
      x += c.width;
    });
    doc.y += rh;
    doc.hline(doc.y, doc.margin, doc.margin + total, COLORS.line, 0.4);
  }
  doc.gap(6);
}

function barChart(doc: PdfDoc, values: number[], labels: string[], height = 92): void {
  doc.ensure(height + 34);
  const top = doc.y + 6;
  const base = top + height;
  const max = Math.max(...values, 1);
  const bw = doc.contentWidth / Math.max(values.length, 1);
  doc.hline(base, doc.margin, doc.margin + doc.contentWidth, COLORS.line, 0.8);
  values.forEach((v, k) => {
    const h = (v / max) * (height - 6);
    const x = doc.margin + k * bw;
    if (h > 0) doc.rect(x + bw * 0.14, base - h, bw * 0.72, h, { fill: COLORS.navy });
    doc.textAt(labels[k] ?? "", x, base + 10, { size: 6.5, color: COLORS.gray, width: bw, align: "center" });
  });
  doc.y = base + 20;
}

function kpis(doc: PdfDoc, items: [string, string, string?][]): void {
  const perRow = 4;
  const gap = 8;
  const w = (doc.contentWidth - gap * (perRow - 1)) / perRow;
  const h = 48;
  for (let k = 0; k < items.length; k += perRow) {
    doc.ensure(h + 8);
    items.slice(k, k + perRow).forEach(([label, value, hint], j) => {
      const x = doc.margin + j * (w + gap);
      doc.rect(x, doc.y, w, h, { stroke: COLORS.line, lineWidth: 0.8 });
      doc.textAt(label.toUpperCase(), x + 8, doc.y + 14, { size: 6.5, bold: true, color: COLORS.gray });
      doc.textAt(value, x + 8, doc.y + 30, { size: 12.5, bold: true, color: COLORS.navy });
      if (hint) doc.textAt(hint, x + 8, doc.y + 41, { size: 7, color: COLORS.gray });
    });
    doc.y += h + 8;
  }
}

export function reportPdf(report: MonthReport, series: MonthPoint[], company: { name: string; phone: string }, tz: string): Buffer {
  const doc = new PdfDoc({
    title: `Rapport ${report.label} - ${company.name}`,
    author: company.name,
    footer: `${company.name} · Rapport ${report.label} · Document interne`,
  });
  const t = report.totals;
  const p = report.previous;

  // En-tête
  doc.rect(0, 0, 595.28, 84, { fill: COLORS.navy });
  doc.textAt(company.name.toUpperCase(), doc.margin, 36, { size: 10, bold: true, color: COLORS.gold });
  doc.textAt(`Rapport mensuel · ${report.label}`, doc.margin, 60, { size: 20, bold: true, color: COLORS.white });
  const gen = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, dateStyle: "long", timeStyle: "short" }).format(new Date(report.generatedAt));
  doc.textAt(`Généré le ${gen}`, doc.margin, 76, { size: 8, color: COLORS.white, width: doc.contentWidth, align: "right" });
  doc.y = 104;

  kpis(doc, [
    ["Chiffre d'affaires", money(t.revenue), `${evolution(t.revenue, p.revenue)} vs ${p.label}`],
    ["Réservations", num(t.count), `${evolution(t.count, p.count)} vs ${p.label}`],
    ["Jours de location", num(t.rentDays), `${evolution(t.rentDays, p.rentDays)} vs ${p.label}`],
    ["Panier moyen", money(t.avgBasket)],
    ["Locations", num(t.rentCount)],
    ["Ventes", num(t.buyCount)],
    ["Payé", money(t.paid)],
    ["À encaisser", money(t.toCollect), t.cancelled ? `${t.cancelled} annulée(s) non comptée(s)` : ""],
  ]);

  // Résumé en phrases
  const best = report.byVehicle[0];
  const sentences: string[] = [];
  sentences.push(
    t.count === 0
      ? "Aucune réservation enregistrée ce mois-ci."
      : `${num(t.count)} réservation(s) ce mois-ci (${num(t.rentCount)} location(s), ${num(t.buyCount)} vente(s)) pour ${money(t.revenue)}.`,
  );
  if (best) sentences.push(`Véhicule le plus rentable : ${best.name} (${num(best.count)} réservation(s), ${money(best.revenue)}).`);
  if (t.withDriver) sentences.push(`${num(t.withDriver)} réservation(s) avec chauffeur.`);
  if (t.gifts) sentences.push(`${num(t.gifts)} véhicule(s) offert(s) en cadeau.`);
  doc.para(sentences.join(" "), { size: 9.5, color: COLORS.gray });

  doc.heading("Chiffre d'affaires par jour");
  barChart(doc, report.byDay.map((d) => d.revenue), report.byDay.map((d) => String(d.day)));

  doc.heading("Véhicules");
  table(
    doc,
    [
      { label: "Véhicule", width: 215 },
      { label: "Réservations", width: 80, align: "right" },
      { label: "Jours loués", width: 80, align: "right" },
      { label: "Chiffre d'affaires", width: 120, align: "right" },
    ],
    report.byVehicle.map((v) => [v.name, num(v.count), num(v.days), money(v.revenue)]),
  );

  doc.heading("Lieux de remise");
  table(
    doc,
    [
      { label: "Lieu", width: 295 },
      { label: "Réservations", width: 80, align: "right" },
      { label: "Chiffre d'affaires", width: 120, align: "right" },
    ],
    [...report.byCity.map((c) => [`Ville : ${c.label}`, num(c.count), money(c.revenue)]), ...report.byPlace.map((c) => [c.label, num(c.count), money(c.revenue)])],
  );

  doc.heading("Paiements et statuts");
  table(
    doc,
    [
      { label: "Moyen de paiement", width: 295 },
      { label: "Réservations", width: 80, align: "right" },
      { label: "Montant", width: 120, align: "right" },
    ],
    report.byPayment.map((x) => [x.label, num(x.count), money(x.amount)]),
  );
  doc.ensure(130); // le tableau des statuts reste d'un seul bloc
  table(
    doc,
    [
      { label: "Suivi des réservations", width: 295 },
      { label: "Nombre", width: 200, align: "right" },
    ],
    report.byStatus.map((s) => [s.label, num(s.count)]),
  );

  if (report.topCustomers.length) {
    doc.heading("Meilleurs clients du mois");
    table(
      doc,
      [
        { label: "Client", width: 215 },
        { label: "Téléphone", width: 110 },
        { label: "Réserv.", width: 55, align: "right" },
        { label: "Montant", width: 115, align: "right" },
      ],
      report.topCustomers.map((c) => [c.name, c.phone, num(c.count), money(c.revenue)]),
    );
  }

  // Évolution sur 12 mois (le titre reste avec son graphique)
  doc.ensure(200);
  doc.heading("Évolution sur 12 mois : chiffre d'affaires");
  barChart(doc, series.map((s) => s.revenue), series.map((s) => s.label.replace(/\s\d{4}$/, "")));
  doc.heading("Statistiques de location par mois");
  table(
    doc,
    [
      { label: "Mois", width: 110 },
      { label: "Réserv.", width: 60, align: "right" },
      { label: "Locations", width: 65, align: "right" },
      { label: "Ventes", width: 55, align: "right" },
      { label: "Jours loués", width: 70, align: "right" },
      { label: "Chiffre d'affaires", width: 135, align: "right" },
    ],
    [...series].reverse().map((s) => [monthLabel(s.month), num(s.count), num(s.rentals), num(s.sales), num(s.rentDays), money(s.revenue)]),
  );

  // Détail
  doc.heading(`Détail des réservations (${report.rows.length})`);
  table(
    doc,
    [
      { label: "Réf.", width: 62 },
      { label: "Date", width: 46 },
      { label: "Client", width: 88 },
      { label: "Véhicule", width: 115 },
      { label: "Type", width: 44 },
      { label: "Montant", width: 70, align: "right" },
      { label: "Statut", width: 70 },
    ],
    report.rows.map((r) => [r.id, dmy(r.date).slice(0, 5), r.name, r.vehicle, r.type === "Location" ? `Loc. ${r.days} j` : "Achat", num(r.amount), r.status]),
    { size: 7.5 },
  );
  doc.para(`Les réservations annulées ne sont pas comptées dans les totaux. Rapport basé sur la date de la demande (fuseau ${tz}). Contact : ${company.phone}.`, { size: 8, color: COLORS.gray });

  return doc.finish();
}

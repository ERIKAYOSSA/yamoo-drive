// Comptes clients (facultatifs) : bouton « Compte » de l'en-tête, page /compte, préremplissage de la réservation.
import type { Reservation } from "../shared/types.js";
import { L, getLang, tr } from "./i18n.js";

interface PublicUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}
interface Me {
  user: PublicUser | null;
  reservations: Reservation[];
}
interface CatalogLite {
  vehicles: { n: string }[];
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const val = (id: string): string => (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";
const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

let me: Me = { user: null, reservations: [] };
let vehicles: { n: string }[] = [];

/** Message du serveur (toujours en français) traduit si le site est en anglais. */
const t = (s: string): string => (getLang() === "en" ? (tr(s) ?? s) : s);

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
  if (!res.ok) throw new Error(t([data.error ?? "Une erreur est survenue.", ...(data.details ?? [])].join(" ")));
  return data as T;
}

async function fetchMe(): Promise<Me> {
  try {
    const res = await fetch("/api/me");
    if (res.ok) return (await res.json()) as Me;
  } catch {
    /* hors ligne : on reste en mode « invité » */
  }
  return { user: null, reservations: [] };
}

const firstName = (name: string): string => name.split(/\s+/)[0] ?? name;
const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
const fmtDate = (iso: string): string => new Date(iso).toLocaleDateString(L("fr-FR", "en-GB"), { day: "numeric", month: "long", year: "numeric" });
const money = (n: number): string => `${Math.round(n).toLocaleString(L("fr-FR", "en-US"))} FCFA`;
const showMsg = (id: string, text: string): void => {
  const el = $(id);
  el.textContent = text;
  el.hidden = !text;
};

function setBadge(): void {
  const a = document.getElementById("acc");
  if (!a) return;
  a.textContent = me.user ? firstName(me.user.name) : L("Se connecter", "Log in");
  a.classList.toggle("in", !!me.user);
  a.setAttribute("aria-label", me.user ? L("Mon compte", "My account") : L("Se connecter", "Log in"));
}

// ---------------------------------------------------------------------------------------------
// Réservation : préremplissage et message d'invitation
// ---------------------------------------------------------------------------------------------
function fill(id: string, value: string): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el || el.value.trim()) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function prepareReserve(): void {
  const hint = document.getElementById("accHint");
  if (me.user) {
    fill("cname", me.user.name);
    fill("cphone", `+${me.user.phone}`);
  }
  if (hint) {
    hint.hidden = false;
    hint.innerHTML = me.user
      ? esc(L("Connecté : cette réservation sera ajoutée à votre compte.", "Logged in: this booking will be added to your account."))
      : `${esc(L("Pas encore de compte ?", "No account yet?"))} <a href="/compte">${esc(L("Créez-en un", "Create one"))}</a> ${esc(L("(facultatif) pour suivre vos réservations.", "(optional) to follow your bookings."))}`;
  }
}

// ---------------------------------------------------------------------------------------------
// Page /compte
// ---------------------------------------------------------------------------------------------
type Tier = "new" | "regular" | "loyal" | "vip";
function tierOf(count: number, spent: number): Tier {
  if (count >= 5 || spent >= 1_000_000) return "vip";
  if (count >= 3) return "loyal";
  if (count >= 2) return "regular";
  return "new";
}
const TIER_LABEL = (k: Tier): string => ({ new: L("Nouveau", "New"), regular: L("Régulier", "Regular"), loyal: L("Fidèle", "Loyal"), vip: "VIP" })[k];
const STATUS = (r: Reservation): { label: string; cls: string } => {
  switch (r.fulfillment ?? "new") {
    case "confirmed": return { label: L("Confirmée", "Confirmed"), cls: "ok" };
    case "delivered": return { label: L("Véhicule remis", "Vehicle handed over"), cls: "ok" };
    case "completed": return { label: L("Terminée", "Completed"), cls: "done" };
    case "cancelled": return { label: L("Annulée", "Cancelled"), cls: "off" };
    default: return { label: L("Demande reçue", "Request received"), cls: "wait" };
  }
};

function paintUser(): void {
  const u = me.user;
  if (!u) return;
  const active = me.reservations.filter((r) => (r.fulfillment ?? "new") !== "cancelled");
  const spent = active.reduce((s, r) => s + r.quote.total, 0);
  const tier = tierOf(active.length, spent);
  $("auAv").textContent = initials(u.name);
  $("auName").textContent = u.name;
  $("auSince").textContent = `${L("Client depuis le", "Customer since")} ${fmtDate(u.createdAt)} · ${active.length} ${L(active.length > 1 ? "réservations" : "réservation", active.length > 1 ? "bookings" : "booking")}`;
  $("auTier").textContent = TIER_LABEL(tier);
  $("auTier").className = `acc-tier ${tier}`;
  ($("pfName") as HTMLInputElement).value = u.name;
  ($("pfEmail") as HTMLInputElement).value = u.email ?? "";
  $("pfPhone").textContent = `${L("Téléphone", "Phone")} : +${u.phone}`;

  const rows = [...me.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $("auRes").innerHTML = rows.length
    ? rows
        .map((r) => {
          const st = STATUS(r);
          const car = vehicles[r.input.vehicleId]?.n ?? `#${r.input.vehicleId}`;
          const what = r.input.mode === "rent" ? L(`location ${r.quote.days} j`, `rental ${r.quote.days} d`) : L("achat", "purchase");
          const pay = r.status === "pending_payment" ? `<a href="/paiement?ref=${esc(r.id)}">${esc(L("Payer", "Pay"))}</a>` : "";
          return `<div class="acc-res"><div><b>${esc(car)}</b> <span class="acc-pill ${st.cls}">${esc(st.label)}</span><br><small>${esc(r.id)} · ${esc(what)} · ${esc(fmtDate(r.createdAt))}</small></div><div class="acc-r2"><b>${esc(money(r.quote.total))}</b><span>${pay} <a href="/api/reservations/${esc(r.id)}/contract" target="_blank" rel="noopener">${esc(L("Contrat PDF", "PDF contract"))}</a></span></div></div>`;
        })
        .join("")
    : `<p class="acc-note">${esc(L("Aucune réservation pour le moment. Réservez en étant connecté : elle apparaîtra ici.", "No bookings yet. Book while logged in and it will appear here."))}</p>`;
}

function showState(): void {
  $("accLoading").hidden = true;
  $("accGuest").hidden = !!me.user;
  $("accUser").hidden = !me.user;
  if (me.user) paintUser();
}

async function refresh(): Promise<void> {
  me = await fetchMe();
  setBadge();
  showState();
}

function initPage(): void {
  // Onglets « Se connecter » / « Créer un compte »
  document.querySelectorAll<HTMLButtonElement>("[data-acc]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-acc]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("loginForm").hidden = b.dataset.acc !== "login";
      $("regForm").hidden = b.dataset.acc !== "register";
    }),
  );

  const run = (form: string, errId: string, work: () => Promise<void>): void => {
    $(form).addEventListener("submit", (ev) => {
      ev.preventDefault();
      const btn = $(form).querySelector("button[type=submit]") as HTMLButtonElement;
      showMsg(errId, "");
      btn.disabled = true;
      void work()
        .catch((e: Error) => showMsg(errId, e.message))
        .finally(() => {
          btn.disabled = false;
        });
    });
  };

  run("loginForm", "lgErr", async () => {
    await post("/api/auth/login", { phone: val("lgPhone"), password: val("lgPw") });
    ($("lgPw") as HTMLInputElement).value = "";
    await refresh();
  });
  run("regForm", "rgErr", async () => {
    await post("/api/auth/register", { name: val("rgName"), phone: val("rgPhone"), email: val("rgEmail"), password: val("rgPw") });
    ($("rgPw") as HTMLInputElement).value = "";
    await refresh();
  });
  run("profForm", "pfErr", async () => {
    showMsg("pfOk", "");
    await post("/api/me", { name: val("pfName"), email: val("pfEmail") });
    await refresh();
    showMsg("pfOk", L("Informations enregistrées.", "Information saved."));
  });
  run("pwForm", "pwErr", async () => {
    showMsg("pwOk", "");
    await post("/api/me/password", { current: val("pwCur"), next: val("pwNew") });
    ($("pwCur") as HTMLInputElement).value = "";
    ($("pwNew") as HTMLInputElement).value = "";
    showMsg("pwOk", L("Mot de passe modifié.", "Password changed."));
  });
  run("delForm", "delErr", async () => {
    await post("/api/me/delete", { password: val("delPw") });
    ($("delPw") as HTMLInputElement).value = "";
    await refresh();
  });
  $("auLogout").addEventListener("click", () => {
    void post("/api/auth/logout", {}).then(refresh);
  });
  // Les textes générés par le script se refont dans la bonne langue.
  document.getElementById("lang")?.addEventListener("change", () => {
    setBadge();
    if (me.user) paintUser();
  });
}

export async function initAccount(page: string): Promise<void> {
  me = await fetchMe();
  setBadge();
  document.getElementById("lang")?.addEventListener("change", setBadge);
  if (page === "reserver") prepareReserve();
  if (page === "compte") {
    try {
      vehicles = ((await (await fetch("/api/catalog")).json()) as CatalogLite).vehicles;
    } catch {
      /* les noms de véhicules sont facultatifs */
    }
    initPage();
    showState();
  }
}

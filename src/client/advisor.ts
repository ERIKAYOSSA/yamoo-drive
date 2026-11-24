// Conseiller virtuel : bouton flottant + fenêtre de discussion sur toutes les pages du site.
// Il parle uniquement à /api/advisor (la clé de l'IA reste sur le serveur).
import type { Catalog, Vehicle } from "../shared/types.js";
import { formatIn } from "./currency.js";
import { L, getLang } from "./i18n.js";

interface Reply {
  reply: string;
  vehicles: number[];
  mode: "ai" | "faq";
  suggestions: string[];
}
interface Msg {
  role: "user" | "assistant";
  text: string;
  vehicles?: number[];
  suggestions?: string[];
  error?: boolean;
}
interface FaqData {
  categories: { id: string; label: Record<"fr" | "en", string> }[];
  entries: { id: string; category: string; popular: boolean; q: Record<"fr" | "en", string>; a: Record<"fr" | "en", string> }[];
}

const KEY = "yd-adv";
const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Texte de l'assistant → HTML sûr : **gras**, tirets, retours à la ligne. */
function format(text: string): string {
  return esc(text)
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/^[-•]\s+(.*)$/gm, "<span class=\"adv-li\">$1</span>")
    .replace(/\n/g, "<br>");
}

let catalog: Catalog;
let msgs: Msg[] = [];
let faq: FaqData | null = null;
let busy = false;
let panel: HTMLElement;
let btn: HTMLButtonElement;

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const lang = (): "fr" | "en" => (getLang() === "en" ? "en" : "fr");

function load(): void {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as Msg[];
    if (Array.isArray(raw)) msgs = raw.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string").slice(-30);
  } catch {
    msgs = [];
  }
}
function save(): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));
  } catch {
    /* ignoré */
  }
}

async function loadFaq(): Promise<void> {
  if (faq) return;
  try {
    const res = await fetch("/api/faq");
    if (res.ok) faq = (await res.json()) as FaqData;
  } catch {
    /* sans FAQ, le conseiller fonctionne quand même */
  }
}

// ---------------------------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------------------------
function carCard(id: number): string {
  const v: Vehicle | undefined = catalog.vehicles.find((x) => x.id === id);
  if (!v) return "";
  const crop = v.ph[0];
  const photo = crop ? `style="background-image:var(--p${esc(crop[0])});background-size:${esc(crop[1])};background-position:${esc(crop[2])}"` : "";
  return `<a class="adv-car" href="/vehicule?id=${v.id}"><span class="adv-ph" ${photo} role="img" aria-label="${esc(v.n)}"></span>
    <span class="adv-ci"><b>${esc(v.n)}</b><small>${esc(formatIn(v.rent))} ${L("par jour", "per day")}</small><small>${esc(L("Achat", "Purchase"))} ${esc(formatIn(v.buy))}</small></span>
    <span class="adv-go">${L("Voir", "View")} ›</span></a>`;
}

function popularQuestions(): string[] {
  const l = lang();
  const list = (faq?.entries ?? []).filter((e) => e.popular).slice(0, 6).map((e) => e.q[l]);
  return [L("Je cherche un véhicule adapté à mon besoin", "I'm looking for a vehicle that fits my needs"), ...list];
}

function bubble(m: Msg, last: boolean): string {
  if (m.role === "user") return `<div class="adv-row me"><div class="adv-b">${esc(m.text)}</div></div>`;
  const chips = last && m.suggestions?.length ? `<div class="adv-chips">${m.suggestions.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : "";
  return `<div class="adv-row"><div class="adv-b${m.error ? " err" : ""}">${format(m.text)}</div>${(m.vehicles ?? []).map(carCard).join("")}${chips}</div>`;
}

function renderLog(): void {
  const log = $("advLog");
  let html = "";
  if (!msgs.length) {
    html += `<div class="adv-row"><div class="adv-b">${esc(L("Bonjour ! Je suis le conseiller Yamoo Drive. Dites-moi ce que vous cherchez (occasion, budget, nombre de personnes) ou choisissez une question.", "Hello! I'm the Yamoo Drive advisor. Tell me what you're looking for (occasion, budget, number of people) or pick a question."))}</div>
      <div class="adv-chips">${popularQuestions().map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div></div>`;
  } else {
    html += msgs.map((m, i) => bubble(m, i === msgs.length - 1)).join("");
  }
  if (busy) html += `<div class="adv-row"><div class="adv-b adv-typing" aria-label="${esc(L("Le conseiller écrit", "The advisor is typing"))}"><i></i><i></i><i></i></div></div>`;
  log.innerHTML = html;
  log.scrollTop = log.scrollHeight;
  updateWhatsApp();
}

function updateWhatsApp(): void {
  const lastQ = [...msgs].reverse().find((m) => m.role === "user")?.text ?? "";
  const text = L("Bonjour Yamoo Drive, j'ai une question", "Hello Yamoo Drive, I have a question") + (lastQ ? ` : ${lastQ}` : "");
  ($("advWa") as HTMLAnchorElement).href = `https://wa.me/${catalog.config.whatsapp}?text=${encodeURIComponent(text)}`;
}

function labels(): void {
  btn.setAttribute("aria-label", L("Ouvrir le conseiller Yamoo Drive", "Open the Yamoo Drive advisor"));
  panel.setAttribute("aria-label", L("Conseiller Yamoo Drive", "Yamoo Drive advisor"));
  $("advTitle").textContent = L("Conseiller Yamoo", "Yamoo advisor");
  $("advSub").textContent = L("Répond en quelques secondes", "Replies in seconds");
  $("advWa").textContent = "WhatsApp";
  $("advClose").setAttribute("aria-label", L("Fermer", "Close"));
  const input = $("advIn") as HTMLInputElement;
  input.placeholder = L("Posez votre question…", "Ask your question…");
  $("advSend").setAttribute("aria-label", L("Envoyer", "Send"));
  $("advNote").textContent = L("Réponses générées automatiquement : notre équipe confirme toujours la disponibilité et le prix.", "Automatically generated answers: our team always confirms availability and price.");
}

// ---------------------------------------------------------------------------------------------
// Envoi d'un message
// ---------------------------------------------------------------------------------------------
async function send(text: string): Promise<void> {
  const q = text.trim().slice(0, 500);
  if (!q || busy) return;
  msgs.push({ role: "user", text: q });
  busy = true;
  renderLog();
  save();
  const history = msgs.filter((m) => !m.error).slice(-10).map((m) => ({ role: m.role, content: m.text }));
  try {
    const res = await fetch("/api/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: lang(), messages: history }) });
    const data = (await res.json().catch(() => ({}))) as Partial<Reply> & { error?: string };
    if (!res.ok || typeof data.reply !== "string") throw new Error(data.error ?? "");
    msgs.push({ role: "assistant", text: data.reply, vehicles: data.vehicles ?? [], suggestions: data.suggestions ?? [] });
  } catch {
    msgs.push({ role: "assistant", error: true, text: L("Je n'arrive pas à répondre pour le moment. Vous pouvez écrire à notre équipe sur WhatsApp : elle vous répond rapidement.", "I can't answer right now. You can write to our team on WhatsApp: they reply quickly.") });
  }
  busy = false;
  renderLog();
  save();
  ($("advIn") as HTMLInputElement).focus();
}

// ---------------------------------------------------------------------------------------------
// Ouverture / fermeture
// ---------------------------------------------------------------------------------------------
function setOpen(open: boolean): void {
  panel.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  $("advTip")?.remove();
  if (open) {
    void loadFaq().then(() => {
      if (!msgs.length) renderLog();
    });
    renderLog();
    setTimeout(() => ($("advIn") as HTMLInputElement).focus(), 50);
  } else btn.focus();
}

export function initAdvisor(cat: Catalog): void {
  catalog = cat;
  load();
  const root = document.createElement("div");
  root.id = "advisor";
  root.innerHTML = `
    <button class="adv-btn" id="advBtn" type="button" aria-expanded="false" aria-controls="advPanel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/></svg>
    </button>
    <section class="adv-panel" id="advPanel" role="dialog" aria-modal="false" hidden>
      <div class="adv-head">
        <span class="adv-av" aria-hidden="true">Y</span>
        <div class="adv-t"><b id="advTitle"></b><small id="advSub"></small></div>
        <a class="adv-wa" id="advWa" target="_blank" rel="noopener"></a>
        <button class="adv-x" id="advClose" type="button">×</button>
      </div>
      <div class="adv-log" id="advLog" aria-live="polite"></div>
      <form class="adv-form" id="advForm" autocomplete="off">
        <input id="advIn" maxlength="500" enterkeyhint="send">
        <button type="submit" id="advSend"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg></button>
      </form>
      <p class="adv-note" id="advNote"></p>
    </section>`;
  document.body.append(root);
  btn = $("advBtn") as HTMLButtonElement;
  panel = $("advPanel");
  labels();

  btn.addEventListener("click", () => setOpen(!!panel.hidden));
  $("advClose").addEventListener("click", () => setOpen(false));
  $("advForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const input = $("advIn") as HTMLInputElement;
    const v = input.value;
    input.value = "";
    void send(v);
  });
  $("advLog").addEventListener("click", (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>("[data-q]");
    if (b?.dataset.q) void send(b.dataset.q);
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !panel.hidden) setOpen(false);
  });
  // Un lien « Poser ma question » ailleurs sur le site peut ouvrir le conseiller (éventuellement avec une question).
  document.addEventListener("yd:advisor-open", (ev) => {
    setOpen(true);
    const q = (ev as CustomEvent<{ question?: string }>).detail?.question;
    if (q) void send(q);
  });
  // Langue ou devise changées : textes et prix de la fenêtre mis à jour.
  const refresh = (): void => {
    labels();
    renderLog();
  };
  document.getElementById("lang")?.addEventListener("change", () => setTimeout(refresh, 0));
  document.getElementById("cur")?.addEventListener("change", () => setTimeout(refresh, 0));

  // Petite bulle d'invitation, une seule fois par session.
  try {
    if (!sessionStorage.getItem("yd-adv-tip") && !msgs.length) {
      setTimeout(() => {
        if (!panel.hidden) return;
        const tip = document.createElement("button");
        tip.id = "advTip";
        tip.type = "button";
        tip.className = "adv-tip";
        tip.textContent = L("Besoin d'aide pour choisir ?", "Need help choosing?");
        tip.addEventListener("click", () => setOpen(true));
        root.append(tip);
        sessionStorage.setItem("yd-adv-tip", "1");
        setTimeout(() => tip.remove(), 9000);
      }, 8000);
    }
  } catch {
    /* ignoré */
  }
}

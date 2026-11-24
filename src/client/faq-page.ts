// Page /faq : questions fréquentes avec recherche et catégories (données de /api/faq).
import { L, getLang } from "./i18n.js";

interface FaqData {
  categories: { id: string; label: Record<"fr" | "en", string> }[];
  entries: { id: string; category: string; popular: boolean; q: Record<"fr" | "en", string>; a: Record<"fr" | "en", string> }[];
}

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const norm = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export async function initFaqPage(): Promise<void> {
  let data: FaqData;
  try {
    data = (await (await fetch("/api/faq")).json()) as FaqData;
  } catch {
    $("faqList").innerHTML = `<p class="sub">${esc(L("Impossible de charger les questions. Rechargez la page.", "Unable to load the questions. Please reload the page."))}</p>`;
    return;
  }
  let cat = "all";
  let query = "";
  const lang = (): "fr" | "en" => (getLang() === "en" ? "en" : "fr");

  const paint = (): void => {
    const l = lang();
    $("faqCats").innerHTML = [{ id: "all", label: { fr: "Toutes", en: "All" } }, ...data.categories]
      .map((c) => `<button type="button" data-cat="${esc(c.id)}" aria-pressed="${c.id === cat}">${esc(c.label[l])}</button>`)
      .join("");
    const words = norm(query).split(/\s+/).filter((w) => w.length > 1);
    const rows = data.entries.filter((e) => (cat === "all" || e.category === cat) && words.every((w) => norm(`${e.q[l]} ${e.a[l]}`).includes(w)));
    $("faqList").innerHTML = rows.length
      ? rows.map((e) => `<details class="faq-item" id="${esc(e.id)}"><summary>${esc(e.q[l])}</summary><div class="faq-a">${esc(e.a[l])}</div></details>`).join("")
      : `<p class="sub">${esc(L("Aucune question ne correspond à votre recherche. Demandez à notre conseiller !", "No question matches your search. Ask our advisor!"))}</p>`;
  };

  $("faqCats").addEventListener("click", (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>("[data-cat]");
    if (!b) return;
    cat = b.dataset.cat ?? "all";
    paint();
  });
  $("faqQ").addEventListener("input", (ev) => {
    query = (ev.target as HTMLInputElement).value;
    paint();
  });
  $("faqAsk").addEventListener("click", () => {
    const question = query.trim();
    document.dispatchEvent(new CustomEvent("yd:advisor-open", { detail: question ? { question } : {} }));
  });
  document.getElementById("lang")?.addEventListener("change", () => setTimeout(paint, 0));
  paint();

  // Lien direct vers une question : /faq#delivery
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (target instanceof HTMLDetailsElement) {
    target.open = true;
    target.scrollIntoView({ block: "center" });
  }
}

    // Traduction français ↔️ anglais.
    // Le site est écrit en français. En anglais, chaque texte affiché est remplacé par sa traduction
    // (voir lang-en.ts) ; le texte d'origine est conservé pour pouvoir revenir au français.
    import { EN, LABELS } from "./lang-en.js";
    export type Lang = "fr" | "en";
    const STORAGE_KEY = "yd-lang";
    let lang: Lang = "fr";
    try {
    const saved = 
    localStorage.getItem(STORAGE_KEY);
    if (saved === "fr" || saved === "en") lang = saved;
    } catch {
    /* stockage indisponible : français */
    }
    export const getLang = (): Lang => lang;
    /** Choisit le texte selon la langue : L("Bonjour", "Hello"). */
    export const L = (fr: string, en: string): string => (lang === "en" ? en : fr);

    const clean = (s: string): string => s.replace(/\s+/g, " ").trim();
    const dec = (s: string): string => 
    s.replace(",", ".");

    type Rule = [RegExp, (m: RegExpMatchArray) => string];
    /** Traduit un texte (null si on ne sait pas). */
    export function tr(text: string): string | null {
    const key = clean(text);
    if (!key) return null;
    const direct = EN[key];
    if (direct !== undefined) return direct;
    for (const [re, fn] of RULES) {
    const m = key.match(re);
    if (m) return fn(m);
    }
    // Plusieurs phrases collées (messages d'erreur du serveur) : on traduit phrase par phrase.
    const parts = key.split(/(?<=.)\s+/);
    if (parts.length > 1) {
    const out = parts.map((p) => tr(p));
    if (out.every((x) => x !== null)) return out.join(" ");
    }
    return null;
    }
    const t = (s: string): string => tr(s) ?? s;
    const RULES: Rule[] = [
    [/^(\d+) jours?/, (m) => `{m[1]} ${+m[1] > 1 ? "days" : "day"}], [/^pour (\d+) j$/, (m) => for ${m[1]} d], [/^(.+) \/ jour$/, (m) => ${m[1]} / day], [/^Pour (.+)$/, (m) => For ${m[1]}], [/^« (.*) »/, (m) => `“{t(m[1])}”],
    [/^(.+) · (à acheter|à louer)/, (m) => `{t(m[1])} · ${m[2] === "à acheter" ? "to buy" : "to rent"}], [/^(.+) · (Achat|Location)/, (m) => `{t(m[1])} · ${m[2] === "Achat" ? "Purchase" : "Rental"}],
    [/^Véhicule conseillé : (.+)$/, (m) => Suggested vehicle: ${t(m[1])}],
    [/^Jusqu’à -(\d+)% sur une sélection de véhicules$/, (m) => Up to -${m[1]}% on a selection of vehicles],
    [/^Fin dans (\d+) j (\d+) h (\d+) min (\d+) s$/, (m) => Ends in ${m[1]} d ${m[2]} h ${m[3]} min ${m[4]} s],
    [/^Début choisi : (.+). Touchez Réserver pour continuer.$/, (m) => Start date chosen: ${m[1]}. Tap Book to continue.],
    [/^(\d+) ans d’expérience · ★ ([\d,]+)(?: · (.+))?/, (m) => `{m[1]} years of experience · ★ {dec(m[2])}{m[3] ?  · ${t(m[3])} : ""}], [/^Choisir (.+)$/, (m) => Choose ${m[1]}], [/^Payer (.+)$/, (m) => Pay ${m[1]}], [/^Référence$/, () => "Reference"], [/^Client : (.+)$/, (m) => Customer: ${m[1]}], [/^Location : (.+) (\d+) × (.+)/, (m) => `Rental: ${t(m[1])} ({m[2]} × ${m[3]})],
    [/^Achat : (.+)$/, (m) => Purchase: ${t(m[1])}],
    [/^Chauffeur (\d+) × (.+)/, (m) => `Driver ({m[1]} × ${m[2]})], [/^Montant réglé en FCFA\. Équivalent indicatif : (.+)$/, (m) => Amount paid in FCFA. Indicative equivalent: ${m[1]}], [/^Merci (.+) ! Votre paiement de démonstration par (.+) est enregistré\. Téléchargez votre contrat de location ci-dessous\.$/, (m) => Thank you ${m[1]}! Your demo payment by ${t(m[2])} is recorded. Download your rental contract below.], [/^Merci (.+) ! Votre réservation est enregistrée : vous réglez à l’agence\. Téléchargez votre contrat ci-dessous\.$/, (m) => Thank you ${m[1]}! Your booking is saved: you pay at the agency. Download your contract below.], [/^(Le nom|Le téléphone|Le lieu de remise|Le prénom du bénéficiaire|Le message) est obligatoire\./, (m) => `{LABELS[m[1]]} is required.],
    [/^(Le nom|Le téléphone|Le lieu de remise|Le prénom du bénéficiaire|Le message) est invalide./, (m) => `{LABELS[m[1]]} is invalid.], [/^(Le nom|Le téléphone|Le lieu de remise|Le prénom du bénéficiaire|Le message) est trop court\./, (m) => `{LABELS[m[1]]} is too short.],
    [/^(Le nom|Le téléphone|Le lieu de remise|Le prénom du bénéficiaire|Le message) est trop long (\d+) caractères maximum./, (m) => `{LABELS[m[1]]} is too long (${m[2]} characters maximum).], [/^(.+) indisponible$/, (m) => ${m[1]} unavailable`],
    ];

    // ---------------------------------------------------------------------------------------------
    // Application au document
    // ---------------------------------------------------------------------------------------------

    interface Entry {
    fr: string;
    en: string;
    }
    const textEntries = new WeakMap<Text, Entry>();
    const attrEntries = new WeakMap<Element, Record<string, Entry>>();
    const ATTRS = ["placeholder", "aria-label", "title", "alt"];
    const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT"]);
    function doText(n: Text): void {
    const raw = n.nodeValue ?? "";
    if (!raw.trim()) return;
    const known = textEntries.get(n);
    if (known && raw === known.en) return; // déjà traduit
    const out = tr(raw);
    if (out === null) {
    textEntries.delete(n);
    return;
    }
    const lead = raw.match(/^\s*/)?.[0] ?? "";
    const trail = raw.match(/\s*$/)?.[0] ?? "";
    const en = lead + out + trail;
    textEntries.set(n, { fr: raw, en });
    if (en !== raw) n.nodeValue = en;
    }
    function doAttrs(e: Element): void {
    for (const a of ATTRS) {
    const v = e.getAttribute(a);
    if (!v) continue;
    const rec = attrEntries.get(e) ?? {};
    if (rec[a] && v === rec[a].en) continue;
    const out = tr(v);
    if (out === null) continue;
    rec[a] = { fr: v, en: out };
    attrEntries.set(e, rec);
    e.setAttribute(a, out);
    }
    // Liens WhatsApp écrits en dur dans les pages : on change la langue du message pré-rempli.
    if (e instanceof HTMLAnchorElement && e.href.includes("wa.me") && e.getAttribute("href")?.includes("Bonjour%20Yamoo%20Drive")) {
    const rec = attrEntries.get(e) ?? {};
    const cur = e.getAttribute("href") ?? "";
    if (!rec.href || cur !== rec.href.en) {
    const en = cur.replace("Bonjour%20Yamoo%20Drive", "Hello%20Yamoo%20Drive");
    rec.href = { fr: cur, en };
    attrEntries.set(e, rec);
    e.setAttribute("href", en);
    }
    }
    }
    function translateTree(root: Node): void {
    if (lang !== "en") return;
    if (root.nodeType === Node.TEXT_NODE) {
    if (!SKIP.has((root.parentElement?.tagName ?? ""))) doText(root as Text);
    return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
    if (!SKIP.has(n.parentElement?.tagName ?? "")) doText(n as Text);
    }
    const base = root.nodeType === Node.ELEMENT_NODE ? (root as Element) : document.documentElement;
    if (root.nodeType === Node.ELEMENT_NODE) doAttrs(base);
    base.querySelectorAll("[placeholder],[aria-label],[title],[alt],a[href*='wa.me']").forEach(doAttrs);
    }
    function restoreAll(): void {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
    const entry = textEntries.get(n as Text);
    if (entry && (n as Text).nodeValue === entry.en) (n as Text).nodeValue = entry.fr;
    }
    document.querySelectorAll("*").forEach((e) => {
    const rec = attrEntries.get(e);
    if (!rec) return;
    for (const [a, entry] of Object.entries(rec)) {
    if (e.getAttribute(a) === entry.en) e.setAttribute(a, entry.fr);
    }
    });
    }
    const originalTitle = document.title;
    const metaDesc = (): HTMLMetaElement | null => document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc()?.content ?? "";
    function doHead(): void {
    if (lang === "en") {
    const m = originalTitle.match(/^(.*) – Yamoo Drive$/);
    document.title = m ? ${t(m[1])} – Yamoo Drive : t(originalTitle);
    const md = metaDesc();
    if (md) md.content = t(originalDesc);
    } else {
    document.title = originalTitle;
    const md = metaDesc();
    if (md) md.content = originalDesc;
    }
    }
    let observer: MutationObserver | null = null;
    function apply(): void {
    document.documentElement.lang = lang;
    doHead();
    if (lang === "en") translateTree(document.body);
    else restoreAll();
    const sel = document.getElementById("lang") as HTMLSelectElement | null;
    if (sel) sel.value = lang;
    }
    export function setLang(next: string): void {
    if (next !== "fr" && next !== "en") return;
    lang = next;
    try {
    localStorage.setItem(STORAGE_KEY, next);
    } catch {
    /* ignoré */
    }
    apply();
    }
    /** À appeler une fois au chargement : traduit la page et surveille les contenus ajoutés ensuite.*/
    export function initI18n(): void {
    apply();
    const sel = document.getElementById("lang") as HTMLSelectElement | null;
    sel?.addEventListener("change", () => setLang(sel.value));
    observer = new MutationObserver((muts) => {
    if (lang !== "en") return;
    for (const m of muts) {
    if (m.type === "childList") m.addedNodes.forEach((n) => translateTree(n));
    else if (m.type === "characterData") translateTree(m.target);
    else if (m.type === "attributes" && m.target instanceof Element) doAttrs(m.target);
    }
    });
    observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS, "href"],
    });
    }
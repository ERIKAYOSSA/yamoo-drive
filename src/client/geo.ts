// Position exacte du lieu de remise : bouton « Partager ma position » ou lien Google Maps collé par le client.
import { L } from "./i18n.js";

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Mêmes règles que le serveur : uniquement de vrais liens Google Maps en https. */
export function isMapsLink(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
  const h = u.hostname.toLowerCase();
  const google = /^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(h) && u.pathname.startsWith("/maps");
  return google || h === "maps.app.goo.gl" || h === "maps.google.com" || (h === "goo.gl" && u.pathname.startsWith("/maps"));
}

export function initGeo(): void {
  const btn = document.getElementById("geoBtn") as HTMLButtonElement | null;
  const input = document.getElementById("mapLink") as HTMLInputElement | null;
  const st = document.getElementById("geoSt");
  if (!btn || !input || !st) return;

  const show = (html: string, kind: "ok" | "err" | ""): void => {
    st.hidden = !html;
    st.className = `geo-st ${kind}`;
    st.innerHTML = html;
  };
  const refresh = (): void => {
    const v = input.value.trim();
    if (!v) return show("", "");
    if (isMapsLink(v)) {
      show(`<span>${esc(L("Position ajoutée", "Location added"))}</span><a href="${esc(v)}" target="_blank" rel="noopener">${esc(L("Voir sur la carte", "View on the map"))}</a><button type="button" class="geo-x" id="geoX">${esc(L("Retirer", "Remove"))}</button>`, "ok");
    } else {
      show(esc(L("Collez un lien Google Maps (maps.app.goo.gl ou google.com/maps).", "Paste a Google Maps link (maps.app.goo.gl or google.com/maps).")), "err");
    }
  };
  const setValue = (v: string): void => {
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true })); // enregistre aussi dans le brouillon de la réservation
  };

  input.addEventListener("input", refresh);
  st.addEventListener("click", (ev) => {
    if ((ev.target as HTMLElement).id === "geoX") setValue("");
  });
  document.getElementById("lang")?.addEventListener("change", () => setTimeout(refresh, 0));

  btn.addEventListener("click", () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      show(esc(L("Le partage de position demande une connexion sécurisée (https). Collez plutôt un lien Google Maps.", "Sharing your location needs a secure connection (https). Paste a Google Maps link instead.")), "err");
      return;
    }
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = L("Recherche de votre position…", "Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn.disabled = false;
        btn.textContent = label;
        setValue(`https://www.google.com/maps?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        btn.disabled = false;
        btn.textContent = label;
        show(
          esc(
            err.code === err.PERMISSION_DENIED
              ? L("Autorisation refusée. Activez la localisation pour ce site, ou collez un lien Google Maps.", "Permission denied. Enable location for this site, or paste a Google Maps link.")
              : L("Position introuvable pour le moment. Collez un lien Google Maps.", "Location not available right now. Paste a Google Maps link."),
          ),
          "err",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  });
  refresh();
}

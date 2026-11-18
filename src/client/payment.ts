import { ApiError, contractUrl, getReservation, pay } from "./api.js";
import { el, esc } from "./dom.js";
import { formatMoney } from "../shared/pricing.js";
import { formatIn, getCurrency } from "./currency.js";
import { L, tr } from "./i18n.js";
import type { UIApi } from "./ui.js";
import type { PaymentMethod, Reservation } from "../shared/types.js";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Carte bancaire",
  orange_money: "Orange Money",
  mtn_momo: "MTN Mobile Money",
  agency: "Paiement à l’agence",
};

/** Page « Paiement » : récapitulatif, choix du moyen de paiement (démonstration), contrat. */
export function initPayment(ui: UIApi): void {
  const ref = new URLSearchParams(location.search).get("ref") ?? "";
  void load(ref, ui);
}

async function load(ref: string, ui: UIApi): Promise<void> {
  const empty = el("payEmpty");
  const grid = el("payGrid");
  if (!ref) {
    empty.hidden = false;
    return;
  }
  let reservation: Reservation;
  try {
    reservation = await getReservation(ref);
  } catch (err) {
    el("payEmptyText").textContent = err instanceof ApiError && err.status === 404 ? "Cette réservation est introuvable." : "Impossible de charger la réservation.";
    empty.hidden = false;
    return;
  }

  renderSummary(reservation);
  if (reservation.payment) {
    showDone(reservation, ui);
    return;
  }
  grid.hidden = false;

  const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="pm"]'));
  const selected = (): PaymentMethod => (radios.find((r) => r.checked)?.value ?? "card") as PaymentMethod;
  const phone = el<HTMLInputElement>("payPhone");
  phone.value = reservation.input.customer.phone;
  const hint = el("payHint");
  const go = el<HTMLButtonElement>("payGo");

  const refresh = (): void => {
    const m = selected();
    el("pmCard").hidden = m !== "card";
    el("pmMobile").hidden = m !== "orange_money" && m !== "mtn_momo";
    el("pmAgency").hidden = m !== "agency";
    go.textContent = m === "agency" ? "Confirmer (payer à l’agence)" : `Payer ${formatMoney(reservation.quote.total)}`;
  };
  radios.forEach((r) => r.addEventListener("change", refresh));
  refresh();

  for (const id of ["cardNum", "cardExp"]) {
    el<HTMLInputElement>(id).addEventListener("input", (e) => {
      const input = e.target as HTMLInputElement;
      const d = input.value.replace(/\D/g, "");
      input.value = id === "cardNum" ? (d.match(/.{1,4}/g) ?? []).join(" ").slice(0, 19) : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2, 4)}` : d;
    });
  }

  go.addEventListener("click", () => {
    void (async () => {
      hint.classList.remove("on");
      const method = selected();
      go.disabled = true;
      const label = go.textContent;
      go.textContent = "Traitement…";
      try {
        // Seuls le moyen de paiement et (pour Mobile Money) le numéro sont transmis. Jamais de données de carte.
        const updated = await pay({
          reservationId: reservation.id,
          method,
          ...(method === "orange_money" || method === "mtn_momo" ? { phone: phone.value } : {}),
        });
        grid.hidden = true;
        renderSummary(updated);
        showDone(updated, ui);
      } catch (err) {
        hint.textContent = err instanceof ApiError ? err.full : "Le paiement a échoué.";
        hint.classList.add("on");
        go.disabled = false;
        go.textContent = label;
      }
    })();
  });
}

let lastSummary: Reservation | null = null;
document.getElementById("cur")?.addEventListener("change", () => {
  if (lastSummary) renderSummary(lastSummary);
});

function renderSummary(r: Reservation): void {
  lastSummary = r;
  const approx =
    getCurrency() === "XAF"
      ? ""
      : `<p class="note">Montant réglé en FCFA. Équivalent indicatif : ≈ ${formatIn(r.quote.total)}</p>`;
  const rows = r.quote.lines.map((l) => `<div class="sumrow"><span>${esc(l.label)}</span><span>${formatMoney(l.amount)}</span></div>`).join("");
  const status = r.payment ? (r.payment.status === "succeeded_demo" ? "Payé (démonstration)" : "À régler à l’agence") : "En attente de paiement";
  el("paySummary").innerHTML =
    `<span class="status">${status}</span><h3>Récapitulatif</h3>` +
    `<p class="note">Référence <b>${esc(r.id)}</b><br>Client : ${esc(r.input.customer.name)}</p>` +
    `${rows}<div class="sumrow total"><span>Total</span><span>${formatMoney(r.quote.total)}</span></div>${approx}`;
  el("paySummary").hidden = false;
}

function showDone(r: Reservation, ui: UIApi): void {
  const paid = r.payment?.status === "succeeded_demo";
  const method = r.payment ? METHOD_LABEL[r.payment.method] : "";
  el("payGrid").hidden = false;
  el("payMain").hidden = true;
  el("payDone").hidden = false;
  el("payDoneTitle").textContent = paid ? "Paiement enregistré (démonstration)" : "Réservation confirmée";
  el("payDoneText").textContent = paid
    ? `Merci ${r.input.customer.name} ! Votre paiement de démonstration par ${method} est enregistré. Téléchargez votre contrat de location ci-dessous.`
    : `Merci ${r.input.customer.name} ! Votre réservation est enregistrée : vous réglez à l’agence. Téléchargez votre contrat ci-dessous.`;
  el<HTMLAnchorElement>("dlContract").href = contractUrl(r.id);
  el<HTMLAnchorElement>("waConfirm").href = ui.wa(
    L(
      `Bonjour Yamoo Drive, réservation ${r.id} (${formatMoney(r.quote.total)}) : ${paid ? `paiement effectué par ${method}` : "je règle à l’agence"}. Merci de confirmer.`,
      `Hello Yamoo Drive, booking ${r.id} (${formatMoney(r.quote.total)}): ${paid ? `payment made by ${tr(method) ?? method}` : "I will pay at the agency"}. Please confirm.`,
    ),
  );
}

import { ApiError, contractUrl, createReservation } from "./api.js";
import { el } from "./dom.js";
import type { UIApi } from "./ui.js";
import type { ReservationInput } from "../shared/types.js";

/** Page « Réserver » : WhatsApp, paiement en ligne et contrat PDF. */
export function initReserve(ui: UIApi): void {
  const hint = el("hint");
  const go = el<HTMLAnchorElement>("go");
  const payBtn = el<HTMLButtonElement>("payBtn");
  const contractBtn = el<HTMLButtonElement>("contractBtn");

  const showHint = (msg: string, field?: string): void => {
    hint.textContent = msg;
    hint.classList.add("on");
    if (field) document.getElementById(field)?.focus();
  };

  /** Vérifie le formulaire. `strict` = infos nécessaires au paiement et au contrat. */
  function collect(strict: boolean): ReservationInput | null {
    const input = ui.getInput();
    if (!input.customer.name) {
      showHint("Indiquez votre nom pour continuer.", "cname");
      return null;
    }
    if (strict && !input.customer.phone) {
      showHint("Indiquez votre numéro de téléphone pour continuer.", "cphone");
      return null;
    }
    if (strict && input.mode === "rent" && !input.startDate) {
      showHint("Choisissez la date de début de location.", "date");
      return null;
    }
    if (strict && input.mode === "rent" && !input.startTime) {
      showHint("Indiquez l’heure à laquelle vous voulez recevoir le véhicule.", "stime");
      return null;
    }
    if (strict && input.mode === "rent" && !input.endTime) {
      showHint("Indiquez l’heure de retour du véhicule.", "etime");
      return null;
    }
    hint.classList.remove("on");
    return input;
  }

  async function run(button: HTMLElement, strict: boolean, then: (id: string) => void, fallback?: () => void): Promise<void> {
    const input = collect(strict);
    if (!input) return;
    button.setAttribute("aria-busy", "true");
    if (button instanceof HTMLButtonElement) button.disabled = true;
    try {
      const reservation = await createReservation(input);
      ui.persist();
      then(reservation.id);
    } catch (err) {
      if (fallback && !(err instanceof ApiError && err.status === 400)) {
        fallback(); // le serveur est indisponible : on laisse quand même le client écrire sur WhatsApp
      } else {
        showHint(err instanceof ApiError ? err.full : "Une erreur est survenue.");
      }
    } finally {
      button.removeAttribute("aria-busy");
      if (button instanceof HTMLButtonElement) button.disabled = false;
    }
  }

  // WhatsApp : enregistre la réservation puis ouvre la conversation avec la référence.
  go.addEventListener("click", (e) => {
    e.preventDefault();
    void run(
      go,
      false,
      (id) => {
        window.location.href = ui.wa(`${ui.getMessage()}\n\nRéférence : ${id}`);
      },
      () => {
        window.location.href = ui.wa(ui.getMessage());
      },
    );
  });

  payBtn.addEventListener("click", () => {
    void run(payBtn, true, (id) => {
      window.location.href = `/paiement?ref=${encodeURIComponent(id)}`;
    });
  });

  contractBtn.addEventListener("click", () => {
    void run(contractBtn, true, (id) => {
      window.location.href = contractUrl(id); // téléchargement du PDF (la page reste affichée)
    });
  });
}

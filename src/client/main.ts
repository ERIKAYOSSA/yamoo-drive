import { loadCatalog } from "./api.js";
import { initUI } from "./ui.js";
import { initI18n } from "./i18n.js";
import { initAccount } from "./account.js";
import { initAdvisor } from "./advisor.js";

const page = document.body.dataset.page ?? "accueil";

initI18n();

try {
  const catalog = await loadCatalog();
  const ui = initUI(catalog, page);
  if (page === "reserver") {
    const { initReserve } = await import("./reserve.js");
    initReserve(ui);
    const { initGeo } = await import("./geo.js");
    initGeo();
  } else if (page === "paiement") {
    const { initPayment } = await import("./payment.js");
    initPayment(ui);
  } else if (page === "faq") {
    const { initFaqPage } = await import("./faq-page.js");
    void initFaqPage();
  }
  initAdvisor(catalog); // conseiller virtuel (bouton en bas à droite)
} catch (err) {
  console.error(err);
  document
    .querySelector("main")
    ?.insertAdjacentHTML("afterbegin", '<p class="sub" role="alert">Impossible de charger les données. Rechargez la page.</p>');
}

// Compte client (facultatif) : bouton de l'en-tête, page /compte, préremplissage de la réservation.
void initAccount(page);

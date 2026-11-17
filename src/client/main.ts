import { loadCatalog } from "./api.js";
import { initUI } from "./ui.js";

const page = document.body.dataset.page ?? "accueil";

try {
  const catalog = await loadCatalog();
  const ui = initUI(catalog, page);
  if (page === "reserver") {
    const { initReserve } = await import("./reserve.js");
    initReserve(ui);
  } else if (page === "paiement") {
    const { initPayment } = await import("./payment.js");
    initPayment(ui);
  }
} catch (err) {
  console.error(err);
  document
    .querySelector("main")
    ?.insertAdjacentHTML("afterbegin", '<p class="sub" role="alert">Impossible de charger les données. Rechargez la page.</p>');
}

import { COLORS, PdfDoc } from "./pdf.js";
import { formatMoney } from "../shared/pricing.js";
import type { Driver, Reservation, Vehicle } from "../shared/types.js";
import { config } from "./config.js";

const fmtDate = (iso?: string): string => {
  if (!iso) return "À convenir";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const fmtTime = (t?: string): string => (t ? ` à ${t.replace(":", "h")}` : "");

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const today = (): string => {
  try {
    return new Date().toLocaleDateString("fr-FR", { timeZone: config.timezone });
  } catch {
    return new Date().toLocaleDateString("fr-FR");
  }
};

const STATUS_LABEL: Record<Reservation["status"], string> = {
  pending_payment: "En attente de paiement",
  paid_demo: "Réglé en ligne (paiement de démonstration)",
  pay_at_agency: "À régler à l’agence",
};

const RENTAL_TERMS = [
  "Usage : le véhicule est destiné à un usage personnel ou professionnel licite. Toute sous-location, tout transport payant de personnes et toute participation à des courses ou compétitions sont interdits.",
  "Conducteurs : seuls le Locataire et les conducteurs déclarés, titulaires d’un permis de conduire valide, peuvent conduire. Une pièce d’identité et le permis sont présentés à la remise.",
  "État du véhicule : un état des lieux contradictoire est établi à la remise et à la restitution. Le Locataire rend le véhicule dans l’état constaté, sauf usure normale.",
  "Carburant et kilométrage : le véhicule est remis avec le niveau de carburant indiqué à l’état des lieux et restitué au même niveau. Les conditions de kilométrage sont précisées par le Loueur.",
  "Assurance : le véhicule est couvert selon la formule du Loueur. La franchise et les exclusions restent à la charge du Locataire en cas de faute, d’alcool, de stupéfiants ou de non-respect du présent contrat.",
  "Panne, accident, vol : le Locataire prévient immédiatement le Loueur par WhatsApp ou téléphone, ne fait aucune réparation sans accord et remplit un constat en cas d’accident.",
  "Retard et prolongation : toute prolongation est soumise à l’accord préalable du Loueur. Un retard non autorisé donne lieu à la facturation de la période supplémentaire.",
  "Amendes et péages : les infractions commises pendant la location sont à la charge du Locataire.",
  "Annulation : toute annulation est à signaler au Loueur dans les meilleurs délais ; les conditions de remboursement sont celles communiquées par le Loueur.",
  "Données personnelles : les informations du Locataire servent uniquement à la gestion de la réservation et du contrat.",
];

const SALE_TERMS = [
  "Le véhicule reste la propriété du Vendeur jusqu’au paiement intégral du prix.",
  "Le véhicule est vendu dans l’état constaté à la remise. Les éventuelles garanties sont celles communiquées par écrit par le Vendeur.",
  "Les documents du véhicule sont remis à l’Acheteur après paiement complet.",
  "Les frais d’immatriculation et de changement de titulaire sont précisés par le Vendeur avant la remise.",
  "Les informations de l’Acheteur servent uniquement à la gestion de la commande.",
];

export function buildContractPdf(r: Reservation, vehicle: Vehicle, driver?: Driver): Buffer {
  const rent = r.input.mode === "rent";
  const docTitle = rent ? "CONTRAT DE LOCATION DE VÉHICULE" : "BON DE COMMANDE – ACHAT DE VÉHICULE";
  const pdf = new PdfDoc({
    title: `${rent ? "Contrat de location" : "Bon de commande"} ${r.id}`,
    author: config.company.name,
    footer: `${config.company.name} – Réf. ${r.id}`,
  });

  // Bandeau d'en-tête
  pdf.rect(0, 0, 595.28, 92, { fill: COLORS.navy });
  pdf.textAt("YAMOO DRIVE", 50, 44, { size: 24, bold: true, color: COLORS.white });
  pdf.textAt("Vente et location de véhicules", 50, 62, { size: 10, color: COLORS.gold });
  pdf.textAt(`Réf. ${r.id}`, 50, 44, { size: 10, bold: true, color: COLORS.white, width: 495, align: "right" });
  pdf.textAt(`Établi le ${today()}`, 50, 62, { size: 10, color: COLORS.white, width: 495, align: "right" });
  pdf.y = 116;
  pdf.para(docTitle, { size: 16, bold: true, color: COLORS.navy });
  pdf.gap(2);

  // Parties
  pdf.heading("Parties");
  const company = config.company;
  pdf.rows([
    [rent ? "Le Loueur" : "Le Vendeur", `${company.name}${company.registration ? ` (${company.registration})` : ""}`],
    ["Adresse", company.address],
    ["Téléphone", company.phone],
    [rent ? "Le Locataire" : "L’Acheteur", r.input.customer.name],
    ["Téléphone du client", r.input.customer.phone || "Non renseigné"],
  ]);

  // Véhicule
  pdf.heading("Véhicule");
  pdf.rows([
    ["Modèle", vehicle.n],
    ["Caractéristiques", vehicle.d],
    ["Boîte / énergie", `${vehicle.spec.b} · ${vehicle.spec.t}`],
    ["Immatriculation", "À renseigner à la remise : ____________________"],
  ]);

  if (rent) {
    const start = r.input.startDate;
    pdf.heading("Durée et lieu");
    pdf.rows([
      ["Réception du véhicule", `${fmtDate(start)}${fmtTime(r.input.startTime)}`],
      ["Durée", `${r.quote.days} jour${r.quote.days > 1 ? "s" : ""}`],
      ["Retour du véhicule", start ? `${fmtDate(addDays(start, r.quote.days))}${fmtTime(r.input.endTime)}` : "À convenir"],
      ["Lieu de remise / livraison", r.input.pickupPlace || "À convenir"],
      ...(r.input.landmark ? [["Repère", r.input.landmark] as [string, string]] : []),
      ...(r.input.mapLink ? [["Position Google Maps", "Fournie par le client (lien enregistré avec la réservation)"] as [string, string]] : []),
      ["Kilométrage au départ", "____________________"],
      ["Niveau de carburant", "____________________"],
    ]);

    pdf.heading("Chauffeur");
    if (r.input.withDriver && driver) {
      pdf.rows([
        ["Option", "Avec chauffeur"],
        ["Chauffeur", `${driver.n} (${driver.y} ans d’expérience)`],
      ]);
      pdf.para("Le chauffeur conduit le véhicule sous la responsabilité du Loueur. Le Locataire s’engage à lui réserver un comportement respectueux.", { size: 9, color: COLORS.gray });
    } else {
      pdf.rows([["Option", "Sans chauffeur"]]);
    }
  } else {
    pdf.heading("Remise du véhicule");
    pdf.rows([
      ["Lieu de remise", r.input.pickupPlace || "À convenir"],
      ...(r.input.landmark ? [["Repère", r.input.landmark] as [string, string]] : []),
      ...(r.input.mapLink ? [["Position Google Maps", "Fournie par le client (lien enregistré avec la réservation)"] as [string, string]] : []),
    ]);
  }

  if (r.input.recipient || r.input.decoration) {
    pdf.heading("Options");
    const items: [string, string][] = [];
    if (r.input.recipient) {
      items.push(["Véhicule offert à", r.input.recipient.name]);
      if (r.input.recipient.message) items.push(["Message", r.input.recipient.message]);
      items.push(["Responsabilité", rent ? "Le Locataire reste responsable du contrat ; le bénéficiaire doit présenter un permis valide s’il conduit." : "L’Acheteur reste responsable de la commande."]);
    }
    if (r.input.decoration) items.push(["Décoration", r.input.decoration]);
    pdf.rows(items);
  }

  // Prix
  pdf.heading("Prix et paiement");
  for (const l of r.quote.lines) pdf.amountRow(l.label, formatMoney(l.amount));
  pdf.amountRow("TOTAL", formatMoney(r.quote.total), true);
  pdf.gap(4);
  pdf.rows([
    ["Statut du paiement", STATUS_LABEL[r.status]],
    ...(rent
      ? ([
          [
            "Caution",
            config.depositText ||
              (r.input.withDriver
                ? "Aucune caution (location avec chauffeur)"
                : `${config.depositPercent} % du montant de la location, soit ${formatMoney(Math.round((r.quote.total * config.depositPercent) / 100))}`),
          ],
        ] as [string, string][])
      : []),
  ]);

  // Conditions
  pdf.heading("Conditions générales");
  (rent ? RENTAL_TERMS : SALE_TERMS).forEach((t, i) => {
    pdf.para(`${i + 1}. ${t}`, { size: 9, color: COLORS.ink });
    pdf.gap(2);
  });

  // Signatures
  pdf.ensure(140);
  pdf.gap(14);
  pdf.para(`Fait à ______________________, le ____ / ____ / ________`, { size: 10 });
  pdf.gap(8);
  const top = pdf.y;
  const w = (pdf.contentWidth - 20) / 2;
  const labels = [rent ? "Le Loueur" : "Le Vendeur", rent ? "Le Locataire (« lu et approuvé »)" : "L’Acheteur (« lu et approuvé »)"];
  labels.forEach((label, i) => {
    const x = pdf.margin + i * (w + 20);
    pdf.rect(x, top, w, 90, { stroke: COLORS.line, lineWidth: 0.8 });
    pdf.textAt(label, x + 8, top + 14, { size: 9, bold: true, color: COLORS.gray });
  });
  pdf.y = top + 96;

  return pdf.finish();
}

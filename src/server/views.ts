import { promises as fs } from "node:fs";
import path from "node:path";

export interface PageDef {
  page: string; // valeur de data-page (utilisée par le script de la page)
  file: string; // fichier dans views/pages
  title: string;
  description: string;
}

const T = " – Yamoo Drive";

/** Routes du site : une URL = une page HTML (plus de navigation par ancre). */
export const PAGES: Record<string, PageDef> = {
  "/": { page: "accueil", file: "accueil.html", title: "Yamoo Drive – Vente et location de véhicules", description: "Achetez ou louez un véhicule avec ou sans chauffeur, pour vous ou pour un proche. Réservation directe sur WhatsApp." },
  "/vehicules": { page: "vehicules", file: "vehicules.html", title: `Véhicules${T}`, description: "Découvrez notre flotte : SUV, berlines, 4×4. Prix d’achat et tarifs par jour." },
  "/vehicule": { page: "vehicule", file: "vehicule.html", title: `Fiche véhicule${T}`, description: "Photos, description et disponibilités du véhicule." },
  "/promos": { page: "promos", file: "promos.html", title: `Promotions${T}`, description: "Les offres à durée limitée sur nos véhicules." },
  "/occasions": { page: "occasions", file: "occasions.html", title: `Occasions${T}`, description: "Mariage, aéroport, voyage en famille : trouvez le bon véhicule." },
  "/chauffeurs": { page: "chauffeurs", file: "chauffeurs.html", title: `Chauffeurs${T}`, description: "Nos chauffeurs : expérience, description et avis clients." },
  "/comparer": { page: "comparer", file: "comparer.html", title: `Comparer${T}`, description: "Comparez deux véhicules côte à côte." },
  "/cadeau": { page: "cadeau", file: "cadeau.html", title: `Offrir un véhicule${T}`, description: "Offrez un véhicule avec un message personnalisé." },
  "/parrainage": { page: "parrainage", file: "parrainage.html", title: `Parrainage${T}`, description: "Parrainez un ami et gagnez une réduction." },
  "/agence": { page: "agence", file: "agence.html", title: `Agence${T}`, description: "Adresse, horaires et contact de l’agence." },
  "/reserver": { page: "reserver", file: "reserver.html", title: `Réserver${T}`, description: "Réservez, payez en ligne ou téléchargez votre contrat de location." },
  "/faq": { page: "faq", file: "faq.html", title: `Questions fréquentes${T}`, description: "Les réponses aux questions les plus fréquentes sur la location, l'achat, la livraison et le paiement.", },
  "/compte": { page: "compte", file: "compte.html", title: `Mon compte${T}`, description: "Créez un compte (facultatif) pour retrouver vos réservations.", },
  "/paiement": { page: "paiement", file: "paiement.html", title: `Paiement${T}`, description: "Réglez votre réservation en ligne." },
};

const NOT_FOUND: PageDef = { page: "404", file: "404.html", title: `Page introuvable${T}`, description: "Cette page n’existe pas." };

const escAttr = (s: string): string => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const fill = (tpl: string, token: string, value: string): string => tpl.split(`{{${token}}}`).join(value);

export class Views {
  private layout = "";
  private header = "";
  private footer = "";
  private readonly pages = new Map<string, string>();

  constructor(private readonly dir: string) {}

  async load(): Promise<void> {
    const read = (p: string): Promise<string> => fs.readFile(path.join(this.dir, p), "utf8");
    this.layout = await read("layout.html");
    this.header = await read("partials/header.html");
    this.footer = await read("partials/footer.html");
    for (const def of [...Object.values(PAGES), NOT_FOUND]) {
      this.pages.set(def.file, await read(path.join("pages", def.file)));
    }
  }

  render(def: PageDef): string {
    let html = this.layout;
    html = fill(html, "HEADER", this.header);
    html = fill(html, "FOOTER", this.footer);
    html = fill(html, "CONTENT", this.pages.get(def.file) ?? "");
    html = fill(html, "TITLE", escAttr(def.title));
    html = fill(html, "DESCRIPTION", escAttr(def.description));
    html = fill(html, "PAGE", def.page);
    return html;
  }

  renderNotFound(): string {
    return this.render(NOT_FOUND);
  }
}

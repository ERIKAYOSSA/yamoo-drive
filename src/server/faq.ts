// Questions fréquentes de Yamoo Drive : UNE seule source pour
//   1) la page /faq,
//   2) les boutons de questions rapides du conseiller,
//   3) la base de connaissances donnée à l'IA,
//   4) le mode de secours (réponses sans IA, par mots-clés).
//
// Pour corriger ou ajouter une question : modifiez simplement la liste FAQ ci-dessous.
// Variables utilisables dans les réponses : {phone} (numéro WhatsApp), {driverFee} (chauffeur par jour),
// {minRent} (tarif de location le plus bas par jour).
//
// « confirm: true » = information que l'équipe doit encore renseigner. Tant que c'est à true, l'IA ne donne
// AUCUN chiffre et renvoie vers WhatsApp. Quand vous connaissez la vraie règle, écrivez-la dans la réponse
// puis retirez « confirm: true ».

export type Lang = "fr" | "en";
type Bi = Record<Lang, string>;

export interface FaqEntry {
  id: string;
  category: string;
  popular?: boolean;
  confirm?: boolean;
  q: Bi;
  a: Bi;
  /** Mots-clés supplémentaires pour le mode de secours (sans accents). */
  kw?: Partial<Record<Lang, string[]>>;
}

export const FAQ_CATEGORIES: { id: string; label: Bi }[] = [
  { id: "choose", label: { fr: "Choisir", en: "Choosing" } },
  { id: "rent", label: { fr: "Location", en: "Renting" } },
  { id: "buy", label: { fr: "Achat", en: "Buying" } },
  { id: "driver", label: { fr: "Chauffeur", en: "Driver" } },
  { id: "delivery", label: { fr: "Remise et livraison", en: "Handover & delivery" } },
  { id: "payment", label: { fr: "Paiement", en: "Payment" } },
  { id: "gift", label: { fr: "Cadeau", en: "Gifts" } },
  { id: "loyalty", label: { fr: "Promos et fidélité", en: "Deals & loyalty" } },
  { id: "account", label: { fr: "Compte", en: "Account" } },
  { id: "help", label: { fr: "Aide", en: "Help" } },
];

export const FAQ: FaqEntry[] = [
  // ------------------------------------------------------------------ Choisir
  {
    id: "which-vehicle", category: "choose", popular: true,
    q: { fr: "Quel véhicule choisir pour mon besoin ?", en: "Which vehicle should I choose for my needs?" },
    a: {
      fr: "Dites-moi l'occasion, le nombre de personnes et votre budget, et je vous propose les véhicules adaptés. En général : une berline pour un mariage ou un déplacement professionnel, un SUV pour la famille ou les routes abîmées, un 4×4 pour les pistes et les routes difficiles.",
      en: "Tell me the occasion, how many people and your budget, and I'll suggest suitable vehicles. As a rule: a sedan for a wedding or a business trip, an SUV for the family or damaged roads, a 4×4 for tracks and tough roads.",
    },
    kw: { fr: ["conseil", "recommande", "choisir", "mariage", "famille", "budget", "suv", "berline", "4x4"], en: ["recommend", "suggest", "choose", "wedding", "family", "budget", "suv", "sedan"] },
  },
  {
    id: "see-prices", category: "choose",
    q: { fr: "Où voir les prix ?", en: "Where can I see the prices?" },
    a: {
      fr: "Sur la page Véhicules, choisissez « Prix d'achat » ou « Prix par jour ». Les prix sont en FCFA ; le sélecteur de devise de l'en-tête donne une conversion indicative en euro et en dollar.",
      en: "On the Vehicles page, choose “Purchase price” or “Price per day”. Prices are in FCFA; the currency selector in the header shows an indicative conversion to euro and dollar.",
    },
    kw: { fr: ["prix", "tarif", "combien", "cout"], en: ["price", "prices", "cost", "how much", "rate"] },
  },
  {
    id: "cheapest", category: "choose",
    q: { fr: "À partir de combien peut-on louer ?", en: "What is the lowest rental price?" },
    a: {
      fr: "Nos locations commencent à {minRent} par jour (voir la page Véhicules, option « Prix par jour »). Le prix varie selon le véhicule ; un chauffeur est possible en supplément.",
      en: "Rentals start at {minRent} per day (see the Vehicles page, “Price per day”). The price depends on the vehicle; a driver can be added for an extra fee.",
    },
    kw: { fr: ["moins cher", "pas cher", "economique", "minimum", "a partir de", "dès"], en: ["cheapest", "cheap", "lowest", "minimum", "from", "starting"] },
  },
  {
    id: "availability", category: "choose",
    q: { fr: "Le véhicule est-il disponible à mes dates ?", en: "Is the vehicle available on my dates?" },
    a: {
      fr: "La disponibilité est confirmée par notre équipe. Envoyez votre demande depuis « Réserver » : elle arrive sur WhatsApp avec le véhicule et vos dates, et nous vous répondons rapidement.",
      en: "Our team confirms availability. Send your request from “Book”: it reaches us on WhatsApp with the vehicle and your dates, and we reply quickly.",
    },
    kw: { fr: ["disponible", "disponibilite", "libre", "dates", "reserve"], en: ["available", "availability", "free", "dates", "booked"] },
  },
  // ------------------------------------------------------------------ Location
  {
    id: "how-to-rent", category: "rent", popular: true,
    q: { fr: "Comment louer un véhicule ?", en: "How do I rent a vehicle?" },
    a: {
      fr: "1) Choisissez un véhicule. 2) Dans « Réserver », indiquez la durée, la date de début, l'heure de réception et de retour, avec ou sans chauffeur, et le lieu de remise. 3) Envoyez la demande sur WhatsApp. Notre équipe la confirme, puis vous récupérez les clés en agence ou à l'adresse choisie.",
      en: "1) Pick a vehicle. 2) Under “Book”, enter the duration, start date, pickup and return times, with or without a driver, and the handover place. 3) Send the request on WhatsApp. Our team confirms it, then you collect the keys at the agency or at the address you chose.",
    },
    kw: { fr: ["louer", "location", "comment", "reserver", "etapes"], en: ["rent", "rental", "how", "book", "steps"] },
  },
  {
    id: "rent-price", category: "rent",
    q: { fr: "Comment est calculé le prix d'une location ?", en: "How is the rental price calculated?" },
    a: {
      fr: "Prix par jour du véhicule × nombre de jours, plus {driverFee} par jour si vous prenez un chauffeur. Le total est affiché avant l'envoi de votre demande.",
      en: "The vehicle's daily price × number of days, plus {driverFee} per day if you take a driver. The total is shown before you send your request.",
    },
    kw: { fr: ["calcul", "prix", "jours", "total", "tarif"], en: ["calculated", "price", "days", "total", "rate"] },
  },
  {
    id: "min-duration", category: "rent",
    q: { fr: "Quelle est la durée minimale de location ?", en: "What is the minimum rental period?" },
    a: {
      fr: "La location se calcule par jour : 1 jour minimum, jusqu'à 60 jours sur le site. Vous choisissez aussi l'heure de réception et l'heure de retour du véhicule.",
      en: "Rentals are priced per day: 1 day minimum, up to 60 days on the site. You also choose the vehicle's pickup time and return time.",
    },
    kw: { fr: ["duree", "minimum", "heure", "journee", "semaine", "mois", "longue"], en: ["duration", "minimum", "hour", "day", "week", "month", "long"] },
  },
  {
    id: "rent-then-buy", category: "rent",
    q: { fr: "Puis-je louer d'abord, puis acheter ?", en: "Can I rent first, then buy?" },
    a: {
      fr: "Oui. Le loyer d'un essai est déduit du prix d'achat si vous gardez le véhicule. Précisez-le à notre équipe sur WhatsApp pour fixer les conditions.",
      en: "Yes. The rent paid for a trial is deducted from the purchase price if you keep the vehicle. Tell our team on WhatsApp to agree on the terms.",
    },
    kw: { fr: ["essai", "tester", "puis acheter", "louer puis acheter", "deduit"], en: ["trial", "test", "try", "then buy", "deducted"] },
  },
  {
    id: "documents", category: "rent",
    q: { fr: "Quels documents faut-il pour louer ?", en: "Which documents do I need to rent?" },
    a: {
      fr: "Pour louer, nous demandons un permis de conduire et une pièce d'identité, à présenter lors de la remise du véhicule.",
      en: "To rent, we ask for a driving licence and an ID document, to be presented when the vehicle is handed over.",
    },
    kw: { fr: ["documents", "permis", "piece", "identite", "age", "papiers", "conditions"], en: ["documents", "licence", "license", "id", "age", "papers", "requirements"] },
  },
  {
    id: "deposit", category: "rent",
    q: { fr: "Faut-il verser une caution ?", en: "Do I need to pay a deposit?" },
    a: {
      fr: "Sans chauffeur, la caution est de 25 % du montant de la location (par exemple 30 000 FCFA pour une location de 120 000 FCFA). Avec chauffeur, nous ne prenons aucune caution.",
      en: "Without a driver, the deposit is 25% of the rental amount (for example 30,000 FCFA for a 120,000 FCFA rental). With a driver, we take no deposit.",
    },
    kw: { fr: ["caution", "depot", "garantie"], en: ["deposit", "guarantee", "security"] },
  },
  {
    id: "mileage-fuel", category: "rent", confirm: true,
    q: { fr: "Le kilométrage et le carburant sont-ils inclus ?", en: "Are mileage and fuel included?" },
    a: {
      fr: "Cela dépend du véhicule : notre équipe vous précise les règles de kilométrage et de carburant avant la remise. Le kilométrage et le niveau de carburant au départ sont notés sur le contrat.",
      en: "It depends on the vehicle: our team explains the mileage and fuel rules before handover. The mileage and fuel level at departure are noted on the contract.",
    },
    kw: { fr: ["kilometrage", "kilometres", "carburant", "essence", "plein", "km"], en: ["mileage", "kilometres", "fuel", "petrol", "gas", "km"] },
  },
  {
    id: "insurance", category: "rent",
    q: { fr: "Y a-t-il une assurance ?", en: "Is there insurance?" },
    a: {
      fr: "Une assurance de base est incluse en location. Pour le détail de ce qu'elle couvre, notre équipe vous renseigne sur WhatsApp.",
      en: "Basic insurance is included with rentals. For details of what it covers, our team will inform you on WhatsApp.",
    },
    kw: { fr: ["assurance", "assure", "couvert", "accident", "dommage"], en: ["insurance", "insured", "covered", "accident", "damage"] },
  },
  {
    id: "breakdown", category: "rent",
    q: { fr: "Que faire en cas de panne ?", en: "What should I do if the vehicle breaks down?" },
    a: {
      fr: "Une assistance en cas de panne est disponible 7j/7. Écrivez-nous ou appelez-nous au {phone}.",
      en: "Breakdown assistance is available 7 days a week. Write or call us on {phone}.",
    },
    kw: { fr: ["panne", "assistance", "probleme", "depannage", "accident"], en: ["breakdown", "assistance", "problem", "help", "stuck"] },
  },
  {
    id: "cancel-change", category: "rent",
    q: { fr: "Puis-je modifier ou annuler ma réservation ?", en: "Can I change or cancel my booking?" },
    a: {
      fr: "Oui, vous pouvez annuler tant que vous n'avez pas encore payé. Si vous avez déjà payé, votre commande peut être reportée à une autre date. Écrivez-nous sur WhatsApp au {phone} avec votre référence de réservation.",
      en: "Yes, you can cancel as long as you haven't paid yet. If you have already paid, your order can be postponed to another date. Write to us on WhatsApp at {phone} with your booking reference.",
    },
    kw: { fr: ["annuler", "annulation", "modifier", "changer", "reporter", "reporte", "rembourse"], en: ["cancel", "cancellation", "change", "modify", "postpone", "refund"] },
  },
  {
    id: "late-return", category: "rent",
    q: { fr: "Que se passe-t-il si je rends le véhicule en retard ?", en: "What if I return the vehicle late?" },
    a: {
      fr: "Yamoo Drive est une agence professionnelle, rigoureuse et très attentive : nous prenons la commande de chaque client avec beaucoup de sérieux, et nous ne pouvons pas nous permettre d'être en retard. Nous vous demandons donc de respecter l'heure de retour prévue. Un retard non autorisé donne lieu à la facturation de la période supplémentaire, et toute prolongation est soumise à notre accord préalable. En cas d'empêchement, prévenez-nous le plus tôt possible sur WhatsApp au {phone}.",
      en: "Yamoo Drive is a professional, rigorous and very attentive agency: we take every customer's order very seriously and cannot afford to be late. We therefore ask you to respect the planned return time. An unauthorised delay results in billing for the extra period, and any extension requires our prior agreement. If something comes up, let us know as early as possible on WhatsApp at {phone}.",
    },
    kw: { fr: ["retard", "prolonger", "prolongation", "rendre", "retour", "horaire"], en: ["late", "extend", "extension", "return", "delay", "time"] },
  },
  {
    id: "travel-outside", category: "rent",
    q: { fr: "Puis-je sortir de la ville avec le véhicule ?", en: "Can I take the vehicle out of the city?" },
    a: {
      fr: "Pour sortir de la ville, la location doit obligatoirement se faire avec chauffeur ({driverFee} de plus par jour). Pour un trajet à l'étranger, écrivez-nous sur WhatsApp au {phone} : notre équipe vous confirme ce qui est possible.",
      en: "To leave the city, the rental must be with a driver ({driverFee} extra per day). For a trip abroad, write to us on WhatsApp at {phone}: our team confirms what is possible.",
    },
    kw: { fr: ["voyage", "pays", "frontiere", "ville", "interurbain", "trajet", "sortir", "exterieur"], en: ["travel", "country", "border", "city", "intercity", "route", "trip", "leave", "outside"] },
  },
  // ------------------------------------------------------------------ Achat
  {
    id: "buy-process", category: "buy", popular: false,
    q: { fr: "Comment acheter un véhicule ?", en: "How do I buy a vehicle?" },
    a: {
      fr: "Dans « Réserver », choisissez « Acheter », sélectionnez le véhicule et envoyez la demande sur WhatsApp. Le prix d'achat est affiché sur la fiche du véhicule. Notre équipe vous guide ensuite pour la suite.",
      en: "Under “Book”, choose “Buy”, select the vehicle and send the request on WhatsApp. The purchase price is shown on the vehicle page. Our team then guides you through the next steps.",
    },
    kw: { fr: ["acheter", "achat", "acquerir"], en: ["buy", "purchase", "acquire"] },
  },
  {
    id: "buy-installments", category: "buy", confirm: true,
    q: { fr: "Puis-je payer un achat en plusieurs fois ?", en: "Can I pay for a purchase in instalments?" },
    a: {
      fr: "Oui, le paiement d'un achat en plusieurs fois est pris en compte, et vous pouvez être remboursé au besoin. Les modalités se fixent avec notre équipe : écrivez-nous sur WhatsApp au {phone}.",
      en: "Yes, paying for a purchase in instalments is taken into account, and you can be refunded if needed. The terms are agreed with our team: write to us on WhatsApp at {phone}.",
    },
    kw: { fr: ["plusieurs fois", "tranches", "credit", "facilite", "mensualite", "rembourse"], en: ["instalments", "installments", "credit", "monthly", "plan", "refund"] },
  },
  // ------------------------------------------------------------------ Chauffeur
  {
    id: "with-driver", category: "driver", popular: true,
    q: { fr: "Puis-je louer avec un chauffeur ?", en: "Can I rent with a driver?" },
    a: {
      fr: "Oui : {driverFee} de plus par jour. Vous choisissez parmi nos chauffeurs (expérience, langues, avis clients) sur la page Chauffeurs ou au moment de réserver.",
      en: "Yes: {driverFee} extra per day. You choose from our drivers (experience, languages, customer reviews) on the Drivers page or when booking.",
    },
    kw: { fr: ["chauffeur", "conducteur", "avec chauffeur", "sans chauffeur"], en: ["driver", "chauffeur", "with driver", "without driver"] },
  },
  {
    id: "driver-languages", category: "driver",
    q: { fr: "Les chauffeurs parlent-ils anglais ?", en: "Do the drivers speak English?" },
    a: {
      fr: "Certains oui. La page Chauffeurs indique les langues parlées par chacun, ainsi que son expérience et les avis des clients.",
      en: "Some do. The Drivers page lists the languages each driver speaks, along with their experience and customer reviews.",
    },
    kw: { fr: ["anglais", "langue", "parle", "francais"], en: ["english", "language", "speak", "french"] },
  },
  // ------------------------------------------------------------------ Remise et livraison
  {
    id: "delivery", category: "delivery", popular: true,
    q: { fr: "Livrez-vous le véhicule ?", en: "Do you deliver the vehicle?" },
    a: {
      fr: "Oui, à l'adresse de votre choix à Douala ou Yaoundé : précisez le lieu lors de la réservation. La livraison est offerte pour toute location de 3 jours et plus. Pour une location plus courte, notre équipe vous confirme les conditions de livraison.",
      en: "Yes, to the address of your choice in Douala or Yaoundé: specify the place when booking. Delivery is free for any rental of 3 days or more. For a shorter rental, our team confirms the delivery terms.",
    },
    kw: { fr: ["livraison", "livrer", "domicile", "adresse", "apporter"], en: ["delivery", "deliver", "home", "address", "bring"] },
  },
  {
    id: "places", category: "delivery",
    q: { fr: "Dans quelles villes êtes-vous présents ?", en: "Which cities do you serve?" },
    a: {
      fr: "À Douala et à Yaoundé : remise ou livraison dans les principaux quartiers et aux aéroports (Douala et Yaoundé-Nsimalen).",
      en: "In Douala and Yaoundé: handover or delivery in the main neighborhoods and at the airports (Douala and Yaoundé-Nsimalen).",
    },
    kw: { fr: ["ville", "douala", "yaounde", "aeroport", "quartier", "ou"], en: ["city", "cities", "douala", "yaounde", "airport", "neighborhood", "where"] },
  },
  {
    id: "handover", category: "delivery",
    q: { fr: "Comment se passe la remise des clés ?", en: "How does the key handover work?" },
    a: {
      fr: "Le véhicule est contrôlé et nettoyé avant chaque remise. Vous le recevez en agence ou à l'adresse choisie, à l'heure indiquée dans votre réservation.",
      en: "The vehicle is inspected and cleaned before every handover. You receive it at the agency or at the address you chose, at the time shown in your booking.",
    },
    kw: { fr: ["cles", "remise", "recuperer", "reception"], en: ["keys", "handover", "pick up", "collect", "receive"] },
  },
  {
    id: "share-location", category: "delivery",
    q: { fr: "Comment indiquer ma position exacte pour la livraison ?", en: "How do I give my exact location for delivery?" },
    a: {
      fr: "Dans « Réserver », choisissez la ville et le quartier, ajoutez un repère (par exemple « en face de la pharmacie »), puis cliquez sur « Partager ma position » ou collez un lien Google Maps. Pour un cadeau, demandez à votre proche de vous envoyer sa position sur WhatsApp, puis collez le lien.",
      en: "Under “Book”, choose the city and neighborhood, add a landmark (for example “opposite the pharmacy”), then click “Share my location” or paste a Google Maps link. For a gift, ask your loved one to send you their location on WhatsApp, then paste the link.",
    },
    kw: { fr: ["position", "localisation", "google maps", "gps", "adresse exacte", "itineraire", "repere", "carte"], en: ["location", "position", "google maps", "gps", "exact address", "directions", "landmark", "map"] },
  },
  {
    id: "agency", category: "delivery", confirm: true,
    q: { fr: "Où est l'agence et quels sont les horaires ?", en: "Where is the agency and what are the opening hours?" },
    a: {
      fr: "Consultez la page Agence, ou écrivez-nous / appelez-nous au {phone} : notre équipe vous donne l'adresse exacte et les horaires.",
      en: "See the Agency page, or write / call us on {phone}: our team will give you the exact address and opening hours.",
    },
    kw: { fr: ["agence", "adresse", "horaires", "ouvert", "bureau", "situe"], en: ["agency", "address", "hours", "open", "office", "located"] },
  },
  // ------------------------------------------------------------------ Paiement
  {
    id: "payment-methods", category: "payment", popular: true,
    q: { fr: "Comment puis-je payer ?", en: "How can I pay?" },
    a: {
      fr: "Par carte bancaire, Orange Money ou MTN Mobile Money depuis la page Paiement, ou à l'agence à la remise du véhicule. Les montants sont en FCFA.",
      en: "By bank card, Orange Money or MTN Mobile Money from the Payment page, or at the agency when the vehicle is handed over. Amounts are in FCFA.",
    },
    kw: { fr: ["payer", "paiement", "orange", "mtn", "mobile money", "carte", "especes"], en: ["pay", "payment", "orange", "mtn", "mobile money", "card", "cash"] },
  },
  {
    id: "pay-later", category: "payment",
    q: { fr: "Dois-je payer en ligne pour réserver ?", en: "Do I have to pay online to book?" },
    a: {
      fr: "Non. Vous pouvez choisir « Payer à l'agence » et régler à la remise du véhicule : votre réservation est enregistrée et le contrat est disponible.",
      en: "No. You can choose “Pay at the agency” and pay when the vehicle is handed over: your booking is saved and the contract is available.",
    },
    kw: { fr: ["en ligne", "agence", "sur place", "plus tard", "obligatoire"], en: ["online", "agency", "on site", "later", "required"] },
  },
  {
    id: "currency", category: "payment",
    q: { fr: "Puis-je payer en euro ou en dollar ?", en: "Can I pay in euros or dollars?" },
    a: {
      fr: "Le site affiche des conversions indicatives en euro et en dollar, mais le paiement et le contrat sont en FCFA.",
      en: "The site shows indicative conversions to euro and dollar, but payment and the contract are in FCFA.",
    },
    kw: { fr: ["euro", "dollar", "devise", "monnaie", "etranger", "conversion"], en: ["euro", "dollar", "currency", "foreign", "conversion", "usd", "eur"] },
  },
  {
    id: "contract", category: "payment",
    q: { fr: "Où trouver mon contrat de location ?", en: "Where do I find my rental contract?" },
    a: {
      fr: "Après votre réservation, téléchargez-le en PDF depuis la page Paiement, ou depuis « Mon compte » si vous êtes connecté.",
      en: "After booking, download it as a PDF from the Payment page, or from “My account” if you are logged in.",
    },
    kw: { fr: ["contrat", "pdf", "telecharger", "facture", "recu"], en: ["contract", "pdf", "download", "invoice", "receipt"] },
  },
  // ------------------------------------------------------------------ Cadeau
  {
    id: "gift", category: "gift", popular: true,
    q: { fr: "Comment offrir un véhicule à quelqu'un ?", en: "How do I give a vehicle to someone?" },
    a: {
      fr: "Dans « Réserver », choisissez « Pour un proche », indiquez son prénom et votre message. Votre proche reçoit un lien cadeau, découvre votre message et choisit la date de remise. Vous payez, et il garde son dossier et ses papiers à son nom.",
      en: "Under “Book”, choose “For a loved one”, enter their first name and your message. They receive a gift link, discover your message and pick the handover date. You pay, and they keep the file and papers in their own name.",
    },
    kw: { fr: ["offrir", "cadeau", "proche", "anniversaire", "surprise"], en: ["gift", "give", "present", "birthday", "surprise", "loved one"] },
  },
  {
    id: "gift-delivery", category: "gift",
    q: { fr: "Peut-on livrer le cadeau chez la personne ?", en: "Can the gift be delivered to the person's home?" },
    a: {
      fr: "Oui : indiquez le lieu de livraison au moment de réserver. Le véhicule arrive chez votre proche, avec un suivi partagé entre vous deux.",
      en: "Yes: enter the delivery place when booking. The vehicle arrives at your loved one's place, with tracking shared between you both.",
    },
    kw: { fr: ["livrer", "cadeau", "suivi", "porte"], en: ["deliver", "gift", "tracking", "door"] },
  },
  {
    id: "decoration", category: "gift", confirm: true,
    q: { fr: "Peut-on décorer le véhicule (mariage, cadeau) ?", en: "Can the vehicle be decorated (wedding, gift)?" },
    a: {
      fr: "Oui : à la réservation, choisissez « Fleurs de mariage » ou « Grand ruban cadeau ». Le tarif dépend du type de décoration souhaitée ; retrouvez des idées et plus d'informations sur la page Occasions.",
      en: "Yes: when booking, choose “Wedding flowers” or “Large gift ribbon”. The price depends on the type of decoration you want; find ideas and more information on the Occasions page.",
    },
    kw: { fr: ["decoration", "decorer", "fleurs", "ruban", "mariage", "tarif"], en: ["decoration", "decorate", "flowers", "ribbon", "wedding", "price"] },
  },
  // ------------------------------------------------------------------ Promos et fidélité
  {
    id: "promos", category: "loyalty", popular: true,
    q: { fr: "Y a-t-il des promotions ?", en: "Are there any promotions?" },
    a: {
      fr: "Oui. La page Promos affiche les offres en cours avec leur compte à rebours. Aussi : livraison offerte dès 3 jours de location, message cadeau offert, et une journée gratuite à chaque 5e location.",
      en: "Yes. The Promos page shows current offers with their countdown. Also: free delivery from 3 rental days, free gift message, and a free day with every 5th rental.",
    },
    kw: { fr: ["promo", "promotion", "reduction", "offre", "remise", "solde"], en: ["promo", "promotion", "discount", "offer", "deal", "sale"] },
  },
  {
    id: "referral", category: "loyalty", confirm: true,
    q: { fr: "Comment fonctionne le parrainage ?", en: "How does the referral program work?" },
    a: {
      fr: "Sur la page Parrainage, vous obtenez votre code à partager. Votre ami le saisit dans « Réserver » : vous gagnez chacun une réduction sur la première location. Le montant de la réduction dépend du contrat de chaque parrainage.",
      en: "On the Referral page you get your code to share. Your friend enters it under “Book”: you each earn a discount on the first rental. The amount of the discount depends on the contract of each referral.",
    },
    kw: { fr: ["parrainage", "parrain", "code", "ami", "filleul", "reduction"], en: ["referral", "refer", "code", "friend", "discount"] },
  },
  {
    id: "loyalty", category: "loyalty",
    q: { fr: "Y a-t-il un programme de fidélité ?", en: "Is there a loyalty program?" },
    a: {
      fr: "Chaque 5e location donne une journée gratuite. Créer un compte (facultatif) vous permet de retrouver toutes vos réservations au même endroit.",
      en: "Every 5th rental earns a free day. Creating an account (optional) lets you find all your bookings in one place.",
    },
    kw: { fr: ["fidelite", "fidele", "gratuit", "5e", "cinquieme"], en: ["loyalty", "loyal", "free", "5th", "fifth"] },
  },
  // ------------------------------------------------------------------ Compte
  {
    id: "account-needed", category: "account",
    q: { fr: "Faut-il un compte pour réserver ?", en: "Do I need an account to book?" },
    a: {
      fr: "Non, le compte est facultatif. Il sert à retrouver vos réservations, vos contrats et vos informations au même endroit. Il se crée avec votre numéro de téléphone et un mot de passe.",
      en: "No, an account is optional. It lets you find your bookings, contracts and details in one place. You create it with your phone number and a password.",
    },
    kw: { fr: ["compte", "inscription", "inscrire", "creer", "connexion", "connecter"], en: ["account", "sign up", "register", "create", "login", "log in"] },
  },
  {
    id: "forgot-password", category: "account",
    q: { fr: "J'ai oublié mon mot de passe", en: "I forgot my password" },
    a: {
      fr: "Écrivez-nous sur WhatsApp au {phone} : nous vous envoyons un mot de passe provisoire, que vous pouvez ensuite changer dans « Mon compte ».",
      en: "Write to us on WhatsApp at {phone}: we send you a temporary password, which you can then change under “My account”.",
    },
    kw: { fr: ["mot de passe", "oublie", "perdu", "reinitialiser"], en: ["password", "forgot", "lost", "reset"] },
  },
  {
    id: "privacy", category: "account",
    q: { fr: "Mes données sont-elles protégées ?", en: "Is my data protected?" },
    a: {
      fr: "Votre numéro sert à vous identifier et à vous contacter pour vos réservations, et il n'est jamais partagé. Les mots de passe sont chiffrés. Vous pouvez supprimer votre compte à tout moment dans « Mon compte ».",
      en: "Your number is used to identify you and to contact you about your bookings, and it is never shared. Passwords are encrypted. You can delete your account at any time under “My account”.",
    },
    kw: { fr: ["donnees", "protege", "securite", "confidentialite", "prive", "supprimer"], en: ["data", "protected", "security", "privacy", "private", "delete"] },
  },
  // ------------------------------------------------------------------ Aide
  {
    id: "contact", category: "help", popular: true,
    q: { fr: "Comment contacter l'équipe ?", en: "How can I contact the team?" },
    a: {
      fr: "Par WhatsApp au {phone} (réponse rapide), avec le bouton WhatsApp en bas à droite du site, ou depuis la page Agence.",
      en: "On WhatsApp at {phone} (fast reply), with the WhatsApp button at the bottom right of the site, or from the Agency page.",
    },
    kw: { fr: ["contacter", "contact", "joindre", "telephone", "appeler", "whatsapp", "equipe"], en: ["contact", "reach", "phone", "call", "whatsapp", "team"] },
  },
  {
    id: "english-site", category: "help",
    q: { fr: "Le site est-il disponible en anglais ?", en: "Is the site available in English?" },
    a: {
      fr: "Oui. Choisissez « EN » dans l'en-tête : le site et le conseiller passent en anglais.",
      en: "Yes. Choose “EN” in the header: the site and the advisor switch to English.",
    },
    kw: { fr: ["anglais", "english", "langue", "traduction"], en: ["english", "language", "translation", "french"] },
  },
];

// ---------------------------------------------------------------------------------------------
// Variables ({phone}, {driverFee}, {minRent}) et version publique
// ---------------------------------------------------------------------------------------------
export interface FaqVars {
  phone: string;
  driverFee: string;
  minRent: string;
}

export const formatPhone = (digits: string): string =>
  digits.startsWith("237") && digits.length === 12 ? `${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}` : digits;

export function fill(text: string, vars: FaqVars): string {
  return text.replace(/\{(phone|driverFee|minRent)\}/g, (_m, k: keyof FaqVars) => vars[k]);
}

export interface PublicFaq {
  categories: { id: string; label: Bi }[];
  entries: { id: string; category: string; popular: boolean; q: Bi; a: Bi }[];
}

export function publicFaq(vars: FaqVars): PublicFaq {
  return {
    categories: FAQ_CATEGORIES,
    entries: FAQ.map((e) => ({
      id: e.id,
      category: e.category,
      popular: !!e.popular,
      q: e.q,
      a: { fr: fill(e.a.fr, vars), en: fill(e.a.en, vars) },
    })),
  };
}

// ---------------------------------------------------------------------------------------------
// Recherche par mots-clés (mode de secours, sans IA)
// ---------------------------------------------------------------------------------------------
const STOP: Record<Lang, Set<string>> = {
  fr: new Set("le la les un une des de du d l et ou a au aux en pour par sur dans avec sans que qui quoi est sont je j tu vous nous mon ma mes votre vos ce cette ces il elle on y ne pas plus puis peut peux pouvez puisje comment quel quelle quels quelles ai as avez faut".split(" ")),
  en: new Set("the a an of to for and or in on at with without is are am i you we my your our it its do does can could would how what which where when there any be by from as if this that these those me".split(" ")),
};

export const normalize = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const tokens = (s: string, lang: Lang): string[] =>
  normalize(s).split(" ").filter((t) => t.length > 1 && !STOP[lang].has(t)).map((t) => t.replace(/(s|x)$/, ""));

export function searchFaq(text: string, lang: Lang, limit = 3): { entry: FaqEntry; score: number }[] {
  const qTokens = tokens(text, lang);
  const qNorm = ` ${normalize(text)} `;
  if (!qTokens.length) return [];
  return FAQ.map((entry) => {
    const kwPhrases = (entry.kw?.[lang] ?? []).map(normalize);
    const kwTokens = new Set(kwPhrases.flatMap((p) => p.split(" ").map((t) => t.replace(/(s|x)$/, ""))));
    const questionTokens = new Set(tokens(entry.q[lang], lang));
    let score = 0;
    const kwList = [...kwTokens];
    for (const t of qTokens) {
      if (kwTokens.has(t)) score += 2;
      else if (t.length >= 5 && kwList.some((k) => k.length >= 5 && k.slice(0, 5) === t.slice(0, 5))) score += 1; // « livrez » ~ « livrer »
      if (questionTokens.has(t)) score += 1;
    }
    for (const p of kwPhrases) if (p.includes(" ") && qNorm.includes(` ${p} `)) score += 3;
    return { entry, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

# Yamoo Drive – site web (frontend multi-pages + backend TypeScript)

Vente et location de véhicules, avec ou sans chauffeur, réservation sur WhatsApp, paiement en ligne (**démonstration**) et contrat de location en PDF.

## Ce que contient le projet

```
src/
  shared/    types.ts, pricing.ts      Types et calcul de prix utilisés par le serveur ET le navigateur
  server/    index.ts                  Serveur HTTP (aucune dépendance) : pages, fichiers, API
             data.ts                   Catalogue : véhicules, chauffeurs, promotions (à remplacer / brancher sur une base)
             validate.ts               Validation stricte des données reçues
             store.ts                  Stockage des réservations (fichier JSON, remplaçable par PostgreSQL)
             payments.ts               Paiement : interface PaymentProvider + simulation
             contract.ts, pdf.ts       Contrat de location / bon de commande en PDF (sans bibliothèque)
  client/    main.ts, api.ts           Démarrage, appels API typés
             reserve.ts, payment.ts    Pages Réserver et Paiement
             ui.ts                     Interface reprise du prototype (// @ts-nocheck, à typer progressivement)
views/       layout.html, partials/, pages/   Une page HTML par rubrique
public/      css/, img/, favicon…              Fichiers statiques (les images ne sont plus dans le HTML)
```

Pages : `/`, `/vehicules`, `/vehicule?id=N`, `/promos`, `/occasions`, `/chauffeurs`, `/comparer`, `/cadeau`, `/parrainage`, `/agence`, `/reserver`, `/paiement`.

## Lancer en local

Prérequis : Node.js 20.11 ou plus récent.

```bash
npm install
npm run build        # compile le TypeScript (serveur + client)
npm start            # http://localhost:3000
```

`npm run dev` recompile puis relance le serveur à chaque changement du serveur. `npm run typecheck` vérifie les types sans écrire de fichiers.

## API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/catalog` | Véhicules, chauffeurs, promotions, configuration publique |
| POST | `/api/reservations` | Crée une réservation. **Le prix est recalculé par le serveur.** |
| GET | `/api/reservations/:id` | Détail d'une réservation |
| GET | `/api/reservations/:id/contract` | Télécharge le contrat (location) ou le bon de commande (achat) en PDF |
| POST | `/api/payments` | Paiement (démonstration). Corps : `{reservationId, method, phone?}` |
| GET | `/api/admin/reservations` | Liste des réservations. Exige `Authorization: Bearer <ADMIN_TOKEN>` |
| GET | `/health` | Contrôle de santé |

La référence (`YD-` + 10 caractères aléatoires) sert de secret : ne la partagez pas publiquement.

## Variables d'environnement

Voir `.env.example`. Principales : `PORT`, `WHATSAPP_NUMBER`, `DRIVER_FEE_PER_DAY`, `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_PHONE`, `COMPANY_REGISTRATION`, `DEPOSIT_TEXT`, `DATA_DIR`, `ADMIN_TOKEN`.
Renseignez surtout `COMPANY_ADDRESS` et `COMPANY_REGISTRATION` : ils apparaissent sur le contrat.

## Déploiement sur Railway

1. Envoyez le projet sur GitHub (le `.gitignore` exclut `node_modules`, `dist`, `public/js`, `data`).
2. Railway → **New Project → Deploy from GitHub repo**. Le `Dockerfile` compile le TypeScript puis lance `node dist/server/index.js` ; Railway fournit `PORT` automatiquement.
3. Service → **Variables** : ajoutez les variables ci-dessus (au minimum `COMPANY_ADDRESS`, `ADMIN_TOKEN`).
4. Service → **Settings → Networking → Generate Domain** pour tester, puis **Custom Domain** pour votre domaine.
5. Cloudflare → DNS : créez les enregistrements CNAME (et TXT de vérification) donnés par Railway, nuage gris (DNS only) le temps de la validation. SSL/TLS → mode **Full** (pas Flexible).

**Données persistantes.** Sans volume, le fichier des réservations est effacé à chaque déploiement. Deux options : ajouter un **Volume** Railway monté sur `/app/data` (si l'écriture est refusée, essayez la variable `RAILWAY_RUN_UID=0`), ou, mieux pour la production, remplacer `ReservationStore` par PostgreSQL (même interface : `get`, `list`, `save`).

## Paiement en ligne : ce qui est fait, ce qui reste

**Fait (démonstration).** Parcours complet : récapitulatif, choix Carte / Orange Money / MTN Mobile Money / Paiement à l'agence, confirmation, contrat. Aucun argent n'est débité. Les champs de carte ne sont **jamais envoyés** au serveur.

**Pour un vrai paiement.** Implémentez l'interface `PaymentProvider` (`src/server/payments.ts`) avec votre prestataire (par exemple CinetPay, Flutterwave, Orange Money, MTN MoMo ou Stripe), puis :
- créez la transaction chez le prestataire et redirigez le client vers sa page de paiement ;
- ajoutez une route de **webhook** et vérifiez sa signature avant de marquer la réservation payée ;
- ne collectez jamais vous-même les numéros de carte (utilisez la page hébergée du prestataire).

## Heures de réception et de retour

En location, le client indique l'heure à laquelle il veut recevoir le véhicule et l'heure de retour (champs `stime` et `etime`). Elles sont validées par le serveur (`HH:MM`), ajoutées au message WhatsApp et inscrites sur le contrat. Elles sont obligatoires pour payer en ligne ou télécharger le contrat.

## Contrat de location

Généré par `src/server/contract.ts` : parties, véhicule, durée, chauffeur, prix, statut du paiement, 10 clauses, zones de signature. **C'est un modèle de départ : faites-le relire et adapter par un juriste** (caution, franchise d'assurance, kilométrage, droit applicable, mentions légales) avant de l'utiliser avec de vrais clients.

## Reste à faire avant le lancement

- Remplacer les données de démonstration (`src/server/data.ts`) : vrais véhicules, prix, chauffeurs, avis, promotions.
- Remplacer les captures d'écran par vos propres photos (`public/img/`, 4 par véhicule).
- Compléter l'adresse, les horaires et la carte (page Agence, footer).
- Brancher une vraie base de données et un vrai paiement.
- Ajouter l'envoi d'e-mails / SMS de confirmation et un espace d'administration.
- Typer progressivement `src/client/ui.ts`.

## Sécurité déjà en place

Validation de toutes les entrées, prix recalculé côté serveur, limite de débit par IP, taille des requêtes limitée, en-têtes de sécurité (CSP, X-Frame-Options, etc.), protection contre l'accès hors de `public/`, conteneur exécuté sans droits root, aucune dépendance à l'exécution.

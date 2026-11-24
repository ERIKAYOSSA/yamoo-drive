# Conseiller virtuel Yamoo Drive

Un bouton de discussion apparaît en bas à droite de toutes les pages publiques (au-dessus du bouton WhatsApp). Le client peut :
- décrire son besoin (« une berline pour un mariage, 50 000 par jour ») : le conseiller propose des véhicules sous forme de cartes cliquables ;
- poser les questions fréquentes (paiement, livraison, chauffeur, cadeau, promos, compte…) ;
- passer à tout moment à l'équipe avec le bouton **WhatsApp** de la fenêtre.

Il répond en français ou en anglais selon la langue du client. Une page **/faq** reprend les mêmes questions, avec recherche et catégories.

**Le conseiller ne confirme jamais** une disponibilité, un paiement ou un prix hors catalogue : il renvoie vers « Réserver » ou WhatsApp.

## Deux modes

| Mode | Quand | Coût |
|---|---|---|
| **FAQ** (par défaut) | Pas de clé API, plafond du jour atteint, ou IA en panne | Gratuit |
| **IA** | `ANTHROPIC_API_KEY` renseignée | Quelques centimes par jour pour un petit site |

Le passage d'un mode à l'autre est automatique : le client ne voit jamais d'erreur.

## Activer l'IA

1. Créez un compte sur https://console.anthropic.com et générez une **clé API**.
2. Dans `.env` :
```
ANTHROPIC_API_KEY=votre_cle
AI_MODEL=claude-haiku-5-5
AI_DAILY_LIMIT=400
```
3. Relancez le serveur. La clé reste **uniquement sur le serveur** : elle n'est jamais envoyée au navigateur.

`AI_DAILY_LIMIT` est un garde-fou : après 400 réponses IA dans la journée (tous visiteurs confondus), le conseiller continue en mode FAQ jusqu'au lendemain. Chaque visiteur est aussi limité à 15 messages toutes les 10 minutes.

## Ce que l'IA connaît

À chaque message, le serveur lui donne : le catalogue (noms, descriptions, caractéristiques, prix d'achat et par jour), les chauffeurs, les promotions en cours, les règles de la boutique et **toutes les questions fréquentes** de `src/server/faq.ts`. Elle n'a accès ni aux réservations, ni aux comptes, ni aux numéros de téléphone des clients. Si vous changez un prix dans le catalogue, le conseiller le sait immédiatement.

## Modifier ou compléter les questions fréquentes

Tout est dans **`src/server/faq.ts`** (liste `FAQ`). Chaque question existe en français et en anglais :
```ts
{
  id: "with-driver", category: "driver", popular: true,
  q: { fr: "Puis-je louer avec un chauffeur ?", en: "Can I rent with a driver?" },
  a: { fr: "Oui : {driverFee} de plus par jour…", en: "Yes: {driverFee} extra per day…" },
  kw: { fr: ["chauffeur", "conducteur"], en: ["driver", "chauffeur"] },
}
```
- `popular: true` : la question apparaît comme bouton rapide à l'ouverture du chat.
- `{phone}`, `{driverFee}`, `{minRent}` sont remplacés automatiquement (numéro WhatsApp, tarif chauffeur, location la moins chère).
- `kw` aide le mode FAQ à reconnaître la question (sans accents).
- Après modification : `npm run build` puis redémarrage.

### Règles déjà intégrées (vos réponses)
Documents (permis + pièce d'identité) · caution (25 % de la location sans chauffeur, aucune avec chauffeur) · annulation (possible tant que ce n'est pas payé, report possible après paiement) · retard (retour à l'heure, période supplémentaire facturée, prolongation sur accord) · sortie de la ville (avec chauffeur uniquement).

La caution est aussi appliquée dans le **contrat PDF** : 25 % du montant de la location (calculé automatiquement) ou « Aucune caution (location avec chauffeur) ». Le pourcentage se règle avec `DEPOSIT_PERCENT` dans `.env`.

### Réponses « ça dépend » (marquées `confirm: true`)
Pour ces questions, l'IA ne donne aucun chiffre et renvoie vers WhatsApp : `mileage-fuel` (dépend du véhicule) · `buy-installments` (modalités à fixer avec l'équipe) · `decoration` (tarif selon la décoration) · `referral` (montant selon le contrat de parrainage) · `agency` (adresse et horaires : **à compléter**).

Dès que vous avez une règle précise (par exemple le kilométrage inclus d'un véhicule, ou l'adresse de l'agence), écrivez-la dans la réponse (français + anglais) et retirez `confirm: true`.

Vérifiez aussi `payment-methods` quand les paiements réels seront activés (aujourd'hui le site est en mode démonstration).

## Sécurité et vie privée

- Les messages ne contiennent ni mot de passe ni numéro de carte : le conseiller n'en demande jamais.
- Les consignes imposent de rester sur le sujet Yamoo Drive et d'ignorer toute demande de les contourner.
- Seuls les 12 derniers messages et 600 caractères par message sont envoyés.
- Les conversations ne sont pas enregistrées sur votre serveur (elles restent dans le navigateur du client le temps de sa visite). Si vous envoyez des messages à Anthropic, consultez leur politique de confidentialité et mentionnez le conseiller dans la vôtre.

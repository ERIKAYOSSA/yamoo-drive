# Page admin Yamoo Drive

Adresse : `https://votre-site.com/admin` (en local : `http://localhost:3000/admin`).

## 1. Activer la page admin

Dans votre fichier `.env`, ajoutez un mot de passe (une phrase longue vaut mieux qu'un mot court) :

```
ADMIN_PASSWORD=une-longue-phrase-que-vous-etes-seul-a-connaitre
```

Puis `npm run build` et redémarrez le serveur. Sans `ADMIN_PASSWORD`, la page reste désactivée.

Vous restez connecté 7 jours sur l'appareil. Après 6 tentatives ratées en 10 minutes, la connexion est bloquée temporairement.

## 2. Ce que contient la page

| Onglet | Rôle |
|---|---|
| **Accueil** | Chiffres du mois, réservations « à traiter », véhicules les plus demandés, graphique sur 12 mois |
| **Réservations** | Recherche, filtres par statut, fiche complète, boutons WhatsApp / Appeler / Contrat PDF, note interne |
| **Clients** | Les comptes créés sur le site (facultatifs) : niveau de fidélité, total dépensé, réservations, WhatsApp / Appeler, mot de passe provisoire, export Excel |
| **Rapports** | Rapport par mois : **Imprimer**, **PDF**, **Excel (réservations)**, **Excel (12 mois)** |
| **Réglages** | État des notifications, bouton « message test », déconnexion |

Suivi d'une réservation : Nouvelle → Confirmée → Remise effectuée → Terminée (ou Annulée).
Les réservations annulées ne sont pas comptées dans les totaux. Les rapports se basent sur la date de la demande.

Quand une nouvelle réservation arrive pendant que la page est ouverte, un petit son et une alerte s'affichent (vérification toutes les 25 secondes).

## 3. Recevoir les notifications sur WhatsApp

À chaque nouvelle réservation et à chaque paiement, le serveur vous envoie un message sur **votre** WhatsApp (client, véhicule, montant, lieu, lien vers la fiche).

### Option A : CallMeBot (gratuit, simple, idéal pour tester)

1. Suivez les instructions officielles sur https://www.callmebot.com (rubrique « WhatsApp ») : vous activez le service depuis votre WhatsApp et vous recevez une **clé API**.
2. Dans `.env` :

```
NOTIFY_PROVIDER=callmebot
NOTIFY_PHONE=237XXXXXXXXX        # votre numéro avec l'indicatif, sans + ni espaces
CALLMEBOT_APIKEY=la_cle_recue
PUBLIC_URL=https://votre-site.com
```

3. Redémarrez, ouvrez **Réglages** et cliquez sur « Envoyer un message test ».

C'est un service tiers non officiel : pratique pour démarrer, mais à remplacer par l'option B quand le site tourne pour de vrai.

### Option B : API officielle WhatsApp Cloud (Meta)

Il faut un compte Meta Business et un numéro WhatsApp Business. Dans `.env` :

```
NOTIFY_PROVIDER=cloud
NOTIFY_PHONE=237XXXXXXXXX
WA_CLOUD_TOKEN=votre_jeton
WA_CLOUD_PHONE_ID=identifiant_du_numero
WA_CLOUD_TEMPLATE=nom_du_modele      # voir ci-dessous
WA_CLOUD_LANG=fr
```

WhatsApp n'autorise un message libre que dans les 24 h qui suivent un message que **vous** lui avez écrit. Pour recevoir les alertes à tout moment, créez dans Meta un **modèle de message** avec une seule variable `{{1}}` (par exemple « Yamoo Drive : {{1}} ») et indiquez son nom dans `WA_CLOUD_TEMPLATE`. Le serveur y met le résumé de la réservation.

Si aucun fournisseur n'est configuré, la page admin fonctionne quand même : vous voyez les nouvelles réservations en l'ouvrant.

## 4. Où sont les données ?

Dans `data/reservations.json` (phase de test). **Faites-en une copie régulièrement.** Quand vous passerez à une vraie base de données, seul `src/server/store.ts` aura besoin de changer : la page admin et les rapports ne bougent pas.

Les champs ajoutés par l'admin (`fulfillment`, `note`, `updatedAt`) sont écrits dans ce même fichier ; les anciennes réservations continuent de fonctionner (statut « Nouvelle » par défaut).

## 5. Sécurité

- Cookie de session `HttpOnly`, `SameSite=Strict`, signé ; `Secure` automatiquement derrière HTTPS (le proxy doit envoyer `X-Forwarded-Proto: https`).
- Les actions de modification refusent toute requête venant d'un autre site.
- Tout ce que saisissent les clients est échappé à l'affichage, et neutralisé dans les exports Excel (pas de formule exécutée).
- La page est exclue des moteurs de recherche (`noindex`).
- Gardez `ADMIN_PASSWORD` secret et ne le partagez pas par message.

## 6. Comptes clients (facultatifs)

Les visiteurs peuvent créer un compte sur `/compte` (bouton « Se connecter » dans l'en-tête). **Réserver sans compte reste possible.**

- Identifiant : le **numéro de téléphone** (+ mot de passe de 8 caractères minimum, e-mail facultatif).
- Un client connecté a son nom et son numéro préremplis dans « Réserver », et ses réservations sont rattachées à son compte. Il les retrouve dans « Mon compte » (statut, contrat PDF, paiement). Il peut modifier ses informations, changer son mot de passe ou supprimer son compte.
- Dans l'admin, l'onglet **Clients** classe les inscrits par fidélité. Niveaux : **Nouveau** (0 à 1 réservation), **Régulier** (2), **Fidèle** (3 à 4), **VIP** (5 et plus, ou 1 000 000 FCFA dépensés). Les réservations annulées ne comptent pas. Côté admin, les réservations faites avec le même numéro, même sans être connecté, sont comptées.
- **Mot de passe oublié :** ouvrez la fiche du client dans l'admin, « Réinitialiser le mot de passe », puis envoyez-lui le mot de passe provisoire sur WhatsApp. Il le change ensuite dans « Mon compte ».
- Vous recevez aussi une notification WhatsApp à chaque nouveau compte.
- Les données sont dans `data/users.json` (mots de passe chiffrés avec scrypt, jamais en clair). Sauvegardez ce fichier avec `reservations.json`. Le fichier `data/.session-secret` signe les connexions : ne le supprimez pas, sinon tout le monde devra se reconnecter.

**Limite actuelle :** le numéro n'est pas vérifié par un code (SMS ou WhatsApp). Quelqu'un pourrait créer un compte avec le numéro d'un autre. Ça ne donne accès à aucune réservation existante (seules celles faites une fois connecté sont visibles), et vous pouvez supprimer un compte depuis l'admin. Une vérification par code pourra être ajoutée plus tard.

## 7. Position du lieu de remise (Google Maps)

Dans « Réserver », sous la ville et le quartier, le client peut ajouter :
- un **repère** (« en face de la pharmacie ») ;
- sa **position exacte** avec « Partager ma position » (le téléphone demande l'autorisation), ou en collant un **lien Google Maps** (utile pour un cadeau : le proche envoie sa position sur WhatsApp).

Seuls de vrais liens Google Maps en https sont acceptés (`maps.app.goo.gl`, `google.com/maps`…) : le serveur refuse tout autre lien. Le partage de position ne fonctionne qu'en **https** (ou en local), comme tout site avec géolocalisation.

Où vous le retrouvez : message WhatsApp de la réservation, notification WhatsApp, fiche de la réservation dans l'admin (bouton **Itinéraire**, ou « Voir le quartier sur Google Maps » si le client n'a pas partagé de position), pastille « Position GPS » dans la liste, contrat PDF et export Excel.

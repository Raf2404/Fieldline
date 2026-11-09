# Fieldline — boutique de crampons

![Fieldline](public/brand/fieldline-logo.png)

Site de vente de crampons de football à prix réduit : catalogue mobile, réservation en ligne avec paiement
via WhatsApp, suivi de commande et espace de gestion utilisable sans toucher au code.
Le cahier des charges est la référence fonctionnelle, sauf pour le paiement (voir ci-dessous).

## Paiement : WhatsApp au lieu de PayPal

1. Le client valide sa commande sur le site (coordonnées, adresse, CGV). Elle est créée **« En attente de paiement »**
   et les paires sont **réservées** (retirées du stock).
2. La page de confirmation affiche un bouton **« Envoyer ma commande sur WhatsApp »** : le message (numéro de commande,
   articles, total) est déjà rempli.
3. Le vendeur règle le paiement avec le client sur WhatsApp, puis clique **« Paiement reçu »** dans l'admin : la commande passe en « Payée ».
4. Sans validation dans le délai (48 h par défaut, réglable), la commande est **annulée automatiquement** et les paires reviennent en stock.

Le numéro WhatsApp, le texte sur le moyen de paiement, le délai et les frais de port se règlent dans **Admin > Réglages**.

**Stack** : Next.js 16 (App Router, Cache Components) · Postgres (Supabase en production) via Drizzle ORM ·
Supabase Storage pour les photos · Vercel pour l'hébergement.

## Avancement

| Phase | Contenu | État |
|---|---|---|
| 1-2 | Catalogue public (accueil, catalogue filtrable, fiche produit, FAQ, guide des tailles) + gestion des articles sans code | ✅ fait |
| 3 | Panier, commande, paiement via WhatsApp, réservation et libération du stock, admin commandes, réglages | ✅ fait |
| 4 | E-mails automatiques, numéros de suivi transporteur, page « Suivre ma commande », espace client, demandes problème / retour | ✅ fait |
| 5 | Chiffre d'affaires, codes promo, actions groupées, export commandes, bon de livraison, clients, réglages complets, équipe, double authentification | ✅ fait |
| 6 | Pages légales (CGV avec les conditions de paiement), contact, facture PDF, nom de domaine, mise en ligne | à faire |

### Déjà en place
- **Site** : pensé téléphone d'abord. Filtres marque / pointure / terrain / prix + tri, disponibilité par pointure
  (« Disponible », « Plus que X paires », « Rupture », « Bientôt disponible », « Sur commande »),
  galerie avec zoom, prix barré et remise, « Me prévenir du retour en stock », référencement (titres, descriptions, données produit).
- **Admin** (`/admin`) : connexion sécurisée, tableau de bord (stock bas, alertes), liste des articles avec
  changement de statut en un clic, prix et stock modifiables directement, dupliquer, supprimer (sans toucher aux commandes),
  ordre d'affichage par glisser-déposer (souris et doigt), fiche article complète (photos glisser-déposer jusqu'à 8,
  réordonnables, redimensionnées automatiquement ; pointures et stock ; prix d'achat et marge visibles seulement en admin),
  import / export CSV compatible Excel.
- **Commandes** : panier (cookie, sans compte), page commande avec contrôle des champs, confirmation avec bouton WhatsApp,
  admin commandes par onglets (paiement à valider avec compte à rebours, à commander, en cours…), fiche commande
  (valider le paiement, prolonger 48 h, avancer d'étape, annuler avec remise en stock, rembourser, écrire au client sur WhatsApp,
  notes internes, historique horodaté). Prix et stock toujours relus en base à la commande ; deux clients ne peuvent pas prendre
  la même dernière paire ; 2 commandes non payées maximum par client (anti-blocage du stock).
- **Suivi et e-mails** : un e-mail aux couleurs de Fieldline à chaque étape (commande réservée avec bouton WhatsApp, payée,
  commandée, reçue, expédiée avec lien de suivi du transporteur, livrée, annulée, remboursée, retard) + alerte au vendeur
  à chaque commande et chaque demande client. Tous les e-mails sont visibles et renvoyables depuis la fiche commande.
  Page de commande client avec frise des étapes datées, date de livraison estimée, colis, message du vendeur,
  « Signaler un problème » / « Demander un retour ». Page « Suivre ma commande » (numéro + e-mail, sans compte).
- **Espace client** : connexion sans mot de passe par lien e-mail (usage unique, 30 min), toutes les commandes passées
  avec cet e-mail, profil qui pré-remplit la commande suivante, suppression du compte (RGPD).
- **Gestion (phase 5)** : chiffre d'affaires du jour / de la semaine / du mois, meilleures ventes et pointures
  les plus demandées ; codes promo (% ou montant fixe, date de fin, nombre d'utilisations, panier minimum) ;
  actions groupées sur les commandes (ex. 10 paires reçues d'un coup, chaque client prévenu) ; export CSV des
  commandes (une ligne par article) ; bon de livraison imprimable ; liste et fiches clients ; réglages : délai
  affiché, réseaux sociaux, informations légales, textes des e-mails ; équipe avec compte **associé**
  (articles, commandes, clients, promos — sans réglages, équipe, chiffre d'affaires ni prix d'achat) ;
  **double authentification** (application Google Authenticator ou équivalent) et changement de mot de passe.
- **Règles** : un article passe seul en « Rupture de stock » quand toutes ses pointures sont à 0 (sauf « Vente sur commande »).
  Toute modification dans l'admin est visible immédiatement sur le site.

## Démarrer en local

Prérequis : Node.js 20+ et Docker (pour la base locale). Sans Docker, mets directement l'URL d'un projet Supabase de test dans `DATABASE_URL`.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Puis remplace `SESSION_SECRET` dans `.env.local` par le résultat de `openssl rand -base64 32`.

```bash
npm run db:up
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run admin:create -- ton@email.fr "Ton prénom"
```

```bash
npm run dev
```

Site : http://localhost:3000 · Admin : http://localhost:3000/admin

`db:seed` crée 11 articles de démonstration avec des visuels générés (refuse de tourner sur une base distante).

## Mise en ligne (Supabase + Vercel)

1. **Supabase** : crée un projet. Dans *Storage*, crée un bucket **public** nommé `products`.
2. **Base** : récupère l'URL de connexion (*Connect* > *Session pooler* pour les migrations, *Transaction pooler* pour le site), puis :
   ```bash
   DATABASE_URL="postgres://…session-pooler…" npm run db:migrate
   ```
   ```bash
   DATABASE_URL="postgres://…session-pooler…" npm run admin:create -- ton@email.fr "Ton prénom"
   ```
3. **Vercel** : importe le dépôt GitHub et renseigne les variables de `.env.example` :
   `DATABASE_URL` (transaction pooler), `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_BUCKET=products`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.
4. **E-mails** : crée un compte Resend, vérifie ton nom de domaine, puis renseigne `RESEND_API_KEY` et `EMAIL_FROM` sur Vercel.
5. **Annulation des commandes non payées** : elle a lieu à chaque nouvelle commande, à chaque ouverture de l'admin,
   et une fois par jour via la tâche planifiée de `vercel.json` (limite du plan gratuit de Vercel). Pour un passage
   toutes les heures, programme un service gratuit (ex. cron-job.org) qui appelle
   `https://ton-site/api/cron/commandes-expirees` avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.

La clé `SUPABASE_SERVICE_ROLE_KEY` reste côté serveur : ne la mets jamais dans une variable `NEXT_PUBLIC_…`.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` / `npm start` | build et serveur de production |
| `npm run db:generate` | génère une migration après modification de `src/db/schema.ts` |
| `npm run db:migrate` | applique les migrations |
| `npm run typecheck` / `npm run lint` | vérifications |

## Organisation du code

```
src/
  app/(shop)/          site public (accueil, catalogue, produit, FAQ, guide des tailles)
  app/(shop)/panier/   panier et actions de commande
  app/(shop)/commande/ page commande et confirmation WhatsApp
  app/admin/(panel)/   espace de gestion (articles, commandes, réglages)
  app/admin/connexion/ connexion admin
  db/schema.ts         tables (articles, pointures, photos, marques, admins, alertes stock, commandes, réglages)
  lib/catalog.ts       règles métier : statuts, disponibilité, pointures
  lib/queries.ts       lecture du catalogue public (mise en cache, vidée à chaque modification)
  lib/admin-data.ts    lectures de l'admin
  lib/order-service.ts création des commandes, réservation / libération du stock, expiration, e-mails de statut
  lib/email*.ts        envoi (Resend) et modèles d'e-mails
  lib/customer-auth.ts connexion client par lien e-mail
  lib/orders.ts        statuts, téléphone, lien WhatsApp
  lib/settings.ts      réglages modifiables dans l'admin
  lib/storage.ts       photos : Supabase Storage, ou .data/uploads en local
  proxy.ts             redirection vers la connexion pour /admin
```

@AGENTS.md

# Projet : boutique de crampons

- Textes visibles en français, tutoiement côté client. Prix stockés en centimes (`priceCents`).
- Next.js 16 avec `cacheComponents` : les données publiques passent par `getPublicCatalog()` (`use cache` + tag `catalog`).
  Toute action qui modifie le catalogue doit appeler `expireCatalog()` / `catalogChanged()` (voir `src/app/admin/(panel)/articles/actions.ts`).
  Ne pas pré-générer les pages produit (`generateStaticParams`) : la page complète serait servie périmée une fois après une modification.
- Chaque page et chaque Server Action de l'admin commence par `await requireAdmin()`.
- Formulaires avec `useActionState` : soumettre via `onSubmit` + `startTransition`, pas `action={…}`, sinon React vide les champs après une erreur.
- Schéma : modifier `src/db/schema.ts`, puis `npm run db:generate` et `npm run db:migrate`.
- Paiement hors site via WhatsApp (pas de PayPal) : une commande naît « pending_payment » avec stock réservé ;
  tout changement de statut passe par `changeOrderStatus()` (`src/lib/order-service.ts`), qui gère la remise en stock et l'historique.
- E-mails : toujours via `sendEmail()` (`src/lib/email.ts`), qui journalise dans la table `emails` (sans clé Resend : statut « skipped »).
  Changement de statut côté admin = `changeOrderStatus()` puis `notifyStatus()`.
- Charte : marine `ink` #202a33, bleu `brand` #06afea, vert `accent` #a1ff2a, `orange` #ff6b21 ; titres h1/h2 en Saira.
  Le symbole du logo a des traits blancs : ne le poser que sur fond marine.

@AGENTS.md

# Projet : boutique de crampons

- Textes visibles en français, tutoiement côté client. Prix stockés en centimes (`priceCents`).
- Next.js 16 avec `cacheComponents` : les données publiques passent par `getPublicCatalog()` (`use cache` + tag `catalog`).
  Toute action qui modifie le catalogue doit appeler `expireCatalog()` / `catalogChanged()` (voir `src/app/admin/(panel)/articles/actions.ts`).
  Ne pas pré-générer les pages produit (`generateStaticParams`) : la page complète serait servie périmée une fois après une modification.
- Chaque page et chaque Server Action de l'admin commence par `await requireAdmin()`.
- Formulaires avec `useActionState` : soumettre via `onSubmit` + `startTransition`, pas `action={…}`, sinon React vide les champs après une erreur.
- Schéma : modifier `src/db/schema.ts`, puis `npm run db:generate` et `npm run db:migrate`.

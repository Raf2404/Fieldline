"use client";

import Form from "next/form";
import { useState, type ReactNode } from "react";
import { FilterIcon, XIcon } from "./icons";

/** Panneau de filtres : feuille plein écran sur téléphone, colonne fixe sur ordinateur. Soumission automatique. */
export function FilterPanel({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary btn-sm lg:hidden">
        <FilterIcon className="size-4" /> Filtrer{count > 0 && ` (${count})`}
      </button>
      <div
        className={`${open ? "fixed" : "hidden"} inset-0 z-40 bg-black/40 lg:hidden`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`${open ? "fixed" : "hidden"} inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-paper p-5 pb-24 lg:static lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0`}
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-lg font-bold">Filtres</p>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-full p-2 hover:bg-black/5">
            <XIcon />
          </button>
        </div>
        {children}
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper p-4 lg:hidden">
          <button type="button" onClick={() => setOpen(false)} className="btn-primary w-full">
            Voir les résultats
          </button>
        </div>
      </aside>
    </>
  );
}

/** Formulaire GET qui se soumet seul à chaque changement (navigation côté client, sans rechargement). */
export function AutoForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Form
      action="/catalogue"
      className={className}
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (target.type === "number" || target.type === "search") return; // validés avec Entrée ou en quittant le champ
        e.currentTarget.requestSubmit();
      }}
      onBlur={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (target.type === "number") e.currentTarget.requestSubmit();
      }}
    >
      {children}
    </Form>
  );
}

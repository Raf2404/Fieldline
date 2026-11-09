"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { applyPromo, removePromo } from "@/app/(shop)/panier/actions";

export function PromoForm({ current, error: currentError }: { current: string | null; error: string | null }) {
  const [state, action, pending] = useActionState(applyPromo, null);
  const [removing, startRemove] = useTransition();
  const [open, setOpen] = useState(false);
  if (current && !currentError) {
    return (
      <p className="flex items-center justify-between text-sm">
        <span>Code <b>{current}</b> appliqué ✓</span>
        <button type="button" disabled={removing} onClick={() => startRemove(() => removePromo())} className="text-muted underline">Retirer</button>
      </p>
    );
  }
  if (!open && !currentError) {
    return <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium underline underline-offset-4">J&apos;ai un code promo</button>;
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-1"
    >
      <div className="flex gap-2">
        <input name="code" defaultValue={current ?? ""} placeholder="Code promo" autoCapitalize="characters" className="input py-2 uppercase" />
        <button className="btn-secondary btn-sm shrink-0" disabled={pending}>Appliquer</button>
      </div>
      {(state?.error ?? currentError) && <p className="text-sm text-sale">{state?.error ?? currentError}</p>}
    </form>
  );
}

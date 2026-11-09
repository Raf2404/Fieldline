"use client";

import { useState, useTransition } from "react";
import { requestLinkForOrder } from "@/app/(shop)/compte/actions";

/** « Créer mon compte en un clic » après une commande sans compte. */
export function AccountLinkButton({ token, email }: { token: string; email: string }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ ok: boolean; error: string | null } | null>(null);
  if (res?.ok) return <p className="text-sm font-medium text-ok">Lien envoyé à {email}. Ouvre-le pour accéder à ton espace.</p>;
  return (
    <div className="space-y-1">
      <button type="button" disabled={pending} onClick={() => start(async () => setRes(await requestLinkForOrder(token)))} className="btn-secondary btn-sm">
        {pending ? "Envoi…" : "Créer mon espace client en un clic"}
      </button>
      {res?.error && <p className="text-sm text-sale">{res.error}</p>}
    </div>
  );
}

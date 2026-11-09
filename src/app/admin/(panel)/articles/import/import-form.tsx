"use client";

import { useActionState } from "react";
import { importCsv, type ImportState } from "../actions";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCsv, null);
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-white p-5">
      <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-white" />
      <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Import en cours…" : "Importer"}</button>
      {state?.message && <p className={`text-sm font-medium ${state.ok ? "text-ok" : "text-sale"}`}>{state.message}</p>}
      {!!state?.errors?.length && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-sale">
          {state.errors.map((er) => <li key={er}>{er}</li>)}
        </ul>
      )}
    </form>
  );
}

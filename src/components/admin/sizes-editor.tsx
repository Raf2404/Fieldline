"use client";

import { useState } from "react";
import { DEFAULT_SIZES, compareSizes } from "@/lib/catalog";
import { XIcon } from "../icons";

type Row = { size: string; stock: number };

export function SizesEditor({ initial, error }: { initial: Row[]; error?: string }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [newSize, setNewSize] = useState("");
  const total = rows.reduce((n, r) => n + (Number(r.stock) || 0), 0);

  const addSize = (size: string) => {
    const s = size.trim().replace(",", ".");
    if (!s || rows.some((r) => r.size === s)) return;
    setRows([...rows, { size: s, stock: 0 }].sort((a, b) => compareSizes(a.size, b.size)));
  };

  return (
    <div>
      <input type="hidden" name="sizes" value={JSON.stringify(rows)} />
      <div className={`overflow-hidden rounded-xl border ${error ? "border-sale" : "border-line"}`}>
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Pointure (EU)</th>
              <th className="px-3 py-2 font-medium">Quantité en stock</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={r.size}>
                <td className="px-3 py-1.5 font-semibold">{r.size}</td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={r.stock}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, stock: Math.max(0, Number(e.target.value)) } : x)))}
                    className="input w-24 py-1.5"
                    aria-label={`Stock en ${r.size}`}
                  />
                </td>
                <td>
                  <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Retirer la pointure ${r.size}`} className="rounded-full p-1.5 text-muted hover:bg-sale/10 hover:text-sale">
                    <XIcon className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-muted">Aucune pointure.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSize(newSize);
              setNewSize("");
            }
          }}
          placeholder="ex. 42.5"
          inputMode="decimal"
          className="input w-28 py-1.5"
          aria-label="Nouvelle pointure"
        />
        <button type="button" onClick={() => { addSize(newSize); setNewSize(""); }} className="btn-secondary btn-sm">Ajouter</button>
        {!rows.length && (
          <button
            type="button"
            onClick={() => setRows(DEFAULT_SIZES.map((size) => ({ size, stock: 0 })))}
            className="btn-secondary btn-sm"
          >
            Pointures standard (39 à 46)
          </button>
        )}
        <span className="ml-auto text-xs text-muted">Total : {total} paire{total > 1 ? "s" : ""}</span>
      </div>
      {error && <p className="mt-1 text-sm text-sale">{error}</p>}
    </div>
  );
}

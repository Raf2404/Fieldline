"use client";

import { useRef } from "react";

/** Éditeur volontairement simple : gras et listes, sans HTML. */
export function DescriptionEditor({ defaultValue }: { defaultValue: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after = before) => {
    const t = ref.current!;
    const { selectionStart: s, selectionEnd: e, value } = t;
    const sel = value.slice(s, e) || "texte";
    t.setRangeText(before + sel + after, s, e, "end");
    t.focus();
  };
  const bullet = () => {
    const t = ref.current!;
    const { selectionStart: s, selectionEnd: e, value } = t;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(lineStart, e) || "";
    const lines = block.split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`));
    t.setRangeText(lines.join("\n"), lineStart, e, "end");
    t.focus();
  };
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white focus-within:border-ink">
      <div className="flex gap-1 border-b border-line bg-paper p-1">
        <button type="button" onClick={() => wrap("**")} className="rounded px-2.5 py-1 text-sm font-bold hover:bg-black/5">G</button>
        <button type="button" onClick={bullet} className="rounded px-2.5 py-1 text-sm hover:bg-black/5">• Liste</button>
      </div>
      <textarea
        ref={ref}
        name="description"
        defaultValue={defaultValue}
        rows={7}
        className="block w-full resize-y px-3 py-2.5 text-base outline-none"
        placeholder={"Authentique, neuve, en boîte.\n\n- Point fort 1\n- Point fort 2"}
      />
    </div>
  );
}

"use client";

import { useRef, useState, type PointerEvent } from "react";

/**
 * Réordonner une liste en glissant une poignée — souris ET doigt (pointer events).
 * Fonctionne en liste verticale comme en grille (on vise l'élément dont le centre est le plus proche).
 */
export function useSortable<T>(items: T[], setItems: (items: T[]) => void, onDrop: (items: T[]) => void) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const live = useRef<{ index: number; items: T[] } | null>(null);

  const handleProps = (index: number) => ({
    style: { touchAction: "none" as const, cursor: "grab" },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      live.current = { index, items };
      setDragging(index);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const st = live.current;
      if (!st) return;
      let best = st.index;
      let bestDist = Infinity;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      if (best !== st.index) {
        const next = [...st.items];
        const [moved] = next.splice(st.index, 1);
        next.splice(best, 0, moved);
        live.current = { index: best, items: next };
        setDragging(best);
        setItems(next);
      }
    },
    onPointerUp: () => {
      const st = live.current;
      live.current = null;
      setDragging(null);
      if (st) onDrop(st.items);
    },
    onPointerCancel: () => {
      live.current = null;
      setDragging(null);
    },
  });

  const itemRef = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  };

  return { handleProps, itemRef, dragging };
}

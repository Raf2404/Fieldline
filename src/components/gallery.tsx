"use client";

import { useRef, useState } from "react";
import { XIcon } from "./icons";

type Img = { sm: string; lg: string };

/** Galerie produit : glisser sur téléphone, zoom au survol sur ordinateur, plein écran au clic. */
export function Gallery({ images, alt }: { images: Img[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const [full, setFull] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);
  const track = useRef<HTMLDivElement>(null);

  if (!images.length) {
    return <div className="grid aspect-square place-items-center rounded-3xl bg-white text-muted">Pas de photo</div>;
  }

  const goTo = (i: number) => {
    setCurrent(i);
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };

  return (
    <div>
      <div className="relative">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setCurrent(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-3xl bg-white [scrollbar-width:none]"
        >
          {images.map((img, i) => (
            <button
              key={img.lg}
              type="button"
              onClick={() => setFull(true)}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
              }}
              onMouseLeave={() => setOrigin(null)}
              className="relative w-full shrink-0 snap-center overflow-hidden cursor-zoom-in"
              aria-label={`Agrandir la photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.lg}
                alt={`${alt} – vue ${i + 1}`}
                width={1400}
                height={1400}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                className="size-full object-cover transition-transform duration-200"
                style={origin && i === current ? { transform: "scale(1.8)", transformOrigin: origin } : undefined}
              />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-ink" : "w-1.5 bg-ink/25"}`} />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 hidden gap-2 sm:flex">
          {images.map((img, i) => (
            <button
              key={img.sm}
              type="button"
              onClick={() => goTo(i)}
              className={`size-16 overflow-hidden rounded-xl border-2 bg-white ${i === current ? "border-ink" : "border-transparent"}`}
              aria-label={`Voir la photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.sm} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {full && (
        <div className="fixed inset-0 z-50 overflow-auto bg-white" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setFull(false)}
            className="fixed right-3 top-3 z-10 rounded-full bg-ink p-2.5 text-white"
            aria-label="Fermer"
          >
            <XIcon />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[current].lg} alt={alt} className="mx-auto min-h-full w-auto max-w-none object-contain sm:max-w-full" style={{ touchAction: "pinch-zoom" }} />
        </div>
      )}
    </div>
  );
}

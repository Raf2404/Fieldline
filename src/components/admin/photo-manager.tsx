"use client";

import { useRef, useState } from "react";
import { MAX_PHOTOS } from "@/lib/catalog";
import { uploadProductPhoto } from "@/app/admin/(panel)/articles/actions";
import { GripIcon, XIcon } from "../icons";
import { useSortable } from "./use-sortable";

type Photo = { key: string; url: string } | { uploading: string; preview: string };

/** Réduit la photo dans le navigateur (≤ 2000 px) : envoi rapide même en 4G. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file; // format non lisible par le navigateur (ex. HEIC) : le serveur s'en charge
  }
}

export function PhotoManager({ initial, error }: { initial: { key: string; url: string }[]; error?: string }) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { handleProps, itemRef, dragging } = useSortable(photos, setPhotos, () => {});

  const add = async (files: FileList | File[]) => {
    setProblem(null);
    const list = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    const room = MAX_PHOTOS - photos.length;
    if (list.length > room) setProblem(`${MAX_PHOTOS} photos maximum : ${list.length - room} photo(s) ignorée(s).`);
    for (const file of list.slice(0, Math.max(0, room))) {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      setPhotos((p) => [...p, { uploading: id, preview }]);
      const fd = new FormData();
      fd.append("file", await shrink(file), file.name.replace(/\.\w+$/, ".jpg"));
      const res = await uploadProductPhoto(fd);
      setPhotos((p) =>
        "key" in res && res.key
          ? p.map((x) => ("uploading" in x && x.uploading === id ? { key: res.key!, url: res.url! } : x))
          : p.filter((x) => !("uploading" in x && x.uploading === id)),
      );
      if ("error" in res && res.error) setProblem(res.error);
    }
  };

  const ready = photos.filter((p): p is { key: string; url: string } => "key" in p);

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(ready.map((p) => p.key))} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={`grid grid-cols-3 gap-2 rounded-2xl border-2 border-dashed p-2 sm:grid-cols-4 ${over ? "border-ink bg-accent/20" : error ? "border-sale" : "border-line"}`}
      >
        {photos.map((p, i) => (
          <div
            key={"key" in p ? p.key : p.uploading}
            ref={itemRef(i)}
            className={`group relative aspect-square overflow-hidden rounded-xl bg-paper ${dragging === i ? "ring-2 ring-ink" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={"key" in p ? p.url : p.preview} alt="" className={`size-full object-cover ${"uploading" in p ? "opacity-40" : ""}`} draggable={false} />
            {"uploading" in p ? (
              <span className="absolute inset-0 grid place-items-center text-xs font-semibold">Envoi…</span>
            ) : (
              <>
                {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">Principale</span>}
                <button type="button" aria-label="Déplacer la photo" className="absolute left-1 top-1 rounded-full bg-white/90 p-1" {...handleProps(i)}>
                  <GripIcon className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Retirer la photo"
                  onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1 hover:bg-sale hover:text-white"
                >
                  <XIcon className="size-4" />
                </button>
              </>
            )}
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="grid aspect-square place-items-center rounded-xl bg-paper p-2 text-center text-xs font-medium text-muted hover:bg-black/5 hover:text-ink"
          >
            <span>
              <span className="block text-2xl leading-none">+</span>
              Ajouter des photos
            </span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
      <p className="mt-1.5 text-xs text-muted">
        Glisse tes photos ici ou touche « + ». {MAX_PHOTOS} max, la première est la photo principale. Redimensionnées automatiquement.
      </p>
      {(problem || error) && <p className="mt-1 text-sm text-sale">{problem ?? error}</p>}
    </div>
  );
}

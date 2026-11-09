import { compareSizes } from "./catalog";
import type { PublicProduct } from "./queries";

export type SearchParams = Record<string, string | string[] | undefined>;

export const SORTS = [
  { code: "", label: "Pertinence" },
  { code: "nouveaute", label: "Nouveautés" },
  { code: "prix-asc", label: "Prix croissant" },
  { code: "prix-desc", label: "Prix décroissant" },
] as const;

export type CatalogFilters = {
  marque: string[];
  pointure: string[];
  terrain: string[];
  min: number | null;
  max: number | null;
  tri: string;
  q: string;
};

const list = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
const num = (v: string | string[] | undefined) => {
  const n = Number(list(v)[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function parseFilters(sp: SearchParams): CatalogFilters {
  return {
    marque: list(sp.marque),
    pointure: list(sp.pointure),
    terrain: list(sp.terrain),
    min: num(sp.min),
    max: num(sp.max),
    tri: list(sp.tri)[0] ?? "",
    q: (list(sp.q)[0] ?? "").trim(),
  };
}

export const activeFilterCount = (f: CatalogFilters) =>
  f.marque.length + f.pointure.length + f.terrain.length + (f.min ? 1 : 0) + (f.max ? 1 : 0);

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function applyFilters(products: PublicProduct[], f: CatalogFilters) {
  let out = products.filter((p) => {
    if (f.marque.length && !f.marque.includes(p.brand)) return false;
    if (f.terrain.length && !p.surfaces.some((s) => f.terrain.includes(s))) return false;
    // Une pointure filtrée doit être réellement disponible (ou vendable sur commande).
    if (
      f.pointure.length &&
      !p.sizes.some((s) => f.pointure.includes(s.size) && (s.stock > 0 || (p.allowBackorder && p.status === "online")))
    )
      return false;
    if (f.min && p.priceCents < f.min * 100) return false;
    if (f.max && p.priceCents > f.max * 100) return false;
    if (f.q) {
      const hay = norm(`${p.brand} ${p.name} ${p.model ?? ""}`);
      if (!norm(f.q).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const outOfStockLast = (a: PublicProduct, b: PublicProduct) =>
    Number(a.availability.kind === "out") - Number(b.availability.kind === "out");
  out = [...out].sort((a, b) => {
    const oos = outOfStockLast(a, b);
    if (oos) return oos;
    switch (f.tri) {
      case "prix-asc":
        return a.priceCents - b.priceCents;
      case "prix-desc":
        return b.priceCents - a.priceCents;
      case "nouveaute":
        return b.createdAt.localeCompare(a.createdAt);
      default:
        return a.position - b.position;
    }
  });
  return out;
}

/** Valeurs proposées dans les filtres, d'après le catalogue réel. */
export function facetValues(products: PublicProduct[]) {
  const brands = [...new Set(products.map((p) => p.brand))].sort();
  const sizes = [...new Set(products.flatMap((p) => p.sizes.map((s) => s.size)))].sort(compareSizes);
  const surfaces = [...new Set(products.flatMap((p) => p.surfaces))];
  return { brands, sizes, surfaces };
}

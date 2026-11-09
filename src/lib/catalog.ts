// Constantes et règles métier partagées entre le site, l'admin et les scripts.

export const SURFACES = [
  { code: "FG", label: "Terrain sec (FG)" },
  { code: "SG", label: "Terrain gras (SG)" },
  { code: "AG", label: "Synthétique (AG)" },
  { code: "TF", label: "Stabilisé (TF)" },
  { code: "IC", label: "Salle (IC)" },
] as const;
export type SurfaceCode = (typeof SURFACES)[number]["code"];
export const SURFACE_CODES = SURFACES.map((s) => s.code) as SurfaceCode[];

export const TAGS = [
  { code: "nouveaute", label: "Nouveauté" },
  { code: "promo", label: "Promo" },
  { code: "best-seller", label: "Best-seller" },
] as const;
export const TAG_CODES = TAGS.map((t) => t.code) as string[];
export const tagLabel = (code: string) => TAGS.find((t) => t.code === code)?.label ?? code;

export const STATUS_LABELS = {
  online: "En ligne",
  out_of_stock: "Rupture de stock",
  coming_soon: "Bientôt disponible",
  draft: "Masqué / brouillon",
  deleted: "Supprimé",
} as const;
export type Status = keyof typeof STATUS_LABELS;
/** Statuts visibles par les clients. */
export const PUBLIC_STATUSES: Status[] = ["online", "out_of_stock", "coming_soon"];

export const DEFAULT_LEAD_TIME = "2 à 3 semaines";
/** En dessous de ce stock on affiche « Plus que X paires ». */
export const LOW_STOCK_THRESHOLD = 3;
export const MAX_PHOTOS = 8;

/** Pointures proposées par défaut à la création d'un article. */
export const DEFAULT_SIZES = ["39", "40", "40.5", "41", "42", "42.5", "43", "44", "44.5", "45", "46"];

export type Availability =
  | { kind: "available" }
  | { kind: "low"; left: number }
  | { kind: "backorder" }
  | { kind: "out" }
  | { kind: "soon" };

/** Disponibilité affichée pour un article entier. */
export function productAvailability(p: {
  status: string;
  allowBackorder: boolean;
  totalStock: number;
}): Availability {
  if (p.status === "coming_soon") return { kind: "soon" };
  if (p.status === "out_of_stock") return { kind: "out" };
  if (p.totalStock <= 0) return p.allowBackorder ? { kind: "backorder" } : { kind: "out" };
  if (p.totalStock <= LOW_STOCK_THRESHOLD) return { kind: "low", left: p.totalStock };
  return { kind: "available" };
}

/** Disponibilité d'une pointure précise. */
export function sizeAvailability(
  p: { status: string; allowBackorder: boolean },
  stock: number,
): Availability {
  return productAvailability({ ...p, totalStock: stock });
}

export const canReserve = (a: Availability) =>
  a.kind === "available" || a.kind === "low" || a.kind === "backorder";

export function availabilityLabel(a: Availability): string {
  switch (a.kind) {
    case "available":
      return "Disponible";
    case "low":
      return a.left === 1 ? "Plus qu'une paire" : `Plus que ${a.left} paires`;
    case "backorder":
      return "Sur commande";
    case "out":
      return "Rupture de stock";
    case "soon":
      return "Bientôt disponible";
  }
}

/** Tri des pointures : 40 < 40.5 < 41, les tailles non numériques à la fin. */
export function compareSizes(a: string, b: string) {
  const na = Number(a.replace(",", "."));
  const nb = Number(b.replace(",", "."));
  if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b);
  if (Number.isNaN(na)) return 1;
  if (Number.isNaN(nb)) return -1;
  return na - nb;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

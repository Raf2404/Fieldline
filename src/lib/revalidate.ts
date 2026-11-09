import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { CATALOG_TAG } from "./queries";

/**
 * Vide le cache du catalogue tout de suite (stock, prix).
 * inAction : updateTag n'est autorisé que dans une Server Action ; ailleurs (route, cron) seul revalidateTag l'est.
 */
export function expireCatalog(inAction = true) {
  if (inAction) updateTag(CATALOG_TAG);
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

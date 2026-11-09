"use client";

import { useEffect } from "react";
import { runExpiry } from "@/app/admin/(panel)/commandes/actions";

/** Déclenche le nettoyage des commandes non payées dans les délais dès qu'une page admin s'ouvre. */
export function RunExpiry() {
  useEffect(() => {
    runExpiry().catch(() => {});
  }, []);
  return null;
}

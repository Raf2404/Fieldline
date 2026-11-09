import Image from "next/image";
import Link from "next/link";

/** Logo Fieldline : symbole + nom (« line » en bleu), à poser sur fond marine. */
export function Logo({ href = "/", size = "md", suffix }: { href?: string; size?: "md" | "lg"; suffix?: string }) {
  const h = size === "lg" ? 44 : 30;
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2" aria-label="Fieldline, accueil">
      <Image src="/brand/fieldline-mark.png" alt="" width={Math.round((h * 240) / 154)} height={h} priority />
      <span className={`font-[family-name:var(--font-display)] font-bold leading-none tracking-tight ${size === "lg" ? "text-3xl" : "text-xl"}`}>
        <span className="text-white">Field</span>
        <span className="text-brand">line</span>
      </span>
      {suffix && <span className="ml-1 text-sm font-medium text-white/50">{suffix}</span>}
    </Link>
  );
}

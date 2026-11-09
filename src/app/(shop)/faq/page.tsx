import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Délais de livraison, tailles, retours, paiement, authenticité : toutes les réponses.",
};

// Textes à relire et adapter avant la mise en ligne (notamment retours et remboursements, à aligner sur les CGV).
const qa = (leadTime: string): { q: string; a: React.ReactNode }[] => [
  {
    q: "Pourquoi la livraison prend 2 à 3 semaines ?",
    a: `Pour te proposer ces prix, on commande ta paire auprès de nos fournisseurs une fois ta réservation payée. Compte ${leadTime} entre ta commande et la livraison. Tu reçois un e-mail à chaque étape : commandée, arrivée chez nous, expédiée avec le numéro de suivi.`,
  },
  {
    q: "Comment suivre ma commande ?",
    a: (
      <>
        Avec ton numéro de commande et ton e-mail sur la page <Link href="/suivi" className="underline">Suivre ma commande</Link>, sans
        créer de compte. Si tu as un compte, toutes tes commandes sont dans ton espace client.
      </>
    ),
  },
  {
    q: "Les crampons sont-ils authentiques ?",
    a: "Oui, uniquement des produits authentiques, neufs et dans leur boîte d'origine. Nous ne vendons aucune contrefaçon.",
  },
  {
    q: "Comment choisir ma pointure ?",
    a: (
      <>
        Consulte notre <Link href="/guide-des-tailles" className="underline">guide des tailles</Link>. En cas de doute entre deux
        pointures, écris-nous avant de commander.
      </>
    ),
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Tu valides ta commande sur le site (ta paire est réservée), puis tu nous envoies ton numéro de commande sur WhatsApp : on te donne les instructions pour régler. Dès réception du paiement, ta commande est confirmée. Sans paiement dans le délai indiqué sur ta confirmation, la réservation est annulée. Aucune donnée bancaire n'est demandée sur le site.",
  },
  {
    q: "Puis-je retourner ma paire ?",
    a: (
      <>
        Oui : tu disposes de 14 jours à compter de la réception pour exercer ton droit de rétractation. Les conditions sont détaillées
        dans notre <Link href="/retours" className="underline">politique de retour</Link>.
      </>
    ),
  },
  {
    q: "Ma paire est en rupture, que faire ?",
    a: "Sur la fiche produit, choisis ta pointure et clique sur « Me prévenir » : tu recevras un e-mail dès qu'elle est de retour.",
  },
];

export default async function FaqPage() {
  const QA = qa((await getSettings()).defaultLeadTime);
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <h1 className="text-3xl font-extrabold uppercase tracking-tight">Questions fréquentes</h1>
      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
        {QA.map(({ q, a }) => (
          <details key={q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {q}
              <span className="text-xl leading-none text-muted transition group-open:rotate-45">+</span>
            </summary>
            <div className="mt-3 text-[15px] leading-relaxed text-muted">{a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide des tailles",
  description: "Correspondance des pointures EU / UK / US / cm pour Nike, Adidas et Puma.",
};

// Correspondances indicatives (homme) d'après les grilles publiées par les marques ; à vérifier modèle par modèle.
const GRIDS: { brand: string; rows: [string, string, string, string][] }[] = [
  {
    brand: "Nike",
    rows: [
      ["39", "5.5", "6.5", "24.5"], ["40", "6", "7", "25"], ["40.5", "6.5", "7.5", "25.5"], ["41", "7", "8", "26"],
      ["42", "7.5", "8.5", "26.5"], ["42.5", "8", "9", "27"], ["43", "8.5", "9.5", "27.5"], ["44", "9", "10", "28"],
      ["44.5", "9.5", "10.5", "28.5"], ["45", "10", "11", "29"], ["46", "11", "12", "30"],
    ],
  },
  {
    brand: "Adidas",
    rows: [
      ["39 1/3", "6", "6.5", "24.5"], ["40", "6.5", "7", "25"], ["40 2/3", "7", "7.5", "25.5"], ["41 1/3", "7.5", "8", "26"],
      ["42", "8", "8.5", "26.5"], ["42 2/3", "8.5", "9", "27"], ["43 1/3", "9", "9.5", "27.5"], ["44", "9.5", "10", "28"],
      ["44 2/3", "10", "10.5", "28.5"], ["45 1/3", "10.5", "11", "29"], ["46", "11", "11.5", "29.5"],
    ],
  },
  {
    brand: "Puma",
    rows: [
      ["39", "6", "7", "25"], ["40", "6.5", "7.5", "25.5"], ["40.5", "7", "8", "26"], ["41", "7.5", "8.5", "26.5"],
      ["42", "8", "9", "27"], ["42.5", "8.5", "9.5", "27.5"], ["43", "9", "10", "28"], ["44", "9.5", "10.5", "28.5"],
      ["44.5", "10", "11", "29"], ["45", "10.5", "11.5", "29.5"], ["46", "11", "12", "30"],
    ],
  },
];

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <h1 className="text-3xl font-black uppercase tracking-tight">Guide des tailles</h1>
      <div className="mt-4 space-y-2 rounded-2xl bg-white p-5 text-[15px] leading-relaxed">
        <p className="font-semibold">Mesure ton pied en 1 minute</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Pose ton pied à plat sur une feuille, talon contre un mur, en fin de journée.</li>
          <li>Marque l&apos;orteil le plus long et mesure la distance depuis le mur, en cm.</li>
          <li>Prends la pointure dont la colonne « cm » est égale ou juste au-dessus.</li>
        </ol>
        <p className="text-sm text-muted">Les crampons se portent ajustés. Entre deux tailles, prends la plus grande si tu as le pied large.</p>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {GRIDS.map((g) => (
          <section key={g.brand}>
            <h2 className="mb-2 font-bold">{g.brand}</h2>
            <table className="w-full overflow-hidden rounded-xl bg-white text-center text-sm">
              <thead className="bg-ink text-white">
                <tr>{["EU", "UK", "US", "cm"].map((h) => <th key={h} className="py-2 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {g.rows.map((r) => (
                  <tr key={r[0]}>{r.map((c, i) => <td key={i} className={`py-1.5 ${i === 0 ? "font-semibold" : "text-muted"}`}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Correspondances indicatives (taille homme). Elles peuvent varier légèrement selon les modèles.</p>
    </div>
  );
}

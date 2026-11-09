import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { totpUri } from "@/lib/totp";
import { PasswordForm, TotpSetup } from "./security-ui";

export const metadata: Metadata = { title: "Sécurité" };

export default async function SecurityPage() {
  const admin = await requireAdmin();
  const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, admin.id));
  const pendingSetup = Boolean(row.totpSecret && !row.totpEnabledAt);
  const qrSvg = pendingSetup ? await QRCode.toString(totpUri(row.totpSecret!, row.email), { type: "svg", margin: 0 }) : null;
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Sécurité de mon compte</h1>
      <p className="text-sm text-muted">{admin.name} · {admin.email} · {admin.role === "owner" ? "Propriétaire" : "Associé"}</p>
      <section className="space-y-3 rounded-2xl bg-white p-5">
        <h2 className="font-semibold">Double authentification</h2>
        <TotpSetup enabled={Boolean(row.totpEnabledAt)} pendingSetup={pendingSetup} qrSvg={qrSvg} secret={pendingSetup ? row.totpSecret : null} />
      </section>
      <section className="space-y-3 rounded-2xl bg-white p-5">
        <h2 className="font-semibold">Mot de passe</h2>
        <PasswordForm />
      </section>
    </div>
  );
}

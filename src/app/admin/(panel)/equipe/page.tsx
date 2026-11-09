import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireOwner } from "@/lib/auth";
import { dateFr } from "@/lib/orders";
import { AddMember, RemoveMember } from "./team-ui";

export const metadata: Metadata = { title: "Équipe" };

export default async function TeamPage() {
  const me = await requireOwner();
  const members = await db.select().from(schema.adminUsers).orderBy(asc(schema.adminUsers.createdAt));
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Équipe</h1>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{m.name}{m.id === me.id && <span className="font-normal text-muted"> (toi)</span>}</p>
              <p className="text-muted">{m.email} · depuis le {dateFr(m.createdAt)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.role === "owner" ? "bg-ink text-white" : "bg-brand/10 text-brand"}`}>{m.role === "owner" ? "Propriétaire" : "Associé"}</span>
            <span className={`text-xs ${m.totpEnabledAt ? "text-ok" : "text-warn"}`}>{m.totpEnabledAt ? "2FA ✓" : "sans 2FA"}</span>
            {m.id !== me.id && <RemoveMember id={m.id} name={m.name} />}
          </li>
        ))}
      </ul>
      <AddMember />
    </div>
  );
}

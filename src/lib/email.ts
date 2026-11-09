import "server-only";
import { db, schema } from "@/db";

/**
 * Envoi d'e-mails via Resend (https://resend.com), sans dépendance.
 * Chaque e-mail est journalisé : sans RESEND_API_KEY il est marqué « skipped » (utile en local et pour les tests).
 * Ne lève jamais d'erreur : un e-mail raté ne doit pas bloquer une commande.
 */
export async function sendEmail(input: { to: string; subject: string; html: string; kind: string; orderId?: string | null }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Fieldline <onboarding@resend.dev>";
  let status = "skipped";
  let error: string | null = null;
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, reply_to: process.env.EMAIL_REPLY_TO || undefined }),
      });
      if (res.ok) status = "sent";
      else {
        status = "failed";
        error = `${res.status} ${(await res.text()).slice(0, 300)}`;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.log(`[e-mail non envoyé, RESEND_API_KEY absent] ${input.kind} → ${input.to} : ${input.subject}`);
  }
  if (error) console.error(`[e-mail en échec] ${input.kind} → ${input.to} : ${error}`);
  const [row] = await db
    .insert(schema.emails)
    .values({ orderId: input.orderId ?? null, kind: input.kind, to: input.to, subject: input.subject, html: input.html, status, error })
    .returning({ id: schema.emails.id });
  return { id: row.id, status };
}

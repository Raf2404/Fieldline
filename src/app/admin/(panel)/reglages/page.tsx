import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { DEFAULT_EMAIL_TEXTS } from "@/lib/email-templates";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  await requireOwner();
  const settings = await getSettings();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Réglages</h1>
      <SettingsForm settings={settings} emailDefaults={DEFAULT_EMAIL_TEXTS} />
    </div>
  );
}

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Réglages</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}

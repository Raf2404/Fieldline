import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} · ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description:
    "Crampons de football authentiques à prix réduit : Nike, Adidas, Puma… Réserve ta paire en 2 minutes, paiement PayPal, livraison suivie en 2 à 3 semaines.",
};

export const viewport: Viewport = { themeColor: "#111110" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

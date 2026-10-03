import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navigation } from "@/components/navigation";
import { CsvImportReminder } from "@/components/csv-import-reminder";

export const metadata: Metadata = {
  title: "家計簿くん",
  description: "家族で使うためのブラウザ家計簿アプリ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "家計簿くん",
  },
};

export const viewport: Viewport = {
  themeColor: "#f9fafb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#f9fafb] text-[#1f2937]">
        <Navigation />
        <CsvImportReminder />
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 md:px-6 md:pb-10 md:pt-6">
          {children}
        </main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

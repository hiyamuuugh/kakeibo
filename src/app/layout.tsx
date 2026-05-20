import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navigation } from "@/components/navigation";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "家計簿",
  description: "PayPay・クレジットカード対応の家計簿アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <Navigation />
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

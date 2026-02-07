import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UPL1FT | Faith-Based Streetwear",
  description:
    "Premium streetwear for the battle-hardened believer. Strength, discipline, and faith woven into every piece.",
  keywords: [
    "streetwear",
    "faith-based clothing",
    "christian apparel",
    "premium streetwear",
    "urban fashion",
  ],
  authors: [{ name: "UPL1FT" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://uplift.com",
    title: "UPL1FT | Faith-Based Streetwear",
    description: "Premium streetwear for the battle-hardened believer.",
    siteName: "UPL1FT",
  },
  twitter: {
    card: "summary_large_image",
    title: "UPL1FT | Faith-Based Streetwear",
    description: "Premium streetwear for the battle-hardened believer.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${cinzel.variable} antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />

        {/* Analytics Placeholders */}
        {/* TODO: Add GA4 tracking ID */}
        {/* TODO: Add Meta Pixel ID */}
      </body>
    </html>
  );
}

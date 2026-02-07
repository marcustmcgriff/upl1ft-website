import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartToast } from "@/components/cart/CartToast";

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
    url: "https://upl1ft.org",
    title: "UPL1FT | Faith-Based Streetwear",
    description: "Premium streetwear for the battle-hardened believer.",
    siteName: "UPL1FT",
    images: [
      {
        url: "https://upl1ft.org/images/upl1ft-logo.png",
        width: 1024,
        height: 1024,
        alt: "UPL1FT",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "UPL1FT | Faith-Based Streetwear",
    description: "Premium streetwear for the battle-hardened believer.",
    images: ["https://upl1ft.org/images/upl1ft-logo.png"],
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
        <CartProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <CartToast />
        </CartProvider>

        {/* Analytics Placeholders */}
        {/* TODO: Add GA4 tracking ID */}
        {/* TODO: Add Meta Pixel ID */}
      </body>
    </html>
  );
}

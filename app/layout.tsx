import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AuthProvider } from "@/components/auth/AuthProvider";

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
        url: "https://upl1ft.org/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "UPL1FT - Faith-Based Streetwear",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UPL1FT | Faith-Based Streetwear",
    description: "Premium streetwear for the battle-hardened believer.",
    images: ["https://upl1ft.org/images/og-image.png"],
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
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
        </AuthProvider>

        {/* Analytics Placeholders */}
        {/* TODO: Add GA4 tracking ID */}
        {/* TODO: Add Meta Pixel ID */}
      </body>
    </html>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { products } from "@/lib/data/products";
import { ProductDetail } from "./ProductDetail";

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};

  return {
    title: `${product.name} | UPL1FT`,
    description: product.description,
    openGraph: {
      title: `${product.name} | UPL1FT`,
      description: product.description,
      images: [{ url: product.images[0], width: 800, height: 1067 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      images: [product.images[0]],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    url: `https://upl1ft.org/shop/${product.slug}`,
    brand: {
      "@type": "Brand",
      name: "UPL1FT",
    },
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "USD",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `https://upl1ft.org/shop/${product.slug}`,
      seller: { "@type": "Organization", name: "UPL1FT" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "USD",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "US",
        },
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} />
    </>
  );
}

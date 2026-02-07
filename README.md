# UPL1FT - Faith-Based Streetwear E-Commerce

A production-ready Next.js e-commerce website for UPL1FT, a premium faith-based streetwear brand with a dark/grunge + sacred/baroque aesthetic.

## 🎨 Design Philosophy

- **Dark Mode Only**: Matte black backgrounds with subtle grain texture
- **Gold Accents**: Antique gold (#C8A24A) for highlights and CTAs
- **Typography**: Cinzel (display/headlines) + Inter (body text)
- **Minimal & Breathable**: Strong hierarchy, lots of negative space
- **Holy-Yet-Gritty**: Biblical references meet urban streetwear

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui-inspired component library
- **Animations**: Framer Motion
- **Image Optimization**: Next.js Image component
- **SEO**: Built-in metadata + JSON-LD ready

## 📦 Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
uplift-website/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with header/footer
│   ├── page.tsx                 # Home page
│   ├── shop/                    # Shop collection & product pages
│   │   ├── page.tsx            # Shop grid with filters
│   │   └── [slug]/page.tsx     # Product detail pages
│   ├── about/page.tsx           # Brand doctrine/mission
│   ├── lookbook/page.tsx        # Editorial imagery
│   ├── cart/page.tsx            # Shopping cart
│   ├── checkout/page.tsx        # Checkout (Stripe stub)
│   └── legal/                   # Legal pages
│       ├── privacy/page.tsx
│       ├── terms/page.tsx
│       └── refunds/page.tsx
├── components/
│   ├── ui/                      # Base UI components
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── layout/                  # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── MobileNav.tsx
│   ├── product/                 # Product components
│   │   ├── ProductCard.tsx
│   │   └── ProductGrid.tsx
│   └── sections/                # Home page sections
│       ├── Hero.tsx
│       ├── FeaturedDrops.tsx
│       ├── CategoryTiles.tsx
│       ├── Testimonials.tsx
│       └── Newsletter.tsx
├── lib/
│   ├── data/
│   │   └── products.ts         # Product data (10 sample products)
│   ├── types.ts                # TypeScript interfaces
│   └── utils.ts                # Utility functions
└── public/
    └── images/                 # Image assets (see below)
```

## 🖼️ Required Images

Create these image directories and add your product photos:

### Hero & Background Images
- `public/images/hero-bg.jpg` - Hero section background (1920x1080px)
- `public/images/grain.png` - Subtle grain texture overlay (seamless, 512x512px)
- `public/images/marble-texture.jpg` - Cracked marble texture (1920x1080px)
- `public/images/about-hero.jpg` - About page hero image (1920x800px)

### Product Images (aspect ratio 3:4, 1200x1600px recommended)
```
public/images/products/
  ├── calm-chaos-tee-front.jpg
  ├── calm-chaos-tee-back.jpg
  ├── calm-chaos-tee-detail.jpg
  ├── cross-hoodie-front.jpg
  ├── cross-hoodie-back.jpg
  ├── cross-hoodie-detail.jpg
  ├── heaven-tee-front.jpg
  ├── heaven-tee-back.jpg
  ├── armor-crewneck-front.jpg
  ├── armor-crewneck-back.jpg
  ├── armor-crewneck-detail.jpg
  ├── discipline-pants-front.jpg
  ├── discipline-pants-detail.jpg
  ├── risen-tee-front.jpg
  ├── risen-tee-back.jpg
  ├── warrior-hoodie-front.jpg
  ├── warrior-hoodie-back.jpg
  ├── warrior-hoodie-detail.jpg
  ├── sanctified-joggers-front.jpg
  ├── sanctified-joggers-detail.jpg
  ├── faith-chain-front.jpg
  ├── faith-chain-detail.jpg
  ├── scripture-shorts-front.jpg
  └── scripture-shorts-detail.jpg
```

### Collection Images (square, 800x800px)
```
public/images/collections/
  ├── tees.jpg
  ├── hoodies.jpg
  ├── bottoms.jpg
  └── accessories.jpg
```

### Lookbook Images (aspect ratio 3:4, 1200x1600px)
```
public/images/lookbook/
  ├── look1.jpg
  ├── look2.jpg
  ├── look3.jpg
  ├── look4.jpg
  ├── look5.jpg
  └── look6.jpg
```

## 🛍️ Managing Products

Products are currently managed in `lib/data/products.ts`. To add or edit products:

1. Open `lib/data/products.ts`
2. Add/edit product objects following this structure:

```typescript
{
  id: '11',
  name: 'YOUR PRODUCT NAME',
  slug: 'your-product-name',
  price: 75,
  compareAtPrice: 100,  // Optional: original price for sale items
  description: 'Short product description',
  story: 'Scripture-inspired narrative about the product',
  images: [
    '/images/products/your-product-front.jpg',
    '/images/products/your-product-back.jpg',
  ],
  category: 'tees', // or 'hoodies', 'bottoms', 'accessories'
  tags: ['faith', 'premium'],
  sizes: ['S', 'M', 'L', 'XL'],
  colors: ['Black', 'White'],
  featured: true,
  inStock: true,
  bestseller: false,
}
```

## 💳 Stripe Integration

The checkout page includes a Stripe integration stub. To connect Stripe:

1. Install Stripe packages:
```bash
npm install @stripe/stripe-js stripe
```

2. Add environment variables to `.env.local`:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

3. Create API route for Stripe checkout (`app/api/checkout/route.ts`):
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// Implement checkout session creation
```

4. Update `app/checkout/page.tsx` to use Stripe Elements

## 📊 Analytics Setup

### Google Analytics 4
1. Get your GA4 Measurement ID
2. Add to `app/layout.tsx`:
```tsx
<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" />
<Script id="google-analytics">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

### Meta Pixel
Add Meta Pixel tracking in `app/layout.tsx`

## 🎯 Features Implemented

### ✅ Complete
- [x] Responsive design (mobile, tablet, desktop)
- [x] Dark mode with gold accents
- [x] Product catalog with 10 sample products
- [x] Product filtering and sorting
- [x] Product detail pages with size/color selection
- [x] Shopping cart UI (frontend only)
- [x] Checkout page structure
- [x] About/Doctrine page
- [x] Lookbook gallery
- [x] Newsletter signup UI
- [x] Legal pages (Privacy, Terms, Refunds)
- [x] Sticky header with navigation
- [x] Mobile navigation drawer
- [x] Footer with links and social
- [x] SEO-optimized metadata
- [x] Accessibility features (ARIA labels, keyboard nav)
- [x] Image optimization with next/image
- [x] Framer Motion animations

### 🚧 To Be Implemented
- [ ] Cart state management (Context API or Zustand)
- [ ] Stripe payment integration
- [ ] Newsletter API integration
- [ ] Product search functionality
- [ ] Customer reviews system
- [ ] Size guide modal
- [ ] Product quick view
- [ ] Wishlist functionality
- [ ] Account/authentication pages
- [ ] Order history
- [ ] Real-time inventory management

## 🎨 Color Palette

```css
/* Background Colors */
--background: #0A0A0A        /* Matte black */
--muted: #1A1A1A            /* Dark gray */

/* Text Colors */
--foreground: #E8E3D7        /* Off-white */
--muted-foreground: #A0A0A0  /* Medium gray */

/* Accent Colors */
--accent: #C8A24A            /* Antique gold */
--accent-foreground: #0A0A0A /* Black on gold */

/* Borders */
--border: #2A2A2A            /* Dark border */
```

## 📱 Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## ⚡ Performance Tips

1. **Images**: Add actual product images to improve visual experience
2. **Fonts**: Fonts are loaded via Google Fonts with `display: swap`
3. **Build**: Run `npm run build` to check for optimization opportunities
4. **Lighthouse**: Target 90+ scores (will improve with real images)

## 🔒 Security Headers

Security headers are configured in `next.config.ts`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

For CSP, add to `next.config.ts` headers as needed.

## 🧪 Testing the Site

1. **Home page**: Hero, featured products, categories, testimonials
2. **Shop page**: Filter by category, sort products
3. **Product page**: Select size/color, view product story
4. **Mobile nav**: Test hamburger menu on mobile
5. **Navigation**: Click through all pages
6. **Form validation**: Try newsletter signup

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Other Platforms
- Build command: `npm run build`
- Output directory: `.next`
- Node version: 18+

## 📝 Brand Copy Guidelines

All copy follows these principles:
- **Tone**: Concise, stoic, biblical, military discipline
- **Voice**: Masculine, battle-hardened, faith-forward
- **Examples**: "CALM IN CHAOS", "CARRY YOUR CROSS"
- Keep it short and strong - no fluff

## 🎯 Next Steps

1. **Add Real Images**: Replace placeholder paths with actual product photos
2. **Wire Cart**: Implement cart state management
3. **Connect Stripe**: Set up payment processing
4. **Add CMS**: Consider Sanity or Contentful for easier product management
5. **Analytics**: Add GA4 and Meta Pixel tracking IDs
6. **Email**: Connect newsletter to Mailchimp/ConvertKit
7. **Testing**: Add E2E tests with Playwright
8. **Blog**: Consider adding `/blog` for content marketing

## 🤝 Contributing

When adding new features:
1. Keep the dark, minimal aesthetic
2. Use the existing component library
3. Follow TypeScript best practices
4. Maintain accessibility standards
5. Test on mobile devices

## 📄 License

© 2026 UPL1FT. All rights reserved.

---

**Built with purpose. Carry your cross.**

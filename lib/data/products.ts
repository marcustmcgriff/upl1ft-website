import { Product } from '../types';

export const products: Product[] = [
  {
    id: '1',
    name: 'LIVE BY FAITH, NOT BY SIGHT',
    slug: 'live-by-faith-not-by-sight',
    price: 40,
    description: 'Oversized faded tee with front and inside label prints. Walk by faith, not by what you see.',
    story: '"For we walk by faith, not by sight." - 2 Corinthians 5:7. The world shows you one thing. Faith reveals another. This tee is a declaration—you move by conviction, not by circumstance.',
    images: [
      '/images/products/live-by-faith-front.png',
    ],
    category: 'tees',
    tags: ['faith', 'vision', 'featured'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Faded Black'],
    featured: true,
    inStock: true,
    bestseller: true,
  },
  {
    id: '2',
    name: 'COMFORT KILLS POTENTIAL',
    slug: 'comfort-kills-potential',
    price: 40,
    description: 'Oversized faded tee with front, back, and inside label prints. Comfort is the enemy of greatness.',
    story: '"No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it." - Hebrews 12:11. Comfort is the quiet killer of purpose. Step out of ease and into your calling.',
    images: [
      '/images/products/comfort-kills-potential-front.png',
      '/images/products/comfort-kills-potential-back.png',
    ],
    category: 'tees',
    tags: ['discipline', 'growth', 'featured'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Faded Black'],
    featured: true,
    inStock: true,
    bestseller: true,
  },
  {
    id: '3',
    name: 'HIS PAIN, OUR GAIN',
    slug: 'his-pain-our-gain',
    price: 40,
    description: 'Oversized faded tee with front and back print. A tribute to the sacrifice that set us free.',
    story: '"But he was pierced for our transgressions, he was crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed." - Isaiah 53:5. His suffering was not in vain. Every wound carried purpose. Wear this truth.',
    images: [
      '/images/products/his-pain-our-gain-front.png',
      '/images/products/his-pain-our-gain-back.png',
    ],
    category: 'tees',
    tags: ['sacrifice', 'redemption', 'scripture'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Faded Black'],
    featured: true,
    inStock: true,
  },
  {
    id: '4',
    name: 'IT IS WRITTEN',
    slug: 'it-is-written',
    price: 40,
    description: 'Oversized faded tee with front, back, and inside label prints. The Word stands forever.',
    story: '"It is written: Man shall not live on bread alone, but on every word that comes from the mouth of God." - Matthew 4:4. When temptation came, Jesus answered with Scripture. The Word is your weapon. Carry it boldly.',
    images: [
      '/images/products/it-is-written-front.png',
      '/images/products/it-is-written-back.png',
    ],
    category: 'tees',
    tags: ['scripture', 'word', 'authority'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Faded Black'],
    featured: true,
    inStock: true,
    bestseller: true,
  },
];

export const collections: any[] = [
  {
    id: 'tees',
    name: 'Tees',
    slug: 'tees',
    description: 'Oversized faded tees with faith-forward graphics. Premium DTG printing on AS Colour 5082.',
    image: '/images/products/live-by-faith-front.png',
  },
];

export const testimonials = [
  {
    id: '1',
    name: 'Marcus T.',
    quote: 'This brand gets it. Quality is unmatched, message is clear. Wearing UPL1FT reminds me daily what I\'m fighting for.',
  },
  {
    id: '2',
    name: 'David R.',
    quote: 'Finally, streetwear that speaks to my faith without being corny. The craftsmanship is premium.',
  },
  {
    id: '3',
    name: 'Isaiah M.',
    quote: 'The Carry Your Cross hoodie is the best piece I own. Heavy, bold, and every detail matters.',
  },
];

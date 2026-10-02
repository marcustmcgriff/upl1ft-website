import { Product, Testimonial } from '../types';

export const products: Product[] = [
  {
    id: '4',
    name: 'IT IS WRITTEN',
    slug: 'it-is-written',
    price: 60,
    description:
      'Heavyweight oversized tee — boxy, structured fit. Blackletter "it is written" on the left chest, the archangel Michael across the back. Premium direct-to-garment print on AS Colour 5080. Free shipping.',
    story:
      '"It is written: Man shall not live on bread alone, but on every word that comes from the mouth of God." - Matthew 4:4. When temptation came, Jesus answered with Scripture. The Word is your weapon. Carry it boldly.',
    images: [
      '/images/products/it-is-written/pine-back.jpg?v=3',
      '/images/products/it-is-written/pine-front.jpg?v=3',
      '/images/products/it-is-written/pine-person.jpg?v=3',
      '/images/products/it-is-written/pine-pback.jpg?v=3',
      '/images/products/it-is-written/pine-pclose.jpg?v=3',
    ],
    colorImages: {
      'Pine Green': [
        '/images/products/it-is-written/pine-back.jpg?v=3',
        '/images/products/it-is-written/pine-front.jpg?v=3',
        '/images/products/it-is-written/pine-person.jpg?v=3',
        '/images/products/it-is-written/pine-pback.jpg?v=3',
        '/images/products/it-is-written/pine-pclose.jpg?v=3',
      ],
      Black: [
        '/images/products/it-is-written/black-back.jpg?v=3',
        '/images/products/it-is-written/black-front.jpg?v=3',
        '/images/products/it-is-written/black-person.jpg?v=3',
        '/images/products/it-is-written/black-pback.jpg?v=3',
        '/images/products/it-is-written/black-pclose.jpg?v=3',
      ],
    },
    category: 'tees',
    tags: ['scripture', 'word', 'authority', 'featured'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Pine Green', 'Black'],
    featured: true,
    inStock: true,
    bestseller: true,
  },
  {
    id: '2',
    name: 'COMFORT KILLS POTENTIAL',
    slug: 'comfort-kills-potential',
    price: 60,
    description: 'Heavyweight oversized tee on AS Colour 5080. Crossed-out DISTRACTION on the front, COMFORT KILLS POTENTIAL across the back. Comfort is the enemy of greatness.',
    story: '"No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it." - Hebrews 12:11. Comfort is the quiet killer of purpose. Step out of ease and into your calling.',
    images: [
      '/images/products/comfort-kills-potential/pine-back.jpg?v=3',
      '/images/products/comfort-kills-potential/pine-front.jpg?v=3',
      '/images/products/comfort-kills-potential/pine-person.jpg?v=3',
      '/images/products/comfort-kills-potential/pine-pback.jpg?v=3',
      '/images/products/comfort-kills-potential/pine-pclose.jpg?v=3',
    ],
    colorImages: {
      'Pine Green': [
        '/images/products/comfort-kills-potential/pine-back.jpg?v=3',
        '/images/products/comfort-kills-potential/pine-front.jpg?v=3',
        '/images/products/comfort-kills-potential/pine-person.jpg?v=3',
        '/images/products/comfort-kills-potential/pine-pback.jpg?v=3',
        '/images/products/comfort-kills-potential/pine-pclose.jpg?v=3',
      ],
      Black: [
        '/images/products/comfort-kills-potential/black-back.jpg?v=3',
        '/images/products/comfort-kills-potential/black-front.jpg?v=3',
        '/images/products/comfort-kills-potential/black-person.jpg?v=3',
        '/images/products/comfort-kills-potential/black-pback.jpg?v=3',
        '/images/products/comfort-kills-potential/black-pclose.jpg?v=3',
      ],
    },
    category: 'tees',
    tags: ['discipline', 'growth', 'featured'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Pine Green', 'Black'],
    featured: true,
    inStock: true,
  },
  {
    id: '3',
    name: 'HIS PAIN, OUR GAIN',
    slug: 'his-pain-our-gain',
    price: 60,
    description: 'Heavyweight oversized tee on AS Colour 5080. UPL1FT mark on the left chest, crown of thorns across the upper back. A tribute to the sacrifice that set us free.',
    story: '"But he was pierced for our transgressions, he was crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed." - Isaiah 53:5. His suffering was not in vain. Every wound carried purpose. Wear this truth.',
    images: [
      '/images/products/his-pain-our-gain/pine-back.jpg?v=3',
      '/images/products/his-pain-our-gain/pine-front.jpg?v=3',
      '/images/products/his-pain-our-gain/pine-person.jpg?v=3',
      '/images/products/his-pain-our-gain/pine-pback.jpg?v=3',
      '/images/products/his-pain-our-gain/pine-pclose.jpg?v=3',
    ],
    colorImages: {
      'Pine Green': [
        '/images/products/his-pain-our-gain/pine-back.jpg?v=3',
        '/images/products/his-pain-our-gain/pine-front.jpg?v=3',
        '/images/products/his-pain-our-gain/pine-person.jpg?v=3',
        '/images/products/his-pain-our-gain/pine-pback.jpg?v=3',
        '/images/products/his-pain-our-gain/pine-pclose.jpg?v=3',
      ],
      Black: [
        '/images/products/his-pain-our-gain/black-back.jpg?v=3',
        '/images/products/his-pain-our-gain/black-front.jpg?v=3',
        '/images/products/his-pain-our-gain/black-person.jpg?v=3',
        '/images/products/his-pain-our-gain/black-pback.jpg?v=3',
        '/images/products/his-pain-our-gain/black-pclose.jpg?v=3',
      ],
    },
    category: 'tees',
    tags: ['sacrifice', 'redemption', 'scripture'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Pine Green', 'Black'],
    featured: true,
    inStock: true,
  },
  {
    id: '1',
    name: 'LIVE BY FAITH, NOT BY SIGHT',
    slug: 'live-by-faith-not-by-sight',
    price: 60,
    description: 'Heavyweight oversized tee on AS Colour 5080 with a front cross print. Walk by faith, not by what you see.',
    story: '"For we walk by faith, not by sight." - 2 Corinthians 5:7. The world shows you one thing. Faith reveals another. This tee is a declaration—you move by conviction, not by circumstance.',
    images: [
      '/images/products/live-by-faith/pine-front.jpg?v=3',
      '/images/products/live-by-faith/pine-person.jpg?v=3',
      '/images/products/live-by-faith/pine-pclose.jpg?v=3',
      '/images/products/live-by-faith/pine-back.jpg?v=3',
      '/images/products/live-by-faith/pine-pback.jpg?v=3',
    ],
    colorImages: {
      'Pine Green': [
        '/images/products/live-by-faith/pine-front.jpg?v=3',
        '/images/products/live-by-faith/pine-person.jpg?v=3',
        '/images/products/live-by-faith/pine-pclose.jpg?v=3',
        '/images/products/live-by-faith/pine-back.jpg?v=3',
        '/images/products/live-by-faith/pine-pback.jpg?v=3',
      ],
      Black: [
        '/images/products/live-by-faith/black-front.jpg?v=3',
        '/images/products/live-by-faith/black-person.jpg?v=3',
        '/images/products/live-by-faith/black-pclose.jpg?v=3',
        '/images/products/live-by-faith/black-back.jpg?v=3',
        '/images/products/live-by-faith/black-pback.jpg?v=3',
      ],
    },
    category: 'tees',
    tags: ['faith', 'vision', 'featured'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Pine Green', 'Black'],
    featured: true,
    inStock: true,
  },
];

export const collections: any[] = [
  {
    id: 'tees',
    name: 'Tees',
    slug: 'tees',
    description: 'Heavyweight oversized tees with faith-forward graphics. Premium DTG printing on AS Colour 5080.',
    image: '/images/products/it-is-written/pine-back.jpg?v=3',
  },
];

// Real customer quotes only, with the customer's permission. The home page shows the
// Testimonies section as soon as this list has an entry and hides it while it is empty.
export const testimonials: Testimonial[] = [];

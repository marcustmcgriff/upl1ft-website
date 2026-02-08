import { Product } from '../types';

export const products: Product[] = [
  {
    id: '2',
    name: 'COMFORT KILLS POTENTIAL',
    slug: 'comfort-kills-potential',
    price: 40,
    description: 'Oversized faded tee with front, back, and inside label prints. Comfort is the enemy of greatness.',
    story: '"No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it." - Hebrews 12:11. Comfort is the quiet killer of purpose. Step out of ease and into your calling.',
    images: [
      'https://files.cdn.printful.com/files/00e/00ef9d38684f9327e0595af7abb98aa3_preview.png',
      'https://files.cdn.printful.com/files/9d4/9d4c1ce1554ebe7c025afe672a8a7402_preview.png',
      'https://files.cdn.printful.com/files/1e9/1e905e9355e1cfb3a8e891f634702653_preview.png',
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
    id: '4',
    name: 'IT IS WRITTEN',
    slug: 'it-is-written',
    price: 40,
    description: 'Oversized faded tee with front, back, and inside label prints. The Word stands forever.',
    story: '"It is written: Man shall not live on bread alone, but on every word that comes from the mouth of God." - Matthew 4:4. When temptation came, Jesus answered with Scripture. The Word is your weapon. Carry it boldly.',
    images: [
      'https://files.cdn.printful.com/files/115/1151d0f817b0a1599fe216ff3a43c97f_preview.png',
      'https://files.cdn.printful.com/files/d43/d431feba39ae765c5e1623f0b7cfa56e_preview.png',
      'https://files.cdn.printful.com/files/9f5/9f528c1b8fe9e1fab6ea67a8e97afa04_preview.png',
    ],
    category: 'tees',
    tags: ['scripture', 'word', 'authority'],
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
      'https://files.cdn.printful.com/files/76e/76e857b76ddeaf26622144557cba22d1_preview.png',
      'https://files.cdn.printful.com/files/9fd/9fdc91c0bee6b157e2704e8f2fb3f6a9_preview.png',
      'https://files.cdn.printful.com/files/7a3/7a30f6abc7488d4773939b1431bd092f_preview.png',
    ],
    category: 'tees',
    tags: ['sacrifice', 'redemption', 'scripture'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Faded Black'],
    featured: true,
    inStock: true,
  },
  {
    id: '1',
    name: 'LIVE BY FAITH, NOT BY SIGHT',
    slug: 'live-by-faith-not-by-sight',
    price: 40,
    description: 'Oversized faded tee with front and inside label prints. Walk by faith, not by what you see.',
    story: '"For we walk by faith, not by sight." - 2 Corinthians 5:7. The world shows you one thing. Faith reveals another. This tee is a declaration—you move by conviction, not by circumstance.',
    images: [
      'https://files.cdn.printful.com/files/4e2/4e24a19476388bfd52f5a23a5700085d_preview.png',
      'https://files.cdn.printful.com/files/7c3/7c334d1ed0be95394d8d1ca384f40217_preview.png',
    ],
    category: 'tees',
    tags: ['faith', 'vision', 'featured'],
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
    image: 'https://files.cdn.printful.com/files/4e2/4e24a19476388bfd52f5a23a5700085d_preview.png',
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
    quote: 'The It Is Written tee is the best piece I own. Bold design, premium feel, and the message hits every time I put it on.',
  },
];

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import {
  User,
  Role,
  Product,
  Category,
  Banner,
  Coupon,
  Review,
  Order,
  Address,
  InventoryMovement,
} from '../models';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const sizes = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'];
const colors = ['Black', 'White', 'Red', 'Blue', 'Gray', 'Navy', 'Brown', 'Green', 'Beige', 'Pink'];

interface SeedProduct {
  name: string;
  description: string;
  shortDescription: string;
  categoryIndex: number;
  tags: string[];
  price: number;
  compareAtPrice: number;
  costPrice: number;
  isFeatured: boolean;
}

const productData: SeedProduct[] = [
  // Running Shoes
  {
    name: 'Air Max Pulse',
    description: 'The Nike Air Max Pulse brings a fresh look to the iconic Air Max line. Featuring a lightweight textile upper with a sleek silhouette, these running shoes offer exceptional comfort for everyday wear. The visible Air cushioning unit in the heel provides responsive impact absorption, while the rubber outsole delivers durable traction on multiple surfaces.',
    shortDescription: 'Lightweight running shoes with visible Air cushioning for all-day comfort.',
    categoryIndex: 0,
    tags: ['running', 'air max', 'nike', 'casual'],
    price: 18000, compareAtPrice: 20400, costPrice: 6600, isFeatured: true,
  },
  {
    name: 'Ultraboost Light',
    description: 'The Adidas Ultraboost Light redefines running performance with its revolutionary Light BOOST midsole technology. The Primeknit+ upper adapts to your foot shape for a custom-like fit, while the Continental rubber outsole provides unmatched grip in wet and dry conditions. Perfect for both serious runners and casual joggers.',
    shortDescription: 'Premium running shoes with Light BOOST midsole and Primeknit+ upper.',
    categoryIndex: 0,
    tags: ['running', 'ultraboost', 'adidas', 'premium'],
    price: 22800, compareAtPrice: 26400, costPrice: 7800, isFeatured: true,
  },
  {
    name: 'FuelCell Rebel v4',
    description: 'New Balance FuelCell Rebel v4 delivers an energetic ride with its FuelCell foam midsole. The engineered mesh upper provides breathability and support, while the blown rubber outsole ensures reliable traction. Ideal for tempo runs and long-distance training sessions.',
    shortDescription: 'Responsive running shoes with FuelCell foam for energetic performance.',
    categoryIndex: 0,
    tags: ['running', 'fuelcell', 'new balance', 'training'],
    price: 16800, compareAtPrice: 19200, costPrice: 5750, isFeatured: false,
  },
  {
    name: 'RS-X³ Puzzle',
    description: 'Puma RS-X³ Puzzle brings a bold retro-futuristic aesthetic to running. The chunky sole features RS technology for superior cushioning, while the mixed-material upper combines mesh and synthetic overlays for style and durability. A statement shoe for sneaker enthusiasts.',
    shortDescription: 'Retro-futuristic running shoes with RS cushioning technology.',
    categoryIndex: 0,
    tags: ['running', 'retro', 'puma', 'chunky'],
    price: 14400, compareAtPrice: 16800, costPrice: 5050, isFeatured: false,
  },
  {
    name: 'Nano X3',
    description: 'Reebok Nano X3 is built for cross-training excellence. The Flexweave upper provides durable breathability, while the Floatride Energy Foam cushioning offers responsive comfort during workouts. The wide, flat outsole ensures stability during lifts and lateral movements.',
    shortDescription: 'Cross-training shoes with Flexweave upper for workout versatility.',
    categoryIndex: 0,
    tags: ['running', 'cross-training', 'reebok', 'gym'],
    price: 15600, compareAtPrice: 18000, costPrice: 5400, isFeatured: false,
  },
  // Casual Shoes
  {
    name: 'Classic Leather',
    description: 'The Adidas Classic Leather is a timeless casual sneaker that has transcended generations. Crafted from premium tumbled leather with a clean minimalist design, these shoes feature a comfortable rubber cupsole and the iconic three-stripe detailing. Perfect for everyday wear.',
    shortDescription: 'Timeless leather sneakers with premium materials and clean design.',
    categoryIndex: 1,
    tags: ['casual', 'leather', 'adidas', 'classic'],
    price: 10800, compareAtPrice: 12000, costPrice: 3600, isFeatured: true,
  },
  {
    name: 'Court Vision Low',
    description: 'Nike Court Vision Low delivers clean court-inspired style for everyday wear. The leather upper provides durability, while the low-cut design offers a casual look. A lightweight foam midsole ensures all-day comfort, and the rubber outsole features a pivot circle pattern.',
    shortDescription: 'Court-inspired casual sneakers with clean leather construction.',
    categoryIndex: 1,
    tags: ['casual', 'court', 'nike', 'leather'],
    price: 7800, compareAtPrice: 9000, costPrice: 2650, isFeatured: false,
  },
  {
    name: 'Suede Classic XXI',
    description: 'Puma Suede Classic XXI is an icon of streetwear culture. The rich suede upper features the signature Formstrip overlay, while the rubber cupsole provides cushioned comfort. A heritage sneaker that continues to make a statement.',
    shortDescription: 'Iconic suede sneakers with signature Formstrip design.',
    categoryIndex: 1,
    tags: ['casual', 'suede', 'puma', 'heritage'],
    price: 9000, compareAtPrice: 10200, costPrice: 3100, isFeatured: false,
  },
  {
    name: 'Club C 85',
    description: 'Reebok Club C 85 offers understated retro style with premium leather construction. The clean silhouette features subtle branding details, a comfortable terry lining, and a durable rubber outsole. A versatile casual sneaker for any occasion.',
    shortDescription: 'Retro leather sneakers with clean understated design.',
    categoryIndex: 1,
    tags: ['casual', 'retro', 'reebok', 'leather'],
    price: 9600, compareAtPrice: 10800, costPrice: 3350, isFeatured: false,
  },
  // Formal Shoes
  {
    name: 'Oxford Wing Tip',
    description: 'Premium leather oxford shoes featuring elegant wing tip brogue detailing. The Goodyear welted construction ensures durability and allows for resoling. A cushioned insole provides all-day comfort, while the leather outsole offers a refined finish.',
    shortDescription: 'Premium leather oxfords with wing tip brogue detailing.',
    categoryIndex: 2,
    tags: ['formal', 'oxford', 'leather', 'premium'],
    price: 24000, compareAtPrice: 30000, costPrice: 8400, isFeatured: true,
  },
  {
    name: 'Classic Derby',
    description: 'Timeless derby shoes crafted from polished full-grain leather. The open lacing system provides a comfortable fit, while the Blake stitched sole allows for easy resoling. Perfect for business meetings and formal events.',
    shortDescription: 'Polished leather derby shoes with open lacing system.',
    categoryIndex: 2,
    tags: ['formal', 'derby', 'leather', 'business'],
    price: 21600, compareAtPrice: 26400, costPrice: 7450, isFeatured: false,
  },
  {
    name: 'Monk Strap',
    description: 'Elegant single monk strap shoes in premium suede leather. The buckle closure adds a distinctive touch, while the leather lining and cushioned footbed ensure comfort throughout the day. A sophisticated choice for the modern gentleman.',
    shortDescription: 'Suede monk strap shoes with elegant buckle closure.',
    categoryIndex: 2,
    tags: ['formal', 'monk', 'suede', 'elegant'],
    price: 22800, compareAtPrice: 27600, costPrice: 8150, isFeatured: false,
  },
  // Sports Shoes
  {
    name: 'LeBron XXI',
    description: 'Nike LeBron XXI delivers on-court dominance with Max Air cushioning in the heel and forefoot for impact protection. The Flyknit upper provides a dynamic fit, while the multi-directional traction pattern ensures grip during quick cuts and drives.',
    shortDescription: 'Basketball shoes with Max Air cushioning for on-court performance.',
    categoryIndex: 3,
    tags: ['sports', 'basketball', 'nike', 'lebron'],
    price: 24000, compareAtPrice: 26400, costPrice: 8650, isFeatured: true,
  },
  {
    name: 'Predator Edge',
    description: 'Adidas Predator Edge football boots feature a Demonskin zones on the upper for enhanced ball control and swerve. The Split outsole provides explosive traction on firm ground, while the Primeknit collar offers a secure, sock-like fit.',
    shortDescription: 'Football boots with Demonskin zones for enhanced ball control.',
    categoryIndex: 3,
    tags: ['sports', 'football', 'adidas', 'predator'],
    price: 20400, compareAtPrice: 24000, costPrice: 6950, isFeatured: false,
  },
  {
    name: 'PUMA Future Ultimate',
    description: 'PUMA Future Ultimate football boots feature FUZIONFIT+ technology for adaptive midfoot support. The upper is engineered for precise touch and ball control, while the Agility PL outsole delivers explosive speed on firm ground pitches.',
    shortDescription: 'Football boots with FUZIONFIT+ for adaptive support.',
    categoryIndex: 3,
    tags: ['sports', 'football', 'puma', 'speed'],
    price: 19200, compareAtPrice: 22800, costPrice: 6500, isFeatured: false,
  },
  {
    name: 'Royal Grand Court',
    description: 'Converse Royal Grand Court tennis shoes combine classic style with modern performance. The leather upper provides durability, while the herringbone outsole offers excellent grip on court surfaces. A versatile shoe for both competitive and recreational play.',
    shortDescription: 'Tennis shoes combining classic style with court performance.',
    categoryIndex: 3,
    tags: ['sports', 'tennis', 'converse', 'court'],
    price: 10800, compareAtPrice: 13200, costPrice: 3850, isFeatured: false,
  },
  // Sandals
  {
    name: 'Benassi Ultra Soft',
    description: 'Nike Benassi Ultra Soft slides feature an ultra-plush upper strap with Nike branding and a cushioned footbed for all-day comfort. The textured outsole provides traction, making them perfect for post-workout recovery or casual outings.',
    shortDescription: 'Plush slides with cushioned footbed for ultimate comfort.',
    categoryIndex: 4,
    tags: ['sandals', 'slides', 'nike', 'comfort'],
    price: 4800, compareAtPrice: 6000, costPrice: 1450, isFeatured: false,
  },
  {
    name: 'Adilette Comfort',
    description: 'Adidas Adilette Comfort sandals feature a cloudfoam footbed that molds to your foot shape for step-in comfort. The synthetic upper is quick-drying, making these ideal for the pool, beach, or everyday wear.',
    shortDescription: 'Cloudfoam sandals for step-in comfort and quick-drying convenience.',
    categoryIndex: 4,
    tags: ['sandals', 'slides', 'adidas', 'comfort'],
    price: 4200, compareAtPrice: 5400, costPrice: 1200, isFeatured: false,
  },
  {
    name: 'Yoga Stripe',
    description: 'Reebok Yoga Stripe sandals feature a lightweight design with a soft webbing strap and cushioned EVA midsole. Perfect for yoga, Pilates, or simply lounging around. The rubber outsole provides reliable grip on various surfaces.',
    shortDescription: 'Lightweight sandals with webbing strap for yoga and lounging.',
    categoryIndex: 4,
    tags: ['sandals', 'yoga', 'reebok', 'lightweight'],
    price: 3600, compareAtPrice: 4800, costPrice: 1100, isFeatured: false,
  },
  // Boots
  {
    name: 'Air Force 1 Mid',
    description: 'Nike Air Force 1 Mid brings the iconic AF1 silhouette to mid-top form. Featuring a leather upper with a midfoot strap for lockdown fit, Air-Sole cushioning for comfort, and a durable rubber outsole with pivot circles. A streetwear staple.',
    shortDescription: 'Mid-top leather boots with Air-Sole cushioning and ankle strap.',
    categoryIndex: 5,
    tags: ['boots', 'air force', 'nike', 'streetwear'],
    price: 14400, compareAtPrice: 16800, costPrice: 5050, isFeatured: true,
  },
  {
    name: 'Terrex Free Hiker',
    description: 'Adidas Terrex Free Hiker combines hiking boot durability with running shoe comfort. The Primeknit upper hugs your foot, while the Boost midsole provides responsive cushioning. The Continental rubber outsole delivers exceptional grip on all terrains.',
    shortDescription: 'Hiking boots with Primeknit upper and Boost cushioning.',
    categoryIndex: 5,
    tags: ['boots', 'hiking', 'adidas', 'terrex'],
    price: 21600, compareAtPrice: 25200, costPrice: 7450, isFeatured: false,
  },
  {
    name: 'Suede Classic Boot',
    description: 'Puma Suede Classic Boot extends the iconic Suede design to a winter-ready silhouette. The premium suede upper features a warm lining, while the lugged rubber outsole provides traction on slippery surfaces. Style meets function.',
    shortDescription: 'Winter-ready suede boots with warm lining and lugged outsole.',
    categoryIndex: 5,
    tags: ['boots', 'winter', 'puma', 'suede'],
    price: 12000, compareAtPrice: 14400, costPrice: 4200, isFeatured: false,
  },
  {
    name: 'Newton Ridge Plus',
    description: 'New Balance Newton Ridge Plus hiking boots feature a waterproof leather and mesh upper to keep your feet dry on the trail. The EVA midsole provides cushioning, while the Vibram outsole offers superior grip on rocky terrain.',
    shortDescription: 'Waterproof hiking boots with Vibram outsole for rugged trails.',
    categoryIndex: 5,
    tags: ['boots', 'hiking', 'new balance', 'waterproof'],
    price: 18000, compareAtPrice: 21600, costPrice: 6000, isFeatured: false,
  },
  // Sneakers
  {
    name: 'Air Jordan 1 Retro High',
    description: 'The Air Jordan 1 Retro High is the shoe that started it all. Featuring a premium leather upper with the iconic Wings logo, Air-Sole cushioning, and a solid rubber outsole with pivot circle traction. A must-have for sneaker collectors.',
    shortDescription: 'Iconic high-top sneakers with premium leather and Wings logo.',
    categoryIndex: 6,
    tags: ['sneakers', 'jordan', 'nike', 'iconic'],
    price: 21600, compareAtPrice: 22800, costPrice: 7200, isFeatured: true,
  },
  {
    name: 'Superstar',
    description: 'Adidas Superstar is the original shell-toe sneaker that dominated basketball courts and hip-hop culture. Featuring a full leather upper, the iconic rubber shell toe, and a comfortable textile lining. Timeless style since 1969.',
    shortDescription: 'Shell-toe sneakers with iconic rubber toe cap since 1969.',
    categoryIndex: 6,
    tags: ['sneakers', 'superstar', 'adidas', 'iconic'],
    price: 12000, compareAtPrice: 14400, costPrice: 4100, isFeatured: true,
  },
  {
    name: 'Chuck 70 High Top',
    description: 'Converse Chuck 70 High Top elevates the classic Chuck Taylor with premium materials. The thicker canvas upper, OrthoLite insole, and vintage winged ankle patch make this a refined take on an American icon.',
    shortDescription: 'Premium canvas high-tops with OrthoLite insole comfort.',
    categoryIndex: 6,
    tags: ['sneakers', 'converse', 'classic', 'canvas'],
    price: 10200, compareAtPrice: 11400, costPrice: 3350, isFeatured: false,
  },
  {
    name: 'RS-0 Sneaker',
    description: 'Puma RS-0 Sneaker reimagines the Running System with modern design language. Featuring a chunky midsole with RS technology, mesh and leather upper, and reflective details. A fusion of retro and futuristic aesthetics.',
    shortDescription: 'Retro-futuristic sneakers with RS technology and reflective details.',
    categoryIndex: 6,
    tags: ['sneakers', 'puma', 'retro', 'futuristic'],
    price: 13200, compareAtPrice: 15600, costPrice: 4550, isFeatured: false,
  },
  {
    name: 'Classic Harmony',
    description: 'Reebok Classic Harmony sneakers feature a sleek suede and mesh upper with a clean midsole design. The lightweight EVA midsole provides cushioning, while the rubber outsole ensures durability. A versatile everyday sneaker.',
    shortDescription: 'Sleek suede and mesh sneakers with lightweight cushioning.',
    categoryIndex: 6,
    tags: ['sneakers', 'reebok', 'classic', 'versatile'],
    price: 9600, compareAtPrice: 10800, costPrice: 3250, isFeatured: false,
  },
  // Loafers
  {
    name: 'Penny Loafer',
    description: 'Classic penny loafer crafted from polished full-grain leather. The hand-stitched construction ensures quality and durability, while the leather sole provides a refined look and comfortable stride. A timeless choice for smart-casual dressing.',
    shortDescription: 'Polished leather penny loafers with hand-stitched construction.',
    categoryIndex: 7,
    tags: ['loafers', 'penny', 'leather', 'classic'],
    price: 20400, compareAtPrice: 24000, costPrice: 6950, isFeatured: true,
  },
  {
    name: 'Tassel Loafer',
    description: 'Elegant tassel loafers in soft suede leather with decorative tassels. The Blake stitched sole allows for flexibility and easy maintenance. Features a cushioned insole for all-day comfort. Perfect for dressy occasions.',
    shortDescription: 'Suede tassel loafers with decorative detail and cushioned comfort.',
    categoryIndex: 7,
    tags: ['loafers', 'tassel', 'suede', 'elegant'],
    price: 19200, compareAtPrice: 22800, costPrice: 6500, isFeatured: false,
  },
  {
    name: 'Horsebit Loafer',
    description: 'Italian-inspired horsebit loafers featuring a polished leather upper with gold-tone hardware. The leather lining and cushioned footbed ensure comfort, while the rubber-tipped sole provides traction. Luxury meets practicality.',
    shortDescription: 'Italian-inspired loafers with gold-tone horsebit hardware.',
    categoryIndex: 7,
    tags: ['loafers', 'horsebit', 'luxury', 'italian'],
    price: 24000, compareAtPrice: 28800, costPrice: 8400, isFeatured: false,
  },
  {
    name: 'Moccasin Loafer',
    description: 'Soft leather moccasin loafers with hand-sewn construction and decorative stitching. The rubber sole provides grip without sacrificing elegance. Features a plush cushioned insole for superior comfort throughout the day.',
    shortDescription: 'Soft moccasin loafers with hand-sewn construction.',
    categoryIndex: 7,
    tags: ['loafers', 'moccasin', 'handmade', 'comfort'],
    price: 15600, compareAtPrice: 18000, costPrice: 5300, isFeatured: false,
  },
  {
    name: 'Platform Loafer',
    description: 'Modern platform loafers combining classic design with contemporary style. The chunky sole adds height while maintaining comfort. Crafted from patent leather with a high-shine finish for a bold fashion statement.',
    shortDescription: 'Modern platform loafers in high-shine patent leather.',
    categoryIndex: 7,
    tags: ['loafers', 'platform', 'modern', 'fashion'],
    price: 16800, compareAtPrice: 20400, costPrice: 5750, isFeatured: false,
  },
  // Extra products to fill 40+
  {
    name: 'Zoom Pegasus 40',
    description: 'Nike Zoom Pegasus 40 continues the legacy of the beloved Pegasus line. The React foam midsole provides responsive cushioning, while the engineered mesh upper ensures breathability. A reliable daily trainer for runners of all levels.',
    shortDescription: 'Reliable daily trainers with React foam cushioning.',
    categoryIndex: 0,
    tags: ['running', 'pegasus', 'nike', 'daily'],
    price: 14400, compareAtPrice: 15600, costPrice: 5050, isFeatured: false,
  },
  {
    name: 'Gel-Nimbus 25',
    description: 'New Balance Fresh Foam X 1080v13 features Fresh Foam X midsole technology for plush cushioning. The Hypoknit upper provides a supportive yet breathable fit, making it ideal for long-distance running and daily training.',
    shortDescription: 'Plush cushioned running shoes with Fresh Foam X technology.',
    categoryIndex: 0,
    tags: ['running', 'fresh foam', 'new balance', 'long-distance'],
    price: 19200, compareAtPrice: 21600, costPrice: 6500, isFeatured: false,
  },
  {
    name: 'Ghost 15',
    description: 'Smooth transitions and balanced cushioning define the Ghost 15. The DNA LOFT v2 midsole adapts to your stride, while the 3D Fit Print upper provides structure without excess weight. A neutral trainer for everyday miles.',
    shortDescription: 'Neutral running shoes with adaptive DNA LOFT v2 cushioning.',
    categoryIndex: 0,
    tags: ['running', 'ghost', 'reebok', 'neutral'],
    price: 16800, compareAtPrice: 18000, costPrice: 5750, isFeatured: false,
  },
  {
    name: 'Campus 80s',
    description: 'Adidas Campus 80s brings back the vintage basketball aesthetic with premium suede and leather construction. The retro design features the iconic trefoil branding and a comfortable rubber cupsole. A streetwear essential.',
    shortDescription: 'Vintage basketball-inspired sneakers in premium suede.',
    categoryIndex: 6,
    tags: ['sneakers', 'campus', 'adidas', 'vintage'],
    price: 10800, compareAtPrice: 13200, costPrice: 3600, isFeatured: false,
  },
  {
    name: 'Mach 1000',
    description: 'Puma Mach 1000 is engineered for speed with a lightweight mesh upper and responsive PROFOAM midsole. The GripControl outsole ensures traction during high-speed movements. Perfect for competitive athletes.',
    shortDescription: 'Speed-engineered sneakers with PROFOAM cushioning.',
    categoryIndex: 3,
    tags: ['sports', 'speed', 'puma', 'athletic'],
    price: 15600, compareAtPrice: 18000, costPrice: 5300, isFeatured: false,
  },
  {
    name: 'Low Top Classic',
    description: 'Converse Low Top Classic delivers the iconic canvas sneaker experience. The vulcanized rubber sole, signature toe cap, and All Star ankle patch make this a wardrobe essential. Available in a variety of colors.',
    shortDescription: 'Iconic canvas low-tops with signature toe cap design.',
    categoryIndex: 6,
    tags: ['sneakers', 'converse', 'classic', 'canvas'],
    price: 7200, compareAtPrice: 8400, costPrice: 2150, isFeatured: false,
  },
  {
    name: 'EvoStrike Pro',
    description: 'New Balance EvoStrike Pro combines court performance with street style. The herringbone outsole provides excellent grip, while the cushioned midsole absorbs impact. A versatile shoe for volleyball, tennis, and casual wear.',
    shortDescription: 'Versatile court shoes with herringbone outsole and cushioning.',
    categoryIndex: 3,
    tags: ['sports', 'court', 'new balance', 'versatile'],
    price: 12000, compareAtPrice: 14400, costPrice: 4100, isFeatured: false,
  },
  {
    name: 'Birkenstock Boston',
    description: 'The Birkenstock Boston clog features a suede upper with a contoured cork-latex footbed that molds to your foot over time. The adjustable buckle ensures a secure fit, while the EVA outsole provides lightweight cushioning.',
    shortDescription: 'Suede clogs with contoured cork-latex footbed.',
    categoryIndex: 4,
    tags: ['sandals', 'clog', 'birkenstock', 'comfort'],
    price: 13200, compareAtPrice: 15600, costPrice: 4550, isFeatured: false,
  },
  {
    name: 'Chelsea Boot',
    description: 'Sleek Chelsea boots in premium leather with elastic side panels for easy on and off. The Goodyear welted construction ensures longevity, while the leather heel provides a polished look. Essential for any wardrobe.',
    shortDescription: 'Premium leather Chelsea boots with elastic side panels.',
    categoryIndex: 5,
    tags: ['boots', 'chelsea', 'leather', 'premium'],
    price: 22800, compareAtPrice: 26400, costPrice: 7800, isFeatured: true,
  },
  {
    name: 'Chukka Boot',
    description: 'Classic chukka boots in supple suede leather with a crepe rubber sole. The three-eyelet lacing system provides a comfortable fit, while the cushioned insole ensures all-day wearability. Smart-casual perfection.',
    shortDescription: 'Suede chukka boots with crepe sole for casual elegance.',
    categoryIndex: 5,
    tags: ['boots', 'chukka', 'suede', 'casual'],
    price: 16800, compareAtPrice: 20400, costPrice: 5750, isFeatured: false,
  },
  {
    name: 'Performance Slide',
    description: 'Reebok Performance Slide features a quick-dry upper strap with perforated detailing for breathability. The cushioned footbed and textured outsole make these perfect for pool, gym, or everyday comfort.',
    shortDescription: 'Quick-dry slides with perforated strap for breathability.',
    categoryIndex: 4,
    tags: ['sandals', 'slides', 'reebok', 'performance'],
    price: 3000, compareAtPrice: 4200, costPrice: 950, isFeatured: false,
  },
];

const categories = [
  { name: 'Running Shoes', description: 'Engineered for performance and comfort on every stride. From daily trainers to race-day flats.' },
  { name: 'Casual Shoes', description: 'Everyday footwear combining style and comfort for laid-back looks.' },
  { name: 'Formal Shoes', description: 'Elegant dress shoes for business meetings, weddings, and special occasions.' },
  { name: 'Sports Shoes', description: 'Specialized footwear for basketball, football, tennis, and other sports.' },
  { name: 'Sandals', description: 'Open-toe footwear for warm weather, beach trips, and relaxation.' },
  { name: 'Boots', description: 'Durable footwear for hiking, winter weather, and rugged adventures.' },
  { name: 'Sneakers', description: 'Iconic and trendy sneakers for fashion and casual wear.' },
  { name: 'Loafers', description: 'Slip-on shoes for effortless sophistication and smart-casual dressing.' },
];

const UNSPLASH = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

// Verified working Unsplash photo IDs (shoes/footwear)
const shoeImages = [
  '1542291026-7eec264c27ff',
  '1595950653106-6c9ebd614d3a',
  '1600185365483-26d7a4cc7519',
  '1606107557195-0e29a4b5b4aa',
  '1560769629-975ec94e6a86',
  '1608231387042-66d1773070a5',
  '1549298916-b41d501d3772',
  '1552346154-21d32810aba3',
  '1595341888016-a392ef81b7de',
  '1579338559194-a162d19bf842',
  '1520639888713-7851133b1ed0',
  '1449505278894-297fdb3edbc1',
  '1603487742131-4160ec999306',
  '1614252369475-531eba835eb1',
  '1556905055-8f358a7a47b2',
  '1512374382149-233c42b6a83b',
  '1533867617858-e7b97e060509',
].map((id) => UNSPLASH(id, 800));

const bannerData = [
  {
    title: 'Summer Collection 2026',
    subtitle: 'Up to 40% off on selected styles',
    // Desktop artwork (wide) + dedicated mobile artwork (portrait-ish crop)
    image: UNSPLASH('1542291026-7eec264c27ff', 1600),
    mobileImage: UNSPLASH('1542291026-7eec264c27ff', 800),
    altText: 'Summer Collection 2026',
    link: '/product-category',
    linkType: 'url' as const,
    position: 'hero' as const,
    sortOrder: 1,
  },
  {
    title: 'New Arrivals',
    subtitle: 'Fresh drops from your favorite brands',
    image: UNSPLASH('1595950653106-6c9ebd614d3a', 1600),
    mobileImage: UNSPLASH('1595950653106-6c9ebd614d3a', 800),
    altText: 'New Arrivals',
    link: '/product-category/new-arrival',
    linkType: 'url' as const,
    position: 'hero' as const,
    sortOrder: 2,
  },
  {
    title: 'Running Essentials',
    subtitle: 'Gear up for your next run',
    image: UNSPLASH('1552346154-21d32810aba3', 1600),
    mobileImage: UNSPLASH('1552346154-21d32810aba3', 800),
    altText: 'Running Essentials',
    link: '/product-category',
    linkType: 'url' as const,
    position: 'hero' as const,
    sortOrder: 3,
  },
  {
    title: 'Member Exclusive',
    subtitle: 'Earn double points on all purchases this week',
    image: UNSPLASH('1600185365483-26d7a4cc7519', 1600),
    mobileImage: UNSPLASH('1600185365483-26d7a4cc7519', 800),
    altText: 'Member Exclusive',
    link: '/product-category',
    linkType: 'url' as const,
    position: 'hero' as const,
    sortOrder: 4,
  },
  {
    title: 'Free Shipping',
    subtitle: 'On orders over $100',
    image: UNSPLASH('1549298916-b41d501d3772', 1600),
    mobileImage: UNSPLASH('1549298916-b41d501d3772', 800),
    altText: 'Free Shipping',
    link: '/product-category',
    linkType: 'url' as const,
    position: 'hero' as const,
    sortOrder: 5,
  },
];

const couponData = [
  { code: 'WELCOME10', description: '10% off your first order', discountType: 'percentage' as const, discountValue: 10, minPurchase: 50, usageLimit: 1000 },
  { code: 'SUMMER25', description: '25% off summer collection', discountType: 'percentage' as const, discountValue: 25, minPurchase: 100, maxDiscount: 50, usageLimit: 500 },
  { code: 'FLAT15', description: '$15 off orders over $75', discountType: 'fixed' as const, discountValue: 15, minPurchase: 75, usageLimit: 300 },
  { code: 'FREESHIP', description: 'Free standard shipping', discountType: 'shipping' as const, discountValue: 0, minPurchase: 0, usageLimit: 2000 },
  { code: 'VIP50', description: '$50 off for VIP members', discountType: 'fixed' as const, discountValue: 50, minPurchase: 200, usageLimit: 100 },
  { code: 'SPORT20', description: '20% off sports shoes', discountType: 'percentage' as const, discountValue: 20, minPurchase: 80, maxDiscount: 30, usageLimit: 400 },
  { code: 'BOOTS30', description: '$30 off boots collection', discountType: 'fixed' as const, discountValue: 30, minPurchase: 120, usageLimit: 200 },
  { code: 'NEWUSER', description: '15% off for new users', discountType: 'percentage' as const, discountValue: 15, minPurchase: 30, usageLimit: 5001 },
  { code: 'FLASH50', description: '50% off flash sale items', discountType: 'percentage' as const, discountValue: 50, minPurchase: 0, maxDiscount: 100, usageLimit: 50 },
  { code: 'LOYALTY20', description: '$20 loyalty reward', discountType: 'fixed' as const, discountValue: 20, minPurchase: 0, usageLimit: 1000 },
];

const reviewTitles = [
  'Amazing quality!', 'Exactly what I expected', 'Best purchase ever', 'Comfortable and stylish',
  'Great value for money', 'Highly recommend', 'Perfect fit', 'Love these shoes',
  'Exceeded expectations', 'Solid purchase', 'Not bad', 'Good but could be better',
  'Impressive quality', 'True to size', 'Worth every penny',
];

const reviewComments = [
  'These shoes are incredibly comfortable. I wore them all day without any discomfort.',
  'The quality is outstanding for the price. Very well made with attention to detail.',
  'Perfect fit right out of the box. No break-in period needed.',
  'Stylish design that gets compliments everywhere I go.',
  'Great shoes for the price. Durable and comfortable.',
  'Exactly what I was looking for. Fast shipping too.',
  'These exceeded my expectations. Very happy with this purchase.',
  'Comfortable enough for long walks and standing all day.',
  'The color and design match the photos perfectly.',
  'Good shoes overall. Slightly narrow but true to size.',
];


const customerAddresses = [
  [
    { label: 'Home', fullName: 'Jane Smith', phone: '+1 (555) 200-1001', address1: '789 Oak Lane', address2: '', city: 'Los Angeles', state: 'CA', postalCode: '90001', country: 'US', isDefault: true },
  ],
  [
    { label: 'Home', fullName: 'Bob Johnson', phone: '+1 (555) 300-1001', address1: '321 Pine Street', address2: '', city: 'Chicago', state: 'IL', postalCode: '60601', country: 'US', isDefault: true },
    { label: 'Work', fullName: 'Bob Johnson', phone: '+1 (555) 300-1002', address1: '654 Corporate Blvd', address2: '', city: 'Chicago', state: 'IL', postalCode: '60602', country: 'US', isDefault: false },
  ],
  [
    { label: 'Home', fullName: 'Alice Brown', phone: '+1 (555) 400-1001', address1: '987 Elm Drive', address2: '', city: 'Houston', state: 'TX', postalCode: '77001', country: 'US', isDefault: true },
  ],
];

export async function seed(): Promise<void> {
  console.log('\n🌱 Starting database seeding...\n');

  // Connect to MongoDB
  await mongoose.connect(config.mongoUri);
  console.log('✅ Connected to MongoDB');

  // Condition check — seed only what is missing. Existing data is never
  // cleared or overwritten (same behaviour as size/settings/admin seeds).
  const [existingProducts, existingCategories] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
  ]);
  if (existingProducts > 0 && existingCategories > 0) {
    console.log(
      `✅ Already seeded — nothing to do (products=${existingProducts}, categories=${existingCategories})`
    );
    return;
  }
  console.log(
    `🌱 Seeding missing data (products=${existingProducts}, categories=${existingCategories})...`
  );

  // Create Roles
  console.log('\n📋 Creating roles...');
  const allPermissions = [
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'orders.view', 'orders.manage',
    'customers.view', 'customers.manage',
    'categories.manage', 'coupons.manage', 'banners.manage',
    'reviews.manage', 'inventory.manage', 'analytics.view', 'settings.manage', 'staff.manage',
  ];

  const rolesData = [
    { name: 'super-admin', description: 'Full system access with all permissions', permissions: allPermissions, isSystem: true },
    { name: 'admin', description: 'Administrative access to manage store operations', permissions: allPermissions.filter(p => !p.includes('staff')), isSystem: true },
    { name: 'staff', description: 'Staff access for order and customer management', permissions: ['products.view', 'orders.view', 'orders.manage', 'customers.view', 'reviews.manage', 'inventory.view'], isSystem: true },
    { name: 'customer', description: 'Regular customer access', permissions: [], isSystem: true },
    { name: 'manager', description: 'Manager access with analytics and staff management', permissions: allPermissions.filter(p => p !== 'settings.manage'), isSystem: true },
  ];

  const rolesExist = (await Role.countDocuments()) > 0;
  const createdRoles = rolesExist ? await Role.find() : await Role.insertMany(rolesData);
  console.log(
    rolesExist
      ? `✅ Roles already exist (${createdRoles.length})`
      : `✅ Created ${createdRoles.length} roles: ${createdRoles.map(r => r.name).join(', ')}`
  );

  // Create Super Admin
  console.log('\n👤 Creating Super Admin...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@footware2.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  let superAdmin: any = await User.findOne({
    role: { $in: ['super-admin', 'admin'] },
  });
  if (superAdmin) {
    console.log(`✅ Admin already exists (${superAdmin.email})`);
  } else {
    superAdmin = new User({
      name: 'Super Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'super-admin',
      isVerified: true,
      isActive: true,
      phone: '+1 (555) 000-0001',
    });
    await superAdmin.save();
    console.log(`✅ Created Super Admin: ${adminEmail}`);
  }

  // Create Customers
  console.log('\n👥 Creating sample customers...');
  const customersData = [
    { name: 'Jane Smith', email: 'jane.smith@example.com', password: 'Customer@123', phone: '+1 (555) 200-0001', },
    { name: 'Bob Johnson', email: 'bob.johnson@example.com', password: 'Customer@123', phone: '+1 (555) 300-0001', },
    { name: 'Alice Brown', email: 'alice.brown@example.com', password: 'Customer@123', phone: '+1 (555) 400-0001', },
  ];

  // Email -> seed addresses (addresses live in their own Address collection)
  const addressesByEmail: Record<string, typeof customerAddresses[number]> = {};
  customersData.forEach((c, i) => { addressesByEmail[c.email] = customerAddresses[i]; });
  let customers: InstanceType<typeof User>[] = await User.find({
    email: { $in: customersData.map((c) => c.email) },
  });
  if (customers.length > 0) {
    console.log(`✅ Customers already exist (${customers.length})`);
  } else {
  customers = [];
  for (const c of customersData) {
    const customer = new User({
      name: c.name,
      email: c.email,
      password: c.password,
      role: 'customer',
      isVerified: true,
      isActive: true,
      phone: c.phone,
    });
    await customer.save();
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers`);
  }

  // Create Addresses
  console.log('\n📍 Creating addresses...');
  const existingAddressCount = await Address.countDocuments();
  const addressDocs: InstanceType<typeof Address>[] = [];
  if (existingAddressCount > 0) {
    console.log(`✅ Addresses already exist (${existingAddressCount})`);
  } else {
  for (const cust of customers) {
    for (const addr of (addressesByEmail[cust.email] || [])) {
      const addressDoc = new Address({
        user: cust._id,
        label: addr.label,
        fullName: addr.fullName,
        phone: addr.phone,
        address1: addr.address1,
        address2: addr.address2 || '',
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
        isDefault: addr.isDefault,
      });
      await addressDoc.save();
      addressDocs.push(addressDoc);
    }
  }
  console.log(`✅ Created ${addressDocs.length} addresses`);
  }

  // Create Categories
  console.log('\n📂 Creating categories...');
  let createdCategories: InstanceType<typeof Category>[] = await Category.find();
  if (createdCategories.length > 0) {
    console.log(`✅ Categories already exist (${createdCategories.length})`);
  } else {
  for (let i = 0; i < categories.length; i++) {
    const cat = new Category({
      name: categories[i].name,
      slug: slugify(categories[i].name),
      description: categories[i].description,
      isActive: true,
      sortOrder: i + 1,
    });
    await cat.save();
    createdCategories.push(cat);
  }
  console.log(`✅ Created ${createdCategories.length} categories`);
  }

  // Create Products
  console.log('\n👟 Creating products...');
  let createdProducts: any[] = await Product.find();
  if (createdProducts.length > 0) {
    console.log(`✅ Products already exist (${createdProducts.length})`);
  } else {
  for (const pd of productData) {
    const category = createdCategories[pd.categoryIndex];

    const numColors = randomInt(2, 4);
    const productColors = colors.slice(0, numColors);
    const productSizes = sizes.slice(randomInt(0, 3), randomInt(7, sizes.length));

    const skuPrefix = slugify(pd.name).substring(0, 6).toUpperCase();

    const variants = [];
    for (const color of productColors) {
      for (const size of productSizes) {
        variants.push({
          size,
          color,
          price: pd.price + randomInt(-5, 10),
          stock: randomInt(5, 50),
          sku: `${skuPrefix}-${size}-${color.substring(0, 3).toUpperCase()}`,
        });
      }
    }

    const slug = slugify(pd.name) + '-' + Date.now().toString(36) + randomInt(100, 999);

    const product = new Product({
      name: pd.name,
      slug,
      description: pd.description,
      shortDescription: pd.shortDescription,
      category: category._id,
      tags: pd.tags,
      images: [
        shoeImages[createdProducts.length % shoeImages.length],
        shoeImages[(createdProducts.length + 1) % shoeImages.length],
        shoeImages[(createdProducts.length + 2) % shoeImages.length],
      ],
      thumbnail: shoeImages[createdProducts.length % shoeImages.length],
      price: pd.price,
      compareAtPrice: pd.compareAtPrice,
      costPrice: pd.costPrice,
      sku: `${skuPrefix}-${randomInt(1000, 9999)}`,
      variants,
      sizes: productSizes,
      colors: productColors,
      isActive: true,
      isFeatured: pd.isFeatured,
    });
    await product.save();
    createdProducts.push(product);
  }
  console.log(`✅ Created ${createdProducts.length} products`);
  }

  // Create Banners
  console.log('\n🖼️  Creating banners...');
  const existingBanners = await Banner.countDocuments();
  const createdBanners: any[] = [];
  if (existingBanners > 0) {
    console.log(`✅ Banners already exist (${existingBanners})`);
  } else {
  for (const bd of bannerData) {
    const banner = new Banner({
      ...bd,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    await banner.save();
    createdBanners.push(banner);
  }
  console.log(`✅ Created ${createdBanners.length} banners`);
  }

  // Create Coupons
  console.log('\n🎫 Creating coupons...');
  const existingCoupons = await Coupon.countDocuments();
  const createdCoupons: any[] = [];
  if (existingCoupons > 0) {
    console.log(`✅ Coupons already exist (${existingCoupons})`);
  } else {
  for (const cd of couponData) {
    const coupon = new Coupon({
      ...cd,
      isActive: true,
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    });
    await coupon.save();
    createdCoupons.push(coupon);
  }
  console.log(`✅ Created ${createdCoupons.length} coupons`);
  }

  // Create Reviews
  console.log('\n⭐ Creating reviews...');
  const existingReviewCount = await Review.countDocuments();
  const createdReviews: any[] = [];
  const reviewProducts = createdProducts.slice(0, 20);
  const skipReviews =
    existingReviewCount > 0 ||
    customers.length === 0 ||
    reviewProducts.length === 0;
  if (skipReviews) {
    console.log(
      `✅ Reviews skipped (existing=${existingReviewCount}, customers=${customers.length}, products=${reviewProducts.length})`
    );
  } else {
  for (let i = 0; i < reviewProducts.length; i++) {
    const review = new Review({
      user: customers[i % customers.length]._id,
      product: reviewProducts[i]._id,
      rating: randomInt(3, 5),
      title: reviewTitles[i % reviewTitles.length],
      comment: reviewComments[i % reviewComments.length],
      isVerified: Math.random() > 0.3,
      helpful: randomInt(0, 15),
      status: 'approved',
    });
    await review.save();
    createdReviews.push(review);
  }
  console.log(`✅ Created ${createdReviews.length} reviews`);
  }

  // Create Orders
  console.log('\n📦 Creating orders...');
  const orderStatuses: Array<{ orderStatus: string; paymentStatus: string }> = [
    { orderStatus: 'delivered', paymentStatus: 'paid' },
    { orderStatus: 'shipped', paymentStatus: 'paid' },
    { orderStatus: 'processing', paymentStatus: 'paid' },
    { orderStatus: 'confirmed', paymentStatus: 'paid' },
    { orderStatus: 'pending', paymentStatus: 'pending' },
    { orderStatus: 'cancelled', paymentStatus: 'refunded' },
  ];

  const existingOrderCount = await Order.countDocuments();
  const createdOrders: any[] = [];
  const skipOrders =
    existingOrderCount > 0 ||
    customers.length === 0 ||
    createdProducts.length === 0;
  if (skipOrders) {
    console.log(`✅ Orders skipped (existing=${existingOrderCount})`);
  } else {
  for (let i = 0; i < 10; i++) {
    const customer = customers[i % customers.length];
    const numItems = randomInt(1, 4);
    const orderItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = createdProducts[randomInt(0, createdProducts.length - 1)];
      const quantity = randomInt(1, 3);
      const itemPrice = product.price;
      subtotal += itemPrice * quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: itemPrice,
        quantity,
        image: product.thumbnail,
      });
    }

    const shipping = 0; // Free shipping on all orders
    const statusIdx = i % orderStatuses.length;

    const shippingAddr = addressesByEmail[customer.email] && addressesByEmail[customer.email].length > 0
      ? {
          fullName: addressesByEmail[customer.email][0].fullName,
          phone: addressesByEmail[customer.email][0].phone,
          address1: addressesByEmail[customer.email][0].address1,
          address2: addressesByEmail[customer.email][0].address2 || '',
          city: addressesByEmail[customer.email][0].city,
          state: addressesByEmail[customer.email][0].state,
          postalCode: addressesByEmail[customer.email][0].postalCode,
          country: addressesByEmail[customer.email][0].country,
        }
      : {
          fullName: customer.name,
          phone: customer.phone || '+1 (555) 000-0000',
          address1: '123 Default Street',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        };

    const order = new Order({
      user: customer._id,
      orderNumber: `FW26${(i + 1).toString().padStart(4, '0')}`,
      items: orderItems,
      shippingAddress: shippingAddr,
      paymentMethod: i % 2 === 0 ? 'cod' : 'bank_deposit',
      paymentStatus: orderStatuses[statusIdx].paymentStatus,
      orderStatus: orderStatuses[statusIdx].orderStatus,
      subtotal,
      discount: 0,
      shipping,
      total: Math.round((subtotal + shipping) * 100) / 100,
      notes: i % 3 === 0 ? 'Please leave at the front door' : undefined,
      trackingNumber: orderStatuses[statusIdx].orderStatus === 'shipped' || orderStatuses[statusIdx].orderStatus === 'delivered' ? `TRK${randomInt(100000, 999999)}` : undefined,
      shippingCarrier: orderStatuses[statusIdx].orderStatus === 'shipped' || orderStatuses[statusIdx].orderStatus === 'delivered' ? 'FedEx' : undefined,
    });
    await order.save();
    createdOrders.push(order);
  }
  console.log(`✅ Created ${createdOrders.length} orders`);
  }

  // Create Inventory Movements
  console.log('\n📊 Creating inventory movements...');
  const movementTypes: Array<'purchase' | 'adjustment' | 'sale' | 'return'> = ['purchase', 'adjustment', 'sale', 'return'];
  const existingMovementCount = await InventoryMovement.countDocuments();
  const createdMovements: any[] = [];
  const skipMovements = existingMovementCount > 0 || createdProducts.length === 0;
  if (skipMovements) {
    console.log(`✅ Inventory movements skipped (existing=${existingMovementCount})`);
  } else {
  for (let i = 0; i < 20; i++) {
    const product = createdProducts[i % createdProducts.length];
    const movementType = movementTypes[i % movementTypes.length];
    const qty = randomInt(5, 50);
    const prevStock = randomInt(50, 200);
    const newStock = movementType === 'sale' ? prevStock - qty : prevStock + qty;

    const movement = new InventoryMovement({
      product: product._id,
      type: movementType,
      quantity: qty,
      previousStock: Math.max(0, prevStock),
      newStock: Math.max(0, newStock),
      reference: `${movementType.toUpperCase()}-${randomInt(1000, 9999)}`,
      notes: `Sample ${movementType} movement`,
      performedBy: superAdmin._id,
    });
    await movement.save();
    createdMovements.push(movement);
  }
  console.log(`✅ Created ${createdMovements.length} inventory movements`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SEED SUMMARY');
  console.log('='.repeat(50));
  console.log(`👤 Users:          ${1 + customers.length} (1 admin + ${customers.length} customers)`);
  console.log(`📋 Roles:          ${createdRoles.length}`);
  console.log(`📂 Categories:     ${createdCategories.length}`);
  console.log(`👟 Products:       ${createdProducts.length}`);
  console.log(`🖼️  Banners:        ${createdBanners.length}`);
  console.log(`🎫 Coupons:        ${createdCoupons.length}`);
  console.log(`⭐ Reviews:        ${createdReviews.length}`);
  console.log(`📦 Orders:         ${createdOrders.length}`);
  console.log(`📍 Addresses:      ${addressDocs.length}`);
  console.log(`📊 Movements:      ${createdMovements.length}`);
  console.log('='.repeat(50));
  console.log(`\n🔑 Admin credentials:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`\n🔑 Customer credentials:`);
  console.log(`   Email:    jane.smith@example.com`);
  console.log(`   Password: Customer@123`);
  console.log('');
}

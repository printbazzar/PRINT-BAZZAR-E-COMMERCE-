import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function cleanSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export const LIVE_PRICE_DATA = [
  // BUSINESS CARDS
  {
    name: 'Luxury 800 GSM Card',
    category: 'Business Cards',
    quantity: 500,
    quantityUnit: 'Cards',
    basePrice: 2300,
    pricingType: 'TIERED',
    shortDescription: 'Heavyweight 800 GSM luxury sandwich card with colored seam edge option.',
    slabs: [
      { minQty: 500, singleSidePrice: 2300, doubleSidePrice: 2800 },
      { minQty: 1000, singleSidePrice: 4200, doubleSidePrice: 4900 },
    ],
  },
  {
    name: 'Circle Card',
    category: 'Business Cards',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 290,
    pricingType: 'TIERED',
    shortDescription: 'Precision circular die-cut visiting cards for creative professionals.',
    slabs: [
      { minQty: 100, singleSidePrice: 290, doubleSidePrice: 380 },
      { minQty: 250, singleSidePrice: 620, doubleSidePrice: 790 },
      { minQty: 500, singleSidePrice: 1100, doubleSidePrice: 1390 },
      { minQty: 1000, singleSidePrice: 1950, doubleSidePrice: 2450 },
    ],
  },
  {
    name: 'Raised UV Card',
    category: 'Business Cards',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 850,
    pricingType: 'TIERED',
    shortDescription: 'Tactile high-gloss 3D raised Spot UV texture on matte velvet card.',
    slabs: [
      { minQty: 100, singleSidePrice: 850, doubleSidePrice: 1150 },
      { minQty: 250, singleSidePrice: 1650, doubleSidePrice: 2150 },
      { minQty: 500, singleSidePrice: 2750, doubleSidePrice: 3450 },
      { minQty: 1000, singleSidePrice: 4800, doubleSidePrice: 5900 },
    ],
  },
  {
    name: 'Synthetic Card',
    category: 'Business Cards',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 350,
    pricingType: 'TIERED',
    shortDescription: '100% waterproof, tear-resistant non-tearable synthetic plastic card.',
    slabs: [
      { minQty: 100, singleSidePrice: 350, doubleSidePrice: 450 },
      { minQty: 250, singleSidePrice: 750, doubleSidePrice: 950 },
      { minQty: 500, singleSidePrice: 1350, doubleSidePrice: 1650 },
      { minQty: 1000, singleSidePrice: 2350, doubleSidePrice: 2850 },
    ],
  },
  {
    name: 'Laminated Card',
    category: 'Business Cards',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 370,
    pricingType: 'TIERED',
    shortDescription: '350 GSM Art Card with premium thermal matte or gloss lamination.',
    slabs: [
      { minQty: 100, singleSidePrice: 370, doubleSidePrice: 470 },
      { minQty: 250, singleSidePrice: 780, doubleSidePrice: 980 },
      { minQty: 500, singleSidePrice: 1380, doubleSidePrice: 1680 },
      { minQty: 1000, singleSidePrice: 2380, doubleSidePrice: 2880 },
    ],
  },
  {
    name: 'Square Card',
    category: 'Business Cards',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 380,
    pricingType: 'TIERED',
    shortDescription: 'Modern 2.5 x 2.5 inch symmetrical square profile business card.',
    slabs: [
      { minQty: 100, singleSidePrice: 380, doubleSidePrice: 480 },
      { minQty: 250, singleSidePrice: 790, doubleSidePrice: 990 },
      { minQty: 500, singleSidePrice: 1390, doubleSidePrice: 1690 },
      { minQty: 1000, singleSidePrice: 2390, doubleSidePrice: 2890 },
    ],
  },
  {
    name: 'Elite 500 GSM Card',
    category: 'Business Cards',
    quantity: 500,
    quantityUnit: 'Cards',
    basePrice: 1188,
    pricingType: 'TIERED',
    shortDescription: 'Extra rigid 500 GSM industrial duplex board with matte finish.',
    slabs: [
      { minQty: 500, singleSidePrice: 1188, doubleSidePrice: 1488 },
      { minQty: 1000, singleSidePrice: 2150, doubleSidePrice: 2650 },
      { minQty: 2000, singleSidePrice: 3950, doubleSidePrice: 4850 },
    ],
  },
  {
    name: 'Plantable Paper Card',
    category: 'Business Cards',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 300,
    pricingType: 'TIERED',
    shortDescription: 'Eco-friendly handmade seed paper embedded with basil & marigold seeds.',
    slabs: [
      { minQty: 100, singleSidePrice: 300, doubleSidePrice: 400 },
      { minQty: 250, singleSidePrice: 650, doubleSidePrice: 850 },
      { minQty: 500, singleSidePrice: 1150, doubleSidePrice: 1450 },
      { minQty: 1000, singleSidePrice: 2050, doubleSidePrice: 2550 },
    ],
  },
  {
    name: 'Royal Embossed UV Card',
    category: 'Business Cards',
    quantity: 500,
    quantityUnit: 'Cards',
    basePrice: 1350,
    pricingType: 'TIERED',
    shortDescription: 'Royal multi-level blind embossing with raised spot gloss highlight.',
    slabs: [
      { minQty: 500, singleSidePrice: 1350, doubleSidePrice: 1750 },
      { minQty: 1000, singleSidePrice: 2350, doubleSidePrice: 2950 },
      { minQty: 2000, singleSidePrice: 4250, doubleSidePrice: 5350 },
    ],
  },

  // INVITATION CARDS
  {
    name: 'Naming Ceremony Invitation',
    category: 'Invitations',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 100,
    pricingType: 'TIERED',
    shortDescription: 'Custom printed baby naming celebration invite cards with gold envelopes.',
    slabs: [
      { minQty: 10, singleSidePrice: 100, doubleSidePrice: 150 },
      { minQty: 50, singleSidePrice: 450, doubleSidePrice: 650 },
      { minQty: 100, singleSidePrice: 800, doubleSidePrice: 1100 },
      { minQty: 250, singleSidePrice: 1800, doubleSidePrice: 2400 },
    ],
  },
  {
    name: 'Other Special Occasions',
    category: 'Invitations',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 100,
    pricingType: 'TIERED',
    shortDescription: 'Versatile invitation cards for corporate events, anniversaries & galas.',
    slabs: [
      { minQty: 10, singleSidePrice: 100, doubleSidePrice: 150 },
      { minQty: 50, singleSidePrice: 450, doubleSidePrice: 650 },
      { minQty: 100, singleSidePrice: 800, doubleSidePrice: 1100 },
    ],
  },
  {
    name: 'Bangle Ceremony Invitation',
    category: 'Invitations',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 30,
    pricingType: 'PER_PIECE',
    shortDescription: 'Traditional Valagappu & Bangle ceremony invitations with ornate motifs.',
    slabs: [
      { minQty: 1, singleSidePrice: 30, doubleSidePrice: 45 },
      { minQty: 50, singleSidePrice: 500, doubleSidePrice: 700 },
      { minQty: 100, singleSidePrice: 900, doubleSidePrice: 1200 },
    ],
  },
  {
    name: 'Shinchan Invitation',
    category: 'Invitations',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 30,
    pricingType: 'PER_PIECE',
    shortDescription: 'Cartoon Shinchan themed kids birthday party invitation cards.',
    slabs: [
      { minQty: 1, singleSidePrice: 30, doubleSidePrice: 45 },
      { minQty: 50, singleSidePrice: 500, doubleSidePrice: 700 },
    ],
  },
  {
    name: 'Baby Sprinkle Invitation',
    category: 'Invitations',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 30,
    pricingType: 'PER_PIECE',
    shortDescription: 'Pastel watercolor baby sprinkle shower cards with personalized text.',
    slabs: [
      { minQty: 1, singleSidePrice: 30, doubleSidePrice: 45 },
      { minQty: 50, singleSidePrice: 500, doubleSidePrice: 700 },
    ],
  },
  {
    name: 'Haldi Invitation',
    category: 'Invitations',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 100,
    pricingType: 'TIERED',
    shortDescription: 'Vibrant marigold yellow Haldi & Mehndi ceremony invitation leaflets.',
    slabs: [
      { minQty: 10, singleSidePrice: 100, doubleSidePrice: 150 },
      { minQty: 50, singleSidePrice: 450, doubleSidePrice: 650 },
      { minQty: 100, singleSidePrice: 800, doubleSidePrice: 1100 },
    ],
  },
  {
    name: 'Baby Shower Invitation',
    category: 'Invitations',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 100,
    pricingType: 'TIERED',
    shortDescription: 'Elegant Seemantham / Baby shower ceremony invites with glossy print.',
    slabs: [
      { minQty: 10, singleSidePrice: 100, doubleSidePrice: 150 },
      { minQty: 50, singleSidePrice: 450, doubleSidePrice: 650 },
      { minQty: 100, singleSidePrice: 800, doubleSidePrice: 1100 },
    ],
  },
  {
    name: 'House Warming Invitation',
    category: 'Invitations',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 100,
    pricingType: 'TIERED',
    shortDescription: 'Griha Pravesham traditional house warming ceremony cards.',
    slabs: [
      { minQty: 10, singleSidePrice: 100, doubleSidePrice: 150 },
      { minQty: 50, singleSidePrice: 450, doubleSidePrice: 650 },
      { minQty: 100, singleSidePrice: 800, doubleSidePrice: 1100 },
    ],
  },

  // PERSONALISED GIFTS
  {
    name: 'Photo Crystal',
    category: 'Gifts',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 800,
    pricingType: 'PER_PIECE',
    shortDescription: 'High-clarity optical 3D laser-engraved glass photo crystal prism.',
    slabs: [{ minQty: 1, singleSidePrice: 800, doubleSidePrice: 800 }],
  },
  {
    name: 'Tshirt Printing',
    category: 'Gifts',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 200,
    pricingType: 'PER_PIECE',
    shortDescription: '180 GSM 100% bio-wash combed cotton round neck customized t-shirt.',
    slabs: [
      { minQty: 1, singleSidePrice: 200, doubleSidePrice: 280 },
      { minQty: 10, singleSidePrice: 1800, doubleSidePrice: 2400 },
      { minQty: 50, singleSidePrice: 7500, doubleSidePrice: 9500 },
    ],
  },
  {
    name: 'Couple Pair Mug',
    category: 'Gifts',
    quantity: 1,
    quantityUnit: 'Pairs',
    basePrice: 1000,
    pricingType: 'FIXED_QTY',
    shortDescription: 'Interlocking heart-handle couple ceramic coffee mugs set with gift box.',
    slabs: [{ minQty: 1, singleSidePrice: 1000, doubleSidePrice: 1000 }],
  },
  {
    name: 'Magic Mug',
    category: 'Gifts',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 450,
    pricingType: 'PER_PIECE',
    shortDescription: 'Heat-sensitive color changing ceramic mug that reveals photo with hot liquid.',
    slabs: [{ minQty: 1, singleSidePrice: 450, doubleSidePrice: 450 }],
  },
  {
    name: 'Gold and Silver Mug',
    category: 'Gifts',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 500,
    pricingType: 'PER_PIECE',
    shortDescription: 'Metallic mirror electroplated gold and silver ceramic mug.',
    slabs: [{ minQty: 1, singleSidePrice: 500, doubleSidePrice: 500 }],
  },
  {
    name: 'Heart Mug',
    category: 'Gifts',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 200,
    pricingType: 'PER_PIECE',
    shortDescription: 'Ceramic coffee mug with stylized heart-shaped ergonomic handle.',
    slabs: [{ minQty: 1, singleSidePrice: 200, doubleSidePrice: 200 }],
  },
  {
    name: 'Inner Color Mug',
    category: 'Gifts',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 400,
    pricingType: 'PER_PIECE',
    shortDescription: 'Dual-tone ceramic mug with vibrant interior glaze (Red, Blue, Yellow, Green).',
    slabs: [{ minQty: 1, singleSidePrice: 400, doubleSidePrice: 400 }],
  },
  {
    name: 'MDF Keychains',
    category: 'Gifts',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 150,
    pricingType: 'PER_PIECE',
    shortDescription: 'Sublimation printed high-density fiberboard glossy double-sided keychains.',
    slabs: [
      { minQty: 1, singleSidePrice: 150, doubleSidePrice: 180 },
      { minQty: 25, singleSidePrice: 2500, doubleSidePrice: 3000 },
    ],
  },

  // PACKAGING
  {
    name: 'Cosmetic Box',
    category: 'Packaging',
    quantity: 4,
    quantityUnit: 'Pieces',
    basePrice: 150,
    pricingType: 'FIXED_QTY',
    shortDescription: 'Tuck-end cosmetic packaging box with moisture-proof matte coating.',
    slabs: [
      { minQty: 4, singleSidePrice: 150, doubleSidePrice: 150 },
      { minQty: 50, singleSidePrice: 1250, doubleSidePrice: 1250 },
      { minQty: 500, singleSidePrice: 8500, doubleSidePrice: 8500 },
    ],
  },
  {
    name: 'Pharma Box',
    category: 'Packaging',
    quantity: 4,
    quantityUnit: 'Pieces',
    basePrice: 150,
    pricingType: 'FIXED_QTY',
    shortDescription: 'Pharmaceutical grade mono-carton boxes with security seal flaps.',
    slabs: [
      { minQty: 4, singleSidePrice: 150, doubleSidePrice: 150 },
      { minQty: 100, singleSidePrice: 2200, doubleSidePrice: 2200 },
    ],
  },
  {
    name: 'Soap Box',
    category: 'Packaging',
    quantity: 4,
    quantityUnit: 'Pieces',
    basePrice: 150,
    pricingType: 'FIXED_QTY',
    shortDescription: 'Custom handmade soap packaging box with optional die-cut viewing window.',
    slabs: [
      { minQty: 4, singleSidePrice: 150, doubleSidePrice: 150 },
      { minQty: 100, singleSidePrice: 2200, doubleSidePrice: 2200 },
    ],
  },
  {
    name: 'Custom Carton Box',
    category: 'Packaging',
    quantity: 4,
    quantityUnit: 'Pieces',
    basePrice: 150,
    pricingType: 'FIXED_QTY',
    shortDescription: 'Corrugated 3-ply shipping carton boxes with company branding.',
    slabs: [
      { minQty: 4, singleSidePrice: 150, doubleSidePrice: 150 },
      { minQty: 50, singleSidePrice: 1400, doubleSidePrice: 1400 },
    ],
  },
  {
    name: 'Health Mix Box',
    category: 'Packaging',
    quantity: 4,
    quantityUnit: 'Pieces',
    basePrice: 150,
    pricingType: 'FIXED_QTY',
    shortDescription: 'Food-grade 350 GSM virgin board nutrition & health mix packaging boxes.',
    slabs: [
      { minQty: 4, singleSidePrice: 150, doubleSidePrice: 150 },
      { minQty: 100, singleSidePrice: 2400, doubleSidePrice: 2400 },
    ],
  },

  // DIGITAL PRINTING (Sheets / Materials)
  {
    name: 'Metallic Board',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 32,
    pricingType: 'PER_PIECE',
    shortDescription: 'Gold & Silver shimmer metallic specialty board digital print.',
    slabs: [{ minQty: 1, singleSidePrice: 32, doubleSidePrice: 48 }],
  },
  {
    name: 'Art Sticker',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 25,
    pricingType: 'PER_PIECE',
    shortDescription: 'Self-adhesive Chromo art paper sticker sheet print.',
    slabs: [{ minQty: 1, singleSidePrice: 25, doubleSidePrice: 25 }],
  },
  {
    name: 'Maplitho Paper',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 12,
    pricingType: 'PER_PIECE',
    shortDescription: '80-100 GSM uncoated wood-free Maplitho high-speed print sheet.',
    slabs: [{ minQty: 1, singleSidePrice: 12, doubleSidePrice: 18 }],
  },
  {
    name: 'Synthetic Board',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 32,
    pricingType: 'PER_PIECE',
    shortDescription: '125/200/350 Microns tear-resistant waterproof synthetic plastic board.',
    slabs: [{ minQty: 1, singleSidePrice: 32, doubleSidePrice: 48 }],
  },
  {
    name: 'Metallic Sticker',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 60,
    pricingType: 'PER_PIECE',
    shortDescription: 'Mirror gold and brushed silver adhesive foil sticker sheets.',
    slabs: [{ minQty: 1, singleSidePrice: 60, doubleSidePrice: 60 }],
  },
  {
    name: 'Transparent Sticker',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 40,
    pricingType: 'PER_PIECE',
    shortDescription: 'Ultra-clear transparent film waterproof stickers with white underbase print.',
    slabs: [{ minQty: 1, singleSidePrice: 40, doubleSidePrice: 40 }],
  },
  {
    name: 'PVC Sticker',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 40,
    pricingType: 'PER_PIECE',
    shortDescription: 'Durable non-tearable white vinyl PVC outdoor sticker sheet.',
    slabs: [{ minQty: 1, singleSidePrice: 40, doubleSidePrice: 40 }],
  },
  {
    name: 'Art Board',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 15,
    pricingType: 'PER_PIECE',
    shortDescription: '250/300/350/400 GSM high-bulk coated art board printing.',
    slabs: [{ minQty: 1, singleSidePrice: 15, doubleSidePrice: 22 }],
  },

  // MARKETING ITEMS
  {
    name: 'Wiro Menu Book',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 180,
    pricingType: 'PER_PIECE',
    shortDescription: 'Twin-loop metallic wiro bound restaurant food menu book with hard lamination.',
    slabs: [
      { minQty: 1, singleSidePrice: 180, doubleSidePrice: 180 },
      { minQty: 10, singleSidePrice: 1600, doubleSidePrice: 1600 },
    ],
  },
  {
    name: 'Menu Card',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 100,
    pricingType: 'PER_PIECE',
    shortDescription: 'Laminated table menu cards for cafes, restaurants and hotel dining.',
    slabs: [
      { minQty: 1, singleSidePrice: 100, doubleSidePrice: 100 },
      { minQty: 25, singleSidePrice: 2000, doubleSidePrice: 2000 },
    ],
  },
  {
    name: 'Garments Tag Glossy',
    category: 'Marketing and Promotionals Items',
    quantity: 2000,
    quantityUnit: 'Pieces',
    basePrice: 1000,
    pricingType: 'TIERED',
    shortDescription: '350 GSM apparel hang tags with high-gloss UV coating and punch hole.',
    slabs: [
      { minQty: 2000, singleSidePrice: 1000, doubleSidePrice: 1300 },
      { minQty: 5000, singleSidePrice: 2200, doubleSidePrice: 2800 },
    ],
  },
  {
    name: 'Bulk Brochures',
    category: 'Marketing and Promotionals Items',
    quantity: 1000,
    quantityUnit: 'Pieces',
    basePrice: 3540,
    pricingType: 'TIERED',
    shortDescription: '170 GSM gloss art paper corporate brochures in bi-fold or tri-fold format.',
    slabs: [
      { minQty: 1000, singleSidePrice: 3540, doubleSidePrice: 4240 },
      { minQty: 2500, singleSidePrice: 7500, doubleSidePrice: 8900 },
    ],
  },
  {
    name: 'Membership Card',
    category: 'Marketing and Promotionals Items',
    quantity: 100,
    quantityUnit: 'Cards',
    basePrice: 4000,
    pricingType: 'TIERED',
    shortDescription: '0.76mm CR80 PVC plastic membership & privilege cards with barcode/QR.',
    slabs: [
      { minQty: 100, singleSidePrice: 4000, doubleSidePrice: 4500 },
      { minQty: 500, singleSidePrice: 15000, doubleSidePrice: 17000 },
    ],
  },
  {
    name: 'Tent Card',
    category: 'Marketing and Promotionals Items',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 300,
    pricingType: 'TIERED',
    shortDescription: 'Free-standing table tent cards for restaurant promotions and counter display.',
    slabs: [
      { minQty: 10, singleSidePrice: 300, doubleSidePrice: 300 },
      { minQty: 50, singleSidePrice: 1200, doubleSidePrice: 1200 },
    ],
  },
  {
    name: 'Personalised Event Kit',
    category: 'Marketing and Promotionals Items',
    quantity: 50,
    quantityUnit: 'Pieces',
    basePrice: 3250,
    pricingType: 'TIERED',
    shortDescription: 'Complete delegate conference kit with lanyard, badge, notepad and pen.',
    slabs: [
      { minQty: 50, singleSidePrice: 3250, doubleSidePrice: 3250 },
      { minQty: 100, singleSidePrice: 5900, doubleSidePrice: 5900 },
    ],
  },
  {
    name: 'Synthetic Menu Book',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 100,
    pricingType: 'PER_PIECE',
    shortDescription: 'Washable and grease-proof synthetic sheet food menu folder.',
    slabs: [{ minQty: 1, singleSidePrice: 100, doubleSidePrice: 100 }],
  },
  {
    name: 'Garments Tag Matt',
    category: 'Marketing and Promotionals Items',
    quantity: 2000,
    quantityUnit: 'Pieces',
    basePrice: 1500,
    pricingType: 'TIERED',
    shortDescription: 'Elegant matte finish clothing price & brand label tags with hole drilling.',
    slabs: [
      { minQty: 2000, singleSidePrice: 1500, doubleSidePrice: 1900 },
      { minQty: 5000, singleSidePrice: 3200, doubleSidePrice: 4000 },
    ],
  },

  // STICKERS & LABELS
  {
    name: 'Square Stickers',
    category: 'Stickers & Labels',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 120,
    pricingType: 'TIERED',
    shortDescription: 'Square cut product branding & packaging stickers with gloss laminate.',
    slabs: [
      { minQty: 100, singleSidePrice: 120, doubleSidePrice: 120 },
      { minQty: 500, singleSidePrice: 450, doubleSidePrice: 450 },
      { minQty: 1000, singleSidePrice: 750, doubleSidePrice: 750 },
    ],
  },
  {
    name: 'Price Label',
    category: 'Stickers & Labels',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 120,
    pricingType: 'TIERED',
    shortDescription: 'High-tack adhesive price tags and barcode retail stickers.',
    slabs: [
      { minQty: 100, singleSidePrice: 120, doubleSidePrice: 120 },
      { minQty: 500, singleSidePrice: 450, doubleSidePrice: 450 },
    ],
  },
  {
    name: 'Craft Stickers',
    category: 'Stickers & Labels',
    quantity: 1,
    quantityUnit: 'Sheets',
    basePrice: 90,
    pricingType: 'PER_PIECE',
    shortDescription: 'Vintage textured brown kraft paper sticker sheets.',
    slabs: [{ minQty: 1, singleSidePrice: 90, doubleSidePrice: 90 }],
  },
  {
    name: 'Custom Shape Stickers',
    category: 'Stickers & Labels',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 120,
    pricingType: 'TIERED',
    shortDescription: 'Digital kiss-cut stickers cut exactly along your logo outline contour.',
    slabs: [
      { minQty: 100, singleSidePrice: 120, doubleSidePrice: 120 },
      { minQty: 500, singleSidePrice: 480, doubleSidePrice: 480 },
    ],
  },
  {
    name: 'Bottle and Jar Label',
    category: 'Stickers & Labels',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 120,
    pricingType: 'TIERED',
    shortDescription: 'Waterproof and condensation-resistant vinyl labels for jars & bottles.',
    slabs: [
      { minQty: 100, singleSidePrice: 120, doubleSidePrice: 120 },
      { minQty: 500, singleSidePrice: 480, doubleSidePrice: 480 },
    ],
  },
  {
    name: 'Pouch Labels',
    category: 'Stickers & Labels',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 120,
    pricingType: 'TIERED',
    shortDescription: 'Front and back self-adhesive labels for food & dry fruits stand-up pouches.',
    slabs: [
      { minQty: 100, singleSidePrice: 120, doubleSidePrice: 120 },
      { minQty: 500, singleSidePrice: 480, doubleSidePrice: 480 },
    ],
  },
  {
    name: 'Large Format Stickers',
    category: 'Stickers & Labels',
    quantity: 1,
    quantityUnit: 'Sq.ft',
    basePrice: 12,
    pricingType: 'PER_SQFT',
    shortDescription: 'Large format outdoor solvent vinyl branding print measured per square foot.',
    slabs: [{ minQty: 1, singleSidePrice: 12, doubleSidePrice: 12 }],
  },
  {
    name: 'Envelope Label',
    category: 'Stickers & Labels',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 120,
    pricingType: 'TIERED',
    shortDescription: 'Return address and branding address mailing labels for courier packets.',
    slabs: [
      { minQty: 100, singleSidePrice: 120, doubleSidePrice: 120 },
      { minQty: 500, singleSidePrice: 480, doubleSidePrice: 480 },
    ],
  },

  // BUSINESS ESSENTIALS
  {
    name: 'Booklets',
    category: 'Business Essentials',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 650,
    pricingType: 'TIERED',
    shortDescription: 'Center saddle-stitched multi-page company profiles and catalogs.',
    slabs: [
      { minQty: 10, singleSidePrice: 650, doubleSidePrice: 650 },
      { minQty: 50, singleSidePrice: 2800, doubleSidePrice: 2800 },
      { minQty: 100, singleSidePrice: 4900, doubleSidePrice: 4900 },
    ],
  },
  {
    name: 'Spot UV Envelope Covers',
    category: 'Business Essentials',
    quantity: 1000,
    quantityUnit: 'Pieces',
    basePrice: 5500,
    pricingType: 'TIERED',
    shortDescription: 'Premium executive envelopes with glossy Spot UV company logo highlight.',
    slabs: [{ minQty: 1000, singleSidePrice: 5500, doubleSidePrice: 5500 }],
  },
  {
    name: 'Multi Color Envelope Covers',
    category: 'Business Essentials',
    quantity: 100,
    quantityUnit: 'Pieces',
    basePrice: 1000,
    pricingType: 'TIERED',
    shortDescription: '100 GSM Bond paper multi-color printed envelopes with Peel & Seal tape.',
    slabs: [
      { minQty: 100, singleSidePrice: 1000, doubleSidePrice: 1000 },
      { minQty: 500, singleSidePrice: 3200, doubleSidePrice: 3200 },
      { minQty: 1000, singleSidePrice: 4900, doubleSidePrice: 4900 },
    ],
  },
  {
    name: 'Bill Book',
    category: 'Business Essentials',
    quantity: 2,
    quantityUnit: 'Pieces',
    basePrice: 650,
    pricingType: 'FIXED_QTY',
    shortDescription: 'Carbonless NCR 1+1 duplicate invoice bill books with numbering & perforation.',
    slabs: [
      { minQty: 2, singleSidePrice: 650, doubleSidePrice: 650 },
      { minQty: 5, singleSidePrice: 1400, doubleSidePrice: 1400 },
    ],
  },
  {
    name: 'Standard Certificates',
    category: 'Business Essentials',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 180,
    pricingType: 'TIERED',
    shortDescription: '300 GSM Art Card appreciation & achievement award certificates.',
    slabs: [
      { minQty: 10, singleSidePrice: 180, doubleSidePrice: 180 },
      { minQty: 50, singleSidePrice: 750, doubleSidePrice: 750 },
      { minQty: 100, singleSidePrice: 1300, doubleSidePrice: 1300 },
    ],
  },
  {
    name: 'Spot UV Letter Head',
    category: 'Business Essentials',
    quantity: 1000,
    quantityUnit: 'Pieces',
    basePrice: 4300,
    pricingType: 'TIERED',
    shortDescription: '100 GSM executive bond letterheads with raised spot UV logo emboss.',
    slabs: [{ minQty: 1000, singleSidePrice: 4300, doubleSidePrice: 4300 }],
  },
  {
    name: 'Bulk Bill Book',
    category: 'Business Essentials',
    quantity: 10,
    quantityUnit: 'Pieces',
    basePrice: 4000,
    pricingType: 'TIERED',
    shortDescription: 'Volume package of 10 NCR carbonless duplicate receipt books.',
    slabs: [{ minQty: 10, singleSidePrice: 4000, doubleSidePrice: 4000 }],
  },
  {
    name: 'Premium Certificates',
    category: 'Business Essentials',
    quantity: 24,
    quantityUnit: 'Pieces',
    basePrice: 1300,
    pricingType: 'TIERED',
    shortDescription: '350 GSM metallic textured gold foil stamped honorary certificates.',
    slabs: [{ minQty: 24, singleSidePrice: 1300, doubleSidePrice: 1300 }],
  },

  // NEW ARRIVALS
  {
    name: 'LED Menu Stand',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 2000,
    pricingType: 'PER_PIECE',
    isNewArrival: true,
    shortDescription: 'Backlit edge-lit acrylic LED illuminated tabletop restaurant menu display.',
    slabs: [{ minQty: 1, singleSidePrice: 2000, doubleSidePrice: 2000 }],
  },
  {
    name: 'Table Top Calendar',
    category: 'Marketing and Promotionals Items',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 150,
    pricingType: 'PER_PIECE',
    isNewArrival: true,
    shortDescription: '12-month personalized spiral wire-o desktop calendar with hard stand.',
    slabs: [
      { minQty: 1, singleSidePrice: 150, doubleSidePrice: 150 },
      { minQty: 25, singleSidePrice: 3000, doubleSidePrice: 3000 },
      { minQty: 100, singleSidePrice: 9500, doubleSidePrice: 9500 },
    ],
  },
  {
    name: 'Rotating Lollipop LED Signage',
    category: 'Signages',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 2700,
    pricingType: 'PER_PIECE',
    isNewArrival: true,
    shortDescription: 'Double-sided 360-degree motor-driven illuminated outdoor lollipop store sign.',
    slabs: [{ minQty: 1, singleSidePrice: 2700, doubleSidePrice: 2700 }],
  },
  {
    name: 'Acrylic Business Card Holder',
    category: 'Business Cards',
    quantity: 1,
    quantityUnit: 'Pieces',
    basePrice: 200,
    pricingType: 'PER_PIECE',
    isNewArrival: true,
    shortDescription: 'Crystal-clear molded acrylic tabletop card dispenser stand.',
    slabs: [{ minQty: 1, singleSidePrice: 200, doubleSidePrice: 200 }],
  },
];

export async function seedLivePriceMaster() {
  console.log('--- SEEDING LIVE PRINT BAZZAR PRODUCT PRICE DATABASE ---');

  const categories = await prisma.category.findMany();
  const categoryMap = new Map();
  categories.forEach((c) => categoryMap.set(c.name.toLowerCase().trim(), c.id));

  let importedCount = 0;

  for (let i = 0; i < LIVE_PRICE_DATA.length; i++) {
    const item = LIVE_PRICE_DATA[i];
    const catName = item.category.toLowerCase().trim();
    let categoryId = categoryMap.get(catName);

    if (!categoryId) {
      // Find closest or default to first category
      const fallback = categories.find((c) => c.name.toLowerCase().includes(catName.split(' ')[0])) || categories[0];
      categoryId = fallback?.id;
    }

    const slug = cleanSlug(item.name);
    const sku = `PB-LIVE-${String(i + 1).padStart(4, '0')}`;

    // Upsert product by slug or name
    let product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { name: item.name }] },
    });

    const productPayload = {
      name: item.name,
      slug,
      categoryId,
      startingPrice: item.basePrice,
      minQuantity: item.quantity,
      quantityUnit: item.quantityUnit,
      pricingType: item.pricingType,
      pricingSource: 'CURRENT_PRINTBAZZAR_WEBSITE',
      sourceStatus: 'LIVE_CONFIRMED',
      gstPercentage: 18.0,
      productionDays: 1,
      shortDescription: item.shortDescription,
      isNewArrival: !!item.isNewArrival,
      status: 'ACTIVE',
    };

    if (product) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: productPayload,
      });
    } else {
      product = await prisma.product.create({
        data: {
          ...productPayload,
          sku,
          thumbnailUrl: '/assets/images/business_cards.png',
        },
      });
    }

    // Set Price Slabs exactly as defined
    if (item.slabs && item.slabs.length > 0) {
      await prisma.productPriceSlab.deleteMany({ where: { productId: product.id } });
      await prisma.productPriceSlab.createMany({
        data: item.slabs.map((s) => ({
          productId: product.id,
          minQty: s.minQty,
          unitPrice: s.singleSidePrice / s.minQty,
          singleSidePrice: s.singleSidePrice,
          doubleSidePrice: s.doubleSidePrice,
          unitName: item.quantityUnit,
          pricingType: item.pricingType,
          source: 'CURRENT_PRINTBAZZAR_WEBSITE',
        })),
      });
    }

    importedCount++;
    console.log(`✔ [${importedCount}/${LIVE_PRICE_DATA.length}] ${item.name} ➔ ${item.quantity} ${item.quantityUnit} = ₹${item.basePrice} (${item.pricingType})`);
  }

  console.log(`\n🎉 Successfully imported and confirmed all ${importedCount} live products into the centralized pricing database!`);
}

if (process.argv[1]?.endsWith('seedLivePriceMaster.js')) {
  seedLivePriceMaster()
    .catch((err) => {
      console.error('Error seeding live price master:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

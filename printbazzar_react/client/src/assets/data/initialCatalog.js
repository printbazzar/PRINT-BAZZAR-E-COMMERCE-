import businessCardsImg from '../images/category/business_cards.png';
import stickersImg from '../images/category/stcikers.jpg';
import marketingImg from '../images/category/marketing.jpg';
import invitationsImg from '../images/category/invitation.jpg';
import businessEssenImg from '../images/category/business_essentials.jpg';

/**
 * Pre-bundled Top Products Snapshot
 * Enables 0ms First Contentful Paint & Largest Contentful Paint for visitors landing from Google Search.
 * Silently revalidated and augmented via SWR live API calls.
 */
export const INITIAL_PRODUCTS_BY_CATEGORY = {
  'business-cards': [
    {
      id: 'init-bc-1',
      name: 'Standard Visiting Cards',
      slug: 'standard-card',
      startingPrice: 350,
      thumbnailUrl: businessCardsImg,
      shortDescription: '350 GSM Art Card with crisp offset printing',
      isBestSeller: true,
    },
    {
      id: 'init-bc-2',
      name: 'Laminated Business Cards',
      slug: 'laminated-card',
      startingPrice: 450,
      thumbnailUrl: businessCardsImg,
      shortDescription: 'Matte & Gloss thermal lamination finish',
      isBestSeller: false,
    },
    {
      id: 'init-bc-3',
      name: 'Economical Business Cards',
      slug: 'economical-card',
      startingPrice: 280,
      thumbnailUrl: businessCardsImg,
      shortDescription: 'Cost-effective bulk commercial cards',
      isBestSeller: true,
    },
    {
      id: 'init-bc-4',
      name: 'Premium Spot UV Cards',
      slug: 'spot-uv-card',
      startingPrice: 850,
      thumbnailUrl: businessCardsImg,
      shortDescription: 'Raised gloss texture highlights on velvet matte',
      isBestSeller: false,
    },
  ],
  'stickers-and-labels': [
    {
      id: 'init-st-1',
      name: 'Custom Circle Stickers',
      slug: 'circle-stickers',
      startingPrice: 199,
      thumbnailUrl: stickersImg,
      shortDescription: 'Precision die-cut adhesive vinyl & paper labels',
      isBestSeller: true,
    },
    {
      id: 'init-st-2',
      name: 'Custom Shape Stickers',
      slug: 'custom-shape-stickers',
      startingPrice: 249,
      thumbnailUrl: stickersImg,
      shortDescription: 'Contour-cut waterproof packaging labels',
      isBestSeller: true,
    },
    {
      id: 'init-st-3',
      name: 'Product Packaging Labels',
      slug: 'product-labels',
      startingPrice: 299,
      thumbnailUrl: stickersImg,
      shortDescription: 'Roll & sheet labels for jars, boxes & bottles',
      isBestSeller: false,
    },
    {
      id: 'init-st-4',
      name: 'Transparent Vinyl Stickers',
      slug: 'transparent-stickers',
      startingPrice: 349,
      thumbnailUrl: stickersImg,
      shortDescription: 'Ultra-clear waterproof adhesive branding stickers',
      isBestSeller: false,
    },
  ],
  'marketing-and-promotionals-items': [
    {
      id: 'init-mkt-1',
      name: 'A4 Multi-Color Flyers',
      slug: 'a4-multi-color-flyers',
      startingPrice: 499,
      thumbnailUrl: marketingImg,
      shortDescription: '130/170 GSM high-speed multi-color promotional flyers',
      isBestSeller: true,
    },
    {
      id: 'init-mkt-2',
      name: 'Tri-Fold & Bi-Fold Brochures',
      slug: 'brochures',
      startingPrice: 650,
      thumbnailUrl: marketingImg,
      shortDescription: 'Corporate profile brochures with precision creasing',
      isBestSeller: false,
    },
    {
      id: 'init-mkt-3',
      name: 'Rollup Standee Banners',
      slug: 'rollup-standee',
      startingPrice: 1250,
      thumbnailUrl: marketingImg,
      shortDescription: 'Heavy base aluminum retractable exhibition standee',
      isBestSeller: true,
    },
    {
      id: 'init-mkt-4',
      name: 'Promotional Posters',
      slug: 'promotional-posters',
      startingPrice: 250,
      thumbnailUrl: marketingImg,
      shortDescription: 'Vibrant large-format marketing posters',
      isBestSeller: false,
    },
  ],
  'invitations': [
    {
      id: 'init-inv-1',
      name: 'Custom Wedding Invitations',
      slug: 'wedding-invitation',
      startingPrice: 750,
      thumbnailUrl: invitationsImg,
      shortDescription: 'Gold foil & textured traditional wedding cards',
      isBestSeller: true,
    },
    {
      id: 'init-inv-2',
      name: 'Birthday & Event Invites',
      slug: 'birthday-invitation',
      startingPrice: 450,
      thumbnailUrl: invitationsImg,
      shortDescription: 'Custom party cards with matched designer envelopes',
      isBestSeller: false,
    },
    {
      id: 'init-inv-3',
      name: 'Corporate Event Invitations',
      slug: 'business-invitation',
      startingPrice: 550,
      thumbnailUrl: invitationsImg,
      shortDescription: 'Formal opening & anniversary invitations',
      isBestSeller: false,
    },
  ],
  'business-essentials': [
    {
      id: 'init-be-1',
      name: 'Corporate Letterheads',
      slug: 'letter-head',
      startingPrice: 390,
      thumbnailUrl: businessEssenImg,
      shortDescription: '100 GSM premium executive letterhead stationery',
      isBestSeller: true,
    },
    {
      id: 'init-be-2',
      name: 'Carbonless Bill Books & Invoices',
      slug: 'bill-book',
      startingPrice: 420,
      thumbnailUrl: businessEssenImg,
      shortDescription: '1+1 & 1+2 NCR carbonless duplicate receipt books',
      isBestSeller: true,
    },
    {
      id: 'init-be-3',
      name: 'Employee ID Cards & Lanyards',
      slug: 'id-card',
      startingPrice: 99,
      thumbnailUrl: businessEssenImg,
      shortDescription: 'HD thermal PVC identity cards with satin lanyards',
      isBestSeller: true,
    },
    {
      id: 'init-be-4',
      name: 'Custom Rubber Stamps',
      slug: 'rubber-stamps',
      startingPrice: 220,
      thumbnailUrl: businessEssenImg,
      shortDescription: 'Self-inking pre-inked official business stamps',
      isBestSeller: false,
    },
  ],
};

export function getInitialProducts(categorySlug) {
  if (!categorySlug) return [];
  const clean = categorySlug.toLowerCase().trim();
  return INITIAL_PRODUCTS_BY_CATEGORY[clean] || [];
}

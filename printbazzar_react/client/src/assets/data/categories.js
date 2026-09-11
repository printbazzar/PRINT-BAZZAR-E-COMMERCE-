import {
  HiOutlineCreditCard,
  HiOutlineTag,
  HiOutlineSpeakerphone,
  HiOutlineMail,
  HiOutlineGift,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineBadgeCheck,
} from 'react-icons/hi';

import businessCards from '../images/category/business_cards.png'
import businessEssen from '../images/category/business_essentials.jpg'
import Marketing from '../images/category/marketing.jpg'
import Stickers from '../images/category/stcikers.jpg'
import Invitations from '../images/category/invitation.jpg'
import Apparels from '../images/category/apparels.jpg'
import Packages from '../images/category/packages.jpg'
import Gifts from '../images/category/gifts.jpg'
import Certificates from '../images/business_essen/certificate.jpg'

/**
 * SINGLE SOURCE OF TRUTH — hardcoded/fallback category shortcuts.
 *
 * (Phase 2A — Category Source Consolidation)
 *
 * This is now the only hardcoded category list in the customer frontend.
 * It is consumed as the initial/fallback state by:
 *   - Components/CategoryNavBar.jsx  (desktop quick-nav bar)
 *   - Components/CategoryBubbleRow.jsx (homepage "Categories" section)
 *   - Pages/Shop.jsx and Pages/Category.jsx (sidebar category filter fallback)
 *   - Components/PopularCategories.jsx (currently unused/orphaned in the app)
 * whenever the live `api.getCategories()` call has not yet resolved or fails.
 * The live API result always takes priority in every one of those components;
 * this array is only ever shown during the brief initial load or on a
 * network failure.
 *
 * Slugs match the slugs already live in CategoryNavBar's production
 * navigation. Do NOT change a `slug` value here without confirming it
 * against the live `/categories` API response — FooterComp's footer
 * category links and every page above depend on these staying correct.
 *
 * NOTE: This intentionally covers the 9 primary departments that were
 * already hardcoded and live in CategoryNavBar. A few secondary catalog
 * categories (e.g. Signages, ID Cards, Certificates, Badges, Awards) are
 * NOT included here because their exact current slugs could not be
 * verified against the live category API in this pass (an old data-seed
 * script uses different slug spellings than the ones already live in this
 * app's nav, e.g. "packagings" vs. the live "packaging-items" used here —
 * a pre-existing inconsistency, left untouched). Add them here with
 * confirmed slugs if the fallback should cover the full catalog.
 */
export const categories = [
  { id: 1, name: 'Visiting Cards', slug: 'business-cards', image: businessCards, icon: HiOutlineCreditCard, isHot: true },
  { id: 2, name: 'Stickers & Labels', slug: 'stickers-and-labels', image: Stickers, icon: HiOutlineTag, isHot: true },
  { id: 3, name: 'Flyers & Marketing', slug: 'marketing-and-promotionals-items', image: Marketing, icon: HiOutlineSpeakerphone },
  { id: 4, name: 'Business Stationery', slug: 'business-essentials', image: businessEssen, icon: HiOutlineDocumentText },
  { id: 5, name: 'Invitations', slug: 'invitations', image: Invitations, icon: HiOutlineMail },
  { id: 6, name: 'Apparels & Caps', slug: 'apparels', image: Apparels, icon: HiOutlineCube },
  { id: 7, name: 'Packaging & Bags', slug: 'packaging-items', image: Packages, icon: HiOutlineCube },
  { id: 8, name: 'Corporate Gifts', slug: 'gifts', image: Gifts, icon: HiOutlineGift },
  { id: 9, name: 'Certificates & Awards', slug: 'certificates-and-awards', image: Certificates, icon: HiOutlineBadgeCheck },
];

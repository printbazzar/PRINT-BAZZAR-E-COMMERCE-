import {
  HiOutlineCreditCard,
  HiOutlineTag,
  HiOutlineSpeakerphone,
  HiOutlineMail,
  HiOutlineCube,
  HiOutlineDocumentText,
} from 'react-icons/hi';

import businessCards from '../images/category/business_cards.png'
import businessEssen from '../images/category/business_essentials.jpg'
import Marketing from '../images/category/marketing.jpg'
import Stickers from '../images/category/stcikers.jpg'
import Invitations from '../images/category/invitation.jpg'
import Apparels from '../images/category/apparels.jpg'
import Packages from '../images/category/packages.jpg'

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
 * NOTE: Two entries that used to live here were removed rather than
 * "fixed", because there was no single unambiguous live category to point
 * them at:
 *   - "Corporate Gifts" (slug 'gifts') — the live catalog now has three
 *     separate gift categories (corporate-gifts, personalised-gifts,
 *     return-gifts); guessing one would have silently sent customers to
 *     the wrong one.
 *   - "Certificates & Awards" (slug 'certificates-and-awards') — the live
 *     catalog has separate 'certificates' and 'awards' categories, no
 *     combined slug.
 * This fallback array is only ever shown for the brief moment before the
 * live `/categories` API resolves (or on a network failure), so removing
 * an ambiguous entry is safe — it simply won't appear until the real API
 * data (which always takes priority) loads. Add either back here only
 * with a confirmed, unambiguous live slug.
 */
export const categories = [
  { id: 1, name: 'Visiting Cards', slug: 'business-cards', image: businessCards, icon: HiOutlineCreditCard, isHot: true },
  { id: 2, name: 'Stickers & Labels', slug: 'stickers-and-labels', image: Stickers, icon: HiOutlineTag, isHot: true },
  { id: 3, name: 'Flyers & Marketing', slug: 'marketing-and-promotionals-items', image: Marketing, icon: HiOutlineSpeakerphone },
  { id: 4, name: 'Business Stationery', slug: 'business-essentials', image: businessEssen, icon: HiOutlineDocumentText },
  { id: 5, name: 'Invitations', slug: 'invitations', image: Invitations, icon: HiOutlineMail },
  { id: 6, name: 'Apparels & Caps', slug: 'apparels', image: Apparels, icon: HiOutlineCube },
  { id: 7, name: 'Packaging & Bags', slug: 'packagings', image: Packages, icon: HiOutlineCube },
];

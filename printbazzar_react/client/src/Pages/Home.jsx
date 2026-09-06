import React from 'react';
import { Slider } from '../Components/Slider';
import CategoryBubbleRow from '../Components/CategoryBubbleRow';
import PromoBannerBlocks from '../Components/PromoBannerBlocks';
import FeaturedProductsGrid from '../Components/FeaturedProductsGrid';
import { HomeCategorySection } from '../Components/HomeCategorySection';
import HowItWorks from '../Components/HowItWorks';
import TrustHighlights from '../Components/TrustHighlights';
import Testimonial from '../Components/Testimonial';
import Feedback from '../Components/Feedback';

export default function Home() {
  return (
    <div className="space-y-4">
      {/* 1. Hero Swiper Slider */}
      <Slider />

      {/* 2. Prominent Category Bubble Row */}
      <CategoryBubbleRow />

      {/* 3. Promotional Highlight Banner Blocks */}
      <PromoBannerBlocks />

      {/* 4. Featured Products Grid */}
      <FeaturedProductsGrid />

      {/* 5. Trust & Quality Highlights */}
      <TrustHighlights />

      {/* 6. Popular Category Grids */}
      <HomeCategorySection categorySlug="business-cards" title="Visiting & Business Cards" />
      <HomeCategorySection categorySlug="stickers-and-labels" title="Custom Stickers & Packaging Labels" />

      {/* 7. How It Works Step-by-Step */}
      <HowItWorks />

      <HomeCategorySection categorySlug="marketing-and-promotionals-items" title="Marketing Collaterals & Flyers" />
      <HomeCategorySection categorySlug="business-essentials" title="Business Stationery & Office Essentials" />

      {/* 8. Social Proof & Customer Feedback */}
      <Testimonial />
      <Feedback />
    </div>
  );
}

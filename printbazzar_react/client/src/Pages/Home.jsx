import React from 'react';
import { Slider } from '../Components/Slider';
import CategoryBubbleRow from '../Components/CategoryBubbleRow';
import FeaturedProductsGrid from '../Components/FeaturedProductsGrid';
import TrustHighlights from '../Components/TrustHighlights';
import Testimonial from '../Components/Testimonial';

// Phase 2A cleanup (Rework Customer Frontend UX):
// Homepage consolidated to a lean structure:
//   1. Hero  2. Categories  3. Featured Products  4. Trust/Support  5. Footer
// Footer is rendered globally in App.jsx's layout, not here.
//
// Removed from this page (components are NOT deleted from the project,
// only unwired from Home — see Phase 2A report):
//   - PromoBannerBlocks   (duplicated the category-promotion job CategoryBubbleRow already does)
//   - HomeCategorySection x4 (repeated category product rails; redundant with Featured Products + saves 4 API calls)
//   - HowItWorks          (unnecessary vertical length; file kept for reuse elsewhere)
//   - Feedback            (already rendered on Shop/Cart/ProductDetail/AboutUs/TrackOrder — redundant on Home)
//
// Phase 2B visual polish: removed the flat `space-y-4` gap that stacked on
// top of every section's own top/bottom padding, causing excess dead space
// between Categories and Featured Products. Each section now controls its
// own vertical rhythm via its own (tightened) padding — see CategoryBubbleRow,
// FeaturedProductsGrid and TrustHighlights.
//
// Task #30: re-added Customer Reviews as its own section. The brief's mandated
// homepage hierarchy (Header / Hero / Categories / Popular-Featured / Why Print
// Bazzar / Customer Reviews / Suggestions / Footer) explicitly requires a
// reviews section, which Home had none of after Phase 2A. Testimonial itself is
// unmodified — it already prioritizes real api.getReviews() data and only falls
// back to a fixed set of pre-existing (non-AI-generated) reviews on failure, so
// nothing here fabricates review content; this only re-wires an existing,
// already-compliant component back into the homepage.
export default function Home() {
  return (
    <div>
      {/* 1. Hero Swiper Slider */}
      <Slider />

      {/* 2. Categories - Shop by Category */}
      <CategoryBubbleRow />

      {/* 3. Featured Products */}
      <FeaturedProductsGrid />

      {/* 4. Trust / Support Highlights ("Why Print Bazzar") */}
      <TrustHighlights />

      {/* 5. Customer Reviews */}
      <Testimonial />

      {/* 6. Footer is rendered globally by App.jsx's layout */}
    </div>
  );
}

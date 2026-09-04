import React from 'react';
import { Slider } from '../Components/Slider';
import TrustHighlights from '../Components/TrustHighlights';
import HowItWorks from '../Components/HowItWorks';
import { PopularCategories } from '../Components/PopularCategories';
import { HomeCategorySection } from '../Components/HomeCategorySection';
import Testimonial from '../Components/Testimonial';
import Feedback from '../Components/Feedback';

export default function Home() {
  return (
    <div>
      <Slider />
      <TrustHighlights />
      <PopularCategories />
      <HomeCategorySection categorySlug="business-cards" title="Business & Visiting Cards" />
      <HomeCategorySection categorySlug="stickers-and-labels" title="Custom Stickers & Product Labels" />
      <HowItWorks />
      <HomeCategorySection categorySlug="marketing-and-promotionals-items" title="Marketing Collateral & Brochures" />
      <HomeCategorySection categorySlug="invitations" title="Custom Invitations & Greeting Cards" />
      <HomeCategorySection categorySlug="business-essentials" title="Business Stationery & Essentials" />
      <Testimonial />
      <Feedback />
    </div>
  );
}

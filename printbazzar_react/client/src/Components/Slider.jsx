import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { Link } from "react-router-dom";
import { api } from "../services/api";

// Fallbacks
import homeBanner2 from "../assets/images/home_banner.png";
import homeBanner1 from "../assets/images/home_banner2.png";
import homeBanner4 from "../assets/images/home_banner4.png";
import homeBanner3 from "../assets/images/home_banner5.png";
import homeBannerM1 from "../assets/images/home_banner3_mobile.png";
import homeBannerM2 from "../assets/images/home_banner5_mobile.png";
import homeBannerM3 from "../assets/images/home_banner2_mobile.png";
import homeBannerM4 from "../assets/images/home_banner4_mobile.png";

export function Slider() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    api
      .getBanners()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setBanners(res.data);
        }
      })
      .catch(console.error);
  }, []);

  const defaultBanners = [
    { id: 1, desktopImageUrl: homeBanner1, mobileImageUrl: homeBannerM1, buttonUrl: "/category/business-cards" },
    { id: 2, desktopImageUrl: homeBanner2, mobileImageUrl: homeBannerM2, buttonUrl: "/shop" },
    { id: 3, desktopImageUrl: homeBanner3, mobileImageUrl: homeBannerM3, buttonUrl: "/category/stickers-and-labels" },
    { id: 4, desktopImageUrl: homeBanner4, mobileImageUrl: homeBannerM4, buttonUrl: "/category/marketing-and-promotionals-items" },
  ];

  const displayBanners = banners.length > 0 ? banners : defaultBanners;

  return (
    <div className="w-full bg-[#f8f9fa] py-3 sm:py-5 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop Dual Slider (2 Banners in View) */}
        <div className="w-full hidden md:block">
          <Swiper
            modules={[Navigation, Autoplay]}
            navigation={true}
            autoplay={{ delay: 5000, pauseOnMouseEnter: true, disableOnInteraction: false }}
            loop={displayBanners.length >= 4}
            slidesPerView={2}
            spaceBetween={16}
            className="w-full py-1"
          >
            {displayBanners.map((banner, index) => (
              <SwiperSlide key={banner.id || index}>
                <Link
                  to={banner.buttonUrl || "/shop"}
                  className="block cursor-pointer overflow-hidden rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 border border-gray-200/80 group bg-white"
                >
                  <img
                    src={banner.desktopImageUrl}
                    className="h-auto w-full object-cover group-hover:scale-[1.015] transition-transform duration-300 rounded-2xl"
                    alt={banner.title || `Banner ${index + 1}`}
                  />
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Mobile Single Slider */}
        <div className="w-full block md:hidden">
          <Swiper
            modules={[Navigation, Autoplay]}
            navigation={true}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            loop={displayBanners.length >= 2}
            slidesPerView={1}
            spaceBetween={8}
            className="w-full"
          >
            {displayBanners.map((banner, index) => (
              <SwiperSlide key={banner.id || index}>
                <Link
                  to={banner.buttonUrl || "/shop"}
                  className="block cursor-pointer overflow-hidden rounded-xl shadow-xs border border-gray-200/80 bg-white"
                >
                  <img
                    src={banner.mobileImageUrl || banner.desktopImageUrl}
                    className="w-full h-44 sm:h-56 object-cover rounded-xl"
                    alt={banner.title || `Banner Mobile ${index + 1}`}
                  />
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}

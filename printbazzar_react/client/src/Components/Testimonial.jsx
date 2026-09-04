import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css/navigation";
import "swiper/css";
import { FaGoogle, FaStar } from "react-icons/fa";
import { api } from "../services/api";
import { reviews as fallbackReviews } from "../assets/data/reviews";

export default function Testimonial() {
  const [reviewsList, setReviewsList] = useState([]);

  useEffect(() => {
    api
      .getReviews()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setReviewsList(res.data);
        } else {
          setReviewsList(fallbackReviews);
        }
      })
      .catch(() => setReviewsList(fallbackReviews));
  }, []);

  return (
    <div className="my-10 max-w-7xl mx-auto px-4">
      <div className="my-4 pb-3 text-center no-select">
        <h2 className="text-2xl lg:text-4xl font-extrabold text-gray-900">
          What Our <span className="text-yellow-400 border-b-4 border-yellow-400">Clients Say</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">Verified 4.8+ Star Reviews on Google</p>
      </div>

      <Swiper
        modules={[Navigation, Autoplay]}
        navigation={true}
        autoplay={{ delay: 3500, pauseOnMouseEnter: true }}
        loop={true}
        breakpoints={{
          320: { slidesPerView: 1, spaceBetween: 15 },
          640: { slidesPerView: 2, spaceBetween: 15 },
          1024: { slidesPerView: 3, spaceBetween: 20 },
        }}
        className="pb-6"
      >
        {reviewsList.map((review, index) => (
          <SwiperSlide key={review.id || index}>
            <div className="flex flex-col bg-white border border-gray-100 p-6 rounded-2xl shadow-sm h-[220px] justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={review.customerAvatar || review.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                  className="w-12 h-12 object-cover rounded-full border border-yellow-400 flex-shrink-0"
                  alt={review.customerName || review.name}
                />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{review.customerName || review.name}</h4>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    Verified <FaGoogle className="text-blue-500 inline" /> Review
                  </p>
                  <div className="flex text-yellow-400 text-xs mt-0.5">
                    {[...Array(review.rating || 5)].map((_, i) => (
                      <FaStar key={i} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 line-clamp-4 mt-2 leading-relaxed">
                "{review.reviewText || review.review}"
              </p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

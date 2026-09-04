import { Breadcrumb } from "flowbite-react";
import React from "react";
import { Link } from "react-router-dom";
import bg1 from "../assets/images/feedbackbg.jpg";
import Feedback from "../Components/Feedback";
import { HiHome } from "react-icons/hi";
import { MdDeliveryDining } from "react-icons/md";
import { SiTrustpilot } from "react-icons/si";
import { VscWorkspaceTrusted } from "react-icons/vsc";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css/navigation"; // Import the navigation CSS
import "swiper/css";
import SwiperCore from "swiper";
import Harris from "../assets/images/About/Harrish.png";
import Rajak from "../assets/images/About/Rajak.png";
import Javith from "../assets/images/About/javith.png";
import Vicky from "../assets/images/About/vicky.png";
import { useBusinessInfo } from "../context/BusinessInfoContext";

export default function AboutUs() {
  SwiperCore.use([Navigation, Autoplay]);
  const { businessInfo } = useBusinessInfo();
  const brandName = businessInfo.brand?.brandName || 'Print Bazzar';
  const foundedYear = parseInt(businessInfo.brand?.foundedYear) || 2019;
  const yearsExp = Math.max(5, new Date().getFullYear() - foundedYear);

return (
<div className="bg-black">
    <div className="px-4 py-2 ">
    <Breadcrumb className="text-base lg:text-lg xl:text-xl 2xl:text-2xl">
        <Breadcrumb.Item>
        <Link to="/" className="hover:underline text-white">
            Home
        </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
        <Link className="hover:underline text-white">About Us</Link>
        </Breadcrumb.Item>
    </Breadcrumb>
    </div>

    <div className="my-2 md:my-2 text-center py-4 flex flex-col gap-3  p-4">
    <h1 className="text-2xl md:text-4xl text-white text-center">
        About Our{" "}
        <span className="text-yellow-300 border-b-4 border-yellow-300 ">
        Company
        </span>
    </h1>
    </div>
    <section className="bg-black py-1 lg:py-12 px-6 lg:px-24 flex flex-col lg:flex-row items-center justify-center mt-0 lg:mt-4">
    <div className="lg:w-1/2 mb-2 lg:mb-0 order-2 lg:order-1 mx-5 md:mx-16 lg:mx-3">
        <h1 className="text-2xl md:text-3xl 2xl:text-6xl font-semibold mb-6 text-white">
        Print <span className="text-yellow-300 ">Bazzar</span>
        </h1>
        <ul className="text-white space-y-4 text-sm lg:text-base 2xl:text-3xl">
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            High-quality custom printing services for business cards, flyers,
            brochures, and more.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Creative and innovative graphic designing for logos, banners,
            packaging, and branding.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Tailored solutions to meet your unique printing and design
            requirements.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Quick turnaround times with a commitment to exceptional quality
            and precision.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Over {yearsExp}+ years of expertise delivering outstanding results for
            businesses and individuals.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Customer-focused approach with reliable support and consultation.
        </li>
        </ul>
    </div>
    <div className="lg:w-1/2 lg:ml-12 order-1 lg:order-2 my-5">
        <img
        className="rounded-lg shadow-lg  md:w-[600px] md:h-[300px] xl:w-[2500px] xl:h-auto"
        src={bg1}
        alt={`${brandName} Industrial Offset Printing Facility`}
        />
    </div>
    </section>

    <section className="bg-black py-3 lg:py-12 px-6 lg:px-24 flex flex-col lg:flex-row items-center justify-center mt-4 ">
    <div className="lg:w-1/2 lg:mr-12 order-2 lg:order-1 my-5">
        <img
        className="rounded-lg shadow-lg  md:w-[600px] md:h-[300px] xl:w-[2500px] xl:h-auto"
        src={bg1}
        alt={`${brandName} Creative Graphic Design Studio`}
        />
    </div>
    <div className="lg:w-1/2 mb-2 lg:mb-0 order-2 lg:order-1 mx-5 md:mx-16 lg:mx-3">
        <h1 className="text-2xl md:text-3xl 2xl:text-6xl font-semibold mb-6 text-white">
        Creative <span className="text-yellow-300">Solutions</span>
        </h1>
        <p className="text-white mb-4 text-sm md:text-base"></p>
        <ul className="text-white space-y-4 text-sm lg:text-base 2xl:text-3xl">
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Expert team specializing in modern and visually appealing design
            concepts.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Wide range of services, from digital printing to large-format
            designs for events and promotions.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Use of cutting-edge technology and premium materials for superior
            results.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Customized solutions to help your brand stand out and leave a
            lasting impression.
        </li>
        <li className="flex items-start">
            <span className="text-blue-500 mr-2">✔</span>
            Trusted by clients across industries for delivering consistent
            quality and innovation.
        </li>
        </ul>
    </div>
    </section>

    <section className="bg-black flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-20 lg:mt-4">
    <div className="bg-black p-12 rounded-xl my-2 flex justify-center items-center gap-4">
        <div>
        <MdDeliveryDining className="w-[4rem] h-[4rem] text-yellow-300" />
        </div>
        <div className="">
        <p className="text-2xl font-medium text-white">Super Fast</p>
        <span className="text-xl text-white">
            Great Service with <br /> quick delivery
        </span>
        </div>
    </div>
    <div className="bg-black p-12 rounded-xl my-2 flex justify-center items-center gap-4">
        <div>
        <VscWorkspaceTrusted className="w-[4rem] h-[4rem] text-yellow-300" />
        </div>
        <div className="">
        <p className="text-2xl text-white font-medium">Trusted</p>
        <span className="text-xl text-white">
            Quality built over <br /> {yearsExp}+ years
        </span>
        </div>
    </div>
    <div className="bg-black p-12 rounded-xl my-2 flex justify-center items-center gap-4">
        <div>
        <SiTrustpilot className="w-[4rem] h-[4rem] text-yellow-300" />
        </div>
        <div className="">
        <p className="text-2xl font-medium text-white">Star Rating</p>
        <span className="text-xl text-white">
            Over 4.8 star <br /> ratings in Google
        </span>
        </div>
    </div>
    </section>

    <h1 className="text-2xl md:text-4xl text-white text-center mt-5 mb-5">
    Our{" "}
    <span className="text-yellow-300 border-b-4 border-yellow-300 ">
        Teams
    </span>
    </h1>

    <Swiper
    navigation={true}
    autoplay={{ delay: 4000, pauseOnMouseEnter: true }}
    loop
    breakpoints={{
        320: {
        slidesPerView: 1,
        spaceBetween: 10,
        },
        640: {
        slidesPerView: 2,
        spaceBetween: 10,
        },
        768: {
        slidesPerView: 2,
        spaceBetween: 15,
        },
        1024: {
        slidesPerView: 3,
        spaceBetween: 20,
        },
        2560: {
        slidesPerView: 4,
        spaceBetween: 20,
        },
    }}
    className="mx-4 mb-9 max-w-full mt-2"
    >
    <SwiperSlide className="relative mt-5">
        <div className="flex flex-col">
        <div className="flex flex-col bg-gray-200 hover:bg-yellow-300 transition delay-75">
            <img src={Rajak} className="w-[100%] h-auto " alt="Rajak" />
            <div className="flex flex-col justify-center text-center bg-yellow-300 p-2">
            <h2 className="text-lg md:text-3xl font-bold">Abdul Rajak</h2>
            <p className="text-xs md:text-xl  text-black text-center">
                CEO & Founder
            </p>
            </div>
        </div>
        </div>
    </SwiperSlide>
    <SwiperSlide className="relative mt-5">
        <div className="flex flex-col ">
        <div className="flex flex-col bg-gray-200 hover:bg-yellow-300 transition delay-75">
            <img src={Vicky} className="w-[100%] h-auto " alt="Vignesh Prem" />
            <div className="flex flex-col justify-center text-center bg-yellow-300 p-2">
            <h2 className="text-lg md:text-3xl font-bold">Vignesh Prem</h2>
            <p className="text-xs md:text-xl  text-black text-center">
                Graphic Designer
            </p>
            </div>
        </div>
        </div>
    </SwiperSlide>
    <SwiperSlide className="relative mt-5">
        <div className="flex flex-col ">
        <div className="flex flex-col bg-gray-200 hover:bg-yellow-300 transition delay-75">
            <img src={Javith} className="w-[100%] h-auto " alt="Javith" />
            <div className="flex flex-col justify-center text-center bg-yellow-300 p-2">
            <h2 className="text-lg md:text-3xl font-bold">Javith</h2>
            <p className="text-xs md:text-xl  text-black text-center">
                Production Manager
            </p>
            </div>
        </div>
        </div>
    </SwiperSlide>
    <SwiperSlide className="relative mt-5">
        <div className="flex flex-col ">
        <div className="flex flex-col bg-gray-200 hover:bg-yellow-300 transition delay-75">
            <img src={Harris} className="w-[100%] h-auto " alt="Harris" />
            <div className="flex flex-col justify-center text-center bg-yellow-300 p-2">
            <h2 className="text-lg md:text-3xl font-bold">Harris</h2>
            <p className="text-xs md:text-xl  text-black text-center">
                Web Developer
            </p>
            </div>
        </div>
        </div>
    </SwiperSlide>
    </Swiper>

    <Feedback />
</div>
);
}

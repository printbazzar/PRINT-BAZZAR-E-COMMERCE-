import {
    Breadcrumb,
    Button,
    Checkbox,
    Label,
    Modal,
    Select,
  } from "flowbite-react";
  import Image1 from "../assets/images/business_essen/brouchers.jpg";
  import Thumbnail1 from "../assets/images/business_essen/brouchers.jpg";
  import Thumbnail2 from "../assets/images/business_essen/brouchers_mtrl.jpg";
  import Thumbnail3 from "../assets/images/business_essen/brouchers_mtrl2.jpg";
  import { useState, useEffect } from "react";
  import { Link } from "react-router-dom";
  import GuideDesign from "../Components/GuideDesign";
  import { HiClock, HiHome } from "react-icons/hi";
import { BusinessEssentialsRelated } from "../RelatedProducts/BusinessEssentialsRelated";
  
  export function BookletDetails() {
    const [mainImage, setMainImage] = useState(Image1);
    const [materials, setMaterials] = useState("130gsm Art Paper");
    const [pages, setPages] = useState("8 Page (4 Cover + 4 Inside)");
    const [bind, setBind] = useState("Staple Pin");
    const [size, setSize] = useState("A4");
    const [quantity, setQuantity] = useState("10");
    const [design, setDesign] = useState("No Thank You");
    const [totalPrice, setTotalPrice] = useState(0);
    const [agree, setAgree] = useState(false);
    const [openModal, setOpenModal] = useState(false);
  
    const handleCheckboxChange = () => {
      setAgree(!agree);
    };
  
    useEffect(() => {
      calculatePrice();
    }, [quantity, size, design,materials]);
  
    const handleThumbnailClick = (image) => {
      setMainImage(image);
    };
  
    const calculatePrice = () => {
      let price = 0;
  
      if(materials === '130gsm Art Paper'){
        if (size === "A4") {
            if (quantity === "10") price = 190;
            else if (quantity === "30") price = 450;
            else if (quantity === "50") price = 760;
            else if (quantity === "100") price = 1440;
            else if (quantity === "200") price = 2830;
            else if (quantity === "500") price = 6785;
            else if (quantity === "1000") price = 12750;
      }
      else if (size === "A5") {
        if (quantity === "10") price = 120;
        else if (quantity === "30") price = 450;
        else if (quantity === "50") price = 455;
        else if (quantity === "100") price = 790;
        else if (quantity === "200") price = 1450;
        else if (quantity === "500") price = 3335;
        else if (quantity === "1000") price = 6780;
        }
      }

      else if(materials === '170gsm Art Paper'){
        if (size === "A4") {
            if (quantity === "10") price = 280;
            else if (quantity === "30") price = 572;
            else if (quantity === "50") price = 915;
            else if (quantity === "100") price = 1650;
            else if (quantity === "200") price = 3190;
            else if (quantity === "500") price = 7670;
            else if (quantity === "1000") price = 15000;
      }
      else if (size === "A5") {
        if (quantity === "10") price = 160;
        else if (quantity === "30") price = 307;
        else if (quantity === "50") price = 470;
        else if (quantity === "100") price = 826;
        else if (quantity === "200") price = 1620;
        else if (quantity === "500") price = 3870;
        else if (quantity === "1000") price = 7300;
        }
      }

      else if(materials === '300gsm Art Paper    '){
        if (size === "A4") {
            if (quantity === "10") price = 360;
            else if (quantity === "30") price = 700;
            else if (quantity === "50") price = 1060;
            else if (quantity === "100") price = 1650;
            else if (quantity === "200") price = 3186;
            else if (quantity === "500") price = 7670;
            else if (quantity === "1000") price = 15000;
      }
      else if (size === "A5") {
        if (quantity === "10") price = 177;
        else if (quantity === "30") price = 350;
        else if (quantity === "50") price = 470;
        else if (quantity === "100") price = 885;
        else if (quantity === "200") price = 1710;
        else if (quantity === "500") price = 3900;
        else if (quantity === "1000") price = 7550;
        }
      }

      if(design === 'Yes Please'){
        price += 600
      }

      setTotalPrice(price);
    };
  
    const handleSubmit = () => {

          const message = `
              *Booklets (#PB0094)*:
              - Booklet Size: ${size}
              - Paper Type: ${materials}
              - Pages: ${pages}
              - Bind Type: ${bind}
              - Quantity: ${quantity}
              - Design: ${design}
              - Price: ₹${totalPrice} incl (GST) + Shipping charges
          
              *2 Days Delivery (From Ordered Date)*
            `;
  
      const encodedMessage = encodeURIComponent(message);
      const targetNumber = (typeof window !== "undefined" && window.__BUSINESS_WHATSAPP__) ? window.__BUSINESS_WHATSAPP__ : "919629098565";
      const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;
  
      window.open(whatsappUrl, "_blank");
    };
  
    return (
      <div className="mx-auto px-4 py-8 max-w-full">
        <div className="px-4 py-2">
          <Breadcrumb className="text-base lg:text-lg xl:text-xl 2xl:text-2xl">
            <Breadcrumb.Item icon={HiHome}>
              <Link to="/" className="hover:underline">
                Home
              </Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Link to="/shop" className="hover:underline">
                Shop
              </Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Link
                to="/category/Business%20Essentials"
                className="hover:underline"
              >
                Business Essentials
              </Link>
            </Breadcrumb.Item>
            {/* Current Path - Truncate and Wrap */}
          </Breadcrumb>
        </div>
        <div className="mt-5 flex flex-col justify-center md:flex-row">
          {/* Left Side: Main Image and Thumbnails */}
          <div className="w-full md:w-1/3 2xl:w-1/3 lg:sticky lg:top-0">
            <img
              src={mainImage}
              alt="Square Business Card"
              className="w-full h-auto object-cover rounded-lg"
            />
            <div className="mt-4 flex space-x-4 justify-start">
              <img
                src={Thumbnail1}
                alt="Thumbnail 1"
                className="w-16 h-16 xl:w-32 xl:h-32 object-cover rounded-lg cursor-pointer"
                onClick={() => handleThumbnailClick(Thumbnail1)}
              />
              <img
                src={Thumbnail2}
                alt="Thumbnail 2"
                className="w-16 h-16 xl:w-32 xl:h-32 object-cover rounded-lg cursor-pointer"
                onClick={() => handleThumbnailClick(Thumbnail2)}
              />
              <img
                src={Thumbnail3}
                alt="Thumbnail 3"
                className="w-16 h-16 xl:w-32 xl:h-32 object-cover rounded-lg cursor-pointer"
                onClick={() => handleThumbnailClick(Thumbnail3)}
              />
            </div>
          </div>
  
          {/* Right Side: Product Info and Form */}
          <div className="md:ml-6 mt-4 md:mt-0 w-full md:w-1/2 2xl:w-1/2">
            <h3 className="font-medium text-3xl flex items-center gap-5">
              Booklet <br /> <small className="text-base">(#PB0094)</small>
            </h3>
  
            {/* Form Fields */}
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Brochure Size
              </label>
              <Select value={size} onChange={(e) => {setSize(e.target.value)}}>
                <option>A4</option>
                <option>A5</option>
              </Select>
            </div>

            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Pages
              </label>
              <Select value={pages} onChange={(e) => {setPages(e.target.value)}}>
                <option>8 Page (4 Cover + 4 Inside)</option>
                <option>12 Page (4 Cover + 8 Inside)</option>
                <option>16 Page (4 Cover + 12 Inside)</option>
                <option>20 Page (4 Cover + 16 Inside)</option>
                <option>24 Page (4 Cover + 20 Inside)</option>
              </Select>
            </div>
            
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Materials
              </label>
              <Select
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
              >
                <option>130gsm Art Paper</option>
                <option>170gsm Art Paper</option>
                <option>300gsm Art Paper</option>
              </Select>
            </div>

            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Bind Type
              </label>
              <Select
                value={bind}
                onChange={(e) => setBind(e.target.value)}
              >
                <option>Staple Pin</option>
              </Select>
            </div>
           
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Quantity
              </label>
              <Select
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}>
                    <option>10</option>
                    <option>20</option>
                    <option>30</option>
                    <option>40</option>
                    <option>50</option>
                    <option>100</option>
                    <option>200</option>
                    <option>300</option>
                    <option>500</option>
              </Select>
              <label className="block font-medium text-sm text-gray-700">
              Choose a quantity between 10 - 500 for instant ordering. For higher quantities, Contact Us.
              </label>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Let Us Design For You
              </label>
              <Select value={design} onChange={(e) => setDesign(e.target.value)}>
                <option>Yes Please</option>
                <option>No Thank You</option>
              </Select>
              <label className="block font-medium text-sm text-red-700">
                Minimum Charges (Charges will increase based on Contents)
              </label>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Price
              </label>
              <h3 className="font-medium  text-2xl sm:text-3xl text-red-700">
                ₹{totalPrice}{" "}
                <span className="text-gray-500 text-sm sm:text-base">
                  (incl GST)
                </span>{" "}
                +{" "}
                <span className="text-gray-500 text-sm sm:text-base">
                  Shipping charges
                </span>
              </h3>
            </div>
            <div className="mt-4">
              <h3 className="font-medium text-3xl flex gap-2 text-red-700">
                <span className="text-sm sm:text-base flex items-center gap-2">
                  <HiClock className="text-sm sm:text-xl" />2 Days Delivery
                </span>
                <span className="text-gray-500 text-sm sm:text-base">
                  (Order Before 12PM)
                </span>
              </h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Checkbox id="accept" onChange={handleCheckboxChange} />
              <Label htmlFor="accept" className="flex text-sm sm:text-md">
                I agree with the&nbsp;
                <a
                  onClick={() => setOpenModal(true)}
                  className="text-red-600 hover:underline cursor-pointer"
                >
                  terms and conditions
                </a>
              </Label>
            </div>
  
            <div className="mt-4">
              <Button
                color="dark"
                onClick={handleSubmit}
                disabled={!agree}
                className="rounded-lg w-full"
              >
                Buy Now
              </Button>
            </div>
            {design === "No Thank You" && (
              <Button
                gradientDuoTone="purpleToBlue"
                className="mt-6 w-full hover:opacity-90"
                as={Link}
                to="https://www.canva.com/search?q=brochures"
                target="_blank"
              >
                Create your Own Design
              </Button>
            )}
          </div>
  
          <Modal show={openModal} onClose={() => setOpenModal(false)}>
            <Modal.Header>Terms & Conditions</Modal.Header>
            <Modal.Body>
              <div className="space-y-6">
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-400">
                  Please find the design proof for your order attached. Kindly
                  review it carefully and confirm that everything is correct,
                  including:
                </p>
                <ul className="text-base leading-relaxed text-gray-500 list-disc">
                  <li>Text (spelling, grammar, and alignment)</li>
                  <li>Colors, images, and design layout</li>
                  <li>Dimensions and bleed/crop marks (if applicable)</li>
                  <li>
                    If there are any changes needed, please let us know as soon as
                    possible. Once we receive your approval, we’ll proceed with
                    printing.
                  </li>
                </ul>
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-400">
                  ⚠ Please note: By confirming the proof, you acknowledge that the
                  design is final, and any errors after printing will be your
                  responsibility.
                </p>
              </div>
            </Modal.Body>
          </Modal>
        </div>
  
        <div>
          <GuideDesign />
        </div>
  
        <div className="mt-5 max-w-4xl 2xl:max-w-full xl:mt-20 flex flex-col ">
          {" "}
          <h3 className="text-dark text-2xl lg:text-3xl 2xl:text-4xl font-medium">
            {" "}
            Information{" "}
          </h3>{" "}
          <div className="px-5 mt-5">
            {" "}
            <ul className="text-base leading-relaxed text-gray-500 list-disc">
              {" "}
              <li>
                {" "}
                <span className="text-black font-medium">Color Profile:</span>{" "}
                Use a CMYK color profile - Colors will not look the same when printing an RGB file. A CMYK file will be more accurate to the final printed colors.
              </li>
              <li>
                {" "}
                <span className="text-black font-medium">Size Options:</span>{" "}
                Available in standard A4 size, A5 size and A3 size providing
                ample space for your company’s header, contact details, and
                branding, making it ideal for professional communication and
                documentation.
              </li>
              <li>
                <span className="text-black font-medium">Materials:</span> <br />
                <span className="text-black font-medium">
                  130 GSM, 170 GSM and 300 GSM {""}
                </span>
                Known for its premium quality, this paper type offers a smooth
                texture and a professional appearance that reflects your
                business’s attention to detail.
              </li>
              <li>
                <span className="text-black font-medium">Note:</span>
                <br />
                Images ripped from the web are typically low-resolution, and are not intended for print production
              </li>
              <li>
                <span className="text-black font-medium">Design Features:</span>
                <br /> Custom layouts with your logo, tagline, and contact details
                perfectly aligned to exude professionalism and reinforce brand
                identity. Options for minimalist, corporate, or creative designs.
              </li>
            </ul>
          </div>
        </div>
  
        <div>
          <BusinessEssentialsRelated />
        </div>
      </div>
    );
  }
  
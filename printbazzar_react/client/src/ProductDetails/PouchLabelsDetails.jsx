import {
    Breadcrumb,
    Button,
    Checkbox,
    Label,
    Modal,
    Select,
  } from "flowbite-react";
  import Image1 from "../assets/images/stickers&labels/pouch_labels.jpg";
  import Thumbnail1 from "../assets/images/stickers&labels/pouch_labels.jpg";
  import Thumbnail2 from "../assets/images/stickers&labels/rectangle_mtrl.jpg";
  import Thumbnail3 from "../assets/images/stickers&labels/mtrl.jpg";
  import { useState, useEffect } from "react";
  import { Link } from "react-router-dom";
  import GuideDesign from "../Components/GuideDesign";
  import { HiClock, HiHome } from "react-icons/hi";
  import { FaWhatsapp } from "react-icons/fa";
import { StickersRelated } from "../RelatedProducts/StickersRelated";
  
  export function PouchLabelsDetails() {
    const [mainImage, setMainImage] = useState(Image1);
    const [size, setSize] = useState("3x2 inch");
    const [shape, setShape] = useState("Rectangle");
    const [finish, setFinish] = useState("No Finish");
    const [material, setMaterial] = useState("Paper Sticker (Economy)");
    const [quantity, setQuantity] = useState("100");
    const [totalPrice, setTotalPrice] = useState(0);
    const [design, setDesign] = useState("No Thank You");
    const [agree, setAgree] = useState(false);
    const [openModal, setOpenModal] = useState(false);
  
    const handleCheckboxChange = () => {
      setAgree(!agree);
    };
  
    useEffect(() => {
      calculatePrice();
    }, [quantity, material, size, finish,design]);
  
    const handleThumbnailClick = (image) => {
      setMainImage(image);
    };
  
    const calculatePrice = () => {
      let price = 0;
      
      if(material === "Paper Sticker (Economy)"){
      if (size === "3x2 inch") {
        if (quantity === "25") price = 60;
        else if (quantity === "50") price = 120;
        else if (quantity === "100") price = 180;
        else if (quantity === "150") price = 250;
        else if (quantity === "200") price = 300;
        else if (quantity === "300") price = 315;
        else if (quantity === "500") price = 490;
        else if (quantity === "750") price = 735;
        else if (quantity === "1000") price = 980;
      } else if (size === "4x2 inch") {
        if (quantity === "25") price = 60;
        else if (quantity === "50") price = 120;
        else if (quantity === "100") price = 180;
        else if (quantity === "150") price = 280;
        else if (quantity === "200") price = 300;
        else if (quantity === "300") price = 420;
        else if (quantity === "500") price = 665;
        else if (quantity === "750") price = 980;
        else if (quantity === "1000") price = 1295;
      } else if (size === "4x3 inch" || size === "5x2") {
        if (quantity === "25") price = 70;
        else if (quantity === "50") price = 140;
        else if (quantity === "100") price = 280;
        else if (quantity === "150") price = 400;
        else if (quantity === "200") price = 420;
        else if (quantity === "300") price = 595;
        else if (quantity === "500") price = 980;
        else if (quantity === "750") price = 1470;
        else if (quantity === "1000") price = 1960;
      } else if (size === "5x3 inch" || size === "6x3 inch") {
        if (quantity === "25") price = 70;
        else if (quantity === "50") price = 140;
        else if (quantity === "100") price = 280;
        else if (quantity === "150") price = 400;
        else if (quantity === "200") price = 420;
        else if (quantity === "300") price = 595;
        else if (quantity === "500") price = 875;
        else if (quantity === "750") price = 2200;
        else if (quantity === "1000") price = 2352;
      }
      else if (size === "6x4 inch") {
        if (quantity === "25") price = 105;
        else if (quantity === "50") price = 210;
        else if (quantity === "100") price = 420;
        else if (quantity === "150") price = 600;
        else if (quantity === "200") price = 805;
        else if (quantity === "300") price = 1190;
        else if (quantity === "500") price = 1680;
        else if (quantity === "750") price = 2350;
        else if (quantity === "1000") price = 2800;
      } 
      else if (size === "A5") {
        if (quantity === "25") price = 180;
        else if (quantity === "50") price = 390;
        else if (quantity === "100") price = 625;
        else if (quantity === "150") price = 950;
        else if (quantity === "200") price = 1250;
        else if (quantity === "300") price = 1800;
        else if (quantity === "500") price = 2300;
        else if (quantity === "750") price = 2500;
        else if (quantity === "1000") price = 3760;
      } 
      else if (size === "A4") {
        if (quantity === "25") price = 325;
        else if (quantity === "50") price = 625;
        else if (quantity === "100") price = 1250;
        else if (quantity === "150") price = 1875;
        else if (quantity === "200") price = 2400;
        else if (quantity === "300") price = 3300;
        else if (quantity === "500") price = 5000;
        else if (quantity === "750") price = 7125;
        else if (quantity === "1000") price = 9500;
      } 
      else if (size === "A3") {
        if (quantity === "25") price = 625;
        else if (quantity === "50") price = 1150;
        else if (quantity === "100") price = 2200;
        else if (quantity === "150") price = 3150;
        else if (quantity === "200") price = 4000;
        else if (quantity === "300") price = 5850;
        else if (quantity === "500") price = 7600;
        else if (quantity === "750") price = 9250;
        else if (quantity === "1000") price = 13500;
      } 
      }  
      
      if(material === "PVC White" || material === "Transparent PVC (Clear)"){
      if (size === "3x2 inch") {
        if (quantity === "25") price = 70;
        else if (quantity === "50") price = 120;
        else if (quantity === "100") price = 180;
        else if (quantity === "150") price = 265;
        else if (quantity === "200") price = 320;
        else if (quantity === "300") price = 425;
        else if (quantity === "500") price = 660;
        else if (quantity === "750") price = 900;
        else if (quantity === "1000") price = 1320;
      } else if (size === "4x2 inch") {
        if (quantity === "25") price = 70;
        else if (quantity === "50") price = 120;
        else if (quantity === "100") price = 225;
        else if (quantity === "150") price = 330;
        else if (quantity === "200") price = 430;
        else if (quantity === "300") price = 640;
        else if (quantity === "500") price = 850;
        else if (quantity === "750") price = 1180;
        else if (quantity === "1000") price = 1530;
      } else if (size === "4x3 inch" || size === "5x2") {
        if (quantity === "25") price = 145;
        else if (quantity === "50") price = 170;
        else if (quantity === "100") price = 350;
        else if (quantity === "150") price = 430;
        else if (quantity === "200") price = 560;
        else if (quantity === "300") price = 800;
        else if (quantity === "500") price = 1255;
        else if (quantity === "750") price = 1840;
        else if (quantity === "1000") price = 2450;
      } else if (size === "5x3 inch" || size === "6x3 inch") {
        if (quantity === "25") price = 120;
        else if (quantity === "50") price = 295;
        else if (quantity === "100") price = 510;
        else if (quantity === "150") price = 615;
        else if (quantity === "200") price = 800;
        else if (quantity === "300") price = 1120;
        else if (quantity === "500") price = 1890;
        else if (quantity === "750") price = 2830;
        else if (quantity === "1000") price = 3670;
      }
      else if (size === "6x4 inch") {
        if (quantity === "25") price = 170;
        else if (quantity === "50") price = 350;
        else if (quantity === "100") price = 680;
        else if (quantity === "150") price = 945;
        else if (quantity === "200") price = 1280;
        else if (quantity === "300") price = 1885;
        else if (quantity === "500") price = 2640;
        else if (quantity === "750") price = 3710;
        else if (quantity === "1000") price = 4625;
      } 
      }  
  
  
      if (finish !== "No Finish") {
        if (quantity === "25" || quantity === "50" || quantity === "100") {
          price += 200;
        }
        else if (quantity === "150" || quantity === "200" || quantity === "300") {
          price += 300;
        }
        else if (quantity === "500" || quantity === "750" || quantity === "1000") {
          price += 700;
        }
      }
  
  
      if(design === "Yes Please"){
        price += 300
      }
  
      if (quantity === "Custom Quantity" || size === "Custom Size") price = "Custom";
  
  
      setTotalPrice(price);
    };
  
    const handleSubmit = () => {
      const message = `
                *Pouch Labels (#PB0063)*:
                - Material: ${material}
                - Shape: ${shape}
                - Size: ${size}
                - Lamination: ${finish}
                - Quantity: ${quantity}
                - Design: ${design}
                - Price: ₹${totalPrice} incl (GST) + Shipping charges
                  Including Cutting Charges
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
                to="/category/Stickers%20%26%20Labels"
                className="hover:underline"
              >
                Stickers & Labels
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
              alt="Oval Sticker"
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
            <h3 className="font-medium text-2xl sm:text-3xl flex items-center gap-5">
              Pouch Labels <br />{" "}
              <small className="text-base">(#PB0063)</small>
            </h3>
            {/* Form Fields */}
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Material
              </label>
              <Select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                <option>Paper Sticker (Economy)</option>
                <option>PVC White</option>
                <option>Transparent PVC (Clear)</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Size
              </label>
              <Select value={size} onChange={(e) => setSize(e.target.value)}>
                <option>3x2 inch</option>
                <option>4x2 inch</option>
                <option>4x3 inch</option>
                <option>4x4 inch</option>
                <option>5x2 inch</option>
                <option>5x3 inch</option>
                <option>6x3 inch</option>
                <option>6x4 inch</option>
                <option>Custom Size</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Shape
              </label>
              <Select value={shape} onChange={(e) => setShape(e.target.value)}>
                <option>Rectangle</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Laminations
              </label>
              <Select value={finish} onChange={(e) => setFinish(e.target.value)}>
                <option>No Finish</option>
                <option>Lamination (glossy)</option>
                <option>Lamination (matt)</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Quantity
              </label>
              <Select
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              >
                <option>25</option>
                <option>50</option>
                <option>100</option>
                <option>150</option>
                <option>200</option>
                <option>300</option>
                <option>500</option>
                <option>750</option>
                <option>1000</option>
                <option>Custom Quantity</option>
              </Select>
              <Link
                target="_blank"
                to="https://wa.me/9629098565?text=I%20want%20to%20enquire%20about%20stickers%20and%20labels%20quantity"
                className="font-medium text-xs md:text-sm text-red-600 flex items-center gap-1 mt-2"
              >
                For higher quantities, Click{" "}
                <FaWhatsapp className="text-green-400 text-lg" /> 
              </Link>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Let Us Design For You
              </label>
              <Select value={design} onChange={(e) => setDesign(e.target.value)}>
                <option>Yes Please</option>
                <option>No Thank You</option>
              </Select>
              <label className="block font-medium text-sm text-gray-700">
                Minimum Charges 300
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
              <label className="block font-medium text-sm text-gray-700">
                Including Cutting Charges
              </label>
            </div>
            <div className="mt-4">
              <h3 className="font-medium text-3xl flex gap-2 text-red-700">
                <span className="text-sm sm:text-base flex items-center gap-2">
                  <HiClock className="text-sm sm:text-xl" />2 Days Delivery
                </span>
                <span className="text-gray-500 text-sm sm:text-base">
                  (From Ordered Date)
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
                to="https://www.canva.com/search?q=logo"
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
            <li>
              <span className="text-black font-medium">Materials:</span>{" "}
              <br />
              Available in Paper Sticker (Economy), PVC White, Transparent PVC (Clear).
            </li>
            <li>
              <span className="text-black font-medium">Finish Options: </span>{" "}
              <br />
              Available in No Finish, Lamination (glossy), Lamination (matt).
            </li>
            <li>
              <span className="text-black font-medium">Size Options: </span>
              <br />
              3x2 inch, 4x2 inch, 4x3 inch, 4x4 inch, 5x2 inch, 5x3 inch, 6x3 inch, 6x4 inch, A5, A4, A3 and also in Custom Size.
            </li>
            <li>
              <span className="text-black font-medium">Versatile Use: </span>
              <br />
              Ideal for product packaging, business branding, custom labels, promotions, event planning, and more.
            </li>
            <li>
            <span className="text-black font-medium">Delivery: </span>
            <br />
            Supplied in Sheets with Cutting.
          </li>
          </ul>
          </div>
        </div>
  
        <div>
          <StickersRelated />
        </div>
      </div>
    );
  }
  
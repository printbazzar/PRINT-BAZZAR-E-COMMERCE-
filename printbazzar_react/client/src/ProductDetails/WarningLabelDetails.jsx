import {
  Breadcrumb,
  Button,
  Checkbox,
  Label,
  Modal,
  Select,
} from "flowbite-react";
import Image1 from "../assets/images/stickers&labels/warning_labels.jpg";
import Thumbnail1 from "../assets/images/stickers&labels/warning_labels.jpg";
import Thumbnail2 from "../assets/images/stickers&labels/square_mtrl.jpg";
import Thumbnail3 from "../assets/images/stickers&labels/mtrl.jpg";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GuideDesign from "../Components/GuideDesign";
import { HiClock, HiHome } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { StickersRelated } from "../RelatedProducts/StickersRelated";

export function WarningLabelDetails() {
  const [mainImage, setMainImage] = useState(Image1);
  const [size, setSize] = useState("1x1 inch");
  const [shape, setShape] = useState("Circle");
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

    if(material === "PVC White" || material === "Transparent PVC (Clear)"){
    if (size === "1x1 inch") {
      if (quantity === "100") price = 150;
      else if (quantity === "200") price = 150;
      else if (quantity === "300") price = 240;
      else if (quantity === "400") price = 295;
      else if (quantity === "500") price = 350;
      else if (quantity === "1000") price = 480;
    } else if (size === "1.5x1.5 inch") {
      if (quantity === "100") price = 150;
      else if (quantity === "200") price = 280;
      else if (quantity === "300") price = 300;
      else if (quantity === "400") price = 380;
      else if (quantity === "500") price = 415;
      else if (quantity === "1000") price = 700;
    } else if (size === "2x2 inch") {
      if (quantity === "100") price = 200;
      else if (quantity === "200") price = 400;
      else if (quantity === "300") price = 490;
      else if (quantity === "400") price = 615;
      else if (quantity === "500") price = 700;
      else if (quantity === "1000") price = 1400;
    } else if (size === "2.5x2.5 inch") {
      if (quantity === "100") price = 220;
      else if (quantity === "200") price = 350;
      else if (quantity === "300") price = 640;
      else if (quantity === "400") price = 700;
      else if (quantity === "500") price = 885;
      else if (quantity === "1000") price = 1530;
    } else if (size === "3x3 inch") {
      if (quantity === "100") price = 285;
      else if (quantity === "200") price = 490;
      else if (quantity === "300") price = 920;
      else if (quantity === "400") price = 1165;
      else if (quantity === "500") price = 1240;
      else if (quantity === "1000") price = 2230;
    }
    }
    
    if(material === "Paper Sticker (Economy)"){
    if (size === "1x1 inch") {
      if (quantity === "100") price = 120;
      else if (quantity === "200") price = 130;
      else if (quantity === "300") price = 220;
      else if (quantity === "400") price = 250;
      else if (quantity === "500") price = 300;
      else if (quantity === "1000") price = 400;
    } else if (size === "1.5x1.5 inch") {
      if (quantity === "100") price = 120;
      else if (quantity === "200") price = 250;
      else if (quantity === "300") price = 280;
      else if (quantity === "400") price = 350;
      else if (quantity === "500") price = 380;
      else if (quantity === "1000") price = 630;
    } else if (size === "2x2 inch") {
      if (quantity === "100") price = 180;
      else if (quantity === "200") price = 380;
      else if (quantity === "300") price = 450;
      else if (quantity === "400") price = 580;
      else if (quantity === "500") price = 660;
      else if (quantity === "1000") price = 1300;
    } else if (size === "2.5x2.5 inch") {
      if (quantity === "100") price = 200;
      else if (quantity === "200") price = 320;
      else if (quantity === "300") price = 600;
      else if (quantity === "400") price = 680;
      else if (quantity === "500") price = 800;
      else if (quantity === "1000") price = 1480;
    } else if (size === "3x3 inch") {
      if (quantity === "100") price = 250;
      else if (quantity === "200") price = 450;
      else if (quantity === "300") price = 890;
      else if (quantity === "400") price = 1110;
      else if (quantity === "500") price = 1130;
      else if (quantity === "1000") price = 2100;
    }
    }
    
    if(material === "Gold Metallic" || material === "Silver Metallic"){
    if (size === "1x1 inch") {
      if (quantity === "100") price = 200;
      else if (quantity === "200") price = 250;
      else if (quantity === "300") price = 300;
      else if (quantity === "400") price = 350;
      else if (quantity === "500") price = 390;
      else if (quantity === "1000") price = 680;
    } else if (size === "1.5x1.5 inch") {
      if (quantity === "100") price = 220;
      else if (quantity === "200") price = 250;
      else if (quantity === "300") price = 350;
      else if (quantity === "400") price = 470;
      else if (quantity === "500") price = 590;
      else if (quantity === "1000") price = 1180;
    } else if (size === "2x2 inch") {
      if (quantity === "100") price = 280;
      else if (quantity === "200") price = 570;
      else if (quantity === "300") price = 850;
      else if (quantity === "400") price = 1130;
      else if (quantity === "500") price = 1300;
      else if (quantity === "1000") price = 2360;
    } else if (size === "2.5x2.5 inch") {
      if (quantity === "100") price = 530;
      else if (quantity === "200") price = 1060;
      else if (quantity === "300") price = 1380;
      else if (quantity === "400") price = 1840;
      else if (quantity === "500") price = 2120;
      else if (quantity === "1000") price = 3430;
    } else if (size === "3x3 inch") {
      if (quantity === "100") price = 700;
      else if (quantity === "200") price = 1380;
      else if (quantity === "300") price = 1840;
      else if (quantity === "400") price = 2410;
      else if (quantity === "500") price = 2480;
      else if (quantity === "1000") price = 4960;
    }
    }


    if (finish !== "No Finish") {
      if (quantity === "100" || quantity === "200" || quantity === "300") {
        price += 150;
      }
      else if (quantity === "500" || quantity === "500" || quantity === "600" || quantity === "1000") {
        price += 400;
      }
    }


    if(design === "Yes Please"){
      price += 200
    }

    if (quantity === "Custom Quantity" || size === "Custom Size") price = "Custom";


    setTotalPrice(price);
  };

  const handleSubmit = () => {
    const message = `
              *Warning Label (#PB0053)*:
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
            Warning Label <br />{" "}
            <small className="text-base">(#PB0053)</small>
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
              <option>Silver Metallic</option>
              <option>Gold Metallic</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Size
            </label>
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              <option>1x1 inch</option>
              <option>1.5x1.5 inch</option>
              <option>2x2 inch</option>
              <option>2.5x2.5 inch</option>
              <option>3x3 inch</option>
              <option>Custom Size</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Shape
            </label>
            <Select value={shape} onChange={(e) => setShape(e.target.value)}>
              <option>Circle</option>
              <option>Square</option>
              <option>Oval</option>
              <option>Custom Shapes</option>
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
              <option>100</option>
              <option>200</option>
              <option>300</option>
              <option>400</option>
              <option>500</option>
              <option>600</option>
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
            Available in Paper Sticker (Economy), PVC White, Transparent PVC (Clear), Silver Metallic, Gold Metallic.
          </li>
          <li>
            <span className="text-black font-medium">Finish Options: </span>{" "}
            <br />
            Available in No Finish, Lamination (glossy), Lamination (matt).
          </li>
          <li>
            <span className="text-black font-medium">Size Options: </span>
            <br />
            1x1 inch, 1.5x1.5 inch, 2x2 inch, 2.5x2.5 inch, 3x3 inch, and also in Custom Size.
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

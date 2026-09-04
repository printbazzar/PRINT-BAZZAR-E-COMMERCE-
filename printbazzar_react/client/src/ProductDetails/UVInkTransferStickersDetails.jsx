import {
  Breadcrumb,
  Button,
  Checkbox,
  Label,
  Modal,
  Select,
} from "flowbite-react";
import Image1 from "../assets/images/stickers&labels/uvink.jpg";
import Thumbnail1 from "../assets/images/stickers&labels/uvink.jpg";
import Thumbnail2 from "../assets/images/stickers&labels/uvink_mtrl.jpg";
import Thumbnail3 from "../assets/images/stickers&labels/uvink_mtrl2.jpg";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GuideDesign from "../Components/GuideDesign";
import { HiClock, HiHome } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { StickersRelated } from "../RelatedProducts/StickersRelated";

export function UVInkTransferStickersDetails() {
  const [mainImage, setMainImage] = useState(Image1);
  const [size, setSize] = useState("1.5x1.5 inch");
  const [shape, setShape] = useState("As Per The Design");
  const [sheets, setSheets] = useState("1");
  const [quantity, setQuantity] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [agree, setAgree] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const handleCheckboxChange = () => {
    setAgree(!agree);
  };

  useEffect(() => {
    calculatePrice();
  }, [quantity, size,sheets]);

  const handleThumbnailClick = (image) => {
    setMainImage(image);
  };

  const calculatePrice = () => {
    let price = 0;
    
    price += sheets*1150


    if (quantity === "Custom Quantity" || size === "Custom Size" || sheets === "Custom Sheets") price = "Custom";


    setTotalPrice(price);
  };

  const handleSubmit = () => {
    const message = `
              *UV Ink Transfer Stickers (#PB0062)*:
              - Shape: ${shape}
              - Size: ${size}
              - Sheets: ${sheets}
              - Quantity: ${quantity}
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
            UV Ink Transfer Stickers <br />{" "}
            <small className="text-base">(#PB0062)</small>
          </h3>
          {/* Form Fields */}

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Shape
            </label>
            <Select value={shape} onChange={(e) => setShape(e.target.value)}>
              <option>As Per The Design</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Size
            </label>
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              <option>1.5x1.5 inch</option>
              <option>2x2 inch</option>
              <option>3x2 inch</option>
              <option>3x3 inch</option>
              <option>3.5x3.5 inch</option>
              <option>4x2 inch</option>
              <option>4x4 inch</option>
              <option>Custom Size</option>
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
              {
                size === "1.5x1.5 inch" &&
              <option>70 Pcs</option>
              }
              {
                size === "2x2 inch" &&
              <option>40 Pcs</option>
              }
              {
                size === "3x2 inch" &&
              <option>25 Pcs</option>
              }
              {
                size === "3x3 inch" &&
              <option>15 Pcs</option>
              }
              {
                size === "3.5x3.5 inch" &&
              <option>12 Pcs</option>
              }
              {
                size === "4x2 inch" &&
              <option>20 Pcs</option>
              }
              {
                size === "4x4 inch" &&
              <option>8 Pcs</option>
              }
              <option>Custom Quantity</option>
            </Select>
            <Link
              target="_blank"
              to="https://wa.me/9629098565?text=I%20want%20to%20enquire%20about%20UV%20Ink%20Transfer%20stickers%20quantity"
              className="font-medium text-xs md:text-sm text-red-600 flex items-center gap-1 mt-2"
            >
              For Custom quantities, Click{" "}
              <FaWhatsapp className="text-green-400 text-lg" /> 
            </Link>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Sheets
            </label>
            <Select value={sheets} onChange={(e) => setSheets(e.target.value)}>
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>4</option>
              <option>5</option>
              <option>6</option>
              <option>7</option>
              <option>8</option>
              <option>9</option>
              <option>10</option>
              <option>Custom Sheets</option>
            </Select>
            <label className="block font-medium text-sm text-gray-700">
              Sheet - 11x17 Inch (Supplied in Sheets)
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
          Transform any surface with our Ink Transfer Stickers! Experience seamless customization with easy peel-and-paste application. These durable stickers transfer ink only, ensuring a perfect finish. Ideal for indoor and outdoor use, try them out with a minimum order quantity of 40pcs. Unleash your creativity and personalize anything effortlessly!
          </li>
          <li>
            <span className="text-black font-medium">UV Ink:</span>{" "}
            <br />
            Feels like its directly printed on your product. 
          </li>
          <li>
            <span className="text-black font-medium">Resistant: </span>{" "}
            <br />
            Water/Oil & Scratch resistant. 
          </li>
          <li>
            <span className="text-black font-medium">Size Options: </span>
            <br />
            1.5x1.5 inch, 2x2 inch, 3x2 inch, 3x3 inch, 3.5x3.5 inch, 4x2 inch, 4x3 inch and also in Custom Size.
          </li>
          <li>
            <span className="text-black font-medium">Delivery: </span>
            <br />
            Supplied in Sheets.
          </li>
          <li>
            <span className="text-black font-medium">Way Of Use: </span>
            <br />
            Easy Peel and Paste. Suitable for Flat or Curved Surfaces.
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

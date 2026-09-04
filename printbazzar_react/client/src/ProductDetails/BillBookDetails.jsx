import {
  Breadcrumb,
  Button,
  Checkbox,
  Label,
  Modal,
  Select,
} from "flowbite-react";
import Image1 from "../assets/images/business_essen/billbook.jpg";
import Thumbnail1 from "../assets/images/business_essen/billbook.jpg";
import Thumbnail2 from "../assets/images/business_essen/billbook_mtrl.jpg";
import Thumbnail3 from "../assets/images/business_essen/billbook_mtrl2.jpg";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GuideDesign from "../Components/GuideDesign";
import { HiClock, HiHome } from "react-icons/hi";
import { BusinessEssentialsRelated } from "../RelatedProducts/BusinessEssentialsRelated";

export function BillBookDetails() {
  const [mainImage, setMainImage] = useState(Image1);
  const [printing, setPrinting] = useState("Single Color");
  const [padType, setPadtype] = useState("Select Pad Type");
  const [duplicateColor, setduplicateColor] = useState("Gray");
  const [duplicateColorMulti, setduplicateColorMulti] =
    useState("Black & White");
  const [duplicateColor2, setduplicateColor2] = useState("Gray");
  const [size, setSize] = useState("A4");
  const [invoice, setInvoice] = useState("With Invoice Number");
  const [startInvoice, setStartInvoice] = useState("001");
  const [quantity, setQuantity] = useState("2");
  const [design, setDesign] = useState("No Thank You");
  const [totalPrice, setTotalPrice] = useState(0);
  const [agree, setAgree] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const handleCheckboxChange = () => {
    setAgree(!agree);
  };

  useEffect(() => {
    calculatePrice();
  }, [printing, size, padType, design, quantity,duplicateColor,duplicateColor2,duplicateColorMulti]);

  const handleThumbnailClick = (image) => {
    setMainImage(image);
  };

  const calculatePrice = () => {
    let price = 0;

    if (printing === "Multi Color") {
      if (size === "A5") {
        if (padType === "Original + 1 Duplicate") {
          if (design === "Yes Please") {
            if (quantity === "2") price = 1050 + 200;
            else if (quantity === "4") price = 2100 + 200;
            else if (quantity === "6") price = 3180 + 200;
            else if (quantity === "8") price = 4250 + 200;
            else if (quantity === "10") price = 5300 + 200;
            else if (quantity === "20") price = 10000 + 200;
          } else if (design === "No Thank You") {
            if (quantity === "2") price = 1050;
            else if (quantity === "4") price = 2100;
            else if (quantity === "6") price = 3180;
            else if (quantity === "8") price = 4250;
            else if (quantity === "10") price = 5300;
            else if (quantity === "20") price = 10000;
          }
        }
      }

      if (size === "A4") {
        if (padType === "Original + 1 Duplicate") {
          if (design === "Yes Please") {
            if (quantity === "2") price = 2050 + 200;
            else if (quantity === "4") price = 4060 + 200;
            else if (quantity === "6") price = 6100 + 200;
            else if (quantity === "8") price = 8100 + 200;
            else if (quantity === "10") price = 10000 + 200;
            else if (quantity === "20") price = 19500 + 200;
          } else if (design === "No Thank You") {
            if (quantity === "2") price = 2050;
            else if (quantity === "4") price = 4060;
            else if (quantity === "6") price = 6100;
            else if (quantity === "8") price = 8100;
            else if (quantity === "10") price = 10000;
            else if (quantity === "20") price = 19500;
          }
        }
      }
    }

    if (printing === "Single Color") {
      if (size === "A5") {
        if (padType === "Original + 1 Duplicate") {
          if (design === "Yes Please") {
            if (quantity === "2") price = 650 + 200;
            else if (quantity === "4") price = 1000 + 200;
            else if (quantity === "6") price = 1180 + 200;
            else if (quantity === "8") price = 1350 + 200;
            else if (quantity === "10") price = 1700 + 200;
            else if (quantity === "20") price = 2700 + 200;
          } else if (design === "No Thank You") {
            if (quantity === "2") price = 650;
            else if (quantity === "4") price = 1000;
            else if (quantity === "6") price = 1180;
            else if (quantity === "8") price = 1350;
            else if (quantity === "10") price = 1700;
            else if (quantity === "20") price = 2700;
          }
        }

        if (padType === "Original + 2 Duplicates") {
          if (design === "Yes Please") {
            if (quantity === "2") price = 750 + 200;
            else if (quantity === "4") price = 1150 + 200;
            else if (quantity === "6") price = 1400 + 200;
            else if (quantity === "8") price = 1800 + 200;
            else if (quantity === "10") price = 2400 + 200;
            else if (quantity === "20") price = 4000 + 200;
          } else if (design === "No Thank You") {
            if (quantity === "2") price = 750;
            else if (quantity === "4") price = 1150;
            else if (quantity === "6") price = 1400;
            else if (quantity === "8") price = 1800;
            else if (quantity === "10") price = 2400;
            else if (quantity === "20") price = 4000;
          }
        }
      }

      if (size === "A4") {
        if (padType === "Original + 1 Duplicate") {
          if (design === "Yes Please") {
            if (quantity === "2") price = 850 + 200;
            else if (quantity === "4") price = 1300 + 200;
            else if (quantity === "6") price = 1880 + 200;
            else if (quantity === "8") price = 2300 + 200;
            else if (quantity === "10") price = 2750 + 200;
            else if (quantity === "20") price = 4950 + 200;
          } else if (design === "No Thank You") {
            if (quantity === "2") price = 850;
            else if (quantity === "4") price = 1300;
            else if (quantity === "6") price = 1880;
            else if (quantity === "8") price = 2300;
            else if (quantity === "10") price = 2750;
            else if (quantity === "20") price = 4950;
          }
        }

        if (padType === "Original + 2 Duplicates") {
          if (design === "Yes Please") {
            if (quantity === "2") price = 970 + 200;
            else if (quantity === "4") price = 1650 + 200;
            else if (quantity === "6") price = 2350 + 200;
            else if (quantity === "8") price = 2890 + 200;
            else if (quantity === "10") price = 3450 + 200;
            else if (quantity === "20") price = 5650 + 200;
          } else if (design === "No Thank You") {
            if (quantity === "2") price = 970;
            else if (quantity === "4") price = 1650;
            else if (quantity === "6") price = 2350;
            else if (quantity === "8") price = 2890;
            else if (quantity === "10") price = 3450;
            else if (quantity === "20") price = 5650;
          }
        }
      }
    }

    setTotalPrice(price);
  };

  const handleSubmit = () => {

    if(quantity === 'Select Pad Type'){
      alert('Please Select Pad Type')
  }
  else{

    const message = `
          *Bill Book (#PB0018)*:
          - Printing Color: ${printing}
          - Size: ${size}
          - Pad Type: ${padType}
          ${
            printing === "Single Color"
              ? padType === "Original + 1 Duplicate"
                ? `- Duplicate Sheet Color: ${duplicateColor}`
                : `- 1st Duplicate Sheet Color: ${duplicateColor}
            - 2nd Duplicate Sheet Color: ${duplicateColor2}`
              : " "
          }
          ${
            printing === "Multi Color"
              ? `- Duplicate Sheet Color : ${duplicateColorMulti}`
              : " "
          }
          ${
            invoice === "With Invoice Number"
              ? `- Invoice Numbering: ${invoice}
              - Starting Invoice Number: ${startInvoice}  
              `
              : `- Invoice Numbering: ${invoice}
            `
          }
          - Quantity: ${quantity}
          - Design: ${design}
          - Price: ₹${totalPrice} incl (GST) + Shipping charges
      
          *3 Days Delivery (From Ordered Date)*
        `;

    const encodedMessage = encodeURIComponent(message);
    const targetNumber = (typeof window !== "undefined" && window.__BUSINESS_WHATSAPP__) ? window.__BUSINESS_WHATSAPP__ : "919629098565";
    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  }
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
            <Link to="/category/Business%20Essentials" className="hover:underline">
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
            Bill Book <br /> <small className="text-base">(#PB0018)</small>
          </h3>

          {/* Form Fields */}
          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Printing Color
            </label>
            <Select
              value={printing}
              onChange={(e) => setPrinting(e.target.value)}
            >
              <option>Single Color</option>
              <option>Multi Color</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Size
            </label>
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              <option>A4</option>
              <option>A5</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Pad Type
            </label>
            <Select
              value={padType}
              onChange={(e) => setPadtype(e.target.value)}
            >
              <option>Select Pad Type</option>
              <option>Original + 1 Duplicate</option>
              {printing !== "Multi Color" && (
                <option>Original + 2 Duplicates</option>
              )}
            </Select>
          </div>

          {printing === "Single Color" ? (
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                {padType === "Original + 1 Duplicate" ? (
                  <span>Duplicate Sheet Color</span>
                ) : (
                  <span>1st Duplicate Sheet Color</span>
                )}
              </label>
              <Select
                value={duplicateColor}
                onChange={(e) => setduplicateColor(e.target.value)}
              >
                <option>Gray</option>
                <option>Blue</option>
                <option>Green</option>
                <option>Yellow</option>
                <option>Pink</option>
              </Select>
            </div>
          ) : null}

          {padType == "Original + 2 Duplicates" && (
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                2nd Duplicate Sheet Color
              </label>
              <Select
                value={duplicateColor2}
                onChange={(e) => setduplicateColor2(e.target.value)}
              >
                <option>Gray</option>
                <option>Blue</option>
                <option>Green</option>
                <option>Yellow</option>
                <option>Pink</option>
              </Select>
            </div>
          )}

          {printing === "Multi Color" ? (
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                {padType === "Original + 1 Duplicate" ? (
                  <span>Duplicate Sheet Color</span>
                ) : (
                  <span>1st Duplicate Sheet Color</span>
                )}
              </label>
              <Select
                value={duplicateColorMulti}
                onChange={(e) => setduplicateColorMulti(e.target.value)}
              >
                <option>Black & White</option>
              </Select>
            </div>
          ) : null}

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Invoice Numbering
            </label>
            <Select
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
            >
              <option>With Invoice Number</option>
              <option>Without Invoice Number</option>
            </Select>
            <label className="block font-medium text-sm text-gray-700 mt-2">
              Want to Print Invoice Number ?
            </label>
          </div>

          {invoice === "With Invoice Number" && (
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Starting Invoice Number
              </label>
              <Select
                value={startInvoice}
                onChange={(e) => setStartInvoice(e.target.value)}
              >
                <option>001</option>
                <option>101</option>
                <option>201</option>
                <option>Custom Numbers</option>
              </Select>
            </div>
          )}

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Quantity
            </label>
            <Select
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            >
              <option>2</option>
              <option>4</option>
              <option>6</option>
              <option>8</option>
              <option>10</option>
              <option>20</option>
            </Select>
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
          </div>
          <div className="mt-4">
            <h3 className="font-medium text-3xl flex gap-2 text-red-700">
              <span className="text-sm sm:text-base flex items-center gap-2">
                <HiClock className="text-sm sm:text-xl" />3 Days Delivery
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
              to="https://www.canva.com/search?q=bill%20book"
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
              <span className="text-black font-medium">Size Options:</span>{" "}
              Available in standard A4 size (8.27 x 11.69 inches), providing
              ample space for your company’s header, contact details, and
              branding, making it ideal for professional communication and
              documentation.
            </li>
            <li>
              <span className="text-black font-medium">Paper Type:</span> <br />
              <span className="text-black font-medium">
                80 GSM Executive Bond:
              </span>
              Known for its premium quality, this paper type offers a smooth
              texture and a professional appearance that reflects your
              business’s attention to detail.
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

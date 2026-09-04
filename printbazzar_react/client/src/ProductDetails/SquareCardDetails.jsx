import {
  Breadcrumb,
  Button,
  Checkbox,
  Label,
  Modal,
  Select,
} from "flowbite-react";
import Image1 from "../assets/images/business_card/square_card.jpg";
import Thumbnail1 from "../assets/images/business_card/square_card.jpg";
import Thumbnail2 from "../assets/images/business_card/square_mtrl.png";
import Thumbnail3 from "../assets/images/business_card/laminate_mtrl.png";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GuideDesign from "../Components/GuideDesign";
import { HiClock, HiHome } from "react-icons/hi";
import { BusinessCardRelated } from "../RelatedProducts/BusinessCardRelated";

export function SquareCardDetails() {
  const [mainImage, setMainImage] = useState(Image1);
  const [lamination, setLamination] = useState("No Lamination");
  const [printingType, setPrintingType] = useState("Single Side");
  const [cornerFinishing, setCornerFinishing] = useState("Standard");
  const [quantity, setQuantity] = useState("100");
  const [design, setDesign] = useState("No Thank You");
  const [totalPrice, setTotalPrice] = useState(0);
  const [agree, setAgree] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const handleCheckboxChange = () => {
    setAgree(!agree);
  };

  useEffect(() => {
    calculatePrice();
  }, [lamination, printingType, design, quantity, cornerFinishing]);

  const handleThumbnailClick = (image) => {
    setMainImage(image);
  };

  const calculatePrice = () => {
    let price = 0;

    if (lamination === "No Lamination") {
      if (printingType === "Single Side") {
        if (design === "Yes Please") {
          if (quantity === "100") price = 250 + 200;
          else if (quantity === "200") price = 300 + 200;
          else if (quantity === "300") price = 390 + 200;
          else if (quantity === "500") price = 600 + 200;
          else if (quantity === "1000") price = 900 + 200;
        } else if (design === "No Thank You") {
          if (quantity === "100") price = 250;
          else if (quantity === "200") price = 300;
          else if (quantity === "300") price = 390;
          else if (quantity === "500") price = 600;
          else if (quantity === "1000") price = 900;
        }
      } else if (printingType === "Double Side") {
        if (design === "Yes Please") {
          if (quantity === "100") price = 290 + 400;
          else if (quantity === "200") price = 400 + 400;
          else if (quantity === "300") price = 550 + 400;
          else if (quantity === "500") price = 865 + 400;
          else if (quantity === "1000") price = 1400 + 400;
        } else if (design === "No Thank You") {
          if (quantity === "100") price = 290;
          else if (quantity === "200") price = 400;
          else if (quantity === "300") price = 550;
          else if (quantity === "500") price = 865;
          else if (quantity === "1000") price = 1400;
        }
      }
    } else if (lamination === "Glossy" || lamination === "Matte") {
      if (printingType === "Single Side") {
        if (design === "Yes Please") {
          if (quantity === "100") price = 380 + 200;
          else if (quantity === "200") price = 420 + 200;
          else if (quantity === "300") price = 500 + 200;
          else if (quantity === "500") price = 750 + 200;
          else if (quantity === "1000") price = 1300 + 200;
        } else if (design === "No Thank You") {
          if (quantity === "100") price = 380;
          else if (quantity === "200") price = 420;
          else if (quantity === "300") price = 500;
          else if (quantity === "500") price = 750;
          else if (quantity === "1000") price = 1300;
        }
      } else if (printingType === "Double Side") {
        if (design === "Yes Please") {
          if (quantity === "100") price = 450 + 400;
          else if (quantity === "200") price = 530 + 400;
          else if (quantity === "300") price = 660 + 400;
          else if (quantity === "500") price = 1020 + 400;
          else if (quantity === "1000") price = 1800 + 400;
        } else if (design === "No Thank You") {
          if (quantity === "100") price = 450;
          else if (quantity === "200") price = 530;
          else if (quantity === "300") price = 660;
          else if (quantity === "500") price = 1020;
          else if (quantity === "1000") price = 1800;
        }
      }
    }
    console.log(lamination);
    // Apply corner finishing price
    if (cornerFinishing === "Rounded") {
      if (quantity === "100" || quantity === "200" || quantity === "300") {
        price += 150;
      } else if (quantity === "500" || quantity === "1000") {
        price += 200;
      }
    }

    setTotalPrice(price);
  };

  const handleSubmit = () => {
    const message = `
    *Square Business Card (#PB0005)*:
    - Lamination: ${lamination}
    - Printing Type: ${printingType}
    - Corner Finishing: ${cornerFinishing}
    - Quantity: ${quantity}
    - Design: ${design}
    - Price: ₹${totalPrice} incl (GST) + Shipping charges\n
    *Single Day Delivery (Order Before 12PM)*

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
            <Link to="/category/Business%20Cards" className="hover:underline">
              Business Cards
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
          <h3 className="font-medium text-3xl">Square Business Card</h3>

          {/* Form Fields */}
          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Lamination
            </label>
            <Select
              value={lamination}
              onChange={(e) => setLamination(e.target.value)}
            >
              <option value="No Lamination">No Lamination</option>
              <option value="Glossy">Glossy</option>
              <option value="Matte">Matte</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Printing Location
            </label>
            <Select
              value={printingType}
              onChange={(e) => setPrintingType(e.target.value)}
            >
              <option>Single Side</option>
              <option>Double Side</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Corner Finishing
            </label>
            <Select
              value={cornerFinishing}
              onChange={(e) => setCornerFinishing(e.target.value)}
            >
              <option>Standard</option>
              <option>Rounded</option>
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
              <option>500</option>
              <option>1000</option>
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
                <HiClock className="text-sm sm:text-xl" />
                Single Day Delivery
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
              to="https://www.canva.com/search?q=business%20cards"
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

      <div className="mt-5 max-w-4xl 2xl:max-w-full xl:mt-20  flex flex-col ">
        <h3 className="text-dark text-2xl lg:text-3xl 2xl:text-4xl font-medium">
          Information
        </h3>
        <div className="px-5 mt-5">
          <ul className="text-base leading-relaxed text-gray-500 list-disc">
            <li>
              <span className="text-black font-medium">2.5 x 2.5 inches:</span>{" "}
              Perfect for an attractive professional appearance, its basic
              rectangular form. This scale has a small and easy portable design
              while giving sufficient space for your contact information and
              branding on your custom visiting card online.
            </li>
            <li>
              <span className="text-black font-medium">Printing Options: </span>{" "}
              <br />
              <span className="text-black font-medium">Single Side: </span>
              Custom printed visiting cards online with no distractions on the
              back, ensuring your brand identity is totally focused and leaves a
              clear, unforgettable impression.
              <br />
              <span className="text-black font-medium">Double Side: </span>
              Custom printed visiting cards online offering enough space for a
              strong logo and basic contact information on the front, along with
              creative components, promotional messages, or a visual
              representation of your business or ideals on the back.
            </li>
            <li>
              <span className="text-black font-medium">Finishes:</span> <br />
              <span className="text-black font-medium">Glossy: </span>
              This kind of laminating reflects light, producing a glossy,
              mirror-like impression that gives the custom visiting card a
              professional look. It makes the colors more rich and highlights
              the elements of any design, improving the attractiveness of your
              customized business card. <br />
              <span className="text-black font-medium">Matte :</span>
              Your company visiting card will have a smooth, comfortable feel
              and a polished, beautiful look as the matte surface absorbs rather
              than reflects light. Matte visiting cards online with their soft,
              smooth texture frequently look more luxurious and touch.
            </li>
            <li>
              <span className="text-black font-medium">Edges: </span>
              <br />
              <span className="text-black font-medium">Round:</span>
              Ideal for creatives, startups, and eco-friendly brands.
              <br />
              <span className="text-black font-medium">Standard:</span>
              Ideal for corporate professionals, luxury brands, and consultants.
            </li>
          </ul>
        </div>
      </div>

      <div>
        <BusinessCardRelated />
      </div>
    </div>
  );
}

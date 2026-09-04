import {
    Breadcrumb,
    Button,
    Checkbox,
    Label,
    Modal,
    Select,
  } from "flowbite-react";
  import Image1 from "../assets/images/Invitations/greetingCard.jpg";
  import Thumbnail1 from "../assets/images/Invitations/greetingCard.jpg";
  import Thumbnail2 from "../assets/images/Invitations/envelopePrinting.jpg";
  import Thumbnail3 from "../assets/images/Invitations/laminationCard.jpg";  
  import Thumbnail4 from "../assets/images/Invitations/metallic_mtrl.jpg";
  import Thumbnail5 from "../assets/images/Invitations/sizeChart.jpg";
  import Thumbnail6 from "../assets/images/Invitations/textured_mtrl.jpg";
  import { useState, useEffect } from "react";
  import { Link } from "react-router-dom";
  import GuideDesign from "../Components/GuideDesign";
  import { HiClock, HiHome } from "react-icons/hi";
import { InvitationRelated } from "../RelatedProducts/InvitationRelated";
  
  export function GreetingCardsDetails() {
    const [mainImage, setMainImage] = useState(Image1);
    const [size, setSize] = useState("A5");
    const [shape, setShape] = useState("Rectangle");
    const [envelopeType, setEnvelopeType] = useState("No Envelope");
    const [printingLocation, setPrintingLocation] = useState("Single Side");
    const [orientation, setOrientation] = useState("Portrait");
    const [textured, setTextured] = useState("Needle Point (300 gsm)");
    const [material, setMaterial] = useState("Uncoated Paper (300 gsm)");
    const [quantity, setQuantity] = useState("10");
    const [totalPrice, setTotalPrice] = useState(0);
    const [design, setDesign] = useState("No Thank You");
    const [agree, setAgree] = useState(false);
    const [openModal, setOpenModal] = useState(false);
  
    const handleCheckboxChange = () => {
      setAgree(!agree);
    };
  
    useEffect(() => {
      calculatePrice();
    }, [quantity, material, size, envelopeType, design, printingLocation, shape]);
  
    const handleThumbnailClick = (image) => {
      setMainImage(image);
    };
  
    const calculatePrice = () => {
      let price = 0;
  
      // Material Price
      if (material === "Uncoated Paper (300 gsm)") {
        if (size === "A5") {
          if (printingLocation == "Single Side") {
            if (quantity === "10") price = 100;
            else if (quantity === "20") price = 110;
            else if (quantity === "30") price = 190;
            else if (quantity === "40") price = 240;
            else if (quantity === "50") price = 300;
            else if (quantity === "100") price = 590;
            else if (quantity === "200") price = 1180;
            else if (quantity === "300") price = 1770;
            else if (quantity === "500") price = 2950;
            else if (quantity === "1000") price = 4900;
          } else if (printingLocation == "Double Side") {
            if (quantity === "10") price = 110;
            else if (quantity === "20") price = 150;
            else if (quantity === "30") price = 290;
            else if (quantity === "40") price = 360;
            else if (quantity === "50") price = 460;
            else if (quantity === "100") price = 880;
            else if (quantity === "200") price = 1770;
            else if (quantity === "300") price = 2660;
            else if (quantity === "500") price = 4430;
            else if (quantity === "1000") price = 6785;
          }
        } else if (size === "A4") {
          if (printingLocation == "Single Side") {
            if (quantity === "10") price = 120;
            else if (quantity === "20") price = 240;
            else if (quantity === "30") price = 360;
            else if (quantity === "40") price = 480;
            else if (quantity === "50") price = 590;
            else if (quantity === "100") price = 1180;
            else if (quantity === "200") price = 2360;
            else if (quantity === "300") price = 3540;
            else if (quantity === "500") price = 5610;
            else if (quantity === "1000") price = 10620;
          } else if (printingLocation == "Double Side") {
            if (quantity === "10") price = 180;
            else if (quantity === "20") price = 360;
            else if (quantity === "30") price = 530;
            else if (quantity === "40") price = 700;
            else if (quantity === "50") price = 885;
            else if (quantity === "100") price = 1170;
            else if (quantity === "200") price = 3540;
            else if (quantity === "300") price = 5310;
            else if (quantity === "500") price = 8555;
            else if (quantity === "1000") price = 16520;
          }
        }
      } else if (
        material === "Glossy Laminated (300 gsm)" ||
        material === "Matt Laminated (300 gsm)"
      ) {
        if (size === "A5") {
          if (printingLocation == "Single Side") {
            if (quantity === "10") price = 160;
            else if (quantity === "20") price = 170;
            else if (quantity === "30") price = 285;
            else if (quantity === "40") price = 350;
            else if (quantity === "50") price = 500;
            else if (quantity === "100") price = 850;
            else if (quantity === "200") price = 1470;
            else if (quantity === "300") price = 2050;
            else if (quantity === "500") price = 3300;
            else if (quantity === "1000") price = 5400;
          } else if (printingLocation == "Double Side") {
            if (quantity === "10") price = 170;
            else if (quantity === "20") price = 210;
            else if (quantity === "30") price = 475;
            else if (quantity === "40") price = 560;
            else if (quantity === "50") price = 700;
            else if (quantity === "100") price = 1150;
            else if (quantity === "200") price = 2120;
            else if (quantity === "300") price = 2960;
            else if (quantity === "500") price = 4950;
            else if (quantity === "1000") price = 7385;
          }
        } else if (size === "A4") {
          if (printingLocation == "Single Side") {
            if (quantity === "10") price = 220;
            else if (quantity === "20") price = 350;
            else if (quantity === "30") price = 480;
            else if (quantity === "40") price = 600;
            else if (quantity === "50") price = 740;
            else if (quantity === "100") price = 1380;
            else if (quantity === "200") price = 2660;
            else if (quantity === "300") price = 3890;
            else if (quantity === "500") price = 6100;
            else if (quantity === "1000") price = 11350;
          } else if (printingLocation == "Double Side") {
            if (quantity === "10") price = 280;
            else if (quantity === "20") price = 470;
            else if (quantity === "30") price = 680;
            else if (quantity === "40") price = 850;
            else if (quantity === "50") price = 1085;
            else if (quantity === "100") price = 1470;
            else if (quantity === "200") price = 4140;
            else if (quantity === "300") price = 6010;
            else if (quantity === "500") price = 9355;
            else if (quantity === "1000") price = 17550;
          }
        }
      } else if (
        material === "Textured Board (300 gsm)" ||
        material === "Silver Metallic Board (300 gsm)" ||
        material === "Gold Metallic Board (300 gsm)"
      ) {
        if (size === "A5") {
          if (printingLocation == "Single Side") {
            if (quantity === "10") price = 110;
            else if (quantity === "20") price = 180;
            else if (quantity === "30") price = 285;
            else if (quantity === "40") price = 355;
            else if (quantity === "50") price = 460;
            else if (quantity === "100") price = 885;
            else if (quantity === "200") price = 1655;
            else if (quantity === "300") price = 2390;
            else if (quantity === "500") price = 3910;
            else if (quantity === "1000") price = 7670;
          } else if (printingLocation == "Double Side") {
            if (quantity === "10") price = 150;
            else if (quantity === "20") price = 240;
            else if (quantity === "30") price = 380;
            else if (quantity === "40") price = 475;
            else if (quantity === "50") price = 700;
            else if (quantity === "100") price = 1180;
            else if (quantity === "200") price = 2245;
            else if (quantity === "300") price = 3275;
            else if (quantity === "500") price = 5385;
            else if (quantity === "1000") price = 10620;
          }
        } else if (size === "A4") {
          if (printingLocation == "Single Side") {
            if (quantity === "10") price = 180;
            else if (quantity === "20") price = 355;
            else if (quantity === "30") price = 535;
            else if (quantity === "40") price = 700;
            else if (quantity === "50") price = 885;
            else if (quantity === "100") price = 1770;
            else if (quantity === "200") price = 3305;
            else if (quantity === "300") price = 4780;
            else if (quantity === "500") price = 7820;
            else if (quantity === "1000") price = 15340;
          } else if (printingLocation == "Double Side") {
            if (quantity === "10") price = 240;
            else if (quantity === "20") price = 475;
            else if (quantity === "30") price = 700;
            else if (quantity === "40") price = 945;
            else if (quantity === "50") price = 1180;
            else if (quantity === "100") price = 2360;
            else if (quantity === "200") price = 4485;
            else if (quantity === "300") price = 6550;
            else if (quantity === "500") price = 10770;
            else if (quantity === "1000") price = 21240;
          }
        }
      }
  
      // Envelope Price
      if (size === "A5") {
        if (envelopeType == "Plain Cover") {
          if (quantity === "10") price += 30;
          else if (quantity === "20") price += 60;
          else if (quantity === "30") price += 90;
          else if (quantity === "40") price += 120;
          else if (quantity === "50") price += 100;
          else if (quantity === "100") price += 230;
          else if (quantity === "200") price += 400;
          else if (quantity === "300") price += 600;
          else if (quantity === "500") price += 1000;
          else if (quantity === "1000") price += 1850;
        }
        else if(envelopeType === "Printed in Multi color"){
          if (quantity === "10") price += 120;
          else if (quantity === "20") price += 240;
          else if (quantity === "30") price += 355;
          else if (quantity === "40") price += 475;
          else if (quantity === "50") price += 590;
          else if (quantity === "100") price += 1030;
          else if (quantity === "200") price += 2245;
          else if (quantity === "300") price += 2700;
          else if (quantity === "500") price += 5605;
          else if (quantity === "1000") price += 8675;
        }
        else if(envelopeType === "Printed in Single color"){
          if (quantity === "10") price += 120;
          else if (quantity === "20") price += 240;
          else if (quantity === "30") price += 355;
          else if (quantity === "40") price += 420;
          else if (quantity === "50") price += 500;
          else if (quantity === "100") price += 530;
          else if (quantity === "200") price += 700;
          else if (quantity === "300") price += 900;
          else if (quantity === "500") price += 1300;
          else if (quantity === "1000") price += 2250;
        }
      } 
  
      else if (size === "A4") {
          if (envelopeType == "Plain Cover") {
            if (quantity === "10") price += 40;
            else if (quantity === "20") price += 80;
            else if (quantity === "30") price += 120;
            else if (quantity === "40") price += 160;
            else if (quantity === "50") price += 200;
            else if (quantity === "100") price += 300;
            else if (quantity === "200") price += 600;
            else if (quantity === "300") price += 900;
            else if (quantity === "500") price += 1300;
            else if (quantity === "1000") price += 2500;
          }
          else if(envelopeType === "Printed in Multi color"){
            if (quantity === "10") price += 120;
            else if (quantity === "20") price += 240;
            else if (quantity === "30") price += 360;
            else if (quantity === "40") price += 480;
            else if (quantity === "50") price += 600;
            else if (quantity === "100") price += 1100;
            else if (quantity === "200") price += 2100;
            else if (quantity === "300") price += 3000;
            else if (quantity === "500") price += 4800;
            else if (quantity === "1000") price += 9500;
          }
          else if(envelopeType === "Printed in Single color"){
            if (quantity === "10") price += 120;
            else if (quantity === "20") price += 240;
            else if (quantity === "30") price += 355;
            else if (quantity === "40") price += 420;
            else if (quantity === "50") price += 600;
            else if (quantity === "100") price += 700;
            else if (quantity === "200") price += 1000;
            else if (quantity === "300") price += 1300;
            else if (quantity === "500") price += 1700;
            else if (quantity === "1000") price += 2950;
          }
        } 
      
  
      // Designing Price
      if (design === "Card Only") {
        if (printingLocation === "Single Side") {
          price += 350;
        } else {
          price += 700;
        }
      } else if (design == "Card and Envelope") {
        if (printingLocation === "Single Side") {
          price += 400;
        } else {
          price += 800;
        }
      }
  
      if (quantity === "Custom Quantity" || size === "Custom Size")
        price = "Custom";
  
      setTotalPrice(price);
    };
  
    const handleSubmit = () => {
      const message = `
                  *Greeting Cards (#PB0080)*:
                  - Types & Shape: ${shape}
                  - Card Size: ${size}
                  - Card Material: ${material}
                  ${
                    material === "Textured Board (300 gsm)"
                      ? `- Textured Material: ${textured}`
                      : ""
                  }
                  - Envelope Type: ${envelopeType}
                  - Printing Location: ${printingLocation}
                  - Orientation: ${orientation}
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
              <Link to="/category/Invitations" className="hover:underline">
                Invitations
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
            <div className="mt-4 flex space-x-4 justify-start overflow-auto">
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
              <img
                src={Thumbnail4}
                alt="Thumbnail 4"
                className="w-16 h-16 xl:w-32 xl:h-32 object-cover rounded-lg cursor-pointer"
                onClick={() => handleThumbnailClick(Thumbnail4)}
              />
              <img
                src={Thumbnail5}
                alt="Thumbnail 5"
                className="w-16 h-16 xl:w-32 xl:h-32 object-cover rounded-lg cursor-pointer"
                onClick={() => handleThumbnailClick(Thumbnail5)}
              />
              <img
                src={Thumbnail6}
                alt="Thumbnail 6"
                className="w-16 h-16 xl:w-32 xl:h-32 object-cover rounded-lg cursor-pointer"
                onClick={() => handleThumbnailClick(Thumbnail6)}
              />
            </div>
          </div>
  
          {/* Right Side: Product Info and Form */}
          <div className="md:ml-6 mt-4 md:mt-0 w-full md:w-1/2 2xl:w-1/2">
            <h3 className="font-medium text-2xl sm:text-3xl flex items-center gap-5">
              Greeting Cards <br />{" "}
              <small className="text-base">(#PB0080)</small>
            </h3>
            {/* Form Fields */}
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Types & Shapes
              </label>
              <Select value={shape} onChange={(e) => setShape(e.target.value)}>
                <option>Rectangle</option>
                <option>Folded</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Size
              </label>
              <Select value={size} onChange={(e) => setSize(e.target.value)}>
                <option>A5</option>
                <option>A4</option>
                <option>Custom Size</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Card Material
              </label>
              <Select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                <option>Uncoated Paper (300 gsm)</option>
                <option>Glossy Laminated (300 gsm)</option>
                <option>Matt Laminated (300 gsm)</option>
                <option>Textured Board (300 gsm)</option>
                <option>Silver Metallic Board (300 gsm)</option>
                <option>Gold Metallic Board (300 gsm)</option>
              </Select>
            </div>
  
            {material === "Textured Board (300 gsm)" && (
              <div className="mt-4">
                <label className="block font-medium text-sm text-gray-700">
                  Texture Materials
                </label>
                <Select
                  value={textured}
                  onChange={(e) => setTextured(e.target.value)}
                >
                  <option>Needle Point (300 gsm)</option>
                  <option>Linen Cream (350 gsm)</option>
                  <option>Classic Column (324 gsm)</option>
                  <option>Criss Cross (300 gsm)</option>
                  <option>Natural Evolution</option>
                  <option>Velentino (300 gsm)</option>
                  <option>Linen White (300 gsm)</option>
                  <option>Natural Stucco</option>
                </Select>
              </div>
            )}
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Envelope Type
              </label>
              <Select
                value={envelopeType}
                onChange={(e) => setEnvelopeType(e.target.value)}
              >
                <option>No Cover</option>
                <option>Plain Cover</option>
                <option>Printed in Single color</option>
                <option>Printed in Multi color</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Printing Location
              </label>
              <Select
                value={printingLocation}
                onChange={(e) => setPrintingLocation(e.target.value)}
              >
                <option>Single Side</option>
                <option>Double Side</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Orientation
              </label>
              <Select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
              >
                <option>Portrait</option>
                <option>Landscape</option>
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
                <option>10</option>
                <option>20</option>
                <option>30</option>
                <option>40</option>
                <option>50</option>
                <option>100</option>
                <option>200</option>
                <option>300</option>
                <option>500</option>
                <option>1000</option>
                <option>Custom Quantity</option>
              </Select>
            </div>
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Let Us Design For You
              </label>
              <Select value={design} onChange={(e) => setDesign(e.target.value)}>
                <option>Card Only</option>
                <option>Card and Envelope</option>
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
                to="https://www.canva.com/search?q=greeting%20cards"
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
                <span className="text-black font-medium">Types and Shapes:</span>{" "}
                <br />
                Available in Rectangle, Folded, Rounded Corner and Custom Shapes
              </li>
              <li>
                <span className="text-black font-medium">Size Options: </span>{" "}
                <br />
                Available A5, A4, A6 and Custom Size.
              </li>
              <li>
                <span className="text-black font-medium">
                  Card Material Options:{" "}
                </span>
                <br />
                Available in Uncoated Paper (300 gsm), Glossy Lamination (300
                gsm), Matt Lamination (300 gsm), Textured Board (300 gsm), Silver
                Metallic Board(300 gsm) and Gold Metallic Board (300 gsm)
              </li>
              <li>
                <span className="text-black font-medium">Envelope Type: </span>
                <br />
                Comes with Plain cover, Printed in Single Color, Printed in Multi
                Color
              </li>
              <li>
                <span className="text-black font-medium">
                  Orientaion and Printing:{" "}
                </span>
                <br />
                Available in single-sided or double-sided printing, with options
                for portrait or landscape orientation.
              </li>
              <li>
                <span className="text-black font-medium">Quantity: </span>
                <br />
                Starting from 10-1000 and also available in custom quantity.
              </li>
            </ul>
          </div>
        </div>
  
        <div>
          <InvitationRelated />
        </div>
      </div>
    );
  }
  
import {
    Breadcrumb,
    Button,
    Checkbox,
    Label,
    Modal,
    Select,
  } from "flowbite-react";
  import Image1 from "../assets/images/business_essen/certificate.jpg";
  import Thumbnail1 from "../assets/images/business_essen/certificate.jpg";
  import Thumbnail2 from "../assets/images/business_essen/certificate_mtrl.jpg";
  import Thumbnail3 from "../assets/images/business_essen/certificate_mtrl2.jpg";
  import { useState, useEffect } from "react";
  import { Link } from "react-router-dom";
  import GuideDesign from "../Components/GuideDesign";
  import { HiClock, HiHome } from "react-icons/hi";
import { BusinessEssentialsRelated } from "../RelatedProducts/BusinessEssentialsRelated";
  
  export function StandardCertificatesDetails() {
    const [mainImage, setMainImage] = useState(Image1);
    const [printingLocation, setprintingLocation] = useState("Single Side");
    const [material, setMaterial] = useState("300 gsm paper");
    const [orientation, setOrientation] = useState("Portrait");
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
    }, [quantity,design]);
  
    const handleThumbnailClick = (image) => {
      setMainImage(image);
    };
  
    const calculatePrice = () => {
      let price = 0;
  
      if (quantity === "10") price = 180;
      else if (quantity === "50") price = 700;
      else if (quantity === "100") price = 1000;
      else if (quantity === "200") price = 2000;
      else if (quantity === "300") price = 2850;
      else if (quantity === "500") price = 5000;
      else if (quantity === "1000") price = 9800;

      if(design === 'Yes Please'){
        price +=500
      }
      setTotalPrice(price);
    };
  
    const handleSubmit = () => {
      const message = `
              *Standard Certificates (#PB0025)*:
              - Printing Location: ${printingLocation}
              - Material: ${material}
              - Orientation: ${orientation}
              - Quantity: ${quantity}
              - Design: ${design}
              - Price: ₹${totalPrice} incl (GST) + Shipping charges

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
              <Link to="/category/Certificates" className="hover:underline">
                Certificates
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
              alt="Certificates"
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
              Standard Certificates <br /> <small className="text-base">(#PB0025)</small>
            </h3>
  
            {/* Form Fields */}
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Printing Location
              </label>
              <Select
                value={printingLocation}
                onChange={(e) => setprintingLocation(e.target.value)}
              >
                <option>Single Side</option>
              </Select>
            </div>
            
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Material
              </label>
              <Select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                <option>300 gsm paper</option>
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
                <option>50</option>
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
                <HiClock className="text-sm sm:text-xl" />Single Day Delivery
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
                to="https://www.canva.com/search?q=certificates"
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
            <ul className="text-base leading-relaxed text-gray-500">
              {" "}
              <li>1.We support printing multiple designs.</li>
              <li>2.Same-Day Delivery for orders placed before 12 pm.</li>
              <li>3.Print Location: Single Side</li>
              <li>4.Certificate printed on 300GSM paper.</li>
            </ul>
          </div>
        </div>
  
        <div>
          <BusinessEssentialsRelated />
        </div>
      </div>
    );
  }
  
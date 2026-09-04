import {
    Breadcrumb,
    Button,
    Checkbox,
    Label,
    Modal,
    Select,
  } from "flowbite-react";
  import Image1 from "../assets/images/marketing_materials/standee.jpg";
  import Thumbnail1 from "../assets/images/marketing_materials/standee.jpg";
  import Thumbnail2 from "../assets/images/marketing_materials/standee_mtrl.jpg";
  import Thumbnail3 from "../assets/images/marketing_materials/standee_mtrl2.jpg";
  import { useState, useEffect } from "react";
  import { Link } from "react-router-dom";
  import GuideDesign from "../Components/GuideDesign";
  import { PopularProducts } from "../Components/PopularProducts";
  import { HiClock, HiHome } from "react-icons/hi";
  
  export function RollupStandeeDetails() {
    const [mainImage, setMainImage] = useState(Image1);
    const [printingLocation, setPrintingLocation] = useState("Normal White Flex (Solvent Print)");
    const [size, setSize] = useState("2x5");
    const [quantity, setQuantity] = useState("1");
    const [design, setDesign] = useState("No Thank You");
    const [totalPrice, setTotalPrice] = useState(0);
    const [agree, setAgree] = useState(false);
    const [openModal, setOpenModal] = useState(false);
  
    const handleCheckboxChange = () => {
      setAgree(!agree);
    };
  
    useEffect(() => {
      calculatePrice();
    }, [quantity, size, design,printingLocation]);
  
    const handleThumbnailClick = (image) => {
      setMainImage(image);
    };
  
    const calculatePrice = () => {
      let price = 0;
  
      if(printingLocation === 'Normal White Flex (Solvent Print)'){
        if (size === "2x5") price = quantity * 1300                 
        else if(size === "3x6") price = quantity * 1500
        }
      else if(printingLocation === 'Black Back Flex (Solvent Print)'){
        if (size === "2x5") price = quantity * 1400                 
        else if(size === "3x6") price = quantity * 1600
        }
      else if(printingLocation === 'Star Flex (Solvent Print)'){
        if (size === "2x5") price = quantity * 1450                 
        else if(size === "3x6") price = quantity * 1700
        }
      else if(printingLocation === 'Star Flex (Eco Solvent Print)'){
        if (size === "2x5") price = quantity * 2350                 
        else if(size === "3x6") price = quantity * 2450
        }
      else if(printingLocation === 'Star Flex (UV Printing)'){
        if (size === "2x5") price = quantity * 2550                 
        else if(size === "3x6") price = quantity * 2750
        }

        if(quantity === "Custom Quantity"){
            price = "Custom Charges"
        }
        if(design === "Yes Please"){
            price += 600
        }

      setTotalPrice(price);
    };
  
    const handleSubmit = () => {

          const message = `
              *Roll Up Standee (#PB0036)*:
              - Size: ${size}
              - Print Media: ${printingLocation}
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
                to="/category/Marketing%20and%20Promotionals%20Items"
                className="hover:underline"
              >
                Marketing Materials
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
            <h3 className="font-medium text-2xl sm:text-3xl flex items-center gap-5">
              Roll Up Standee (Aluminium)<br /> <small className="text-base">(#PB0036)</small>
            </h3>
  
            {/* Form Fields */}

            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Size
              </label>
              <Select value={size} onChange={(e) => {setSize(e.target.value)}}>
                <option>2x5</option>
                <option>3x6</option>
              </Select>
            </div>

            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Print Media
              </label>
              <Select value={printingLocation} onChange={(e) => {setPrintingLocation(e.target.value)}}>
                <option>Normal White Flex (Solvent Print)</option>
                <option>Black Back Flex (Solvent Print)</option>
                <option>Star Flex (Solvent Print)</option>
                <option>Star Flex (Eco Solvent Print)</option>
                <option>Star Flex (UV Printing)</option>
              </Select>
            </div>
        
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Quantity
              </label>
              <Select
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}>
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
                    <option>Custom Quantity</option>
              </Select>
              <label className="block font-medium text-sm text-gray-700">
              Choose a quantity between 1 - 10 for instant ordering. For higher quantities, Contact Us.
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
                to="https://www.canva.com/search?q=standee"
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
                <span className="text-black font-medium">Product:</span>{" "}
                Aluminium Roll-up Standee (Light Weight)

              </li>
              <li>
                {" "}
                <span className="text-black font-medium">Size Options:</span>{" "}
                5x2 feet and 6x3 feet available sizes
              </li>
              <li>
                <span className="text-black font-medium">Materials:</span> <br />
                Silver color standee is a standard quality product.
              </li>
              <li>
                <span className="text-black font-medium">Delivery:</span>
                <br />
                Dispatch 1 to 2 working days.
              </li>
              <li>
                <span className="text-black font-medium">Design Features:</span>
                <br />Options for minimalist, corporate, or creative designs.
              </li>
              <li>
                <span className="text-black font-medium">Quantity:</span>
                <br />Bulk order contact our sales team for best price
              </li>
            </ul>
          </div>
        </div>
  
        <div>
          <PopularProducts />
        </div>
      </div>
    );
  }
  
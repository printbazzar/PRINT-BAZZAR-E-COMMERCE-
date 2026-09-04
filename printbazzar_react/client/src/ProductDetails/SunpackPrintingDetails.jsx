import {
    Breadcrumb,
    Button,
    Checkbox,
    Label,
    Modal,
    Select,
  } from "flowbite-react";
  import Image1 from "../assets/images/marketing_materials/sunpack.jpg";
  import Thumbnail1 from "../assets/images/marketing_materials/sunpack.jpg";
  import Thumbnail2 from "../assets/images/marketing_materials/sunpack_mtrl2.jpg";
  import Thumbnail3 from "../assets/images/marketing_materials/sunpack_mtrl.jpg";
  import { useState, useEffect } from "react";
  import { Link } from "react-router-dom";
  import GuideDesign from "../Components/GuideDesign";
  import { PopularProducts } from "../Components/PopularProducts";
  import { HiClock, HiHome } from "react-icons/hi";
  
  export function SunpackPrintingDetails() {
    const [mainImage, setMainImage] = useState(Image1);
    const [size, setSize] = useState("1x1.5");
    const [design, setDesign] = useState("No Thank You");
    const [quantity, setQuantity] = useState("50");
    const [totalPrice, setTotalPrice] = useState(0);
    const [agree, setAgree] = useState(false);
    const [openModal, setOpenModal] = useState(false);
  
    const handleCheckboxChange = () => {
      setAgree(!agree);
    };
  
    useEffect(() => {
      calculatePrice();
    }, [quantity,size,design]);
  
    const handleThumbnailClick = (image) => {
      setMainImage(image);
    };
  
    const calculatePrice = () => {
      let price = 0;
  
      if(size === "1x1.5"){
        if(quantity === "50") price = 1800;
        else if(quantity === "100") price = 3186;
        else if(quantity === "200") price = 6136;
        else if(quantity === "300") price = 9027;
        else if(quantity === "500") price = 14455;
        else if(quantity === "1000") price = 28320;
      }
      else if(size === "1.5x1.5"){
        if(quantity === "50") price = 2650;
        else if(quantity === "100") price = 4720;
        else if(quantity === "200") price = 9322;
        else if(quantity === "300") price = 13630;
        else if(quantity === "500") price = 21830;
        else if(quantity === "1000") price = 42480;
      }
      else if(size === "2x1.5"){
        if(quantity === "50") price = 3500;
        else if(quantity === "100") price = 6372;
        else if(quantity === "200") price = 12508;
        else if(quantity === "300") price = 18054;
        else if(quantity === "500") price = 29204;
        else if(quantity === "1000") price = 56640;
      }
      else if(size === "2x2.5"){
        if(quantity === "50") price = 5900;
        else if(quantity === "100") price = 10620;
        else if(quantity === "200") price = 20650;
        else if(quantity === "300") price = 30090;
        else if(quantity === "500") price = 48675;
        else if(quantity === "1000") price = 94400;
      }
      else if(size === "2x2"){
        if(quantity === "50") price = 4750;
        else if(quantity === "100") price = 8496;
        else if(quantity === "200") price = 16520;
        else if(quantity === "300") price = 24072;
        else if(quantity === "500") price = 38940;
        else if(quantity === "1000") price = 75520;
      }
      else if(size === "2x3"){
        if(quantity === "50") price = 7250;
        else if(quantity === "100") price = 12744;
        else if(quantity === "200") price = 25488;
        else if(quantity === "300") price = 36108;
        else if(quantity === "500") price = 58410;
        else if(quantity === "1000") price = 113280;
      }
      else if(size === "2x4"){
        if(quantity === "50") price = 9400;
        else if(quantity === "100") price = 16992;
        else if(quantity === "200") price = 33040;
        else if(quantity === "300") price = 48144;
        else if(quantity === "500") price = 77880;
        else if(quantity === "1000") price = 151040;
      }
      else if(size === "3x4"){
        if(quantity === "50") price = 14160;
        else if(quantity === "100") price = 25488;
        else if(quantity === "200") price = 49560;
        else if(quantity === "300") price = 72216;
        else if(quantity === "500") price = 116820;
        else if(quantity === "1000") price = 226560;
      }

      if(design === 'Yes Please'){
        price +=300
      }
      
  
      setTotalPrice(price);
    };
  
    const handleSubmit = () => {
      const message = `
              *Sunpack Printing (#PB0037)*:
              - Size: ${size}
              - Quantity: ${quantity}
              - Design: ${design}
              - Price: ₹${totalPrice} incl (GST) + Shipping charges
              *6 Days Delivery (From Ordered Date)*
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
              <Link to="/category/Marketing%20and%20Promotionals%20Items" className="hover:underline">
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
            <h3 className="font-medium text-3xl flex items-center gap-5">
              Sunpack Printing<br /> <small className="text-base">(#PB0037)</small>
            </h3>

            {/* Form Fields */}
  
            <div className="mt-4">
              <label className="block font-medium text-sm text-gray-700">
                Size
              </label>
              <Select
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                <option>1x1.5</option>
                <option>1.5x1.5</option>
                <option>2x1.5</option>
                <option>2x2.5</option>
                <option>2x2</option>
                <option>2x3</option>
                <option>2x4</option>
                <option>3x4</option>
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
                  <HiClock className="text-sm sm:text-xl" />6 Days Delivery
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
                to="https://www.canva.com/search?q=poster"
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
              <li>
                1.3mm Sunpack Sheets
              </li>
              <li>
                2.Direct UV Digital printing (Multicolor)
              </li>
              <li>
                3.Customised Size also possible
              </li>
              <li>
                4.Eyelet Charges 2 extra for per pcs
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
  
import { Breadcrumb, Button, Modal, Select, TextInput } from "flowbite-react";
import Image1 from "../assets/images/marketing_materials/banner.jpg";
import Thumbnail1 from "../assets/images/marketing_materials/banner.jpg";
import Thumbnail2 from "../assets/images/marketing_materials/banner_mtrl.jpg";
import Thumbnail3 from "../assets/images/marketing_materials/banner_mtrl2.jpg";
import { useState } from "react";
import { Link } from "react-router-dom";
import GuideDesign from "../Components/GuideDesign";
import { PopularProducts } from "../Components/PopularProducts";
import { HiHome } from "react-icons/hi";

export function BannersDetails() {
  const [mainImage, setMainImage] = useState(Image1);
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [quality, setQuality] = useState("Normal White Banner");
  const [method, setMethod] = useState("Solvent Printing");
  const [quantity, setQuantity] = useState("1");
  const [design, setDesign] = useState("No Thank You");
  const [openModal, setOpenModal] = useState(false);

  const handleThumbnailClick = (image) => {
    setMainImage(image);
  };

  const handleSubmit = () => {
    const message = `
              *Banners (#PB0042)*:
              - Banner Width: ${width}
              - Banner Height: ${height}
              - Banner Quality: ${quality}
              - Printing Method: ${method}
              - Quantity: ${quantity}
              - Design: ${design}
              - Price: Enquiry 
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
          <h3 className="font-medium text-3xl flex items-center gap-5">
            Banners <br /> <small className="text-base">(#PB0042)</small>
          </h3>

          {/* Form Fields */}

          <div className="flex gap-4">
            <div className="mt-4 flex-1">
              <label className="block font-medium text-sm text-gray-700">
                Banner Width
              </label>
              <TextInput
                min={1}
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>

            <div className="mt-4 flex-1">
              <label className="block font-medium text-sm text-gray-700">
                Banner Height
              </label>
              <TextInput
                min={1}
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Banner Quality
            </label>
            <Select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              <option>Normal White Banner</option>
              <option>Black Back Banner</option>
              <option>Star Banner</option>
              <option>Normal Back Light Banner</option>
              <option>Star Back Light Banner</option>
              <option>Cloth Banner</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Printing Method
            </label>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option>Solvent Printing</option>
              <option>Eco Inject Printing</option>
              <option>UV Printing</option>
            </Select>
          </div>

          <div className="mt-4">
            <label className="block font-medium text-sm text-gray-700">
              Quantity
            </label>
            <TextInput
              min={1}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
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
            <Button
              color="dark"
              onClick={handleSubmit}
              className="rounded-lg w-full"
            >
              Enquire Now
            </Button>
          </div>
          {design === "No Thank You" && (
            <Button
              gradientDuoTone="purpleToBlue"
              className="mt-6 w-full hover:opacity-90"
              as={Link}
              to="https://www.canva.com/search?q=banners"
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
          <ul className="text-base leading-relaxed text-gray-500 ">
            {" "}
            <li>1.Available in Customised Size</li>
            <li>2.Digital printing (Multicolor)</li>
            <li>3.Customised Design also possible</li>
            <li>4.More than 4 Types of Banners</li>
          </ul>
        </div>
      </div>

      <div>
        <PopularProducts />
      </div>
    </div>
  );
}

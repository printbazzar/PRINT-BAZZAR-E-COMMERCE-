import { Button, Label, Modal, Select, Textarea, TextInput } from "flowbite-react";
import React, { useState, useEffect } from "react";
import { useBusinessInfo } from "../context/BusinessInfoContext";

export default function Appoinment() {
  const [openModal, setOpenModal] = useState(false);
  const { businessInfo, getWhatsAppLink } = useBusinessInfo();

  useEffect(() => {
    // Check if modal was already dismissed this session to prevent harassing user
    const hasShown = sessionStorage.getItem("pb_enquiry_modal_shown");
    if (!hasShown) {
      const timer = setTimeout(() => {
        setOpenModal(true);
        sessionStorage.setItem("pb_enquiry_modal_shown", "true");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [enquiry, setEnquiry] = useState("Designing");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!number.trim()) newErrors.number = "Phone number is required";
    if (!enquiry) newErrors.enquiry = "Enquiry type is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const brandName = businessInfo.brand?.brandName || "Print Bazzar";
    const whatsappMessage = `From ${brandName} Quick Enquiry Desk ✈️\n\nName: ${name}\nPhone: ${number}\nEnquiry About: ${enquiry}\nMessage: ${message || "N/A"}`;

    const whatsappURL = getWhatsAppLink(whatsappMessage);
    window.open(whatsappURL, "_blank");

    setName("");
    setNumber("");
    setEnquiry("Designing");
    setMessage("");
    setOpenModal(false);
  };

  return (
    <Modal size="lg" show={openModal} onClose={() => setOpenModal(false)}>
      <Modal.Header className="bg-yellow-300 text-black">
        <span className="font-extrabold text-gray-900">Enquire Now — Quick Consultation</span>
      </Modal.Header>
      <Modal.Body className="bg-gray-50">
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <div>
              <Label value="Your Name *" className="text-xs font-bold" />
              <TextInput
                type="text"
                placeholder="Enter Your Name"
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors({ ...errors, name: "" });
                }}
                className="mt-1"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label value="Your Phone Number *" className="text-xs font-bold" />
              <TextInput
                type="tel"
                placeholder="Enter 10-digit Mobile Number"
                id="number"
                autoComplete="tel"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value);
                  setErrors({ ...errors, number: "" });
                }}
                className="mt-1 font-mono"
              />
              {errors.number && <p className="text-red-500 text-xs mt-1">{errors.number}</p>}
            </div>

            <div>
              <Label value="Enquiry About *" className="text-xs font-bold" />
              <Select
                id="enquiry"
                value={enquiry}
                onChange={(e) => {
                  setEnquiry(e.target.value);
                  setErrors({ ...errors, enquiry: "" });
                }}
                className="mt-1"
              >
                <option value="Designing">Custom Graphic Designing</option>
                <option value="Printing">Commercial Printing</option>
                <option value="Packaging">Custom Packaging & Boxes</option>
                <option value="Bulk/Corporate">Bulk Corporate Order</option>
                <option value="Other">Other Query</option>
              </Select>
              {errors.enquiry && <p className="text-red-500 text-xs mt-1">{errors.enquiry}</p>}
            </div>

            <div>
              <Label value="Your Requirements (Optional)" className="text-xs font-bold" />
              <Textarea
                id="message"
                rows={3}
                placeholder="Mention product name, size, quantity or specifications..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <Button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold uppercase text-xs shadow-md border-0"
            >
              Send via WhatsApp Desk ➔
            </Button>
          </form>
        </div>
      </Modal.Body>
    </Modal>
  );
}

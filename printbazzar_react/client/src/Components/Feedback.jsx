import React, { useState } from "react";
import background from "../assets/images/feedbackbg.jpg";
import { Button, Label, Select, Textarea, TextInput } from "flowbite-react";
import { useBusinessInfo } from "../context/BusinessInfoContext";

export default function Feedback() {
  const { businessInfo, getWhatsAppLink } = useBusinessInfo();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enquiry, setEnquiry] = useState("Designing");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState({});

  const brandName = businessInfo.brand?.brandName || "Print Bazzar";

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!enquiry) newErrors.enquiry = "Enquiry type is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const whatsappMessage = `From ${brandName} Website Enquiry Desk\n\nName: ${name}\nEmail: ${email}\nEnquiry About: ${enquiry}\nMessage: ${message || "N/A"}\nFeedback: ${feedback || "N/A"}`;
    const whatsappURL = getWhatsAppLink(whatsappMessage);

    window.open(whatsappURL, "_blank");
    setName("");
    setEmail("");
    setEnquiry("Designing");
    setMessage("");
    setFeedback("");
  };

  return (
    <div className="relative min-h-full bg-gray-800 flex items-center justify-center my-5">
      <div className="absolute inset-0 bg-black opacity-40">
        <img
          src={background}
          alt="Background"
          className="object-cover w-full h-full"
        />
      </div>
      <div className="relative mx-0 lg:mx-20 z-10 w-full flex flex-col md:flex-row items-center justify-between md:items-center p-8 lg:gap-8">
        <div className="flex-1 text-white mb-8 md:mb-0">
          <h3 className="text-sm uppercase tracking-wider text-yellow-400 font-bold">
            Customer Support & Consultation
          </h3>
          <h2 className="text-3xl md:text-4xl font-extrabold my-4 tracking-tight">
            Receive Expert Printing Guidance Anytime
          </h2>
          <p className="mb-6 text-sm lg:text-base text-gray-200 leading-relaxed">
            Have a question or need custom specifications? Send your requirements directly to our prepress technical team for fast, customized advice tailored to your brand.
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">
            Whether you need assistance with custom prints, packaging design, or volume quotes, we are here to support your business with industrial precision.
          </p>
        </div>

        <div className="flex-1 bg-white text-gray-900 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-lg">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 w-full"
          >
            <h3 className="text-xl font-extrabold text-gray-900 border-b pb-2">
              Send Your Enquiry
            </h3>

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
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label value="Your Email Address *" className="text-xs font-bold" />
              <TextInput
                type="email"
                placeholder="Enter Your Email"
                id="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({ ...errors, email: "" });
                }}
                className="mt-1"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
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
                <option value="Designing">Graphic Designing</option>
                <option value="Printing">Commercial Printing</option>
                <option value="Packaging">Packaging & Labeling</option>
                <option value="Both">Complete Brand Solutions</option>
                <option value="Other">Other Enquiry</option>
              </Select>
              {errors.enquiry && (
                <p className="text-red-500 text-xs mt-1">{errors.enquiry}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label value="Your Requirements (Optional)" className="text-xs font-bold" />
                <Textarea
                  id="message"
                  rows={3}
                  placeholder="Specify product, size, finish..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div className="flex-1">
                <Label value="Feedback / Query (Optional)" className="text-xs font-bold" />
                <Textarea
                  id="feedback"
                  rows={3}
                  placeholder="Any feedback or notes..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold uppercase text-xs shadow-md border-0 mt-2"
            >
              Send via WhatsApp Desk ➔
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

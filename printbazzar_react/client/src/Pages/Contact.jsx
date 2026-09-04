import React, { useState } from 'react';
import { FaLocationDot } from "react-icons/fa6";
import { FaClock, FaPhoneAlt } from "react-icons/fa";
import { IoMdMail } from "react-icons/io";
import { Breadcrumb, Button, Label, Select, Textarea, TextInput } from 'flowbite-react';
import { HiHome } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { useBusinessInfo } from '../context/BusinessInfoContext';

export default function Contact() {
  const { businessInfo, getWhatsAppLink, getPhoneLink, getEmailLink } = useBusinessInfo();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [enquiry, setEnquiry] = useState('Designing');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState({});

  const brandName = businessInfo.brand?.brandName || 'Print Bazzar';
  const primaryPhone = businessInfo.contact?.primaryPhone || '+91 96290 98565';
  const secondaryPhone = businessInfo.contact?.secondaryPhone || '+91 90802 85852';
  const supportEmail = businessInfo.contact?.supportEmail || 'printbazzar.online@gmail.com';
  const salesEmail = businessInfo.contact?.salesEmail || 'orders@printbazzar.online';
  const address = businessInfo.address?.fullDisplayAddress || '12 A, Allimal Street, Big Bazzar St, Tiruchirapalli, Tamilnadu - 620008';
  const operatingHours = businessInfo.operatingHours?.weekdays || 'Monday - Saturday (9:30 AM - 8:30 PM)';
  const mapsEmbedUrl = businessInfo.address?.googleMapsEmbedUrl || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.845502929111!2d78.6958639740178!3d10.82313285833257!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf56a25155d79%3A0xa5c86a1e72feb8cb!2sPrint%20Bazzar!5e0!3m2!1sen!2sin!4v1737012346833!5m2!1sen!2sin';

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!enquiry) newErrors.enquiry = 'Enquiry type is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const whatsappMessage = `From ${brandName} Contact Page ✈️\n\nName: ${name}\nEmail: ${email}\nEnquiry About: ${enquiry}\nMessage: ${message || 'N/A'}\nFeedback: ${feedback || 'N/A'}`;
    const whatsappURL = getWhatsAppLink(whatsappMessage);

    window.open(whatsappURL, '_blank');
    setName('');
    setEmail('');
    setEnquiry('Designing');
    setMessage('');
    setFeedback('');
  };

  return (
    <div>
      <div className="px-4 py-2 mt-2 max-w-7xl mx-auto">
        <Breadcrumb className="text-base lg:text-lg">
          <Breadcrumb.Item icon={HiHome}>
            <Link to="/" className="hover:underline">
              Home
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span className="text-gray-600">Contact</span>
          </Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <div className="my-4 md:my-8 text-center py-2 flex flex-col gap-2 max-w-7xl mx-auto p-4">
        <h1 className="text-2xl md:text-4xl text-gray-900 font-extrabold tracking-tight">
          Have Questions? <span className="text-yellow-400">Get In Touch</span>
        </h1>
        <div className="flex justify-center items-center gap-2">
          <span className="text-gray-500 text-xs sm:text-sm font-medium">
            🕒 {operatingHours}
          </span>
        </div>

        <div className="flex flex-col-reverse lg:flex-row gap-6 mt-4">
          {/* Contact Details Cards */}
          <div className="flex flex-1 flex-col gap-4">
            {/* Location Card */}
            <div className="bg-gray-50 p-6 sm:p-8 shadow-md rounded-2xl border border-gray-100 text-left">
              <div className="flex items-start gap-4">
                <div className="bg-yellow-400 rounded-full p-3.5 shrink-0 text-black shadow-sm">
                  <FaLocationDot className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Our Location</span>
                  <p className="text-sm sm:text-base font-semibold text-gray-800 mt-1 leading-snug">
                    {address}
                  </p>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-gray-50 p-6 sm:p-8 shadow-md rounded-2xl border border-gray-100 text-left">
              <div className="flex items-start gap-4">
                <div className="bg-yellow-400 rounded-full p-3.5 shrink-0 text-black shadow-sm">
                  <FaPhoneAlt className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Let's Talk</span>
                  <div className="mt-1 space-y-0.5">
                    <div>
                      <a href={getPhoneLink(false)} className="text-sm sm:text-base font-bold text-gray-900 hover:text-yellow-600 font-mono">
                        {primaryPhone}
                      </a>
                      <span className="text-xs text-gray-500 ml-2">(Primary Support)</span>
                    </div>
                    {secondaryPhone && (
                      <div>
                        <a href={getPhoneLink(true)} className="text-sm font-semibold text-gray-700 hover:text-yellow-600 font-mono">
                          {secondaryPhone}
                        </a>
                        <span className="text-xs text-gray-500 ml-2">(Alternate / Press Desk)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Email Card */}
            <div className="bg-gray-50 p-6 sm:p-8 shadow-md rounded-2xl border border-gray-100 text-left">
              <div className="flex items-start gap-4">
                <div className="bg-yellow-400 rounded-full p-3.5 shrink-0 text-black shadow-sm">
                  <IoMdMail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Drop a Line</span>
                  <div className="mt-1 space-y-0.5">
                    <div>
                      <a href={getEmailLink('support')} className="text-sm sm:text-base font-bold text-gray-900 hover:text-yellow-600">
                        {supportEmail}
                      </a>
                    </div>
                    {salesEmail && salesEmail !== supportEmail && (
                      <div>
                        <a href={getEmailLink('sales')} className="text-xs text-gray-600 hover:text-yellow-600">
                          {salesEmail} <span className="text-gray-400">(Orders Desk)</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Enquiry Form */}
          <div className="flex-1 bg-white p-6 sm:p-8 shadow-xl rounded-2xl border border-gray-200 text-left">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
              <h2 className="text-yellow-500 text-xl font-extrabold tracking-tight border-b pb-2">
                Enquire Now
              </h2>

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
                    setErrors({ ...errors, name: '' });
                  }}
                  className="mt-1"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
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
                    setErrors({ ...errors, email: '' });
                  }}
                  className="mt-1"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label value="Enquiry About *" className="text-xs font-bold" />
                <Select
                  id="enquiry"
                  value={enquiry}
                  onChange={(e) => {
                    setEnquiry(e.target.value);
                    setErrors({ ...errors, enquiry: '' });
                  }}
                  className="mt-1"
                >
                  <option value="Designing">Graphic Designing</option>
                  <option value="Printing">Offset & Digital Printing</option>
                  <option value="Both">Both Design & Printing</option>
                  <option value="Bulk Orders">Bulk Corporate Orders</option>
                  <option value="Other">Other Query</option>
                </Select>
                {errors.enquiry && <p className="text-red-500 text-xs mt-1">{errors.enquiry}</p>}
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Label value="Your Message (Optional)" className="text-xs font-bold" />
                  <Textarea
                    id="message"
                    rows={3}
                    placeholder="Product specifications or query..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <Label value="Feedback (Optional)" className="text-xs font-bold" />
                  <Textarea
                    id="feedback"
                    rows={3}
                    placeholder="Any comments or feedback..."
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
                Send Message via WhatsApp Desk ➔
              </Button>
            </form>
          </div>
        </div>

        {/* Embedded Google Maps */}
        {mapsEmbedUrl && (
          <div className="mt-8 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <iframe
              src={mapsEmbedUrl}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Print Bazzar Press Location Map"
            />
          </div>
        )}
      </div>
    </div>
  );
}
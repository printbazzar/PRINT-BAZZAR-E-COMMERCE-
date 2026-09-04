import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Breadcrumb, TextInput, Textarea, Select, Button, Label } from 'flowbite-react';
import {
  HiHome,
  HiOutlineSparkles,
  HiOutlineOfficeBuilding,
  HiOutlinePhone,
  HiOutlineMail,
  HiCheckCircle,
} from 'react-icons/hi';
import { BsWhatsapp } from 'react-icons/bs';
import { useBusinessInfo } from '../context/BusinessInfoContext';

export default function QuoteRequestPage() {
  const { businessInfo, getWhatsAppLink } = useBusinessInfo();
  const [searchParams] = useSearchParams();
  const quoteTypeParam = searchParams.get('type') || 'corporate';

  const [formData, setFormData] = useState({
    contactName: '',
    companyName: '',
    phone: '',
    email: '',
    city: 'Tiruchirappalli',
    serviceType: quoteTypeParam === 'bulk' ? 'Bulk Printing' : quoteTypeParam === 'branding' ? 'Brand Identity' : 'Corporate Orders',
    quantity: '500',
    details: '',
  });

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Request a Quote & Corporate Orders | Print Bazzar';
    if (quoteTypeParam === 'bulk') {
      setFormData((prev) => ({ ...prev, serviceType: 'Bulk Printing' }));
    } else if (quoteTypeParam === 'branding') {
      setFormData((prev) => ({ ...prev, serviceType: 'Brand Identity' }));
    } else {
      setFormData((prev) => ({ ...prev, serviceType: 'Corporate Orders' }));
    }
  }, [quoteTypeParam]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleWhatsAppQuote = () => {
    const brandName = businessInfo.brand?.brandName || 'Print Bazzar';
    const message = `*Custom Quote Request — ${brandName}*\n\n• Name: ${formData.contactName || 'Valued Customer'}\n• Company: ${formData.companyName || 'N/A'}\n• Phone: ${formData.phone || 'N/A'}\n• Service: ${formData.serviceType}\n• Estimated Qty: ${formData.quantity}\n• City: ${formData.city}\n• Project Details: ${formData.details || 'Standard specifications'}`;
    const url = getWhatsAppLink(message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <Breadcrumb className="text-xs sm:text-sm mb-6">
          <Breadcrumb.Item icon={HiHome}>
            <Link to="/" className="hover:underline text-gray-700">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/shop" className="hover:underline text-gray-700">Services</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span className="font-semibold text-gray-900">Custom Quote & Corporate Enquiry</span>
          </Breadcrumb.Item>
        </Breadcrumb>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Hero Header */}
          <div className="bg-black text-white p-6 sm:p-10 border-b-4 border-yellow-400">
            <div className="inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-300 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              <HiOutlineOfficeBuilding className="w-4 h-4" /> B2B & Corporate Services
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Request a Custom Print Quotation
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm max-w-xl mt-2 leading-relaxed">
              Tailored commercial printing, wholesale volume discounts, brand packaging, and corporate merchandise. Get competitive factory pricing within 2 hours.
            </p>
          </div>

          <div className="p-6 sm:p-10">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <HiCheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Quotation Request Received!</h2>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  Thank you, <strong>{formData.contactName}</strong>. Our B2B commercial estimator will review your specifications and send your official quotation via email and WhatsApp.
                </p>
                <div className="pt-4 flex justify-center gap-3">
                  <Button onClick={handleWhatsAppQuote} color="success" className="font-bold">
                    <BsWhatsapp className="w-4 h-4 mr-2" /> Connect on WhatsApp Now
                  </Button>
                  <Button as={Link} to="/" color="gray" className="font-bold">
                    Back to Store
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label value="Your Full Name *" />
                    <TextInput
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label value="Company / Brand Name" />
                    <TextInput
                      placeholder="e.g. Apex Tech Solutions Pvt Ltd"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <Label value="Mobile / WhatsApp Number *" />
                    <TextInput
                      required
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label value="Business Email *" />
                    <TextInput
                      required
                      type="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label value="Delivery City *" />
                    <TextInput
                      required
                      placeholder="e.g. Trichy / Chennai"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label value="Service Required *" />
                    <Select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    >
                      <option value="Corporate Orders">Corporate Stationery & Staff Kits</option>
                      <option value="Bulk Printing">Wholesale Bulk Offset Printing (1,000+ pcs)</option>
                      <option value="Brand Identity">Business Branding & Logo Collateral</option>
                      <option value="Custom Packaging">Custom Packaging, Rigid Boxes & Paper Bags</option>
                      <option value="Signage Solutions">Outdoor Signboards, Acrylic & Flex Banners</option>
                      <option value="Reseller Program">Reseller / Printing Partner Program</option>
                      <option value="Other">Other Custom Print Requirement</option>
                    </Select>
                  </div>
                  <div>
                    <Label value="Estimated Quantity" />
                    <TextInput
                      placeholder="e.g. 1000, 5000, 10000 pcs"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label value="Project Specifications & Notes" />
                  <Textarea
                    rows={4}
                    placeholder="Describe paper GSM (e.g. 350 GSM Art Board), size, lamination (Matte / Gloss / Velvet), special finishes (Spot UV, Gold Foil, Embossing), or delivery deadlines..."
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  />
                </div>

                {/* Submission Actions */}
                <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <HiOutlineSparkles className="w-4 h-4 text-yellow-500" />
                    <span>Instant WhatsApp assistance available</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                      type="button"
                      onClick={handleWhatsAppQuote}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                      <BsWhatsapp className="w-4 h-4 mr-1.5" />
                      <span>Quote via WhatsApp</span>
                    </Button>
                    <Button type="submit" color="dark" className="font-extrabold w-full sm:w-auto">
                      Submit Online Request
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

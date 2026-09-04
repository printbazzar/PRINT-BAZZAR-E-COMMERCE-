import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const DEFAULT_BUSINESS_INFO = {
  brand: {
    brandName: "Print Bazzar",
    legalName: "Print Bazzar",
    tagline: "Industrial Precision Printing & Creative Design Studio",
    foundedYear: "2019",
    logoLightUrl: "/assets/images/logo_white.png",
    logoDarkUrl: "/assets/images/logo_black.png",
    faviconUrl: "/favicon.ico"
  },
  tax: {
    gstin: "33AAAAA0000A1Z5",
    isGstinVerified: false,
    msmeRegistration: "UDYAM-TN-27-0000000",
    isMsmeVerified: false,
    pan: "",
    stateCode: "33",
    stateName: "Tamil Nadu",
    taxRatePercentage: 18
  },
  address: {
    buildingNumber: "No. 42 / 12 A",
    street: "Allimal Street / Big Bazzar Street",
    landmark: "Singarathope",
    city: "Tiruchirappalli",
    district: "Tiruchirappalli",
    state: "Tamil Nadu",
    pincode: "620008",
    country: "India",
    fullDisplayAddress: "12 A, Allimal Street, Big Bazzar St, Singarathope, Tiruchirapalli, Tamil Nadu - 620008",
    pressFacilityAddress: "Print Bazzar Press Facility, No. 42 Big Bazzar St, Singarathope, Trichy - 620008",
    googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.845502929111!2d78.6958639740178!3d10.82313285833257!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf56a25155d79%3A0xa5c86a1e72feb8cb!2sPrint%20Bazzar!5e0!3m2!1sen!2sin!4v1737012346833!5m2!1sen!2sin",
    googleMapsDirectionUrl: "https://maps.google.com/?q=Print+Bazzar+Trichy"
  },
  contact: {
    primaryPhone: "+91 96290 98565",
    secondaryPhone: "+91 90802 85852",
    whatsappNumber: "919629098565",
    supportEmail: "printbazzar.online@gmail.com",
    salesEmail: "orders@printbazzar.online",
    corporateEmail: "corporate@printbazzar.online",
    deskNotice: "Direct helpline available Monday to Saturday during press operating hours."
  },
  operatingHours: {
    weekdays: "Monday - Saturday: 9:30 AM - 8:30 PM",
    sunday: "Sunday: Closed",
    lunchBreak: "1:30 PM - 2:30 PM",
    turnaroundNotice: "Online orders accepted 24/7. Offset printing presses run 6 days a week."
  },
  socials: {
    facebook: { url: "https://www.facebook.com/printbazzartry?mibextid=ZbWKwL", isEnabled: true },
    instagram: { url: "", isEnabled: false },
    twitter: { url: "", isEnabled: false },
    linkedin: { url: "", isEnabled: false },
    youtube: { url: "", isEnabled: false }
  },
  flags: {
    gstinRequiresInput: true,
    msmeRequiresInput: true,
    panRequiresInput: true,
    corporateEmailRequiresInput: false
  }
};

const BusinessInfoContext = createContext({
  businessInfo: DEFAULT_BUSINESS_INFO,
  isLoading: false,
  getWhatsAppLink: () => '',
  getPhoneLink: () => '',
  getEmailLink: () => '',
  refreshBusinessInfo: () => {},
});

export function BusinessInfoProvider({ children }) {
  const [businessInfo, setBusinessInfo] = useState(DEFAULT_BUSINESS_INFO);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBusinessInfo = async () => {
    try {
      setIsLoading(true);
      const res = await api.getPublicBusinessInfo();
      if (res.success && res.data) {
        setBusinessInfo(res.data);
      }
    } catch (err) {
      console.warn('Using default business info fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && businessInfo?.contact?.whatsappNumber) {
      window.__BUSINESS_WHATSAPP__ = businessInfo.contact.whatsappNumber.replace(/[^0-9]/g, '');
    }
  }, [businessInfo]);

  const getWhatsAppLink = (customMessage) => {
    const rawNumber = businessInfo.contact?.whatsappNumber || '919629098565';
    const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
    const defaultMsg = `Hello ${businessInfo.brand?.brandName || 'Print Bazzar'}, I have an inquiry regarding custom printing services.`;
    const message = customMessage || defaultMsg;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  const getPhoneLink = (isSecondary = false) => {
    const phone = isSecondary
      ? (businessInfo.contact?.secondaryPhone || '+91 90802 85852')
      : (businessInfo.contact?.primaryPhone || '+91 96290 98565');
    const cleaned = phone.replace(/[^0-9+]/g, '');
    return `tel:${cleaned}`;
  };

  const getEmailLink = (type = 'support') => {
    let email = businessInfo.contact?.supportEmail || 'printbazzar.online@gmail.com';
    if (type === 'sales') email = businessInfo.contact?.salesEmail || email;
    if (type === 'corporate') email = businessInfo.contact?.corporateEmail || email;
    return `mailto:${email}`;
  };

  return (
    <BusinessInfoContext.Provider
      value={{
        businessInfo,
        isLoading,
        getWhatsAppLink,
        getPhoneLink,
        getEmailLink,
        refreshBusinessInfo: fetchBusinessInfo,
      }}
    >
      {children}
    </BusinessInfoContext.Provider>
  );
}

export const useBusinessInfo = () => useContext(BusinessInfoContext);

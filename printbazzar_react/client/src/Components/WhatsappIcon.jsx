import { useState } from 'react';
import { BsWhatsapp, BsShare, BsX, BsTelephone } from 'react-icons/bs';
import { useBusinessInfo } from '../context/BusinessInfoContext';

function Whatsapp() {
  const [isOpen, setIsOpen] = useState(false);
  const { businessInfo, getWhatsAppLink, getPhoneLink } = useBusinessInfo();

  const toggleIcons = () => {
    setIsOpen(!isOpen);
  };

  const brandName = businessInfo.brand?.brandName || 'Print Bazzar';
  const message = `Hello ${brandName}! I would like to inquire about your custom printing services.`;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: brandName,
          text: `Check out ${brandName} for premium printing services`,
          url: window.location.href,
        })
        .catch((error) => console.log('Error sharing:', error));
    } else {
      alert("Your browser doesn't support native sharing. You can copy the link manually.");
    }
  };

  return (
    <div className="fixed bottom-18 right-3.5 lg:bottom-5 lg:right-8 z-50">
      <div className={`flex flex-col items-center space-y-3 ${isOpen ? 'block' : 'hidden'}`}>
        {/* WhatsApp Button */}
        <div className="bg-green-500 hover:bg-green-600 rounded-full p-3 fixed bottom-36 sm:bottom-32 shadow-lg transition-transform hover:scale-110">
          <a
            href={getWhatsAppLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
          >
            <BsWhatsapp className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </a>
        </div>

        {/* Phone Call Button */}
        <a
          href={getPhoneLink()}
          aria-label="Call Customer Support"
          className="bg-blue-500 hover:bg-blue-600 rounded-full p-3 fixed right-[4.5rem] bottom-[6.5rem] sm:right-[6rem] sm:bottom-[5.8rem] md:right-[6.5rem] shadow-lg transition-transform hover:scale-110"
        >
          <BsTelephone className="w-4 h-4 md:w-6 md:h-6 text-white" />
        </a>

        {/* Native Share Button */}
        <button
          onClick={handleShare}
          aria-label="Share this page"
          className="bg-gray-600 hover:bg-gray-700 rounded-full p-3 fixed bottom-20 right-[4.5rem] sm:bottom-6 sm:right-[6rem] md:right-[6.7rem] shadow-lg transition-transform hover:scale-110"
        >
          <BsShare className="w-4 h-4 md:w-6 md:h-6 text-white" />
        </button>
      </div>

      {/* Toggle Button for Opening and Closing Support Desk */}
      <button
        onClick={toggleIcons}
        aria-label={isOpen ? "Close support desk" : "Open WhatsApp & Phone support desk"}
        className="focus:outline-none"
      >
        {isOpen ? (
          <div className="bg-red-500 hover:bg-red-600 rounded-full p-3 mt-3 shadow-xl transition-transform hover:scale-105">
            <BsX className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
        ) : (
          <div className="bg-green-500 hover:bg-green-600 rounded-full p-3 mt-3 shadow-xl transition-transform hover:scale-105 animate-pulse">
            <BsWhatsapp className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        )}
      </button>
    </div>
  );
}

export default Whatsapp;

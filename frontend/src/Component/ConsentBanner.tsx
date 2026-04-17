import React, { useEffect, useState } from "react";

const ConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner if consent is not accepted (even if rejected)
    const consent = localStorage.getItem("cookie_consent");
    if (consent !== "accepted") setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    // Do not store 'rejected', so banner will show again on refresh
    localStorage.removeItem("cookie_consent");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-0">
      <div className="w-full bg-white dark:bg-black border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 flex flex-col md:flex-row items-center gap-3 justify-center">
        <div className="flex-1 text-center text-gray-700 dark:text-gray-200 text-sm">
          We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and serve personalized content. By clicking "Accept," you consent to our use of cookies. Read more in our <a href="/privacy-policy" className="text-[#00ADB5] underline">Privacy Policy</a>.
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button
            onClick={handleAccept}
            className="bg-[#00ADB5] hover:bg-cyan-600 text-white font-semibold px-5 py-1.5 rounded transition-all"
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-5 py-1.5 rounded transition-all"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;

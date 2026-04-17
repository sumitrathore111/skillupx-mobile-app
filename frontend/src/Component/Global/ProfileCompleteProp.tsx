// src/components/CompleteProfilePopup.tsx
import React, { useEffect, useState } from "react";

interface CompleteProfilePopupProps {
  isProfileComplete: boolean; // pass this from backend or context
}

const CompleteProfilePopup: React.FC<CompleteProfilePopupProps> = ({
  isProfileComplete,
}) => {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!isProfileComplete) {
      setShowPopup(true);
    }
  }, [isProfileComplete]);

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-[90%] max-w-md text-center">
        <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
          Complete Your Profile
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-5">
          To continue using the app, please complete your profile first.
        </p>
        <button
          onClick={() => {
            // redirect user to profile page
            window.location.href = "/profile";
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition"
        >
          Go to Profile
        </button>
      </div>
    </div>
  );
};

export default CompleteProfilePopup;

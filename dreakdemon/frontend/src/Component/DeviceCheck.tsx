
import React from "react";

const DeviceCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // detect if mobile based on screen width (you can also check user agent)
  const isMobile = window.innerWidth < 1024; // <1024px → treat as mobile/tablet

  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-500">⚠️ Not Supported</h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Please login using a <span className="font-semibold">Laptop/Desktop</span>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default DeviceCheck;

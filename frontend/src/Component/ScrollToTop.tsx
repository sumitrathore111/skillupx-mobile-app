import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Track page view in Google Analytics on every route change
    if (window.gtag) {
      window.gtag('config', 'G-CSE31EYVW2', {
        page_path: pathname,
        page_title: document.title,
      });
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;

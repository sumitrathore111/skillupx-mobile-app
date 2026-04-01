import { Link } from "react-router-dom";
import SEO from "../Component/SEO";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
      <SEO
        title="404 – Page Not Found | SkillUpX"
        description="Oops! The page you're looking for doesn't exist on SkillUpX. Head back to explore CodeArena coding battles, project collaboration, learning roadmaps, Developer Connect, and 3000+ DSA questions."
        keywords="404, page not found, SkillUpX, CodeArena, project collaboration, learning roadmaps, Developer Connect, tech reviews, DSA practice"
        canonicalUrl="/"
      />

      <div className="text-center max-w-2xl mx-auto">
        {/* 404 Number */}
        <h1 className="text-[120px] sm:text-[180px] font-black leading-none bg-gradient-to-r from-[#00ADB5] to-cyan-400 bg-clip-text text-transparent select-none">
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            to="/"
            className="px-8 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#00ADB5]/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            Go Home
          </Link>
          <Link
            to="/contact"
            className="px-8 py-3 border-2 border-[#00ADB5] text-[#00ADB5] font-semibold rounded-xl hover:bg-[#00ADB5]/10 transition-all duration-300"
          >
            Contact Us
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 font-medium uppercase tracking-wider">
            Popular Pages
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/about"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded-lg hover:bg-[#00ADB5]/10 hover:text-[#00ADB5] transition-colors"
            >
              About Us
            </Link>
            <Link
              to="/TechUpdate"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded-lg hover:bg-[#00ADB5]/10 hover:text-[#00ADB5] transition-colors"
            >
              Tech Updates
            </Link>
            <Link
              to="/documentation"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded-lg hover:bg-[#00ADB5]/10 hover:text-[#00ADB5] transition-colors"
            >
              Documentation
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded-lg hover:bg-[#00ADB5]/10 hover:text-[#00ADB5] transition-colors"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

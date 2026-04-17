import { Github, Linkedin, Twitter } from "lucide-react";

export default function ComingSoon() {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 px-6">
      {/* Futuristic blurred shapes */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-[#00ADB5] opacity-20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-52 h-52 bg-black dark:bg-white opacity-10 rounded-full blur-3xl"></div>

      <div className="relative text-center max-w-xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-black dark:text-white tracking-tight">
          Dashboard <span className="text-[#00ADB5]">Coming Soon</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          We’re building something futuristic. Stay tuned for updates!
        </p>

        {/* Notify Button */}
        <div className="mt-6">
          <button className="px-6 py-3 rounded-full bg-[#00ADB5] text-white font-semibold shadow-lg hover:bg-black hover:text-[#00ADB5] transition-all">
            Notify Me
          </button>
        </div>

        {/* Social Icons */}
        <div className="mt-8 flex justify-center space-x-6">
          <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#00ADB5] transition-colors">
            <Twitter className="w-6 h-6" />
          </a>
          <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#00ADB5] transition-colors">
            <Github className="w-6 h-6" />
          </a>
          <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#00ADB5] transition-colors">
            <Linkedin className="w-6 h-6" />
          </a>
        </div>
      </div>
    </div>
  );
}

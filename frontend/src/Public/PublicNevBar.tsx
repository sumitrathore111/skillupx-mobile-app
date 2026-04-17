import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Book, Home, Info, LogIn, Menu, Moon, Phone, Sun, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useTheme } from "../Context/ThemeContext";

const PublicNavBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const navItems = [
        { id: "home", label: "Home", icon: <Home className="w-5 h-5" />, path: '/' },
        { id: "about", label: "About", icon: <Info className="w-5 h-5" />, path: '/about' },
        { id: "contact", label: "Contact Us", icon: <Phone className="w-5 h-5" />, path: '/contact' },
        { id: "TechUpdate", label: "TechUpdate", icon: <Book className="w-5 h-5" />, path: '/TechUpdate' },
    ];

    const authItems = user
        ? [{ id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-5 h-5" />, path: '/dashboard/db' }]
        : [
            { id: "login", label: "Login", icon: <LogIn className="w-5 h-5" />, path: '/login' },
            { id: "register", label: "Register", icon: <UserPlus className="w-5 h-5" />, path: '/signup' }
          ];

    const allItems = [...navItems, ...authItems];

    const linkAnimation = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 } };
    const MotionLink = motion(Link)
    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-white dark:bg-black shadow-sm ${isScrolled ? 'shadow-md' : ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                   <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <img src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg" alt="SkillUpX Logo" width={32} height={32} className="w-8 h-8" />
                        </div>
                        <span className="font-semibold text-lg text-gray-900 dark:text-white">SkillUpX</span>
                    </Link>

                    {/* Desktop Menu - Centered */}
                    <div className="hidden md:flex items-center justify-center flex-1">
                        <div className="flex items-center space-x-6">
                            {allItems.map((item, idx) => (
                            <MotionLink
                                key={item.id}
                                to={item.path}
                                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                                    location.pathname === item.path
                                        ? "bg-primary text-primary-foreground dark:bg-neutral dark:text-white"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                                }`}
                                initial="hidden"
                                animate="visible"
                                variants={linkAnimation}
                                transition={{ delay: idx * 0.05 }}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </MotionLink>
                        ))}
                        </div>
                    </div>

                    {/* Theme Toggle Button */}
                    <div className="hidden md:flex items-center">
                        <motion.button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Toggle theme"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {theme === 'dark' ? (
                                    <motion.div
                                        key="sun"
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Sun className="w-5 h-5 text-yellow-500" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="moon"
                                        initial={{ rotate: 90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -90, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Moon className="w-5 h-5 text-gray-700" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center space-x-2">
                        {/* Theme Toggle for Mobile */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-md hover:bg-accent dark:hover:bg-gray-800"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-yellow-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-gray-700" />
                            )}
                        </button>
                        <button onClick={() => setIsOpen(true)} className="p-2 rounded-md hover:bg-accent dark:hover:bg-gray-800 dark:text-white">
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            className="absolute left-0 top-0 w-64 h-full bg-white dark:bg-gray-900 p-6 shadow-lg"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center space-x-1">
                                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                        <img src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg" alt="SkillUpX Logo" width={32} height={32} className="w-8 h-8" />
                                    </div>
                                    <span className="font-semibold text-lg dark:text-white">SkillUpX</span>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-2 rounded-md hover:bg-accent dark:hover:bg-gray-800 dark:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex flex-col space-y-3">
                                {allItems.map((item, idx) => (
                                    <MotionLink
                                        key={item.id}
                                        to={item.path}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition ${
                                            location.pathname === item.path
                                                ? "bg-primary text-primary-foreground dark:bg-neutral dark:text-white"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                                        }`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </MotionLink>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default PublicNavBar;

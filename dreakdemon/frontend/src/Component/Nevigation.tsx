import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    BookOpen,
    ChevronsLeft,
    DoorOpen,
    Folder,
    Home,
    LogOut,
    Map,
    Menu,
    Moon,
    Sun,
    Target,
    Trophy,
    UserCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useBattleGuard } from '../Context/BattleGuardContext';
import { useTheme } from "../Context/ThemeContext";
import { useDataContext } from "../Context/UserDataContext";
import { logout } from "../service/auth";

export default function DashboardLayout() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const location = useLocation();
  const navigation = useNavigate();
  const { isBattleActive, activeBattleId, forfeitBattle } = useBattleGuard();
  const [showBattleBlockModal, setShowBattleBlockModal] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { fetchAllIdeas, fetchJoinRequests, userprofile } = useDataContext();

  const navItems = [
    { name: "DashBoard", path: "/dashboard/db", icon: <Home size={20} /> },
    { name: "Creator Corner", path: "/dashboard/projects", icon: <Folder size={20} /> },
    { name: "Developer Connect", path: "/dashboard/developer-connect", icon: <BookOpen size={20} /> },
    { name: "CodeArena", path: "/dashboard/codearena", icon: <Trophy size={20} /> },
    { name: "Learning Roadmaps", path: "/dashboard/roadmaps", icon: <Map size={20} /> },
    { name: "Practice DSA", path: "/dashboard/practice", icon: <Target size={20} /> },
    { name: "Profile Info", path: "/dashboard/profile", icon: <UserCircle size={20} /> },
  ];

  const { user, clearUser } = useAuth();

  // Load pending requests count for projects where user is the creator
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!user) return;

      try {
        const ideas = await fetchAllIdeas();
        // Get only approved projects where the current user is the creator
        const myProjects = ideas.filter((idea: any) => idea.userId === user.id && idea.status === 'approved');

        let totalPending = 0;
        for (const project of myProjects) {
          // Fetch join requests for each project
          const requests = await fetchJoinRequests(project.projectId || project.id);
          // Count only pending requests
          const pendingRequests = requests.filter((req: any) => req.status === 'pending');
          totalPending += pendingRequests.length;
        }

        setPendingRequestsCount(totalPending);
      } catch (error) {
        console.error('Error loading pending requests:', error);
      }
    };

    loadPendingRequests();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [user, fetchAllIdeas, fetchJoinRequests]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={`fixed lg:static top-0 left-0 h-full bg-white dark:bg-black flex flex-col transition-all duration-300 z-[60] shadow-lg lg:shadow-none border-r border-gray-200 dark:border-gray-700 overflow-visible
          ${isMinimized ? "w-20" : "w-64"}
          ${isDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Sidebar Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="relative flex items-center justify-between p-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex-shrink-0 flex items-center justify-start">
                <img
                  src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg"
                  alt="App Logo"
                  className="w-8 h-8 object-contain"
                />
              </Link>

              {!isMinimized && (
                <Link
                  to="/"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-xl font-bold text-gray-800 dark:text-white transition-all duration-300 truncate"
                >
                  SkillUpX
                </Link>
              )}
            </div>

            {/* Minimize Button - Desktop Only */}
            <button
              className="hidden lg:flex flex-shrink-0 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"

              onClick={() => setIsMinimized(!isMinimized)}
            >
              <ChevronsLeft
                size={20}
                className={`transition-transform duration-300 dark:text-white ${
                  isMinimized ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Close Button - Mobile Only */}
            <button
              className="lg:hidden flex-shrink-0 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setIsDrawerOpen(false)}
            >
              <ChevronsLeft size={20} className="dark:text-white" />
            </button>
          </div>
        </div>

        {/* Navigation Links - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <div key={item.name} className="relative">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => {
                      if (isBattleActive) {
                        e.preventDefault();
                        setPendingNavPath(item.path);
                        setShowBattleBlockModal(true);
                        return;
                      }
                      setIsDrawerOpen(false);
                      navigation(item.path);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group cursor-pointer
                      ${
                        isActive
                          ? "text-white shadow-md"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    style={{ backgroundColor: isActive ? "#00ADB5" : "" }}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!isMinimized && (
                      <span className="truncate text-sm font-medium">{item.name}</span>
                    )}
                    {/* Notification Badge for Projects - Full sidebar */}
                    {item.path === '/dashboard/projects' && pendingRequestsCount > 0 && !isMinimized && (
                      <span className="ml-auto flex-shrink-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                      </span>
                    )}
                    {/* Notification Badge for Projects - Minimized sidebar */}
                    {item.path === '/dashboard/projects' && pendingRequestsCount > 0 && isMinimized && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                      </span>
                    )}
                    {/* Tooltip - only when minimized on desktop */}
                    {isMinimized && (
                      <div className="hidden lg:block fixed ml-3 px-3 py-2 rounded-lg shadow-xl bg-gray-900 text-white text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none z-50"
                        style={{
                          left: '80px', // 80px sidebar + 12px gap
                          transform: 'translateY(-50%)'
                        }}
                      >
                        {item.name}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-900"></div>
                      </div>
                    )}
                  </span>
                </div>
              );
            })}
                {/* Battle Block Modal */}
                <AnimatePresence>
                  {showBattleBlockModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    >
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-gray-800 border-2 border-orange-500 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                      >
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-orange-500" />
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2">Leave Battle?</h3>
                          <p className="text-gray-300 mb-6">
                            You have an active battle in progress. If you leave now, you will <span className="text-red-400 font-semibold">forfeit</span> and your opponent will win the prize!
                          </p>

                          <div className="flex gap-3">
                            <button
                              onClick={async () => {
                                // Forfeit and navigate
                                await forfeitBattle();
                                setShowBattleBlockModal(false);
                                if (pendingNavPath) {
                                  navigation(pendingNavPath);
                                  setPendingNavPath(null);
                                }
                              }}
                              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                              <DoorOpen className="w-5 h-5" />
                              Leave Battle
                            </button>
                            <button
                              onClick={() => {
                                setShowBattleBlockModal(false);
                                setPendingNavPath(null);
                                // Navigate back to battle
                                if (activeBattleId) {
                                  navigation(`/dashboard/codearena/battle/${activeBattleId}`);
                                }
                              }}
                              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <Trophy className="w-5 h-5" />
                              Continue Battle
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
          </nav>
        </div>

        {/* Fixed Profile Section at Bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-black overflow-visible">
          {/* Theme Toggle */}
          <div className={`flex items-center gap-2 mb-3 ${isMinimized ? 'justify-center' : ''}`}>
            <button
              onClick={toggleTheme}
              className={`p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors group relative ${isMinimized ? '' : 'flex items-center gap-2'}`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
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
                    <Sun size={18} className="text-yellow-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon size={18} className="text-gray-500 dark:text-gray-400" />
                  </motion.div>
                )}
              </AnimatePresence>
              {!isMinimized && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              )}
              {isMinimized && (
                <div className="hidden lg:block fixed ml-3 px-3 py-2 rounded-lg shadow-xl bg-gray-900 text-white text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none z-50"
                  style={{ left: '80px' }}
                >
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </div>
              )}
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSignOut(!showSignOut)}
              className={`flex items-center w-full hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors group ${
                isMinimized ? "justify-center" : "gap-3"
              }`}
            >
              {/* Avatar/Emoji */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: "#00ADB5" }}
              >
                {(() => {
                  const avatar = userprofile?.avatar;
                  if (avatar && avatar.trim() !== '') {
                    // Check if it's a URL or emoji
                    if (avatar.startsWith('http')) {
                      return (
                        <img
                          src={avatar}
                          alt="User Avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      );
                    } else {
                      // It's an emoji
                      return <span className="text-2xl">{avatar}</span>;
                    }
                  }
                  // Fallback to first letter of name
                  return (
                    <span className="text-white font-bold text-lg">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  );
                })()}
              </div>

              {/* User Info */}
              {!isMinimized && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold truncate text-sm dark:text-white">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
              )}

              {/* Tooltip for minimized state */}
              {isMinimized && (
                <div className="hidden lg:block fixed ml-3 px-3 py-2 rounded-lg shadow-xl bg-gray-900 text-white text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none z-[9999]"
                  style={{
                    left: '92px', // 80px sidebar + 12px gap
                    bottom: '24px'
                  }}
                >
                  <p className="font-semibold">{user?.name || "User"}</p>
                  <p className="text-xs text-gray-300">{user?.email || "user@example.com"}</p>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-900"></div>
                </div>
              )}
            </button>
          </div>

          {/* Animated Sign Out */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              showSignOut ? "max-h-20 mt-3 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <button
              className={`flex items-center gap-2 py-2.5 px-3 w-full rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium ${
                isMinimized ? "justify-center" : ""
              }`}
              onClick={() => {
                logout();
                clearUser();
                navigation("/");
              }}
            >
              <LogOut size={18} />
              {!isMinimized && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Dark overlay for mobile drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-[55] backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar (mobile only) */}
        <div className="lg:hidden flex items-center justify-between bg-white dark:bg-black shadow-md px-4 py-3 z-30">
          {/* Mobile Drawer Button */}
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Menu size={24} className="dark:text-white" />
          </button>

          {/* Logo in center */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2">
            <img
              src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg"
              alt="App Logo"
              className="w-8 h-8"
            />
          </Link>

          {/* Theme Toggle on right side */}
          <div className="ml-auto flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            <div
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "#00ADB5" }}
            >
              {userprofile?.avatar && userprofile.avatar.trim() !== '' ? (
                userprofile.avatar.startsWith('http') ? (
                  <img
                    src={userprofile.avatar}
                    alt="User Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">{userprofile.avatar}</span>
                )
              ) : (
                <span className="text-white font-bold text-lg">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-black relative">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

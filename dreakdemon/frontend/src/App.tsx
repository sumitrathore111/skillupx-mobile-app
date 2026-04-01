import { type JSX, Suspense, lazy } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";

import React from "react";
import Navigation from "./Component/Nevigation";
import ToastProvider from "./Component/ToastProvider";

import { AuthProvider, useAuth } from "./Context/AuthContext";
import { BattleGuardProvider } from "./Context/BattleGuardContext";
import { ThemeProvider } from "./Context/ThemeContext";
import { DataProvider } from "./Context/UserDataContext";

import ConsentBanner from "./Component/ConsentBanner";
import RematchNotification from "./Component/Global/RematchNotification";
import ScrollToTop from "./Component/ScrollToTop";
import DashboardComingSoon from "./Pages/Dashboard/Dashboard";
import ProjectDetail from "./Pages/Projects/ProjectDetails";
import PublicNavBar from "./Public/PublicNevBar";

const Documentation = lazy(() => import("./Public/Documentation"));
const NotFound = lazy(() => import("./Pages/NotFound"));
const Blog = lazy(() => import("./Public/Blog"));

// Lazy-loaded pages
const HomePage = lazy(() => import("./Public/HomePage"));
const AboutPage = lazy(() => import("./Public/CompanyAbout").then(mod => ({ default: mod.AboutPage })));
const ContactUs = lazy(() => import("./Public/ContactUs").then(mod => ({ default: mod.ContactUs })));
const TechUpdate = lazy(() => import("./Public/techupdate"));
const Login = lazy(() => import("./Auth/LoginScreen"));
const Signup = lazy(() => import("./Auth/SignupScreen"));

// const ProjectContribution = lazy(() => import("./Pages/ProjectContribution"));
const BrowseProjects = lazy(() => import("./Pages/Projects/BrowseProjects"));
const IdeaSubmission = lazy(() => import("./Pages/Projects/IdeaSubmission"));
// const ProjectWorkspace = lazy(() => import("./Pages/Projects/ProjectWorkspace"));
const EnhancedProjectWorkspace = lazy(() => import("./Component/ProjectComponent/EnhancedProjectWorkspace/EnhancedProjectWorkspace"));
const ProjectAccessDiagnostic = lazy(() => import("./Pages/Projects/ProjectAccessDiagnostic"));
const AdminPanel = lazy(() => import("./Pages/Admin/AdminPanel"));
const QueryScreen = lazy(() => import("./Pages/QueryScreen"));
const Company_Req = lazy(() => import("./Pages/Company_Req/Company_Req"));
const ProfileInfo = lazy(() => import("./Pages/Profile/ProfileInfo"));
const DeveloperConnect = lazy(() => import("./Pages/DeveloperConnect/DeveloperConnect"));
const CodeArena = lazy(() => import("./Pages/CodeArena/CodeArena"));
const PracticeChallenges = lazy(() => import("./Pages/CodeArena/PracticeChallenges"));
const ChallengeEditor = lazy(() => import("./Pages/CodeArena/ChallengeEditor"));

// Legal pages
const PrivacyPolicy = lazy(() => import("./Pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./Pages/TermsAndConditions"));

// Marketplace pages
// const MarketplaceBazaar = lazy(() => import("./Pages/Marketplace/MarketplaceBazaar"));
// const ProjectDetailMarketplace = lazy(() => import("./Pages/Marketplace/ProjectDetail"));
// const CreateListing = lazy(() => import("./Pages/Marketplace/CreateListing"));
// const MyListings = lazy(() => import("./Pages/Marketplace/MyListings"));
// const MyPurchases = lazy(() => import("./Pages/Marketplace/MyPurchases"));

// Roadmap pages (Learning Platform)
const RoadmapList = lazy(() => import("./Pages/Roadmaps/RoadmapList"));
const RoadmapDetail = lazy(() => import("./Pages/Roadmaps/RoadmapDetail"));
const TopicDetail = lazy(() => import("./Pages/Roadmaps/TopicDetail"));
const LearningDashboard = lazy(() => import("./Pages/Roadmaps/LearningDashboard"));
const InterviewPrep = lazy(() => import("./Pages/Roadmaps/InterviewPrep"));
const CareerInfoPage = lazy(() => import("./Pages/Roadmaps/CareerInfo"));
const JoinProjectViaLink = lazy(() => import("./Pages/JoinProjectViaLink"));
const MyInvites = lazy(() => import("./Pages/Dashboard/MyInvites"));

function PublicLayout() {

  const location = useLocation();
  const hideFooter = ["/login", "/signup"].includes(location.pathname);
  return (
    <div className="min-h-screen bg-background dark:bg-black flex flex-col" style={{ overflowX: 'clip' }}>
      <PublicNavBar />

      <main className="flex-grow" role="main">
        <Suspense fallback={
          <div className="dark:bg-black dark:text-white min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/TechUpdate" element={<TechUpdate />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/signup" element={<SignupRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!hideFooter && (
        <footer className="bg-card dark:bg-black border-t border-border dark:border-gray-700 mt-20 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
            <div className="grid md:grid-cols-4 gap-10">
              <div className="space-y-5">
                <div className="flex items-center space-x-2">
                  <img src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg" alt="SkillUpX Logo" width={32} height={32} className="w-8 h-8" />
                  <span className="text-xl font-bold text-foreground dark:text-white">SkillUpX</span>
                </div>
                <p className="text-sm text-muted-foreground dark:text-gray-400 leading-relaxed">
                  Empowering the next generation of tech professionals through
                  practical education and industry mentorship.
                </p>
                <div className="flex space-x-3 pt-2">
                  <a href="https://www.linkedin.com/company/skillupx-platform" target="_blank" rel="noopener noreferrer" aria-label="SkillUpX on LinkedIn" className="w-9 h-9 bg-muted dark:bg-gray-800 hover:bg-primary rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-primary/25">
                    <svg className="w-4 h-4 text-muted-foreground dark:text-gray-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                  <a href="https://x.com/SkillupX" target="_blank" rel="noopener noreferrer" aria-label="SkillUpX on Twitter/X" className="w-9 h-9 bg-muted dark:bg-gray-800 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/25">
                    <svg className="w-4 h-4 text-muted-foreground dark:text-gray-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  <a href="https://github.com/officialskillupx-lgtm" target="_blank" rel="noopener noreferrer" aria-label="SkillUpX on GitHub" className="w-9 h-9 bg-muted dark:bg-gray-800 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-gray-500/25">
                    <svg className="w-4 h-4 text-muted-foreground dark:text-gray-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  </a>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4 text-foreground dark:text-white text-lg relative inline-block">
                  Features
                  <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-gradient-to-r from-[#00ADB5] to-purple-500 rounded-full"></span>
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground dark:text-gray-400">
                  <li>
                    <Link to="/signup" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Open Project Contribution
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Creator Corner
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      CodeArena
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Developer Connect
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Learning Roadmaps
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4 text-foreground dark:text-white text-lg relative inline-block">
                  Company
                  <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-gradient-to-r from-[#00ADB5] to-purple-500 rounded-full"></span>
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground dark:text-gray-400">
                  <li>
                    <Link to="/about" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link to="/about" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Our Team
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link to="/documentation" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link to="/TechUpdate" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Tech Updates
                    </Link>
                  </li>
                  <li>
                    <Link to="/blog" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Blog
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4 text-foreground dark:text-white text-lg relative inline-block">
                  Connect
                  <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-gradient-to-r from-[#00ADB5] to-purple-500 rounded-full"></span>
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground dark:text-gray-400">
                  <li>
                    <a href="https://www.linkedin.com/company/skillupx-platform" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group relative after:absolute after:left-0 after:-bottom-0.5 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-[#00ADB5] after:to-purple-500 after:rounded-full after:transition-all after:duration-300 focus:after:w-full active:after:w-full" onClick={e => { e.currentTarget.classList.add('after:w-full'); setTimeout(() => e.currentTarget.classList.remove('after:w-full'), 400); }}>
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      LinkedIn
                    </a>
                  </li>
                  <li>
                    <a href="https://x.com/SkillupX" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group relative after:absolute after:left-0 after:-bottom-0.5 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-[#00ADB5] after:to-purple-500 after:rounded-full after:transition-all after:duration-300 focus:after:w-full active:after:w-full" onClick={e => { e.currentTarget.classList.add('after:w-full'); setTimeout(() => e.currentTarget.classList.remove('after:w-full'), 400); }}>
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      Twitter
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/officialskillupx-lgtm" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group relative after:absolute after:left-0 after:-bottom-0.5 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-[#00ADB5] after:to-purple-500 after:rounded-full after:transition-all after:duration-300 focus:after:w-full active:after:w-full" onClick={e => { e.currentTarget.classList.add('after:w-full'); setTimeout(() => e.currentTarget.classList.remove('after:w-full'), 400); }}>
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com/skillupx1.0?igsh=Y25rN29tMzJnenFh" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-200 flex items-center gap-2 group relative after:absolute after:left-0 after:-bottom-0.5 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-[#00ADB5] after:to-purple-500 after:rounded-full after:transition-all after:duration-300 focus:after:w-full active:after:w-full" onClick={e => { e.currentTarget.classList.add('after:w-full'); setTimeout(() => e.currentTarget.classList.remove('after:w-full'), 400); }}>
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full group-hover:bg-primary transition-colors"></span>
                     Instagram
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border dark:border-gray-700/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground dark:text-gray-500">
                &copy; {new Date().getFullYear()} SkillUpX. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-muted-foreground dark:text-gray-500">
                <Link to="/privacy-policy" className="hover:text-primary transition-colors duration-200">Privacy Policy</Link>
                <Link to="/terms-and-conditions" className="hover:text-primary transition-colors duration-200">Terms & Conditions</Link>

              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

function LoginRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard/db" replace /> : <Login />;
}

function SignupRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard/db" replace /> : <Signup />;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="dark:bg-black bg-white min-h-screen flex items-center justify-center" aria-busy="true">
      <div className="w-8 h-8 border-3 border-[#00ADB5] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? (
    <>
      <RematchNotification />
      {children}
    </>
  ) : <Navigate to="/login" replace />;
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <BattleGuardProvider>
            <ToastProvider />
            <ScrollToTop />
            <ConsentBanner />
            <Suspense fallback={
              <div className="dark:bg-black bg-white min-h-screen flex items-center justify-center" aria-busy="true">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
                </div>
              </div>
            }>
              <Routes>
                  {/* Public Routes */}
                  <Route path="/*" element={<PublicLayout />} />

                  {/* Join Project via Invite Link (public, but handles auth internally) */}
                  <Route path="project/join/:inviteToken" element={<JoinProjectViaLink />} />

                {/* Private Routes */}
                <Route
                  path="dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Navigation />
                    </ProtectedRoute>
                  }
                >
                  <Route path="db" element={<DashboardComingSoon />} />
                  <Route path="admin" element={<AdminPanel />} />
                  <Route path="openproject/:id" element={<ProjectDetail />} />
                  <Route path="projects" element={<BrowseProjects />} />
                  <Route path="projects/admin" element={<AdminPanel />} />
                  <Route path="projects/AdminPanel" element={<AdminPanel />} />
                  <Route path="projects/submit-idea" element={<IdeaSubmission />} />
                  <Route path="projects/access-diagnostic" element={<ProjectAccessDiagnostic />} />
                  <Route path="projects/workspace/:projectId" element={<EnhancedProjectWorkspace />} />
                  <Route path="developer-connect" element={<DeveloperConnect />} />
                  <Route path="my-invites" element={<MyInvites />} />
                  <Route path="query" element={<QueryScreen />} />
                  <Route path="profile" element={<ProfileInfo />} />
                  <Route path="practice" element={<PracticeChallenges />} />
                  <Route path="practice/:challengeId" element={<ChallengeEditor />} />
                  <Route path="codearena/*" element={<CodeArena />} />
                  <Route path="company_req" element={<Company_Req />} />

 {/* Marketplace Routes */}
                  {/* <Route path="marketplace" element={<MarketplaceBazaar />} />
                  <Route path="marketplace/project/:projectId" element={<ProjectDetailMarketplace />} />
                  <Route path="marketplace/create" element={<CreateListing />} />
                  <Route path="marketplace/edit/:projectId" element={<CreateListing />} />
                  <Route path="marketplace/my-listings" element={<MyListings />} />
                  <Route path="marketplace/my-purchases" element={<MyPurchases />} /> */}

                  {/* Learning Roadmap Routes */}
                  <Route path="roadmaps" element={<RoadmapList />} />
                  <Route path="roadmaps/:slug" element={<RoadmapDetail />} />
                  <Route path="roadmaps/topic/:topicId" element={<TopicDetail />} />
                  <Route path="roadmaps/:slug/interview" element={<InterviewPrep />} />
                  <Route path="roadmaps/:slug/careers" element={<CareerInfoPage />} />
                  <Route path="learning-dashboard" element={<LearningDashboard />} />
                  <Route path="interview-prep" element={<InterviewPrep />} />
                  <Route path="careers" element={<CareerInfoPage />} />
                </Route>
              </Routes>
          </Suspense>
          </BattleGuardProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

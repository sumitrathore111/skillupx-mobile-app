import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import type { LeaderboardEntry, Project } from "../../service/projectsService";
import { getAllProjects, getLeaderboard } from "../../service/projectsService";

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ProjectList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'leaderboard'>('projects');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Fetch projects using backend API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await getAllProjects();
        setProjects(projectsData);
        setFilteredProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

  // Filter projects by tech stack
  useEffect(() => {
    if (selectedFilter === "All") {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(p =>
        p.techStack?.some((tech: string) =>
          tech.toLowerCase().includes(selectedFilter.toLowerCase())
        )
      );
      setFilteredProjects(filtered);
    }
  }, [selectedFilter, projects]);

  const techFilters = ["All", "React", "Node.js", "Python", "MongoDB", "TypeScript", "JavaScript", "Next.js", "Express"];

  // Fetch Leaderboard Data using backend API
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      const fetchLeaderboardData = async () => {
        setLoadingLeaderboard(true);
        try {
          const leaderboardData = await getLeaderboard();
          setLeaderboard(leaderboardData);
        } catch (error) {
          console.error("Error fetching leaderboard:", error);
        } finally {
          setLoadingLeaderboard(false);
        }
      };

      fetchLeaderboardData();
    }
  }, [activeTab]);

  const getRankEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    if (index === 1) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
    if (index === 2) return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
    return "bg-white dark:bg-gray-900";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6 flex items-start justify-center">
      <div className="w-full max-w-7xl">
        {/* Hero Header */}
        <header className="mb-4 sm:mb-6 md:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2 sm:mb-3">
            Open Source Projects 🚀
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
            Join exciting real-world projects, contribute code, earn points, and build your portfolio!
          </p>
        </header>

        {/* Controls Bar */}
        <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-semibold text-sm hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-all hover:scale-105"
            >
              📖 {showGuide ? "Hide Guide" : "How to Contribute"}
            </button>

            {activeTab === 'projects' && (
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
              >
                {techFilters.map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
              </select>
            )}
          </div>

          {/* Create Project Button - Only show for logged in users */}
          {user && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/dashboard/openproject/new')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition-all hover:scale-105 shadow-md"
              >
                ➕ Create Project
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-3 bg-white dark:bg-gray-900 rounded-2xl p-2 shadow-lg">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'projects'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg scale-105'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            📂 Projects ({filteredProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg scale-105'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* How to Contribute Guide */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 border-2 border-cyan-200 dark:border-cyan-700 rounded-2xl p-6 shadow-lg overflow-hidden"
            >
              <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 mb-4">🚀 How to Start Contributing</h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Step 1 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">Browse Projects</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Explore exciting open-source projects below. Filter by tech stack (React, Python, Node.js, etc.) to find projects matching your skills!</p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">Join a Project</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Click "View & Join →" on any project → Read the details → Click the big "🚀 Join Project" button. That's it - you're in!</p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">Clone & Setup</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Copy the GitHub repo clone command from the project page. Run it in your terminal, install dependencies, and you're ready to code!</p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">Start Contributing!</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Pick an open issue → Work on it → Mark it "Resolved" when done. Earn points on the Leaderboard and download your contribution certificate!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>💡 Pro Tip:</strong> Start with smaller issues to get familiar with the codebase. Add new issues if you find bugs. Your contributions matter!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        <main>
          {activeTab === 'projects' ? (
            <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.length === 0 && (
                <div className="col-span-full bg-white dark:bg-gray-900 rounded-2xl p-16 text-center shadow-lg">
                  <div className="text-6xl mb-4">📂</div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {selectedFilter === "All" ? "No Projects Yet" : `No ${selectedFilter} Projects`}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedFilter === "All"
                      ? "Click 'Load Demo Projects' to get started!"
                      : `Try selecting 'All' to see available projects`}
                  </p>
                </div>
              )}

              {filteredProjects.map((p, index) => (
                <motion.div
                  key={p.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.1 }}
                  onClick={() => navigate(`/dashboard/openproject/${p.id}`)}
                  className="group bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-transparent dark:border-gray-700 cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Header with Status Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-cyan-600 transition-colors line-clamp-2 mb-2">
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full font-medium">
                          🎯 {p.creatorId === user?.id ? 'Your Project' : `by ${p.creatorName}`}
                        </span>
                      </div>
                    </div>
                    <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex-shrink-0">
                      ✓ Open
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-3 mb-4">
                    {p.description}
                  </p>

                  {/* Tech Stack Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {p.techStack?.slice(0, 4).map((tech: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-700"
                      >
                        {tech}
                      </span>
                    ))}
                    {p.techStack?.length > 4 && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold">
                        +{p.techStack.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Footer CTA */}
                  <div className="pt-4 border-t-2 border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      <span className="text-lg">🚀</span>
                      Join & Contribute
                    </span>
                    <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold text-sm group-hover:gap-2 transition-all">
                      {p.creatorId === user?.id ? 'Manage' : 'View Details'}
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </section>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">🏆 Top Contributors</h2>
                <p className="text-gray-600 dark:text-gray-400">Students making an impact on open-source projects</p>
                <div className="mt-4 flex justify-center gap-4 text-sm flex-wrap">
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full font-medium">
                    💡 Issue Resolved = 10 points
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-full font-medium">
                    💬 Message = 2 points
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full font-medium">
                    🚀 Project Joined = 20 points
                  </div>
                </div>
              </div>

              {loadingLeaderboard ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl shadow">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No contributors yet. Be the first to contribute!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className={`${getRankColor(index)} rounded-xl shadow-lg p-6 transition-all hover:scale-102 hover:shadow-xl border ${
                        index < 3 ? 'border-transparent' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-3xl font-bold min-w-[60px]">
                          {getRankEmoji(index)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className={`text-xl font-bold ${index < 3 ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
                              {entry.name}
                            </h3>
                            {entry.githubUsername && (
                              <a
                                href={`https://github.com/${entry.githubUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1 text-sm ${
                                  index < 3 ? 'text-white hover:text-gray-200' : 'text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                </svg>
                                @{entry.githubUsername}
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-6 text-center">
                          <div>
                            <div className={`text-2xl font-bold ${index < 3 ? 'text-white' : 'text-green-600 dark:text-green-400'}`}>
                              {entry.issuesResolved}
                            </div>
                            <div className={`text-xs ${index < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Issues</div>
                          </div>
                          <div>
                            <div className={`text-2xl font-bold ${index < 3 ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                              {entry.projectsContributed}
                            </div>
                            <div className={`text-xs ${index < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Projects</div>
                          </div>
                          <div>
                            <div className={`text-2xl font-bold ${index < 3 ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`}>
                              {entry.messagesSent}
                            </div>
                            <div className={`text-xs ${index < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Messages</div>
                          </div>
                        </div>

                        <div className="text-right min-w-[100px]">
                          <div className={`text-3xl font-bold ${index < 3 ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`}>
                            {entry.totalScore}
                          </div>
                          <div className={`text-xs ${index < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Total Points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

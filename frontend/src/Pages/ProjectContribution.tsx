import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "../service/projectsService";
import { getLeaderboard } from "../service/projectsService";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      try {
        const leaderboardData = await getLeaderboard();
        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

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
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">🏆 Contributor Leaderboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Top contributors making an impact on open-source projects</p>
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

        {loading ? (
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
                  {/* Rank */}
                  <div className="text-3xl font-bold min-w-[60px]">
                    {getRankEmoji(index)}
                  </div>

                  {/* User Info */}
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

                  {/* Stats */}
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

                  {/* Total Score */}
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
    </div>
  );
};

export default Leaderboard;

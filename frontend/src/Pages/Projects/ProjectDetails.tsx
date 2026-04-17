import { motion } from "framer-motion";
import { ArrowLeft, Check, ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import type { Project, ProjectIssue } from "../../service/projectsService";
import { createIssue, getProjectById, getProjectIssues, joinProject, updateIssueStatus } from "../../service/projectsService";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [userContributions, setUserContributions] = useState({ issuesResolved: 0, totalIssues: 0 });
  const [loading, setLoading] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: "", description: "" });

  // Fetch project
  useEffect(() => {
    if (!id) return;
    const fetchProject = async () => {
      try {
        const projectData = await getProjectById(id);
        setProject(projectData);
        // Check if user has joined by looking at members
        if (projectData && user) {
          const isMember = projectData.members?.some(m => m.userId === user.id);
          setHasJoined(!!isMember);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        setProject(null);
      }
    };
    fetchProject();
  }, [id, user]);

  // Fetch issues
  useEffect(() => {
    if (!id) return;
    const fetchIssues = async () => {
      try {
        const issuesData = await getProjectIssues(id);
        setIssues(issuesData);
      } catch (error) {
        console.error("Error fetching issues:", error);
        setIssues([]);
      }
    };
    fetchIssues();
  }, [id]);

  // Calculate contributions
  useEffect(() => {
    if (!user) return;
    const resolved = issues.filter(i => i.resolvedBy === user.id).length;
    setUserContributions({ issuesResolved: resolved, totalIssues: issues.length });
  }, [issues, user]);

  const handleJoinProject = async () => {
    if (!id || !user) {
      alert("Please login to join this project");
      return;
    }

    setLoading(true);
    try {
      await joinProject(id);
      setHasJoined(true);
      alert("🎉 Successfully joined the project! Start contributing now.");
    } catch (error) {
      console.error("Error joining project:", error);
      alert("Failed to join project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddIssue = async () => {
    if (!id || !user || !newIssue.title.trim()) {
      alert("Please provide issue title");
      return;
    }

    setLoading(true);
    try {
      const createdIssue = await createIssue(id, {
        title: newIssue.title.trim(),
        description: newIssue.description.trim(),
      });
      if (createdIssue) {
        setIssues([createdIssue, ...issues]);
      }
      setNewIssue({ title: "", description: "" });
      setShowNewIssue(false);
      alert("✅ Issue added successfully!");
    } catch (error) {
      console.error("Error adding issue:", error);
      alert("Failed to add issue");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIssue = async (issueId: string, currentStatus: string) => {
    if (!id || !user) return;

    setLoading(true);
    try {
      const newStatus = currentStatus === "Open" ? "Resolved" : "Open";
      await updateIssueStatus(id, issueId, newStatus as 'Open' | 'Resolved' | 'In Progress');
      // Update local state
      setIssues(issues.map(issue =>
        (issue.id || issue._id) === issueId
          ? { ...issue, status: newStatus as 'Open' | 'Resolved' | 'In Progress', resolvedBy: newStatus === "Resolved" ? user.id : null }
          : issue
      ));
    } catch (error) {
      console.error("Error updating issue:", error);
      alert("Failed to update issue");
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = () => {
    if (!project || !user) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#00ADB5');
    gradient.addColorStop(1, '#0066CC');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(80, 100, canvas.width - 160, canvas.height - 200);

    ctx.strokeStyle = '#00ADB5';
    ctx.lineWidth = 8;
    ctx.strokeRect(90, 110, canvas.width - 180, canvas.height - 220);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate of Contribution', canvas.width / 2, 220);

    ctx.font = '28px Arial';
    ctx.fillText('This is to certify that', canvas.width / 2, 300);

    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#00ADB5';
    ctx.fillText(user.name || user.email || 'Contributor', canvas.width / 2, 370);

    ctx.font = '28px Arial';
    ctx.fillStyle = '#333333';
    ctx.fillText('has successfully contributed to the project', canvas.width / 2, 430);

    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#0066CC';
    ctx.fillText(`"${project.title}"`, canvas.width / 2, 490);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(`Issues Resolved: ${userContributions.issuesResolved}`, canvas.width / 2, 560);

    ctx.font = '20px Arial';
    ctx.fillText(`Issued on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, canvas.width / 2, 620);

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#00ADB5';
    ctx.fillText('NextStep', canvas.width / 2, 680);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${user.name || 'Contributor'}_${project.title}_Certificate.png`;
        link.click();
        URL.revokeObjectURL(url);
        alert('✅ Certificate downloaded successfully!');
      }
    });
  };

  if (!project) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading project...</p>
      </div>
    );
  }

  const isCreator = project.creatorId === user?.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard/openproject')}
          className="mb-4 sm:mb-6 flex items-center gap-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
        >
          <ArrowLeft size={18} className="sm:hidden" />
          <ArrowLeft size={20} className="hidden sm:block" />
          Back to Projects
        </button>

        {/* Project Header */}
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex-1 w-full lg:w-auto">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">{project.title}</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>

              {/* Tech Stack */}
              <div className="flex flex-wrap gap-2 mb-4">
                {project.techStack?.map((tech: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Creator Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span className="font-medium">Created by:</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                  {isCreator ? 'You' : project.creatorName}
                </span>
              </div>

              {/* GitHub Link */}
              {project.githubRepo && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-gray-900 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <a
                    href={project.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 hover:underline font-mono text-xs sm:text-sm break-all"
                  >
                    {project.githubRepo}
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`git clone ${project.githubRepo}`);
                      alert('?? Clone command copied!');
                    }}
                    className="bg-white text-gray-900 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold hover:bg-gray-100 flex items-center gap-1 whitespace-nowrap"
                  >
                    <ExternalLink size={12} className="sm:hidden" />
                    <ExternalLink size={14} className="hidden sm:block" />
                    <span className="hidden sm:inline">Copy Clone</span>
                    <span className="sm:hidden">Copy</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row lg:flex-col gap-2 sm:gap-3 w-full lg:w-auto">
              {!isCreator && !hasJoined && (
                <button
                  onClick={handleJoinProject}
                  disabled={loading || !user}
                  className="flex-1 lg:flex-none px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-bold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? "Joining..." : "?? Join Project"}
                </button>
              )}

              {hasJoined && (
                <div className="flex-1 lg:flex-none bg-green-50 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-600 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-sm sm:text-base text-green-700 dark:text-green-400 font-bold mb-2">? You're a Contributor!</p>
                  <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-green-600 dark:text-green-400">{userContributions.issuesResolved}</div>
                      <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Issues Fixed</div>
                    </div>
                  </div>
                  {userContributions.issuesResolved > 0 && (
                    <button
                      onClick={downloadCertificate}
                      className="mt-2 sm:mt-3 w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-cyan-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-cyan-600"
                    >
                      ?? Download Certificate
                    </button>
                  )}
                </div>
              )}

              {isCreator && (
                <div className="flex-1 lg:flex-none bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-500 dark:border-yellow-600 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-sm sm:text-base text-yellow-700 dark:text-yellow-400 font-bold">?? You're the Creator</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Issues Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">?? Tasks & Issues</h2>
            {(hasJoined || isCreator) && (
              <button
                onClick={() => setShowNewIssue(!showNewIssue)}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
              >
                {showNewIssue ? "Cancel" : "+ Add Issue"}
              </button>
            )}
          </div>

          {/* Add Issue Form */}
          {showNewIssue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-600"
            >
              <input
                type="text"
                placeholder="Issue title..."
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:border-cyan-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <textarea
                placeholder="Issue description..."
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:border-cyan-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={3}
              />
              <button
                onClick={handleAddIssue}
                disabled={loading}
                className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Issue"}
              </button>
            </motion.div>
          )}

          {/* Issues List */}
          {issues.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">No issues yet. Add the first one!</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {issues.map((issue, idx) => (
                <div
                  key={issue.id || issue._id}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    issue.status === "Open"
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white break-words">{issue.title}</h3>
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                            issue.status === "Open"
                              ? "bg-red-200 text-red-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {issue.status === "Open" ? "🔴 Open" : "✅ Resolved"}
                        </span>
                      </div>
                      {issue.description && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">{issue.description}</p>
                      )}
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        Created by: {issue.createdBy === user?.id ? "You" : issue.creatorName}
                      </p>
                    </div>

                    {(hasJoined || isCreator) && (
                      <button
                        onClick={() => handleToggleIssue(issue.id || issue._id || '', issue.status)}
                        disabled={loading}
                        className={`w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap ${
                          issue.status === "Open"
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-600 hover:bg-gray-700 text-white"
                        }`}
                      >
                        {issue.status === "Open" ? (
                          <>
                            <Check size={14} className="inline mr-1 sm:hidden" />
                            <Check size={16} className="hidden sm:inline mr-1" />
                            <span className="hidden sm:inline">Mark Resolved</span>
                            <span className="sm:hidden">Resolve</span>
                          </>
                        ) : (
                          <>
                            <X size={14} className="inline mr-1 sm:hidden" />
                            <X size={16} className="hidden sm:inline mr-1" />
                            Reopen
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How to Contribute Guide */}
        {!hasJoined && !isCreator && (
          <div className="mt-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 border-2 border-cyan-200 dark:border-cyan-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-400 mb-4">?? How to Contribute</h3>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex gap-3">
                <span className="font-bold text-cyan-600 dark:text-cyan-400">1.</span>
                <span>Click "Join Project" button to become a contributor</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-cyan-600 dark:text-cyan-400">2.</span>
                <span>Clone the GitHub repository using the command above</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-cyan-600 dark:text-cyan-400">3.</span>
                <span>Pick an open issue and start working on it</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-cyan-600 dark:text-cyan-400">4.</span>
                <span>When done, mark the issue as "Resolved" to earn points!</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-cyan-600 dark:text-cyan-400">5.</span>
                <span>Download your contribution certificate and add to your resume</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

import {
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    ExternalLink,
    Eye,
    FolderOpen,
    Github,
    Image,
    Lightbulb,
    Mail,
    MessageSquare,
    Play,
    Search,
    Shield,
    ShoppingBag,
    Trash2,
    TrendingUp,
    User,
    Users,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import {
    approveMarketplaceProject,
    getAllMarketplaceProjectsForAdmin,
    rejectMarketplaceProject
} from '../../service/marketplaceService';
import type { MarketplaceProject } from '../../types/marketplace';

interface SubmittedIdea {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  category: string;
  expectedTimeline: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  feedback?: string;
}

interface PlatformStats {
  totalUsers: number;
  totalIdeas: number;
  pendingIdeas: number;
  approvedIdeas: number;
  rejectedIdeas: number;
  activeProjects: number;
  totalContributors: number;
  totalMarketplace: number;
  pendingMarketplace: number;
  publishedMarketplace: number;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const {
    fetchAllIdeas,
    updateIdeaStatus,
    deleteIdea,
    fetchAllUsers,
    fetchAllProjectMembers
  } = useDataContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'ideas' | 'projects' | 'users' | 'marketplace'>('overview');
  const [ideas, setIdeas] = useState<SubmittedIdea[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<SubmittedIdea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedIdea, setSelectedIdea] = useState<SubmittedIdea | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalIdeas: 0,
    pendingIdeas: 0,
    approvedIdeas: 0,
    rejectedIdeas: 0,
    activeProjects: 0,
    totalContributors: 0,
    totalMarketplace: 0,
    pendingMarketplace: 0,
    publishedMarketplace: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null);
  const [showIdeaDeleteConfirm, setShowIdeaDeleteConfirm] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<SubmittedIdea | null>(null);

  // Marketplace verification state
  const [marketplaceProjects, setMarketplaceProjects] = useState<MarketplaceProject[]>([]);
  const [allMarketplaceProjects, setAllMarketplaceProjects] = useState<MarketplaceProject[]>([]);
  const [marketplaceStatusFilter, setMarketplaceStatusFilter] = useState<'all' | 'pending_verification' | 'published' | 'rejected'>('pending_verification');
  const [selectedMarketplaceProject, setSelectedMarketplaceProject] = useState<MarketplaceProject | null>(null);
  const [marketplaceRejectionReason, setMarketplaceRejectionReason] = useState('');
  const [processingMarketplaceId, setProcessingMarketplaceId] = useState<string | null>(null);

  console.log('AdminPanel rendered', { user, loading });

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Only allow admin users to access this page
    if (user.role !== 'admin') {
      alert('Access Denied: Only admins can access this page');
      navigate('/');
      return;
    }

    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadIdeas().catch(e => console.error('Load ideas error:', e)),
        loadUsers().catch(e => console.error('Load users error:', e)),
        loadProjects().catch(e => console.error('Load projects error:', e)),
        loadMarketplaceProjects().catch(e => console.error('Load marketplace error:', e))
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading admin panel data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const loadMarketplaceProjects = async () => {
    try {
      console.log('Loading all marketplace projects...');
      const allProjects = await getAllMarketplaceProjectsForAdmin();
      console.log('All marketplace projects loaded:', allProjects.length);
      setAllMarketplaceProjects(allProjects);
      // Filter based on current status filter
      filterMarketplaceProjects(allProjects, marketplaceStatusFilter);
    } catch (error) {
      console.error('Error loading marketplace projects:', error);
    }
  };

  const filterMarketplaceProjects = (projects: MarketplaceProject[], status: string) => {
    if (status === 'all') {
      setMarketplaceProjects(projects);
    } else {
      setMarketplaceProjects(projects.filter(p => p.status === status));
    }
  };

  const handleMarketplaceStatusFilterChange = (status: 'all' | 'pending_verification' | 'published' | 'rejected') => {
    setMarketplaceStatusFilter(status);
    filterMarketplaceProjects(allMarketplaceProjects, status);
  };

  const loadIdeas = async () => {
    try {
      const allIdeas = await fetchAllIdeas();
      setIdeas(allIdeas);
      setFilteredIdeas(allIdeas);
    } catch (error) {
      console.error('Error loading ideas:', error);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('Fetching all users...');
      const allUsers = await fetchAllUsers();
      console.log('Users fetched:', allUsers);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const allIdeas = await fetchAllIdeas();
      const approvedProjects = allIdeas.filter((idea: any) => idea.status === 'approved');
      const members = await fetchAllProjectMembers();

      // Group members by project
      const projectsWithMembers = approvedProjects.map((project: any) => {
        const projectMembers = members.filter((m: any) => m.projectId === project.id);
        return {
          ...project,
          memberCount: projectMembers.length + 1, // +1 for creator
          members: projectMembers
        };
      });

      setProjects(projectsWithMembers);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    let filtered = ideas;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(idea => idea.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(idea =>
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredIdeas(filtered);
  }, [ideas, statusFilter, searchQuery]);

  // Calculate stats from loaded data
  useEffect(() => {
    const pendingIdeas = ideas.filter(i => i.status === 'pending').length;
    const approvedIdeas = ideas.filter(i => i.status === 'approved').length;
    const rejectedIdeas = ideas.filter(i => i.status === 'rejected').length;
    const pendingMarketplace = allMarketplaceProjects.filter(p => p.status === 'pending_verification').length;
    const publishedMarketplace = allMarketplaceProjects.filter(p => p.status === 'published').length;

    // Calculate total contributors from projects
    const totalContributors = projects.reduce((sum, p) => sum + (p.memberCount || 1), 0);

    setStats({
      totalUsers: users.length,
      totalIdeas: ideas.length,
      pendingIdeas,
      approvedIdeas,
      rejectedIdeas,
      activeProjects: projects.length,
      totalContributors,
      totalMarketplace: allMarketplaceProjects.length,
      pendingMarketplace,
      publishedMarketplace
    });
  }, [users, ideas, projects, allMarketplaceProjects]);

  const approveIdea = async (ideaId: string) => {
    if (!reviewFeedback.trim()) {
      alert('Please provide feedback before approving');
      return;
    }

    try {
      await updateIdeaStatus(ideaId, 'approved', reviewFeedback, user?.id);

      // Update local state
      setIdeas(ideas.map(idea =>
        idea.id === ideaId
          ? {
              ...idea,
              status: 'approved',
              reviewedAt: new Date().toISOString(),
              reviewedBy: user?.email || 'Admin',
              feedback: reviewFeedback
            }
          : idea
      ));

      alert(`Idea approved! Email notification sent to ${selectedIdea?.userEmail}`);
      setSelectedIdea(null);
      setReviewFeedback('');
    } catch (error) {
      console.error('Error approving idea:', error);
      alert('Failed to approve idea. Please try again.');
    }
  };

  const rejectIdea = async (ideaId: string) => {
    if (!reviewFeedback.trim()) {
      alert('Please provide feedback before rejecting');
      return;
    }

    try {
      await updateIdeaStatus(ideaId, 'rejected', reviewFeedback, user?.id);

      // Update local state
      setIdeas(ideas.map(idea =>
        idea.id === ideaId
          ? {
              ...idea,
              status: 'rejected',
              reviewedAt: new Date().toISOString(),
              reviewedBy: user?.email || 'Admin',
              feedback: reviewFeedback
            }
          : idea
      ));

      alert(`Idea rejected. Email notification sent to ${selectedIdea?.userEmail}`);
      setSelectedIdea(null);
      setReviewFeedback('');
    } catch (error) {
      console.error('Error rejecting idea:', error);
      alert('Failed to reject idea. Please try again.');
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      setDeletingProjectId(projectToDelete.id);

      // Delete the idea (which will cascade delete the associated project)
      // projectToDelete.id is the idea ID, projectToDelete.projectId is the actual project ID
      await deleteIdea(projectToDelete.id);

      // Update local state - remove the deleted project
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setIdeas(ideas.filter(i => i.id !== projectToDelete.id));
      setFilteredIdeas(filteredIdeas.filter(i => i.id !== projectToDelete.id));

      alert(`Project "${projectToDelete.title}" has been deleted successfully`);
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleDeleteIdea = async () => {
    if (!ideaToDelete) return;

    try {
      setDeletingIdeaId(ideaToDelete.id);
      await deleteIdea(ideaToDelete.id);

      // Update local state - remove the deleted idea
      setIdeas(ideas.filter(i => i.id !== ideaToDelete.id));
      setFilteredIdeas(filteredIdeas.filter(i => i.id !== ideaToDelete.id));
      // Also remove from projects if it was approved
      setProjects(projects.filter(p => p.id !== ideaToDelete.id));

      alert(`Idea "${ideaToDelete.title}" and any associated project have been deleted successfully`);
      setShowIdeaDeleteConfirm(false);
      setIdeaToDelete(null);
    } catch (error) {
      console.error('Error deleting idea:', error);
      alert('Failed to delete idea. Please try again.');
    } finally {
      setDeletingIdeaId(null);
    }
  };

  const openIdeaDeleteConfirm = (idea: SubmittedIdea) => {
    setIdeaToDelete(idea);
    setShowIdeaDeleteConfirm(true);
  };

  const openDeleteConfirm = (project: any) => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'pending_verification': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'published': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'pending_verification': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'published': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  // Marketplace verification handlers
  const handleApproveMarketplace = async (projectId: string) => {
    try {
      setProcessingMarketplaceId(projectId);
      await approveMarketplaceProject(projectId);

      // Remove from pending list
      setMarketplaceProjects(prev => prev.filter(p => p.id !== projectId));

      alert('Marketplace project approved and published successfully!');
      setSelectedMarketplaceProject(null);
    } catch (error) {
      console.error('Error approving marketplace project:', error);
      alert('Failed to approve project. Please try again.');
    } finally {
      setProcessingMarketplaceId(null);
    }
  };

  const handleRejectMarketplace = async (projectId: string) => {
    if (!marketplaceRejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingMarketplaceId(projectId);
      await rejectMarketplaceProject(projectId, marketplaceRejectionReason);

      // Remove from pending list
      setMarketplaceProjects(prev => prev.filter(p => p.id !== projectId));

      alert('Marketplace project rejected. The seller has been notified.');
      setSelectedMarketplaceProject(null);
      setMarketplaceRejectionReason('');
    } catch (error) {
      console.error('Error rejecting marketplace project:', error);
      alert('Failed to reject project. Please try again.');
    } finally {
      setProcessingMarketplaceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-10 h-10 text-[#00ADB5]" />
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Admin Panel</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Manage ideas, projects, and users</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white dark:bg-gray-900 rounded-xl p-2 shadow-lg mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              activeTab === 'ideas'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Ideas
              {stats.pendingIdeas > 0 && (
                <span className="bg-white text-[#00ADB5] px-2 py-1 rounded-full text-xs font-bold">
                  {stats.pendingIdeas}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              activeTab === 'projects'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Projects
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Users
            </div>
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              activeTab === 'marketplace'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Marketplace
              {marketplaceProjects.length > 0 && (
                <span className="bg-white text-[#00ADB5] px-2 py-1 rounded-full text-xs font-bold">
                  {marketplaceProjects.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {loading ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Users Card */}
                <div
                  onClick={() => setActiveTab('users')}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-12 h-12 text-blue-500" />
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalUsers}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Users</h3>
                  <p className="text-xs text-blue-500 mt-2">Click to view all users →</p>
                </div>

                {/* Ideas Card */}
                <div
                  onClick={() => setActiveTab('ideas')}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Lightbulb className="w-12 h-12 text-yellow-500" />
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalIdeas}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Ideas</h3>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    <span className="text-yellow-500">{stats.pendingIdeas} pending</span> • <span className="text-green-500">{stats.approvedIdeas} approved</span> • <span className="text-red-500">{stats.rejectedIdeas} rejected</span>
                  </div>
                </div>

                {/* Marketplace Card */}
                <div
                  onClick={() => setActiveTab('marketplace')}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-4">
                    <ShoppingBag className="w-12 h-12 text-purple-500" />
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalMarketplace}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Marketplace Listings</h3>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    <span className="text-yellow-500">{stats.pendingMarketplace} pending</span> • <span className="text-green-500">{stats.publishedMarketplace} published</span>
                  </div>
                </div>

                {/* Projects Card */}
                <div
                  onClick={() => setActiveTab('projects')}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-4">
                    <FolderOpen className="w-12 h-12 text-[#00ADB5]" />
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{stats.activeProjects}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Active Projects</h3>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {stats.totalContributors} contributors
                  </div>
                </div>

                {/* Pending Ideas Alert */}
                {stats.pendingIdeas > 0 && (
                  <div className="lg:col-span-2 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                      <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-1">
                          {stats.pendingIdeas} Ideas Awaiting Review
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Review pending project ideas
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('ideas')}
                        className="px-4 py-2 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-700 transition-colors text-sm"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                )}

                {/* Pending Marketplace Alert */}
                {stats.pendingMarketplace > 0 && (
                  <div className="lg:col-span-2 bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                      <ShoppingBag className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-1">
                          {stats.pendingMarketplace} Marketplace Listings Pending
                        </h3>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          Verify marketplace submissions
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('marketplace')}
                        className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors text-sm"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                )}

                {/* Recent Ideas */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Recent Ideas
                  </h3>
                  <div className="space-y-3">
                    {ideas.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">No ideas submitted yet</p>
                    ) : (
                      ideas.slice(0, 5).map((idea) => (
                        <div key={idea.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{idea.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              by {idea.userName} • {new Date(idea.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ml-2 ${getStatusColor(idea.status)}`}>
                            {idea.status.toUpperCase()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Marketplace Listings */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-purple-500" />
                    Recent Marketplace
                  </h3>
                  <div className="space-y-3">
                    {allMarketplaceProjects.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">No marketplace listings yet</p>
                    ) : (
                      allMarketplaceProjects.slice(0, 5).map((project) => (
                        <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{project.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ${project.price} • {project.category}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ml-2 ${
                            project.status === 'published' ? 'bg-green-100 text-green-700' :
                            project.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {project.status === 'pending_verification' ? 'PENDING' : project.status.toUpperCase()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Users */}
                <div className="lg:col-span-4 bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Recent Users
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {users.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4 col-span-4">No users registered yet</p>
                    ) : (
                      users.slice(0, 8).map((userData) => (
                        <div key={userData.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ADB5] to-cyan-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">
                              {userData.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{userData.name || 'No Name'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userData.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ideas Tab */}
        {activeTab === 'ideas' && (
          <div>
            {/* Search and Filter */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search ideas by title, user, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:border-[#00ADB5] focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-6 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:border-[#00ADB5] focus:outline-none font-semibold"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Ideas List */}
            <div className="space-y-4">
              {filteredIdeas.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                  <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No ideas found</h3>
                  <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter</p>
                </div>
              ) : (
                filteredIdeas.map((idea) => (
                  <div key={idea.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-black text-gray-900 dark:text-white">{idea.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getStatusColor(idea.status)}`}>
                            {getStatusIcon(idea.status)}
                            {idea.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 mb-3 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: idea.description }} />

                        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{idea.userName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span>{idea.userEmail}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(idea.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-3">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg">
                            {idea.category}
                          </span>
                          <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg">
                            Timeline: {idea.expectedTimeline}
                          </span>
                        </div>

                        {idea.feedback && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-gray-600" />
                              <span className="text-xs font-semibold text-gray-600">Admin Feedback:</span>
                            </div>
                            <p className="text-sm text-gray-700">{idea.feedback}</p>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        {idea.status === 'pending' && (
                          <button
                            onClick={() => setSelectedIdea(idea)}
                            className="px-6 py-3 bg-[#00ADB5] text-white font-semibold rounded-xl hover:bg-cyan-600 transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-5 h-5" />
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => openIdeaDeleteConfirm(idea)}
                          disabled={deletingIdeaId === idea.id}
                          className="px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {deletingIdeaId === idea.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div>
            {loading ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Active Projects</h3>
                <p className="text-gray-600 dark:text-gray-400">Approved project ideas will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <div key={project.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{project.title}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 prose prose-sm dark:prose-invert max-w-none line-clamp-3" dangerouslySetInnerHTML={{ __html: project.description }} />

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{project.userName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{project.memberCount} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(project.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg">
                            {project.category}
                          </span>
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-semibold rounded-lg flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Project Members */}
                    {project.members.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Contributors:</p>
                        <div className="flex flex-wrap gap-2">
                          {project.members.slice(0, 5).map((member: any) => (
                            <span key={member.id} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                              {member.userName}
                            </span>
                          ))}
                          {project.members.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{project.members.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delete Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => openDeleteConfirm(project)}
                        disabled={deletingProjectId === project.id}
                        className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingProjectId === project.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete Project
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {loading ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600">Registered users will appear here</p>
              </div>
            ) : (
              <div>
                <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Total Users: {users.length}</h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg">
                        Active: {users.filter(u => u.last_active_date).length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((userData) => (
                    <div key={userData.id} className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ADB5] to-cyan-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {userData.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{userData.name || 'No Name'}</h3>
                          <p className="text-sm text-gray-600 truncate">{userData.email || 'No Email'}</p>

                          <div className="mt-2 space-y-1">
                            {userData.institute && (
                              <p className="text-xs text-gray-500 truncate">🎓 {userData.institute}</p>
                            )}
                            {userData.yearOfStudy && (
                              <p className="text-xs text-gray-500">📚 Year {userData.yearOfStudy}</p>
                            )}
                            {userData.marathon_score !== undefined && userData.marathon_score > 0 && (
                              <p className="text-xs text-gray-500">🏆 {userData.marathon_score} points</p>
                            )}
                            {userData.streakCount && userData.streakCount > 0 && (
                              <p className="text-xs text-gray-500">🔥 {userData.streakCount} day streak</p>
                            )}
                          </div>

                          {userData.skills && userData.skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {userData.skills.slice(0, 3).map((skill: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                                  {skill}
                                </span>
                              ))}
                              {userData.skills.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  +{userData.skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {userData.last_active_date && (
                            <p className="text-xs text-gray-400 mt-2">
                              Last active: {new Date(userData.last_active_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Marketplace Verification Tab */}
        {activeTab === 'marketplace' && (
          <div>
            {/* Status Filter */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Filter by Status:</span>
                <button
                  onClick={() => handleMarketplaceStatusFilterChange('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    marketplaceStatusFilter === 'all'
                      ? 'bg-[#00ADB5] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All ({allMarketplaceProjects.length})
                </button>
                <button
                  onClick={() => handleMarketplaceStatusFilterChange('pending_verification')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    marketplaceStatusFilter === 'pending_verification'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Pending ({allMarketplaceProjects.filter(p => p.status === 'pending_verification').length})
                </button>
                <button
                  onClick={() => handleMarketplaceStatusFilterChange('published')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    marketplaceStatusFilter === 'published'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Approved ({allMarketplaceProjects.filter(p => p.status === 'published').length})
                </button>
                <button
                  onClick={() => handleMarketplaceStatusFilterChange('rejected')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    marketplaceStatusFilter === 'rejected'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Rejected ({allMarketplaceProjects.filter(p => p.status === 'rejected').length})
                </button>
                <button
                  onClick={() => loadMarketplaceProjects()}
                  className="ml-auto px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading marketplace listings...</p>
              </div>
            ) : marketplaceProjects.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No {marketplaceStatusFilter === 'all' ? '' : marketplaceStatusFilter === 'pending_verification' ? 'Pending' : marketplaceStatusFilter === 'published' ? 'Approved' : 'Rejected'} Listings
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {marketplaceStatusFilter === 'pending_verification'
                    ? 'All marketplace listings have been reviewed. New listings will appear here when users submit them for verification.'
                    : `No ${marketplaceStatusFilter === 'published' ? 'approved' : marketplaceStatusFilter === 'rejected' ? 'rejected' : ''} listings found.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info Banner */}
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <ShoppingBag className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <h3 className="text-lg font-bold mb-1 text-yellow-900 dark:text-yellow-100">
                        {allMarketplaceProjects.filter(p => p.status === 'pending_verification').length} Pending Verification
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Review and verify marketplace projects before they go live
                      </p>
                    </div>
                  </div>
                </div>

                {/* Marketplace Listings */}
                {marketplaceProjects.map((project) => (
                  <div key={project.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                    <div className="flex gap-6">
                      {/* Project Image */}
                      <div className="w-48 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                        {project.images && project.images.length > 0 ? (
                          <img
                            src={project.images[0]}
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Project Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-black text-gray-900 dark:text-white">{project.title}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getStatusColor(project.status)}`}>
                                {getStatusIcon(project.status)}
                                {project.status === 'pending_verification' ? 'PENDING' : project.status === 'published' ? 'APPROVED' : project.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: project.description }} />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-[#00ADB5]">${project.price}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{project.sellerName || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Project Links */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.links?.github && (
                            <a
                              href={project.links.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-gray-700 transition-colors"
                            >
                              <Github className="w-3 h-3" />
                              GitHub
                            </a>
                          )}
                          {project.links?.liveDemo && (
                            <a
                              href={project.links.liveDemo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-green-600 transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              Live Demo
                            </a>
                          )}
                          {project.links?.documentation && (
                            <a
                              href={project.links.documentation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-blue-600 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Docs
                            </a>
                          )}
                          {project.links?.video && (
                            <a
                              href={project.links.video}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-red-600 transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              Video
                            </a>
                          )}
                          {project.links?.demoVideo && (
                            <a
                              href={project.links.demoVideo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-purple-700 transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              🎬 Demo
                            </a>
                          )}
                          {project.links?.explanationVideo && (
                            <a
                              href={project.links.explanationVideo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-indigo-700 transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              💡 Explain
                            </a>
                          )}
                        </div>

                        <div className="flex gap-2 mb-4">
                          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg">
                            {project.category}
                          </span>
                          <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-lg">
                            {project.licenseType}
                          </span>
                          {project.tags && project.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => setSelectedMarketplaceProject(project)}
                            className="px-6 py-2 bg-[#00ADB5] text-white font-semibold rounded-xl hover:bg-cyan-600 transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-5 h-5" />
                            View Details
                          </button>
                          {project.status === 'pending_verification' && (
                            <>
                              <button
                                onClick={() => handleApproveMarketplace(project.id)}
                                disabled={processingMarketplaceId === project.id}
                                className="px-6 py-2 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                <CheckCircle className="w-5 h-5" />
                                {processingMarketplaceId === project.id ? 'Processing...' : 'Approve'}
                              </button>
                            </>
                          )}
                          {project.status === 'published' && (
                            <span className="px-6 py-2 bg-green-100 text-green-700 font-semibold rounded-xl flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              Live on Marketplace
                            </span>
                          )}
                          {project.status === 'rejected' && (
                            <span className="px-6 py-2 bg-red-100 text-red-700 font-semibold rounded-xl flex items-center gap-2">
                              <XCircle className="w-5 h-5" />
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Marketplace Review Modal */}
        {selectedMarketplaceProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Review Marketplace Listing</h2>

                {/* Project Images */}
                {selectedMarketplaceProject.images && selectedMarketplaceProject.images.length > 0 && (
                  <div className="mb-6">
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 block">Project Images</label>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedMarketplaceProject.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          className="w-40 h-28 object-cover rounded-lg flex-shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Title</label>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedMarketplaceProject.title}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Description</label>
                    <div className="text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedMarketplaceProject.description }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Category</label>
                      <p className="text-gray-900 dark:text-white">{selectedMarketplaceProject.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Price</label>
                      <p className="text-gray-900 dark:text-white flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ${selectedMarketplaceProject.price}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">License Type</label>
                      <p className="text-gray-900 dark:text-white">{selectedMarketplaceProject.licenseType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Features</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedMarketplaceProject.features?.map((feature, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Project Links */}
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 block">Project Links</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedMarketplaceProject.links?.github && (
                        <a
                          href={selectedMarketplaceProject.links.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
                        >
                          <Github className="w-4 h-4" />
                          GitHub Repository
                        </a>
                      )}
                      {selectedMarketplaceProject.links?.liveDemo && (
                        <a
                          href={selectedMarketplaceProject.links.liveDemo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-green-600 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Live Demo
                        </a>
                      )}
                      {selectedMarketplaceProject.links?.documentation && (
                        <a
                          href={selectedMarketplaceProject.links.documentation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Documentation
                        </a>
                      )}
                      {selectedMarketplaceProject.links?.video && (
                        <a
                          href={selectedMarketplaceProject.links.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-red-600 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Video Preview
                        </a>
                      )}
                      {!selectedMarketplaceProject.links?.github && !selectedMarketplaceProject.links?.liveDemo && !selectedMarketplaceProject.links?.documentation && !selectedMarketplaceProject.links?.video && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">No links provided</span>
                      )}
                    </div>
                  </div>

                  {/* Required Videos Section - Demo & Explanation */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block flex items-center gap-2">
                      📹 Required Videos
                      <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                        Must Review Before Approval
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedMarketplaceProject.links?.demoVideo ? (
                        <a
                          href={selectedMarketplaceProject.links.demoVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-3 bg-purple-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          🎬 Watch Demo Video
                        </a>
                      ) : (
                        <div className="px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-semibold rounded-lg flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          ⚠️ Demo Video Missing!
                        </div>
                      )}
                      {selectedMarketplaceProject.links?.explanationVideo ? (
                        <a
                          href={selectedMarketplaceProject.links.explanationVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          💡 Watch Explanation Video
                        </a>
                      ) : (
                        <div className="px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-semibold rounded-lg flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          ⚠️ Explanation Video Missing!
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Please watch both videos to verify the project quality before approving.
                    </p>
                  </div>

                  {selectedMarketplaceProject.techStack && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tech Stack</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedMarketplaceProject.techStack.map((tech, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Seller Information</label>
                    <p className="text-gray-900 dark:text-white">{selectedMarketplaceProject.sellerName || 'Unknown'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                      Rejection Reason (required if rejecting)
                    </label>
                    <textarea
                      value={marketplaceRejectionReason}
                      onChange={(e) => setMarketplaceRejectionReason(e.target.value)}
                      placeholder="Explain why this listing is being rejected..."
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:border-[#00ADB5] focus:outline-none resize-none"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleApproveMarketplace(selectedMarketplaceProject.id)}
                    disabled={processingMarketplaceId === selectedMarketplaceProject.id}
                    className="flex-1 px-6 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve & Publish
                  </button>
                  <button
                    onClick={() => handleRejectMarketplace(selectedMarketplaceProject.id)}
                    disabled={processingMarketplaceId === selectedMarketplaceProject.id}
                    className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMarketplaceProject(null);
                      setMarketplaceRejectionReason('');
                    }}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {selectedIdea && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Review Idea</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Title</label>
                    <p className="text-lg font-bold text-gray-900">{selectedIdea.title}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600">Description</label>
                    <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedIdea.description }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Category</label>
                      <p className="text-gray-900">{selectedIdea.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Timeline</label>
                      <p className="text-gray-900">{selectedIdea.expectedTimeline}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600">Submitted By</label>
                    <p className="text-gray-900">{selectedIdea.userName} ({selectedIdea.userEmail})</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">
                      Feedback <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      placeholder="Provide feedback for the user..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#00ADB5] focus:outline-none resize-none"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => approveIdea(selectedIdea.id)}
                    className="flex-1 px-6 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => rejectIdea(selectedIdea.id)}
                    className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setSelectedIdea(null);
                      setReviewFeedback('');
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Project Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Project?</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete <span className="font-semibold">"{projectToDelete?.title}"</span>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone. The project and all associated data will be permanently deleted.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setProjectToDelete(null);
                  }}
                  disabled={deletingProjectId !== null}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={deletingProjectId !== null}
                  className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deletingProjectId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Idea Confirmation Modal */}
        {showIdeaDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Idea?</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete <span className="font-semibold">"{ideaToDelete?.title}"</span>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone. The idea and any associated project will be permanently deleted.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowIdeaDeleteConfirm(false);
                    setIdeaToDelete(null);
                  }}
                  disabled={deletingIdeaId !== null}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteIdea}
                  disabled={deletingIdeaId !== null}
                  className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deletingIdeaId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

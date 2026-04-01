import jsPDF from 'jspdf';
import {
  Calendar,
  CheckCircle,
  Clock,
  Code2,
  Filter,
  Lightbulb,
  Search,
  Star,
  TrendingUp,
  Users
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomSelect from '../../Component/Global/CustomSelect';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { getSocket, initializeSocket, joinUserRoom, leaveUserRoom } from '../../service/socketService';

// CREATOR CORNER CACHE - 60 second TTL for instant revisit loading
interface CreatorCornerCache {
  projects: Project[];
  myIdeas: any[];
  myProjects: Project[];
  userJoinRequests: Record<string, any>;
  completedCount: number;
  completedTasks: any[];
  timestamp: number;
}

const CACHE_TTL = 60000; // 60 seconds
let creatorCornerCache: CreatorCornerCache | null = null;

const getCachedCreatorCorner = (): CreatorCornerCache | null => {
  if (!creatorCornerCache) return null;
  if (Date.now() - creatorCornerCache.timestamp > CACHE_TTL) {
    creatorCornerCache = null;
    return null;
  }
  return creatorCornerCache;
};

const setCachedCreatorCorner = (data: Omit<CreatorCornerCache, 'timestamp'>) => {
  creatorCornerCache = { ...data, timestamp: Date.now() };
};


interface Project {
  id: string;
  projectId?: string; // The actual project ID (different from idea ID)
  title: string;
  description: string;
  category: string;
  creator: string;
  creatorId: string;
  members: number;
  status: string;
  progress: number;
  tags: string[];
  createdAt: string;
  isCompleted?: boolean;
}

export default function BrowseProjects() {
  const { user } = useAuth();
  const TASKS_REQUIRED = 50;
  // Certificate download handler (now inside component, so user is in scope)
  const handleDownloadCertificate = () => {
    if (!user) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    // Background gradient effect (simulate with colored rectangles)
    const width = 297;
    const height = 210;
    doc.setFillColor(0, 173, 181); // #00ADB5
    doc.rect(0, 0, width, height, 'F');
    doc.setFillColor(34, 40, 49); // #222831
    doc.rect(10, 10, width - 20, height - 20, 'F');
    // Decorative border
    doc.setDrawColor(0, 173, 181);
    doc.setLineWidth(2);
    doc.rect(10, 10, width - 20, height - 20, 'S');
    // Certificate Title
    doc.setFontSize(32);
    doc.setTextColor(0, 173, 181);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificate of Completion', width / 2, 38, { align: 'center' });
    // Subtitle
    doc.setFontSize(16);
    doc.setTextColor(238, 238, 238);
    doc.setFont('helvetica', 'normal');
    doc.text('This is to proudly certify that', width / 2, 60, { align: 'center' });
    // User Name
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(user.name || user.email || 'User', width / 2, 82, { align: 'center' });
    // User Email
    if (user.email) {
      doc.setFontSize(14);
      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'italic');
      doc.text(user.email, width / 2, 94, { align: 'center' });
    }
    // Achievement
    doc.setFontSize(18);
    doc.setTextColor(238, 238, 238);
    doc.setFont('helvetica', 'normal');
    doc.text(`has successfully completed`, width / 2, 112, { align: 'center' });
    doc.setFontSize(22);
    doc.setTextColor(0, 173, 181);
    doc.setFont('helvetica', 'bold');
    doc.text(`${TASKS_REQUIRED} Verified Tasks`, width / 2, 128, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(238, 238, 238);
    doc.setFont('helvetica', 'normal');
    doc.text('on the NextStep platform.', width / 2, 144, { align: 'center' });
    // Date and Certificate ID
    doc.setFontSize(13);
    doc.setTextColor(200, 200, 200);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 30, height - 30);
    doc.text('Certificate ID: NEXTSTEP-' + user.id, width - 30, height - 30, { align: 'right' });
    // Signature: Stylized 'NextStep' signature
    doc.setFontSize(28);
    doc.setTextColor(0, 173, 181);
    doc.setFont('times', 'italic');
    doc.text('NextStep', width - 60, height - 52, { align: 'center' });
    // Optional: underline for signature
    doc.setDrawColor(0, 173, 181);
    doc.setLineWidth(1);
    doc.line(width - 90, height - 48, width - 30, height - 48);
    // Label below signature
    doc.setFontSize(12);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'normal');
    doc.text('NextStep Team', width - 60, height - 42, { align: 'center' });
    // Unique badge/graphic (simple circle)
    doc.setFillColor(0, 173, 181);
    doc.circle(40, 40, 12, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('NEXT STEP', 40, 44, { align: 'center' });
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('This certificate is generated by NextStep and is valid for all official purposes.', width / 2, height - 15, { align: 'center' });
    doc.save('NextStep_Certificate.pdf');
  };
  const { fetchAllIdeas, sendJoinRequest, fetchAllJoinRequests, getProjectMembers, fetchTasks: _fetchTasks, fetchCompletedTasksCount: _fetchCompletedTasksCount, fetchCompletedTasksData, deleteIdea, ideasRefreshSignal, triggerIdeasRefresh, fetchJoinRequests } = useDataContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'browse' | 'myideas' | 'myprojects'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [myIdeas, setMyIdeas] = useState<any[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState<number>(0);
  // projectTaskCounts removed (was unused) — completed tasks tracked in `completedTasks`
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [myProjectsView, setMyProjectsView] = useState<'projects' | 'ideas'>('projects');

  // Track user's join requests and memberships
  const [userJoinRequests, setUserJoinRequests] = useState<Record<string, any>>({});
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());

  // Track pending join requests count per project (for creators)
  const [projectPendingRequests, setProjectPendingRequests] = useState<Record<string, number>>({});

  // Application Modal State
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [application, setApplication] = useState({
    skills: '',
    experience: '',
    motivation: '',
    availability: ''
  });

  // Project Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);

  const categories = ['All', 'Web Development', 'Mobile App', 'AI/ML', 'Data Science', 'Game Development', 'IoT', 'Blockchain'];

  // Flag to prevent duplicate fetches
  const fetchingRef = useRef(false);

  // SUPERFAST: Cache-first loading with background refresh
  const loadAllDataOptimized = useCallback(async (skipCache = false) => {
    if (!user) return;
    if (fetchingRef.current && !skipCache) return;

    // CHECK CACHE FIRST - instant load!
    if (!skipCache) {
      const cached = getCachedCreatorCorner();
      if (cached) {
        // INSTANT UI from cache
        setProjects(cached.projects);
        setMyIdeas(cached.myIdeas);
        setMyProjects(cached.myProjects);
        setUserJoinRequests(cached.userJoinRequests);
        setCompletedCount(cached.completedCount);
        setCompletedTasks(cached.completedTasks);
        setLoading(false);
        // Refresh in background (stale-while-revalidate)
        loadAllDataOptimized(true);
        return;
      }
    }

    fetchingRef.current = true;
    if (!skipCache) setLoading(true);

    try {
      // STEP 1: Fetch all base data in parallel (3 API calls instead of 4+ sequential)
      const [allIdeas, allJoinRequests, completedData] = await Promise.all([
        fetchAllIdeas(),
        fetchAllJoinRequests(),
        fetchCompletedTasksData(user.id)
      ]);

      // STEP 2: Process ideas locally (no additional API calls)
      // Include both approved and completed projects in browse section
      const approvedIdeas = allIdeas.filter((idea: any) => idea.status === 'approved' || idea.status === 'completed');
      const userIdeas = allIdeas.filter((idea: any) => idea.userId === user.id);
      const userApprovedIdeas = allIdeas.filter((idea: any) =>
        String(idea.userId) === String(user.id) && (idea.status === 'approved' || idea.status === 'completed')
      );

      // STEP 3: Build project/idea maps upfront
      const ideaToProjectMap: Record<string, string> = {};
      const projectToIdeaMap: Record<string, string> = {};
      approvedIdeas.forEach((idea: any) => {
        if (idea.projectId) {
          ideaToProjectMap[idea.id] = idea.projectId;
          projectToIdeaMap[idea.projectId] = idea.id;
        }
      });

      // STEP 4: Build user access status from join requests (fast, no API calls)
      const userRequests = allJoinRequests.filter((req: any) => {
        const reqUserId = typeof req.userId === 'object' ? (req.userId.id || req.userId._id) : req.userId;
        return String(reqUserId) === String(user.id);
      });

      const requestsMap: Record<string, any> = {};
      userRequests.forEach((req: any) => {
        if (!req.projectId) return;
        const reqProjectId = typeof req.projectId === 'object'
          ? (req.projectId?.id || req.projectId?._id || req.projectId)
          : req.projectId;
        if (!reqProjectId) return;
        const ideaId = projectToIdeaMap[String(reqProjectId)] || String(reqProjectId);
        requestsMap[ideaId] = req;
        requestsMap[String(reqProjectId)] = req;
      });

      // STEP 5: Build projects IMMEDIATELY with placeholder member count (show UI fast!)
      const approvedProjectsOptimistic = approvedIdeas.map((idea: any) => ({
        id: idea.id,
        projectId: idea.projectId || idea.id,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        creator: idea.userName,
        creatorId: String(idea.userId),
        members: 1, // Placeholder - will update in background
        status: idea.status === 'completed' ? 'Completed' : 'Active',
        isCompleted: idea.status === 'completed',
        progress: 0,
        tags: [idea.category],
        createdAt: idea.submittedAt || new Date().toISOString()
      }));

      const userProjectsOptimistic = userApprovedIdeas.map((idea: any) => ({
        id: idea.id,
        projectId: idea.projectId || idea.id,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        creator: idea.userName,
        creatorId: String(idea.userId),
        members: 1, // Placeholder - will update in background
        status: idea.status === 'completed' ? 'Completed' : 'Active',
        isCompleted: idea.status === 'completed',
        progress: 0,
        tags: [idea.category],
        createdAt: idea.submittedAt || new Date().toISOString()
      }));

      // STEP 6: Update UI IMMEDIATELY with optimistic data (FAST!)
      setProjects(approvedProjectsOptimistic);
      setMyIdeas(userIdeas);
      setMyProjects(userProjectsOptimistic);
      setUserJoinRequests(requestsMap);
      setCompletedCount(completedData.count);
      setCompletedTasks(completedData.completedTasks);
      setLoading(false); // Show content NOW!

      // STEP 7: Fetch member counts in background (non-blocking)
      const allProjectIds = new Set<string>();
      approvedIdeas.forEach((idea: any) => {
        allProjectIds.add(idea.projectId || idea.id);
      });

      const memberPromises = Array.from(allProjectIds).map(async (projectId) => {
        try {
          const members = await getProjectMembers(projectId);
          return { projectId, members };
        } catch {
          return { projectId, members: [] };
        }
      });

      const memberResults = await Promise.all(memberPromises);
      const projectMembersMap = new Map<string, any[]>();
      memberResults.forEach(({ projectId, members }) => {
        projectMembersMap.set(projectId, members);
      });

      // STEP 8: Update projects with real member counts
      const approvedProjectsFinal = approvedIdeas.map((idea: any) => {
        const actualProjectId = idea.projectId || idea.id;
        const members = projectMembersMap.get(actualProjectId) || [];
        return {
          id: idea.id,
          projectId: actualProjectId,
          title: idea.title,
          description: idea.description,
          category: idea.category,
          creator: idea.userName,
          creatorId: String(idea.userId),
          members: members.length || 1,
          status: idea.status === 'completed' ? 'Completed' : 'Active',
          isCompleted: idea.status === 'completed',
          progress: 0,
          tags: [idea.category],
          createdAt: idea.submittedAt || new Date().toISOString()
        };
      });

      const userProjectsFinal = userApprovedIdeas.map((idea: any) => {
        const actualProjectId = idea.projectId || idea.id;
        const members = projectMembersMap.get(actualProjectId) || [];
        return {
          id: idea.id,
          projectId: actualProjectId,
          title: idea.title,
          description: idea.description,
          category: idea.category,
          creator: idea.userName,
          creatorId: String(idea.userId),
          members: members.length || 1,
          status: idea.status === 'completed' ? 'Completed' : 'Active',
          isCompleted: idea.status === 'completed',
          progress: 0,
          tags: [idea.category],
          createdAt: idea.submittedAt || new Date().toISOString()
        };
      });

      // STEP 9: Build memberships from real member data
      const membershipSet = new Set<string>();
      approvedIdeas.forEach((project: any) => {
        const actualProjectId = project.projectId || project.id;
        const members = projectMembersMap.get(actualProjectId) || [];
        const isMember = members.some((m: any) => m.userId && String(m.userId) === String(user.id));
        if (isMember) {
          membershipSet.add(project.id);
          if (project.projectId) {
            membershipSet.add(project.projectId);
          }
        }
      });

      // STEP 10: Fetch pending join requests in parallel
      const pendingRequestPromises = userProjectsFinal.map(async (project) => {
        try {
          const requests = await fetchJoinRequests(project.projectId || project.id);
          const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
          return { projectId: project.id, pendingCount };
        } catch {
          return { projectId: project.id, pendingCount: 0 };
        }
      });

      const pendingResults = await Promise.all(pendingRequestPromises);
      const pendingCounts: Record<string, number> = {};
      pendingResults.forEach(({ projectId, pendingCount }) => {
        if (pendingCount > 0) {
          pendingCounts[projectId] = pendingCount;
        }
      });

      // STEP 11: Final state update with complete data
      setProjects(approvedProjectsFinal);
      setMyProjects(userProjectsFinal);
      setProjectPendingRequests(pendingCounts);
      setUserMemberships(membershipSet);

      // CACHE for instant revisit
      setCachedCreatorCorner({
        projects: approvedProjectsFinal,
        myIdeas: userIdeas,
        myProjects: userProjectsFinal,
        userJoinRequests: requestsMap,
        completedCount: completedData.count,
        completedTasks: completedData.completedTasks
      });
    } catch (error) {
      console.error('Error loading Creator Corner data:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, fetchAllIdeas, fetchAllJoinRequests, fetchCompletedTasksData, getProjectMembers, fetchJoinRequests]);

  // Lightweight refresh for just access status (used by socket events)
  const refreshAccessStatus = useCallback(async () => {
    if (!user) return;
    try {
      const [allIdeas, allJoinRequests] = await Promise.all([
        fetchAllIdeas(),
        fetchAllJoinRequests()
      ]);

      // Include both approved and completed projects
      const approvedIdeas = allIdeas.filter((idea: any) => idea.status === 'approved' || idea.status === 'completed');

      // Fetch members in parallel
      const memberPromises = approvedIdeas.map(async (idea: any) => {
        const actualProjectId = idea.projectId || idea.id;
        try {
          const members = await getProjectMembers(actualProjectId);
          return { idea, members };
        } catch {
          return { idea, members: [] };
        }
      });

      const results = await Promise.all(memberPromises);

      const projectToIdeaMap: Record<string, string> = {};
      approvedIdeas.forEach((idea: any) => {
        if (idea.projectId) {
          projectToIdeaMap[idea.projectId] = idea.id;
        }
      });

      const userRequests = allJoinRequests.filter((req: any) => {
        const reqUserId = typeof req.userId === 'object' ? (req.userId.id || req.userId._id) : req.userId;
        return String(reqUserId) === String(user.id);
      });

      const requestsMap: Record<string, any> = {};
      userRequests.forEach((req: any) => {
        if (!req.projectId) return;
        const reqProjectId = typeof req.projectId === 'object'
          ? (req.projectId?.id || req.projectId?._id || req.projectId)
          : req.projectId;
        if (!reqProjectId) return;
        const ideaId = projectToIdeaMap[String(reqProjectId)] || String(reqProjectId);
        requestsMap[ideaId] = req;
        requestsMap[String(reqProjectId)] = req;
      });

      const membershipSet = new Set<string>();
      results.forEach(({ idea, members }) => {
        const isMember = members.some((m: any) => m.userId && String(m.userId) === String(user.id));
        if (isMember) {
          membershipSet.add(idea.id);
          if (idea.projectId) {
            membershipSet.add(idea.projectId);
          }
        }
      });

      setUserJoinRequests(requestsMap);
      setUserMemberships(membershipSet);
    } catch (error) {
      console.error('Error refreshing access status:', error);
    }
  }, [user, fetchAllIdeas, fetchAllJoinRequests, getProjectMembers]);

  useEffect(() => {
    loadAllDataOptimized();

    // Refresh user access status every 30 seconds as fallback (reduced for performance)
    const refreshInterval = setInterval(() => {
      refreshAccessStatus();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [loadAllDataOptimized, refreshAccessStatus]);

  // Real-time socket listener for join request updates
  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    initializeSocket();
    const socket = getSocket();

    if (socket) {
      // Join user's personal room for real-time notifications
      joinUserRoom(user.id);

      // Listen for join request status changes (approved/rejected)
      const handleJoinRequestUpdate = (data: { requestId: string; status: string; userId: string }) => {
        console.log('🔔 Real-time join request update:', data);
        // If this update is for the current user, refresh access status immediately
        if (String(data.userId) === String(user.id)) {
          console.log('🔔 Refreshing access status for current user...');
          refreshAccessStatus();
        }
      };

      // Listen for member joined events
      const handleMemberJoined = (data: { userId: string; userName: string }) => {
        console.log('🔔 Real-time member joined:', data);
        if (String(data.userId) === String(user.id)) {
          console.log('🔔 Current user joined a project, refreshing...');
          refreshAccessStatus();
        }
      };

      // Listen for member removed events
      const handleMemberRemoved = (data: { projectId: string; memberId: string }) => {
        console.log('🔔 Real-time member removed:', data);
        if (String(data.memberId) === String(user.id)) {
          console.log('🔔 Current user was removed from project, refreshing...');
          // Remove project from memberships immediately
          setUserMemberships(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.projectId);
            return newSet;
          });
          // Also refresh access status to ensure UI is up to date
          refreshAccessStatus();
        }
      };

      socket.on('join-request-updated', handleJoinRequestUpdate);
      socket.on('member-joined', handleMemberJoined);
      socket.on('member-removed', handleMemberRemoved);

      return () => {
        socket.off('join-request-updated', handleJoinRequestUpdate);
        socket.off('member-joined', handleMemberJoined);
        socket.off('member-removed', handleMemberRemoved);
        leaveUserRoom(user.id);
      };
    }
  }, [user, refreshAccessStatus]);

  // If navigated back after editing/creating an idea, refresh lists instantly
  const location = useLocation();
  useEffect(() => {
    if (location && (location as any).state && (location as any).state.refreshIdeas) {
      (async () => {
        try {
          await loadAllDataOptimized();
        } finally {
          // clear the navigation state so refresh only runs once
          navigate(location.pathname, { replace: true, state: {} });
        }
      })();
    }
  }, [location, loadAllDataOptimized, navigate]);

  // Subscribe to context refresh signal so lists reload automatically
  useEffect(() => {
    if (typeof ideasRefreshSignal === 'number') {
      loadAllDataOptimized();
    }
  }, [ideasRefreshSignal, loadAllDataOptimized]);

  const requestToJoin = async (_projectId: string) => {
    if (!user) {
      alert('Please login to join projects');
      return;
    }

    try {
      // Get project details
      const allIdeas = await fetchAllIdeas();
      const project = allIdeas.find((idea: any) => idea.id === _projectId);

      if (!project) {
        alert('Project not found');
        return;
      }

      if (project.userId === user.id) {
        alert('You cannot join your own project');
        return;
      }

      // Convert to Project type and open modal
      const projectData: Project = {
        id: project.id,
        title: project.title,
        description: project.description,
        category: project.category,
        creator: project.userName,
        creatorId: project.userId,
        members: 1,
        status: 'Active',
        progress: 0,
        tags: [project.category],
        createdAt: project.submittedAt || new Date().toISOString()
      };

      setSelectedProject(projectData);
      setShowApplicationModal(true);
    } catch (error: any) {
      alert(error.message || 'Failed to open application form');
    }
  };

  const joinProject = async (ideaId: string) => {
    if (!user) return;

    try {
      // Navigate using idea ID - workspace page looks up project by idea ID
      navigate(`/dashboard/projects/workspace/${ideaId}`);
    } catch (error) {
      console.error('Error joining project:', error);
    }
  };

  const getProjectButtonState = useCallback((ideaId: string, actualProjectId: string | undefined, creatorId: string, isCompleted?: boolean) => {
    // Check using both ideaId AND actualProjectId for membership and requests
    const isMemberByIdeaId = userMemberships.has(ideaId);
    const isMemberByProjectId = actualProjectId ? userMemberships.has(actualProjectId) : false;
    const isMember = isMemberByIdeaId || isMemberByProjectId;

    const requestByIdeaId = userJoinRequests[ideaId];
    const requestByProjectId = actualProjectId ? userJoinRequests[actualProjectId] : undefined;
    const request = requestByIdeaId || requestByProjectId;

    if (!user) return { text: 'Login to Join', disabled: true, action: 'login' };
    // Use String() comparison for consistent matching
    if (String(creatorId) === String(user.id)) return { text: 'Manage →', disabled: false, action: 'manage' };
    if (isMember) return { text: 'Open Workspace ', disabled: false, action: 'open' };

    // If project is completed, don't allow new join requests
    if (isCompleted) {
      return { text: 'Project Completed', disabled: true, action: 'completed' };
    }

    if (request) {
      if (request.status === 'approved') {
        // When request is approved, show Open Workspace directly
        return { text: 'Open Workspace ', disabled: false, action: 'open' };
      } else if (request.status === 'pending') {
        return { text: 'Pending...', disabled: true, action: 'pending' };
      } else if (request.status === 'rejected') {
        return { text: 'Request Again', disabled: false, action: 'request' };
      }
    }

    return { text: 'Request to Join', disabled: false, action: 'request' };
  }, [user, userMemberships, userJoinRequests]);

  const showProjectDetails = (project: Project) => {
    setSelectedProjectForDetails(project);
    setShowDetailsModal(true);
  };

  const submitApplication = async () => {
    if (!selectedProject || !user) return;

    // Validate application
    if (!application.skills.trim()) {
      alert('Please enter your skills');
      return;
    }

    if (!application.motivation.trim()) {
      alert('Please explain why you want to join this project');
      return;
    }

    try {
      const allIdeas = await fetchAllIdeas();
      const project = allIdeas.find((idea: any) => idea.id === selectedProject.id);

      console.log('🔍 APPLYING TO PROJECT:');
      console.log('Selected Project ID:', selectedProject.id);
      console.log('Found project:', project);
      console.log('Project Idea ID:', project?.id);
      console.log('Project Actual ID:', project?.projectId);
      console.log('Project Creator ID:', project?.userId);

      if (!project) {
        alert('Project not found');
        return;
      }

      // Use the actual project ID (not the idea ID) for join requests
      const actualProjectId = project.projectId || project.id;

      // Send join request with application details
      console.log('📤 Sending join request with:');
      console.log('  actualProjectId:', actualProjectId);
      console.log('  projectTitle:', selectedProject.title);
      console.log('  creatorId:', project.userId);

      // Create message with application details
      const applicationMessage = `Skills: ${application.skills}\nExperience: ${application.experience}\nMotivation: ${application.motivation}\nAvailability: ${application.availability}`;

      await sendJoinRequest(
        actualProjectId,
        applicationMessage
      );

      alert(`✅ Application submitted successfully!\n\nProject: ${selectedProject.title}\nCreator will review in the Members tab of their project.`);
      setShowApplicationModal(false);
      setApplication({ skills: '', experience: '', motivation: '', availability: '' });
      setSelectedProject(null);

      // Reload access status to show pending state
      await refreshAccessStatus();
    } catch (error: any) {
      console.error('❌ Application submission failed:', error);
      alert(error.message || 'Failed to submit application');
    }
  };

  // Debounced search for better performance
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Memoized filtered projects - only recalculates when dependencies change
  const filteredProjects = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    const categoryLower = selectedCategory.toLowerCase();
    return projects.filter(project => {
      const matchesSearch = !debouncedSearch ||
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower);
      const matchesCategory = selectedCategory === 'all' || project.category.toLowerCase() === categoryLower;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'completed' && project.isCompleted) ||
        (statusFilter === 'active' && !project.isCompleted);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [projects, debouncedSearch, selectedCategory, statusFilter]);

  // Memoized completed tasks grouped by project
  const completedByProject = useMemo(() => {
    return completedTasks.reduce((acc: Record<string, any[]>, t: any) => {
      const key = t.projectId || t.projectTitle || 'Unknown Project';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {});
  }, [completedTasks]);

  return (
    <div className="min-h-screen bg-white dark:bg-black p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4 md:mb-6">
            <div className="w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1 sm:mb-2 leading-tight">
                Project Collaboration Hub
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-white">Join exciting projects or submit your own idea</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/projects/submit-idea')}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white text-sm sm:text-base font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
              Submit Your Idea
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-white dark:bg-gray-900 rounded-xl p-2 shadow-lg">
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 rounded-lg text-xs sm:text-sm md:text-base font-semibold transition-all ${
                activeTab === 'browse'
                  ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                  : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Browse Projects</span>
                <span className="sm:hidden">Browse</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('myideas')}
              className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 rounded-lg text-xs sm:text-sm md:text-base font-semibold transition-all ${
                activeTab === 'myideas'
                  ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                  : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Tasks Completed</span>
                <span className="sm:hidden">Completed</span>
                {completedTasks.length > 0 && (
                  <span className="bg-white text-[#00ADB5] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold">
                    {completedTasks.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('myprojects')}
              className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 rounded-lg text-xs sm:text-sm md:text-base font-semibold transition-all ${
                activeTab === 'myprojects'
                  ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                  : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <Code2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">My Projects</span>
                <span className="sm:hidden">Projects</span>
                {myProjects.length > 0 && (
                  <span className="bg-white text-[#00ADB5] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold">
                    {myProjects.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Browse Projects Tab */}
        {activeTab === 'browse' && (
          <div>
            {/* Search and Filter - Enhanced */}
            <div className="mb-4 sm:mb-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-600 transition-all"
                  />
                </div>
                <CustomSelect
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory(value)}
                  options={categories.map((cat) => ({
                    value: cat.toLowerCase(),
                    label: cat
                  }))}
                  className="w-full sm:min-w-[180px] sm:w-auto"
                />
                <CustomSelect
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as 'all' | 'active' | 'completed')}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'completed', label: 'Completed' }
                  ]}
                  className="w-full sm:min-w-[140px] sm:w-auto"
                />
              </div>

              {/* Stats Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-xs sm:text-sm mt-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="flex items-center gap-1 text-gray-600 dark:text-white">
                    <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                    <strong style={{ color: '#00ADB5' }}>{filteredProjects.length}</strong> projects available
                  </span>
                  {searchQuery && (
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold" style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}>
                      Filtered by: "{searchQuery}"
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                  <button className="px-2 sm:px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] sm:text-xs font-medium hover:border-[#00ADB5] transition-all flex items-center gap-1 text-gray-700 dark:text-white">
                    <TrendingUp className="w-3 h-3" /> <span className="hidden sm:inline">Trending</span>
                  </button>
                  <button className="px-2 sm:px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] sm:text-xs font-medium hover:border-[#00ADB5] transition-all flex items-center gap-1 text-gray-700 dark:text-white">
                    <Star className="w-3 h-3" /> <span className="hidden sm:inline">Popular</span>
                  </button>
                  <button className="px-2 sm:px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] sm:text-xs font-medium hover:border-[#00ADB5] transition-all flex items-center gap-1 text-gray-700 dark:text-white">
                    <Calendar className="w-3 h-3" /> <span className="hidden sm:inline">Recent</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Project Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-white">Loading projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                <Code2 className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No projects found</h3>
                <p className="text-gray-600 dark:text-white">Try adjusting your search or submit a new idea!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {filteredProjects.map((project) => (
                <div key={project.id} className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate">{project.title}</h3>
                        {project.isCompleted && (
                          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-gray-600 dark:text-white text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: project.description }} />
                    </div>
                    <span className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full whitespace-nowrap ml-2 ${
                      project.isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {project.isCompleted ? '✓ Completed' : project.status}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-3 sm:mb-4">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-white">Progress</span>
                      <span className="text-xs sm:text-sm font-black text-[#00ADB5]">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${project.progress}%`, backgroundColor: '#00ADB5' }}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    {project.tags.map((tag) => (
                      <span key={tag} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-semibold rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-white">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{project.members}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">{new Date(project.createdAt).toLocaleDateString()}</span>
                        <span className="sm:hidden">{new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => showProjectDetails(project)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg border-2 border-[#00ADB5] text-[#00ADB5] hover:bg-[#00ADB5] hover:text-white transition-colors"
                      >
                        Show Details
                      </button>
                      {(() => {
                        const buttonState = getProjectButtonState(project.id, project.projectId, project.creatorId, project.isCompleted);

                        return buttonState.action === 'completed' ? (
                          <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm">
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Completed</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              // Always use project.id (idea ID) for navigation - workspace looks up by idea ID
                              if (buttonState.action === 'request') requestToJoin(project.id);
                              else if (buttonState.action === 'join' || buttonState.action === 'open') joinProject(project.id);
                              else if (buttonState.action === 'manage') navigate(`/dashboard/projects/workspace/${project.id}`);
                            }}
                            disabled={buttonState.disabled}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                              buttonState.disabled
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                : buttonState.action === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : buttonState.action === 'join' || buttonState.action === 'open'
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-[#00ADB5] text-white hover:bg-cyan-600'
                            }`}
                          >
                            {buttonState.text}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* Tasks Completed Tab (replaces My Ideas) */}
        {activeTab === 'myideas' && (
          <div>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Completed Tasks List (Left) */}
              <div className="flex-1">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">✅ Tasks You've Completed</h3>
                  <p className="text-gray-600 dark:text-white mb-4">Showcasing your verified achievements across projects</p>
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No completed tasks yet</h3>
                      <p className="text-gray-600 dark:text-white mb-6">Complete tasks in project workspaces to earn verification.</p>
                      <button
                        onClick={() => setActiveTab('browse')}
                        className="px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                      >
                        Browse Projects
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.keys(completedByProject).map((projectTitle) => (
                        <div key={projectTitle} className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-900 rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-cyan-100 dark:border-cyan-800">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="px-3 py-1 bg-gradient-to-r from-[#00ADB5] to-cyan-500 text-white rounded-full text-xs font-bold">
                                  PROJECT
                                </div>
                              </div>
                              <h4 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-1">{completedByProject[projectTitle][0].projectTitle || projectTitle}</h4>
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="text-xl">🎯</span>
                                <span><span className="font-bold text-[#00ADB5]">{completedByProject[projectTitle].length}</span> verified task{completedByProject[projectTitle].length !== 1 ? 's' : ''}</span>
                              </p>
                            </div>
                            <div className="text-4xl">📊</div>
                          </div>
                          <div className="divide-y divide-cyan-100 dark:divide-cyan-800">
                            {completedByProject[projectTitle].map((t: any, idx: number) => {
                              let dateToShow = null;
                              if (t.verifiedAt) {
                                if (typeof t.verifiedAt === 'object' && t.verifiedAt.toDate) {
                                  dateToShow = t.verifiedAt.toDate();
                                } else if (typeof t.verifiedAt === 'string') {
                                  dateToShow = new Date(t.verifiedAt);
                                }
                              } else if (t.completedAt) {
                                if (typeof t.completedAt === 'object' && t.completedAt.toDate) {
                                  dateToShow = t.completedAt.toDate();
                                } else if (typeof t.completedAt === 'string') {
                                  dateToShow = new Date(t.completedAt);
                                }
                              }
                              return (
                                <div key={t.id} className="flex flex-col sm:flex-row items-center sm:items-stretch justify-between py-3 px-2 sm:px-4 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-all">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-green-600 dark:text-green-400 font-bold text-lg w-8 text-center">{idx + 1}.</span>
                                    <span className="font-semibold text-gray-900 dark:text-white text-base break-words whitespace-normal flex-1">{t.title || t.name || 'Task'}</span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                    <span className="text-xs text-gray-500 whitespace-nowrap">📅 {dateToShow ? dateToShow.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not available'}</span>
                                    <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full text-xs font-bold text-green-700 flex items-center gap-1">
                                      <span className="text-green-600">🏅</span> Verified
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Certificate Progress (Right) */}
              <div className="w-full md:w-64 flex-shrink-0">
                <div className="mb-6 bg-gradient-to-r from-cyan-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 border-2 border-cyan-200 dark:border-cyan-800 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <div className="flex flex-col items-start justify-between gap-6">
                    <div className="flex items-center gap-3 mb-3">

                      <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Certification Progress</h3>
                    </div>
                    {completedCount >= TASKS_REQUIRED ? (
                      <div>
                        <p className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-400 mb-2">🎉 Congratulations!</p>
                        <p className="text-gray-700 dark:text-white text-sm sm:text-base">You've completed <span className="font-black text-green-600 dark:text-green-400">{completedCount}</span> verified tasks and earned your <span className="font-bold">Verified Certificate</span>! Visit your profile to download it.</p>
                        <button
                          className="mt-4 px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          onClick={handleDownloadCertificate}
                        >
                          Download Certificate
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-700 dark:text-white font-semibold">{completedCount} of {TASKS_REQUIRED} tasks completed</span>
                            <span className="text-[#00ADB5] font-bold text-lg">{Math.round((completedCount / TASKS_REQUIRED) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#00ADB5] to-cyan-500 transition-all duration-500"
                              style={{ width: `${(completedCount / TASKS_REQUIRED) * 100}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-white text-sm sm:text-base">
                          Complete <span className="font-bold">{TASKS_REQUIRED - completedCount}</span> more tasks to earn your <span className="font-semibold text-[#00ADB5]">Verified Certificate</span> and showcase your expertise!
                        </p>
                        <button
                          className="mt-4 px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-bold rounded-xl opacity-60 cursor-not-allowed"
                          disabled
                        >
                          Download Certificate
                        </button>
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col items-center justify-center">

                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-cyan-200 dark:border-cyan-800 text-sm text-gray-600 dark:text-white flex items-center gap-2">
                    <span>💡</span>
                    <span>Keep contributing to projects to unlock your certification and boost your profile credibility.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Projects Tab (combined projects + ideas shown as 'Task Completed') */}
        {activeTab === 'myprojects' && (
          <div>
            {/* View Filter Buttons */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => setMyProjectsView('projects')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  myProjectsView === 'projects'
                    ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  <span>Projects</span>
                </div>
              </button>
              <button
                onClick={() => setMyProjectsView('ideas')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  myProjectsView === 'ideas'
                    ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>Ideas</span>
                </div>
              </button>
            </div>

            {myProjectsView === 'projects' ? (
              // Projects View
              myProjects.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                  <Code2 className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No projects yet</h3>
                  <p className="text-gray-600 dark:text-white mb-6">Join existing projects or create your own once your idea is approved</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      Browse Projects
                    </button>
                    <button
                      onClick={() => navigate('/dashboard/projects/submit-idea')}
                      className="px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                    >
                      Submit Idea
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {myProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/dashboard/projects/workspace/${project.id}`)}
                      className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 cursor-pointer relative"
                    >
                      {/* Pending Requests Badge */}
                      {projectPendingRequests[project.id] > 0 && (
                        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse shadow-lg">
                          <Users className="w-3 h-3" />
                          {projectPendingRequests[project.id]} pending
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">{project.title}</h3>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                              CREATOR
                            </span>
                          </div>
                          <div className="text-gray-600 dark:text-white text-sm prose prose-sm dark:prose-invert max-w-none line-clamp-2" dangerouslySetInnerHTML={{ __html: project.description }} />
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600 dark:text-white">Progress</span>
                          <span className="text-sm font-black text-[#00ADB5]">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${project.progress}%`, backgroundColor: '#00ADB5' }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-white">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{project.members} members</span>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-[#00ADB5] text-white font-semibold rounded-lg hover:bg-cyan-600 transition-colors">
                          Manage →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Ideas View
              myIdeas.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
                  <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No ideas submitted yet</h3>
                  <p className="text-gray-600 dark:text-white mb-6">Submit your project idea and get it approved by our team</p>
                  <button
                    onClick={() => navigate('/dashboard/projects/submit-idea')}
                    className="px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                  >
                    Submit Your First Idea
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myIdeas.map((idea) => (
                    <div key={idea.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border-l-4 border-[#00ADB5]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{idea.title}</h3>
                          <div className="text-sm text-gray-600 dark:text-white mb-3 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: idea.description }} />
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            📅 Submitted on {new Date(idea.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          {idea.status === 'pending' && (
                            <span className="px-4 py-2 bg-yellow-100 text-yellow-700 font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap">
                              <Clock className="w-4 h-4" />
                              Pending
                            </span>
                          )}
                          {idea.status === 'approved' && (
                            <span className="px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap">
                              <CheckCircle className="w-4 h-4" />
                              Approved
                            </span>
                          )}

                          {/* Owner actions: Edit / Delete */}
                          {user && idea.userId === user.id && (
                            <div className="mt-3 flex flex-col items-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/dashboard/projects/submit-idea', { state: { ideaToEdit: idea } });
                                }}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm('Are you sure you want to delete this idea? This cannot be undone.')) return;
                                  try {
                                    await deleteIdea(idea.id);
                                    // update local state
                                    setMyIdeas(prev => prev.filter((it) => it.id !== idea.id));
                                    try { triggerIdeasRefresh && triggerIdeasRefresh(); } catch (err) { /* noop */ }
                                  } catch (err) {
                                    console.error('Failed to delete idea', err);
                                    alert('Failed to delete idea. Please try again.');
                                  }
                                }}
                                className="px-4 py-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Apply to Join Project</h2>
              <p className="text-gray-600 dark:text-white mt-1">{selectedProject.title}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Skills */}
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                  Your Skills <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={application.skills}
                  onChange={(e) => setApplication({ ...application, skills: e.target.value })}
                  placeholder="e.g., React, Node.js, Python, UI/UX Design..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  rows={3}
                />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                  Relevant Experience
                </label>
                <textarea
                  value={application.experience}
                  onChange={(e) => setApplication({ ...application, experience: e.target.value })}
                  placeholder="Share your previous projects or work experience..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  rows={3}
                />
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                  Why do you want to join? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={application.motivation}
                  onChange={(e) => setApplication({ ...application, motivation: e.target.value })}
                  placeholder="Explain what interests you about this project and how you can contribute..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  rows={4}
                />
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                  Weekly Availability
                </label>
                <select
                  value={application.availability}
                  onChange={(e) => setApplication({ ...application, availability: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select your availability</option>
                  <option value="5-10 hours">5-10 hours per week</option>
                  <option value="10-20 hours">10-20 hours per week</option>
                  <option value="20+ hours">20+ hours per week</option>
                  <option value="Full-time">Full-time commitment</option>
                </select>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-2xl flex gap-3">
              <button
                onClick={() => {
                  setShowApplicationModal(false);
                  setApplication({ skills: '', experience: '', motivation: '', availability: '' });
                  setSelectedProject(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={submitApplication}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {showDetailsModal && selectedProjectForDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">{selectedProjectForDetails.title}</h2>
                  <p className="text-gray-600 dark:text-white mt-1">Project Details</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedProjectForDetails(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-gray-500 dark:text-white">×</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Project Status */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-bold text-gray-900 dark:text-white">Status: {selectedProjectForDetails.status}</span>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                  Active Project
                </span>
              </div>

              {/* Project Description */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Project Description</h3>
                <div className="text-gray-700 dark:text-white leading-relaxed bg-gray-50 dark:bg-gray-900 p-4 rounded-xl prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedProjectForDetails.description }} />
              </div>

              {/* Project Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#00ADB5]" />
                    Team Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-white">Creator:</span>
                      <span className="font-semibold dark:text-white">{selectedProjectForDetails.creator}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-white">Team Size:</span>
                      <span className="font-semibold dark:text-white">{selectedProjectForDetails.members} members</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#00ADB5]" />
                    Timeline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-white">Created:</span>
                      <span className="font-semibold dark:text-white">
                        {new Date(selectedProjectForDetails.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-white">Progress:</span>
                      <span className="font-semibold dark:text-white">{selectedProjectForDetails.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Project Progress</h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-600 dark:text-white">Overall Progress</span>
                    <span className="text-lg font-black text-[#00ADB5]">{selectedProjectForDetails.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedProjectForDetails.progress}%`,
                        backgroundColor: '#00ADB5'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Category & Tags */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Category & Tags</h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                  <div className="mb-3">
                    <span className="text-sm text-gray-600 dark:text-white">Category:</span>
                    <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg">
                      {selectedProjectForDetails.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-white block mb-2">Tags:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedProjectForDetails.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-cyan-100 text-cyan-700 text-sm font-semibold rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedProjectForDetails(null);
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

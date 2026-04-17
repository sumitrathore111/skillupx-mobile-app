import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../service/api";
import { useAuth } from "./AuthContext";

interface DataContextType {
  loading: boolean;
  userprofile: any;

  // Note: Many of these functions need to be implemented with your custom backend
  // For now, they are placeholder functions that throw "not implemented" errors
  writeQueryOnDate: (question_data: Query) => void;
  fetchTodayQueries: () => Promise<Object[]>;
  addObjectToUserArray: (uid: string, arrayField: string, objectToAdd: any) => void;
  pushDataToFirestore: (collectionName: string, dataList: object[]) => void;
  contributors: LegacyContributor[] | undefined;
  avatrUrl: string;
  pushDataWithId: (data: any) => Promise<void>;
  calculateResumeCompletion: (userProfile: any) => number;
  calculateCategoryCompletion: (userProfile: any) => object;

  // Add custom backend functions as needed
  updateUserProfile: (userId: string, updates: any) => Promise<void>;
  getUserProfile: (userId: string) => Promise<any>;

  // Additional functions for components
  fetchAllIdeas: () => Promise<any[]>;
  fetchJoinRequests: (projectId?: string) => Promise<any[]>;
  fetchAllJoinRequests: () => Promise<any[]>;
  submitIdea: (formData: { title: string; description: string; category: string; expectedTimeline: string }) => Promise<any>;
  triggerIdeasRefresh: () => void;
  ideasRefreshSignal: number;

  // Project functions
  sendJoinRequest: (projectId: string, message?: string) => Promise<any>;
  approveJoinRequest: (requestId: string, projectId: string, userId: string, userName: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  checkUserRole: (projectId: string) => Promise<string>;
  getProjectMembers: (projectId: string) => Promise<any[]>;
  fetchTasks: (projectId: string) => Promise<any[]>;
  addTask: (projectId: string, taskData: any) => Promise<any>;
  updateTask: (projectId: string, taskId: string, updates: any) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  fetchCompletedTasksCount: (userId: string) => Promise<number>;
  fetchCompletedTasksData: (userId: string) => Promise<{ count: number; completedTasks: any[] }>;
  fetchAllJoinRequestsDebug: () => Promise<any[]>;
  fixJoinRequestProjectId: (requestId: string, projectId: string) => Promise<void>;

  // Project Chat & Files functions
  sendMessage: (projectId: string, messageData: { text: string }) => Promise<any>;
  fetchMessages: (projectId: string) => Promise<any[]>;
  uploadFile: (projectId: string, fileData: { name: string; size: number; url: string }) => Promise<any>;
  fetchFiles: (projectId: string) => Promise<any[]>;
  deleteFile: (projectId: string, fileId: string) => Promise<void>;

  // Dashboard functions
  fetchUserSubmissions: (userId: string) => Promise<any[]>;

  // Wallet functions
  fetchUserTransactions: (userId: string) => Promise<any[]>;

  // Admin functions
  updateIdeaStatus: (ideaId: string, status: string, feedback?: string, reviewedBy?: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteIdea: (ideaId: string) => Promise<void>;
  fetchAllUsers: () => Promise<any[]>;
  fetchAllProjectMembers: () => Promise<any[]>;
  getPlatformStats: () => Promise<any>;
  deductCoins: (userId: string, amount: number, reason: string) => Promise<void>;
  addCoins: (userId: string, amount: number, reason: string) => Promise<void>;

  // CodeArena functions
  getUserWallet: (userId: string) => Promise<any>;
  initializeWallet: (userId: string) => Promise<any>;
  subscribeToWallet: (userId: string, callback: (wallet: any) => void) => () => void;
  fetchGlobalLeaderboard: () => Promise<any[]>;
  fetchWeeklyLeaderboard: () => Promise<any[]>;
  fetchMonthlyLeaderboard: () => Promise<any[]>;
  getUserProgress: (userId: string) => Promise<any>;
  fetchUserBattles: (userId: string) => Promise<any[]>;
  fetchEnrolledCourses: () => Promise<any[]>;
  fetchCompanies: () => Promise<any[]>;
}

interface LegacyContributor {
  id: string;
  image: string;
  name: string;
  avatar: string;
  commit: number;
  contributions: number;
  role: string;
  joinDate: string;
  specialties: string[];
  isTopContributor: boolean;
  from: string;
}

interface Query {
  question: string;
  answer: string;
  date: string;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userprofile, setUserProfile] = useState<any>(null);
  const [contributors] = useState<LegacyContributor[] | undefined>(undefined);
  const avatrUrl = "";

  // Fetch user profile from custom backend
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest(`/users/${user.id}`);
        setUserProfile(response.user);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Custom backend functions
  const getUserProfile = async (userId: string): Promise<any> => {
    const response = await apiRequest(`/users/${userId}`);
    return response.user;
  };

  const updateUserProfile = async (userId: string, updates: any): Promise<void> => {
    await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    // Refresh local profile if updating current user
    if (userId === user?.id) {
      const response = await apiRequest(`/users/${userId}`);
      setUserProfile(response.user);
    }
  };

  // Legacy functions - need backend implementation
  const writeQueryOnDate = (_question_data: Query) => {
    console.warn("writeQueryOnDate not implemented with custom backend");
  };

  const fetchTodayQueries = async (): Promise<Object[]> => {
    console.warn("fetchTodayQueries not implemented with custom backend");
    return [];
  };

  const addObjectToUserArray = (_uid: string, _arrayField: string, _objectToAdd: any) => {
    console.warn("addObjectToUserArray not implemented with custom backend");
  };

  const pushDataToFirestore = (_collectionName: string, _dataList: object[]) => {
    console.warn("pushDataToFirestore not implemented with custom backend");
  };

  const pushDataWithId = async (data: any): Promise<void> => {
    if (!user?.id) {
      console.error("No user ID available for profile update");
      throw new Error("No user ID available");
    }

    try {
      // Clean the data - only include fields that the backend accepts
      const cleanedData: any = {};

      // Only add fields that exist and are allowed
      if (data.name) cleanedData.name = data.name;
      if (data.phone) cleanedData.phone = String(data.phone);
      if (data.location) cleanedData.location = data.location;
      if (data.institute) cleanedData.institute = data.institute;
      if (data.bio) cleanedData.bio = data.bio;
      if (data.portfolio) cleanedData.portfolio = data.portfolio;
      if (data.resume_objective) cleanedData.resume_objective = data.resume_objective;
      if (data.githubUsername) cleanedData.githubUsername = data.githubUsername;
      if (data.yearOfStudy !== undefined) cleanedData.yearOfStudy = Number(data.yearOfStudy) || 0;
      if (data.profileCompletion !== undefined) cleanedData.profileCompletion = Number(data.profileCompletion) || 0;

      // Boolean fields
      if (data.isprofileComplete !== undefined || data.isProfileComplete !== undefined) {
        cleanedData.isProfileComplete = Boolean(data.isprofileComplete ?? data.isProfileComplete);
      }

      // Arrays - ensure they are arrays
      if (Array.isArray(data.skills)) cleanedData.skills = data.skills;
      if (Array.isArray(data.languages)) cleanedData.languages = data.languages;
      if (Array.isArray(data.achievements)) cleanedData.achievements = data.achievements;
      if (Array.isArray(data.target_company)) cleanedData.target_company = data.target_company;
      if (Array.isArray(data.education)) cleanedData.education = data.education;
      if (Array.isArray(data.experience)) cleanedData.experience = data.experience;
      if (Array.isArray(data.links)) cleanedData.links = data.links;

      // Avatar/Emoji field
      if (data.avatar !== undefined) cleanedData.avatar = data.avatar;
      if (data.profilePic !== undefined) cleanedData.profilePic = data.profilePic;

      console.log("Sending profile update:", cleanedData);

      await apiRequest(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(cleanedData)
      });

      // Refresh the user profile after update
      const response = await apiRequest(`/users/${user.id}`);
      setUserProfile(response.user);

      console.log("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const fetchAllIdeas = async (): Promise<any[]> => {
    try {
      const response = await apiRequest('/ideas');
      const ideas = response.ideas || [];
      // Map MongoDB _id to id for frontend compatibility
      return ideas.map((idea: any) => {
        // Extract the actual project ID from the populated projectId object
        let actualProjectId = null;
        if (idea.projectId) {
          // If projectId is populated (object with _id or id), extract it
          actualProjectId = idea.projectId.id || idea.projectId._id || idea.projectId;
        }

        // Extract userId as string - handle populated object (with id or _id) and plain string
        let userId = idea.userId;
        if (idea.submittedBy) {
          if (typeof idea.submittedBy === 'object') {
            // Populated user object - check for id first (from toJSON transform), then _id
            userId = idea.submittedBy.id || idea.submittedBy._id;
            if (userId && typeof userId !== 'string') {
              userId = String(userId);
            }
          } else if (typeof idea.submittedBy === 'string') {
            userId = idea.submittedBy;
          } else {
            userId = String(idea.submittedBy);
          }
        }

        console.log('Idea mapping:', { ideaTitle: idea.title, submittedBy: idea.submittedBy, extractedUserId: userId });

        return {
          ...idea,
          id: idea._id || idea.id,
          projectId: actualProjectId,  // Include actual project ID
          userId: userId,
          userName: idea.submittedByName || idea.submittedBy?.name || idea.userName,
          userEmail: idea.submittedByEmail || idea.submittedBy?.email || idea.userEmail,
          submittedAt: idea.createdAt || idea.submittedAt
        };
      });
    } catch (error) {
      console.error('Error fetching ideas:', error);
      return [];
    }
  };

  const submitIdea = async (formData: { title: string; description: string; category: string; expectedTimeline: string }): Promise<any> => {
    try {
      const response = await apiRequest('/ideas', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      return response.idea;
    } catch (error) {
      console.error('Error submitting idea:', error);
      throw error;
    }
  };

  // Trigger refresh for ideas list (can be used by components)
  const [ideasRefreshKey, setIdeasRefreshKey] = useState(0);
  const triggerIdeasRefresh = () => {
    setIdeasRefreshKey(prev => prev + 1);
  };

  const fetchJoinRequests = async (projectId?: string): Promise<any[]> => {
    try {
      if (projectId) {
        // Fetch join requests for a specific project (for project owner)
        const response = await apiRequest(`/join-requests/project/${projectId}`);
        const requests = response.requests || [];
        // Map MongoDB _id to id for frontend compatibility
        return requests.map((req: any) => ({
          ...req,
          id: req._id || req.id,
          userId: req.userId?._id || req.userId,
          userName: req.userId?.name || req.userName,
          userEmail: req.userId?.email || req.userEmail,
          requestedAt: req.createdAt
        }));
      } else {
        // Fetch current user's join requests
        if (!user?.id) return [];
        const response = await apiRequest(`/users/${user.id}/join-requests`);
        return response.requests || [];
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
      return [];
    }
  };

  const fetchAllJoinRequests = async (): Promise<any[]> => {
    try {
      const response = await apiRequest('/join-requests');
      return response.requests || [];
    } catch (error) {
      console.error('Error fetching all join requests:', error);
      return [];
    }
  };

  const fetchAllJoinRequestsDebug = async (): Promise<any[]> => {
    try {
      const response = await apiRequest('/join-requests/debug');
      return response.requests || [];
    } catch (error) {
      console.error('Error fetching all join requests debug:', error);
      return [];
    }
  };

  const fixJoinRequestProjectId = async (requestId: string, projectId: string): Promise<void> => {
    try {
      await apiRequest(`/join-requests/${requestId}/fix`, {
        method: 'PUT',
        body: JSON.stringify({ projectId })
      });
    } catch (error) {
      console.error('Error fixing join request:', error);
      throw error;
    }
  };

  const sendJoinRequest = async (projectId: string, message?: string): Promise<any> => {
    try {
      const response = await apiRequest('/join-requests', {
        method: 'POST',
        body: JSON.stringify({ projectId, message })
      });
      return response.request;
    } catch (error) {
      console.error('Error sending join request:', error);
      throw error;
    }
  };

  const approveJoinRequest = async (requestId: string, _projectId: string, _userId: string, _userName: string): Promise<void> => {
    try {
      await apiRequest(`/join-requests/${requestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
      });
    } catch (error) {
      console.error('Error approving join request:', error);
      throw error;
    }
  };

  const rejectJoinRequest = async (requestId: string): Promise<void> => {
    try {
      await apiRequest(`/join-requests/${requestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected' })
      });
    } catch (error) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  };

  const checkUserRole = async (projectId: string): Promise<string> => {
    try {
      if (!user?.id) return 'guest';
      const response = await apiRequest(`/projects/${projectId}/role/${user.id}`);
      return response.role || 'guest';
    } catch (error) {
      console.error('Error checking user role:', error);
      return 'guest';
    }
  };

  const getProjectMembers = async (projectId: string): Promise<any[]> => {
    try {
      const response = await apiRequest(`/projects/${projectId}/members`);
      const members = response.members || [];
      console.log('📋 Raw members from API for project', projectId, ':', members);
      // Map backend member format to frontend format
      return members.map((member: any) => {
        // Backend now returns userId as a string directly
        const userId = String(member.userId);

        return {
          id: member._id || member.id,
          userId: userId,
          userName: member.name || 'Unknown',
          userEmail: member.email,
          role: member.role === 'owner' ? 'creator' : 'contributor',
          joinedAt: member.joinedAt
        };
      });
    } catch (error) {
      console.error('Error fetching project members:', error);
      return [];
    }
  };

  const fetchTasks = async (projectId: string): Promise<any[]> => {
    try {
      const response = await apiRequest(`/projects/${projectId}`);
      const project = response.project;
      // Map issues to tasks format
      return (project?.issues || []).map((issue: any) => ({
        id: issue._id || issue.id,
        title: issue.title,
        description: issue.description,
        status: issue.status === 'open' ? 'todo' : issue.status === 'in-progress' ? 'inprogress' : 'completed',
        priority: issue.priority,
        assignedTo: issue.assignedTo,
        createdBy: issue.createdBy,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        // Completion/Verification fields
        completedBy: issue.completedBy,
        completedByName: issue.completedByName,
        completedAt: issue.completedAt,
        pendingVerification: issue.pendingVerification || false,
        verified: issue.verified || false,
        verifiedBy: issue.verifiedBy,
        verifiedByName: issue.verifiedByName,
        verifiedAt: issue.verifiedAt,
        verificationFeedback: issue.verificationFeedback
      }));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  };

  const addTask = async (projectId: string, taskData: any): Promise<any> => {
    try {
      console.log('🔧 Adding task to project:', projectId);
      console.log('🔧 Task data:', taskData);

      // Send assignedTo as username string (like Firebase)
      const issueData: any = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || 'medium',
        assignedTo: taskData.assignedTo || undefined  // Store as username string
      };

      const response = await apiRequest(`/projects/${projectId}/issues`, {
        method: 'POST',
        body: JSON.stringify(issueData)
      });

      console.log('🔧 Task created response:', response);
      const issue = response.issue;
      return {
        id: issue._id || issue.id,
        title: issue.title,
        description: issue.description,
        status: 'todo',
        priority: issue.priority,
        assignedTo: issue.assignedTo,
        createdBy: issue.createdBy,
        createdAt: issue.createdAt
      };
    } catch (error: any) {
      console.error('❌ Error adding task:', error);
      console.error('❌ Error message:', error?.message);
      throw error;
    }
  };

  const updateTask = async (projectId: string, taskId: string, updates: any): Promise<void> => {
    try {
      const mappedUpdates: any = {};
      if (updates.status) {
        mappedUpdates.status = updates.status === 'todo' ? 'open' : updates.status === 'inprogress' ? 'in-progress' : 'closed';
      }
      if (updates.priority) mappedUpdates.priority = updates.priority;
      if (updates.description) mappedUpdates.description = updates.description;
      if (updates.title) mappedUpdates.title = updates.title;
      if (updates.assignedTo !== undefined) mappedUpdates.assignedTo = updates.assignedTo;

      // Completion/Verification fields
      if (updates.completedBy !== undefined) mappedUpdates.completedBy = updates.completedBy;
      if (updates.completedByName !== undefined) mappedUpdates.completedByName = updates.completedByName;
      if (updates.completedAt !== undefined) mappedUpdates.completedAt = updates.completedAt;
      if (updates.pendingVerification !== undefined) mappedUpdates.pendingVerification = updates.pendingVerification;
      if (updates.verified !== undefined) mappedUpdates.verified = updates.verified;
      if (updates.verifiedBy !== undefined) mappedUpdates.verifiedBy = updates.verifiedBy;
      if (updates.verifiedByName !== undefined) mappedUpdates.verifiedByName = updates.verifiedByName;
      if (updates.verifiedAt !== undefined) mappedUpdates.verifiedAt = updates.verifiedAt;
      if (updates.verificationFeedback !== undefined) mappedUpdates.verificationFeedback = updates.verificationFeedback;

      await apiRequest(`/projects/${projectId}/issues/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(mappedUpdates)
      });
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (projectId: string, taskId: string): Promise<void> => {
    try {
      await apiRequest(`/projects/${projectId}/issues/${taskId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  // ==================== PROJECT CHAT FUNCTIONS ====================

  const sendMessage = async (projectId: string, messageData: { text: string }): Promise<any> => {
    try {
      const response = await apiRequest(`/projects/${projectId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      return response.message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const fetchMessages = async (projectId: string): Promise<any[]> => {
    try {
      const response = await apiRequest(`/projects/${projectId}/messages`);
      return response.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  // ==================== PROJECT FILES FUNCTIONS ====================

  const uploadFile = async (projectId: string, fileData: { name: string; size: number; url: string }): Promise<any> => {
    try {
      const response = await apiRequest(`/projects/${projectId}/files`, {
        method: 'POST',
        body: JSON.stringify(fileData)
      });
      return response.file;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const fetchFiles = async (projectId: string): Promise<any[]> => {
    try {
      const response = await apiRequest(`/projects/${projectId}/files`);
      return response.files || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  };

  const deleteFile = async (projectId: string, fileId: string): Promise<void> => {
    try {
      await apiRequest(`/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  };

  const fetchCompletedTasksCount = async (userId: string): Promise<number> => {
    try {
      const response = await apiRequest(`/users/${userId}/completed-tasks`);
      return response.count || 0;
    } catch (error) {
      console.error('Error fetching completed tasks count:', error);
      return 0;
    }
  };

  const fetchCompletedTasksData = async (userId: string): Promise<{ count: number; completedTasks: any[] }> => {
    try {
      const response = await apiRequest(`/users/${userId}/completed-tasks`);
      return {
        count: response.count || 0,
        completedTasks: response.completedTasks || []
      };
    } catch (error) {
      console.error('Error fetching completed tasks data:', error);
      return { count: 0, completedTasks: [] };
    }
  };

  const fetchUserSubmissions = async (userId: string): Promise<any[]> => {
    try {
      const response = await apiRequest(`/challenges/submissions/${userId}`);
      return response.submissions || [];
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      return [];
    }
  };

  const fetchUserTransactions = async (userId: string): Promise<any[]> => {
    try {
      const wallet = await apiRequest(`/wallet/${userId}`);
      return wallet.wallet?.transactions || [];
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      return [];
    }
  };

  const updateIdeaStatus = async (ideaId: string, status: string, feedback?: string, reviewedBy?: string): Promise<void> => {
    try {
      await apiRequest(`/ideas/${ideaId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, feedback, reviewedBy })
      });
    } catch (error) {
      console.error('Error updating idea status:', error);
      throw error;
    }
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    try {
      await apiRequest(`/projects/${projectId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  };

  const deleteIdea = async (ideaId: string): Promise<void> => {
    try {
      await apiRequest(`/ideas/${ideaId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting idea:', error);
      throw error;
    }
  };

  const fetchAllUsers = async (): Promise<any[]> => {
    try {
      const response = await apiRequest('/users');
      return response.users || [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  };

  const fetchAllProjectMembers = async (): Promise<any[]> => {
    try {
      const response = await apiRequest('/projects/members');
      return response.members || [];
    } catch (error) {
      console.error('Error fetching project members:', error);
      return [];
    }
  };

  const getPlatformStats = async (): Promise<any> => {
    try {
      const response = await apiRequest('/admin/stats');
      return response.stats || {};
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      return {};
    }
  };

  const deductCoins = async (userId: string, amount: number, reason: string): Promise<void> => {
    try {
      await apiRequest(`/wallet/${userId}/deduct`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason })
      });
    } catch (error) {
      console.error('Error deducting coins:', error);
      throw error;
    }
  };

  const addCoins = async (userId: string, amount: number, reason: string): Promise<void> => {
    try {
      await apiRequest(`/wallet/${userId}/add`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason })
      });
    } catch (error) {
      console.error('Error adding coins:', error);
      throw error;
    }
  };

  const calculateResumeCompletion = (userProfile: any): number => {
    if (!userProfile) return 0;

    let completion = 0;
    const totalFields = 10;

    if (userProfile.name) completion++;
    if (userProfile.email) completion++;
    if (userProfile.phone && userProfile.phone !== '9999999999') completion++;
    if (userProfile.bio && userProfile.bio !== 'About yourself') completion++;
    if (userProfile.skills && userProfile.skills.length > 0) completion++;
    if (userProfile.education && userProfile.education.length > 0) completion++;
    if (userProfile.experience && userProfile.experience.length > 0) completion++;
    if (userProfile.projects && userProfile.projects.length > 0) completion++;
    if (userProfile.links && userProfile.links.length > 0) completion++;
    if (userProfile.portfolio) completion++;

    return Math.round((completion / totalFields) * 100);
  };

  const calculateCategoryCompletion = (userProfile: any): object => {
    return {
      basic: userProfile?.name ? 100 : 0,
      education: userProfile?.education?.length > 0 ? 100 : 0,
      experience: userProfile?.experience?.length > 0 ? 100 : 0,
      skills: userProfile?.skills?.length > 0 ? 100 : 0,
      projects: userProfile?.projects?.length > 0 ? 100 : 0,
    };
  };

  // CodeArena wallet functions
  const getUserWallet = async (userId: string): Promise<any> => {
    if (!userId) {
      console.warn('getUserWallet called with undefined userId');
      return null;
    }
    try {
      const response = await apiRequest(`/wallet/${userId}`);
      return response.wallet;
    } catch (error) {
      console.error('Error fetching wallet:', error);
      return null;
    }
  };

  const initializeWallet = async (userId: string): Promise<any> => {
    try {
      const response = await apiRequest('/wallet', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      return response.wallet;
    } catch (error) {
      console.error('Error initializing wallet:', error);
      throw error;
    }
  };

  const subscribeToWallet = (userId: string, callback: (wallet: any) => void): (() => void) => {
    // Guard against undefined userId
    if (!userId) {
      console.warn('subscribeToWallet called with undefined userId');
      return () => {};
    }

    // For REST API, we'll poll for wallet updates every 3 seconds for real-time feel
    let isSubscribed = true;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    const pollWallet = async () => {
      if (!isSubscribed || !userId) return;
      try {
        const wallet = await getUserWallet(userId);
        if (wallet && isSubscribed) {
          callback(wallet);
        }
      } catch (error) {
        console.error('Error polling wallet:', error);
      }
      if (isSubscribed) {
        pollTimeout = setTimeout(pollWallet, 3000); // Poll every 3 seconds for real-time updates
      }
    };

    // Initial fetch immediately
    pollWallet();

    // Return unsubscribe function
    return () => {
      isSubscribed = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  };

  const fetchGlobalLeaderboard = async (): Promise<any[]> => {
    try {
      const response = await apiRequest('/leaderboard');
      return response.leaderboard || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  };

  const fetchWeeklyLeaderboard = async (): Promise<any[]> => {
    try {
      const response = await apiRequest('/leaderboard?period=weekly');
      return response.leaderboard || [];
    } catch (error) {
      console.error('Error fetching weekly leaderboard:', error);
      return [];
    }
  };

  const fetchMonthlyLeaderboard = async (): Promise<any[]> => {
    try {
      const response = await apiRequest('/leaderboard?period=monthly');
      return response.leaderboard || [];
    } catch (error) {
      console.error('Error fetching monthly leaderboard:', error);
      return [];
    }
  };

  const getUserProgress = async (userId: string): Promise<any> => {
    try {
      const response = await apiRequest(`/challenges/progress/${userId}`);
      return response.progress || { solvedChallenges: [] };
    } catch (error) {
      console.error('Error fetching user progress:', error);
      return { solvedChallenges: [] };
    }
  };

  const fetchUserBattles = async (userId: string): Promise<any[]> => {
    try {
      const response = await apiRequest(`/battles/user/${userId}`);
      return response.battles || [];
    } catch (error) {
      console.error('Error fetching user battles:', error);
      return [];
    }
  };

  const fetchEnrolledCourses = async (): Promise<any[]> => {
    try {
      // Return empty array for now - can be implemented with a courses API
      return [];
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      return [];
    }
  };

  const fetchCompanies = async (): Promise<any[]> => {
    try {
      // Return empty array for now - can be implemented with a companies API
      return [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  };

  const value: DataContextType = {
    loading,
    userprofile,
    writeQueryOnDate,
    fetchTodayQueries,
    addObjectToUserArray,
    pushDataToFirestore,
    contributors,
    avatrUrl,
    pushDataWithId,
    calculateResumeCompletion,
    calculateCategoryCompletion,
    updateUserProfile,
    getUserProfile,
    fetchAllIdeas,
    fetchJoinRequests,
    fetchAllJoinRequests,
    submitIdea,
    triggerIdeasRefresh,
    ideasRefreshSignal: ideasRefreshKey,
    sendJoinRequest,
    approveJoinRequest,
    rejectJoinRequest,
    checkUserRole,
    getProjectMembers,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    sendMessage,
    fetchMessages,
    uploadFile,
    fetchFiles,
    deleteFile,
    fetchCompletedTasksCount,
    fetchCompletedTasksData,
    fetchAllJoinRequestsDebug,
    fixJoinRequestProjectId,
    fetchUserSubmissions,
    fetchUserTransactions,
    updateIdeaStatus,
    deleteProject,
    deleteIdea,
    fetchAllUsers,
    fetchAllProjectMembers,
    getPlatformStats,
    deductCoins,
    addCoins,
    getUserWallet,
    initializeWallet,
    subscribeToWallet,
    fetchGlobalLeaderboard,
    fetchWeeklyLeaderboard,
    fetchMonthlyLeaderboard,
    getUserProgress,
    fetchUserBattles,
    fetchEnrolledCourses,
    fetchCompanies,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Hook to use the data context
export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a UserDataProvider');
  }
  return context;
};

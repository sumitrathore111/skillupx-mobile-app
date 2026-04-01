import {
    Activity,
    Bell,
    CheckCircle, Circle, Clock,
    FileText,
    MessageSquare,
    Send,
    Shield,
    Trash2,
    Upload,
    User,
    UserCheck,
    UserMinus,
    UserPlus,
    UserX
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { removeMemberFromProject } from '../../service/projectsService';
import {
    initializeSocket,
    joinProjectRoom,
    leaveProjectRoom,
    offJoinRequestUpdated,
    offMemberJoined,
    offNewMessage,
    offTaskCreated,
    offTaskDeleted,
    offTaskUpdated,
    onJoinRequestUpdated,
    onMemberJoined,
    onNewMessage,
    onTaskCreated,
    onTaskDeleted,
    onTaskUpdated
} from '../../service/socketService';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  dueDate?: string;
  completedBy?: string | null;
  completedByName?: string | null;
  completedAt?: string;
  pendingVerification?: boolean;
  verified?: boolean;
  verificationFeedback?: string | null;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string;
}

interface Member {
  id: string;
  userId: string;
  userName: string;
  role: 'creator' | 'contributor';
  joinedAt: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedAt: string;
  skills?: string;
  experience?: string;
  motivation?: string;
  availability?: string;
}

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const {
    fetchAllIdeas, checkUserRole, getProjectMembers, fetchJoinRequests, fetchAllJoinRequestsDebug, fixJoinRequestProjectId,
    approveJoinRequest, rejectJoinRequest,
    addTask: addTaskToDb, fetchTasks: fetchTasksFromDb, updateTask: updateTaskInDb, deleteTask: deleteTaskFromDb,
    sendMessage: sendMessageToDb, fetchMessages: fetchMessagesFromDb,
    uploadFile: uploadFileToDb, fetchFiles: fetchFilesFromDb, deleteFile: deleteFileFromDb
  } = useDataContext();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'files' | 'members' | 'activity'>('tasks');
  const [userRole, setUserRole] = useState<'creator' | 'contributor' | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [actualProjectId, setActualProjectId] = useState<string | null>(null); // The real Project document ID
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [verificationFeedbacks, setVerificationFeedbacks] = useState<Record<string, string>>({});

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assignedTo: '',
    dueDate: ''
  });

  // Chat
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Files
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !projectId) {
      navigate('/dashboard/projects');
      return;
    }
    loadProjectData();
  }, [projectId, user]);

  // Initialize socket and join project room
  useEffect(() => {
    if (!actualProjectId) return;

    // Initialize socket connection
    initializeSocket();

    // Join the project room
    joinProjectRoom(actualProjectId);

    // Cleanup on unmount or when project changes
    return () => {
      leaveProjectRoom(actualProjectId);
    };
  }, [actualProjectId]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!actualProjectId) return;

    // Handle new messages in real-time
    const handleNewMessage = (data: any) => {
      console.log('📨 Real-time message received:', data);
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
    };

    // Handle task creation in real-time
    const handleTaskCreated = (data: any) => {
      console.log('📝 Real-time task created:', data);
      setTasks(prev => {
        const newTask = {
          id: data.task._id || data.task.id,
          title: data.task.title,
          description: data.task.description,
          status: data.task.status === 'open' ? 'todo' : data.task.status === 'in-progress' ? 'inprogress' : 'completed',
          priority: data.task.priority,
          assignedTo: data.task.assignedTo,
          createdBy: data.task.createdBy,
          createdAt: data.task.createdAt
        } as Task;
        if (prev.some(t => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
    };

    // Handle task updates in real-time
    const handleTaskUpdated = (data: any) => {
      console.log('📝 Real-time task updated:', data);
      setTasks(prev => prev.map(task => {
        if (task.id === data.taskId) {
          const t = data.task;
          return {
            ...task,
            title: t.title || task.title,
            description: t.description ?? task.description,
            status: t.status === 'open' ? 'todo' : t.status === 'in-progress' ? 'inprogress' : t.status === 'closed' ? 'completed' : task.status,
            priority: t.priority || task.priority,
            assignedTo: t.assignedTo ?? task.assignedTo,
            completedBy: t.completedBy ?? task.completedBy,
            completedByName: t.completedByName ?? task.completedByName,
            completedAt: t.completedAt ?? task.completedAt,
            pendingVerification: t.pendingVerification ?? task.pendingVerification,
            verified: t.verified ?? task.verified,
            verifiedBy: t.verifiedBy ?? task.verifiedBy,
            verifiedByName: t.verifiedByName ?? task.verifiedByName,
            verifiedAt: t.verifiedAt ?? task.verifiedAt,
            verificationFeedback: t.verificationFeedback ?? task.verificationFeedback
          };
        }
        return task;
      }));
    };

    // Handle task deletion in real-time
    const handleTaskDeleted = (data: any) => {
      console.log('🗑️ Real-time task deleted:', data);
      setTasks(prev => prev.filter(task => task.id !== data.taskId));
    };

    // Handle new member joined in real-time
    const handleMemberJoined = (data: any) => {
      console.log('👤 Real-time member joined:', data);
      setMembers(prev => {
        if (prev.some(m => m.userId === data.userId)) return prev;
        return [...prev, {
          id: data.userId,
          userId: data.userId,
          userName: data.userName,
          role: 'contributor',
          joinedAt: new Date().toISOString()
        }];
      });
    };

    // Handle join request status changes
    const handleJoinRequestUpdated = (data: any) => {
      console.log('📋 Real-time join request updated:', data);
      if (data.status !== 'pending') {
        setJoinRequests(prev => prev.filter(req => req.id !== data.requestId));
      }
    };

    // Register event listeners
    onNewMessage(handleNewMessage);
    onTaskCreated(handleTaskCreated);
    onTaskUpdated(handleTaskUpdated);
    onTaskDeleted(handleTaskDeleted);
    onMemberJoined(handleMemberJoined);
    onJoinRequestUpdated(handleJoinRequestUpdated);

    // Cleanup event listeners
    return () => {
      offNewMessage(handleNewMessage);
      offTaskCreated(handleTaskCreated);
      offTaskUpdated(handleTaskUpdated);
      offTaskDeleted(handleTaskDeleted);
      offMemberJoined(handleMemberJoined);
      offJoinRequestUpdated(handleJoinRequestUpdated);
    };
  }, [actualProjectId]);

  useEffect(() => {
    if (activeTab === 'chat' && (actualProjectId || projectId)) {
      loadMessages();
    }
    if (activeTab === 'files' && (actualProjectId || projectId)) {
      loadFiles();
    }
  }, [activeTab, projectId, actualProjectId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      // Get project from ideas
      const allIdeas = await fetchAllIdeas();
      const projectData = allIdeas.find((idea: any) => idea.id === projectId);

      console.log('🔍 All ideas:', allIdeas);
      console.log('🔍 Found project data:', projectData);

      if (!projectData) {
        alert('Project not found');
        navigate('/dashboard/projects');
        return;
      }

      if (projectData.status !== 'approved') {
        alert('This project is not approved yet');
        navigate('/dashboard/projects');
        return;
      }

      setProject(projectData);
      // Set the actual Project document ID (different from idea ID)
      const realProjectId = projectData.projectId?._id || projectData.projectId || projectId;
      setActualProjectId(realProjectId);
      console.log('📋 Idea ID:', projectId);
      console.log('📋 projectData.projectId:', projectData.projectId);
      console.log('📋 Actual Project ID to use:', realProjectId);

      // Check user role using actual project ID
      const role = await checkUserRole(realProjectId);
      console.log('👤 User role:', role);

      if (!role) {
        console.log('❌ NO ACCESS - Redirecting to diagnostics page');
        navigate(`/dashboard/projects/access-diagnostic?projectId=${projectId}`);
        return;
      }

      setUserRole(role as 'creator' | 'contributor');

      // Load members using actual project ID
      console.log('🔍 Loading members for realProjectId:', realProjectId);
      const membersList = await getProjectMembers(realProjectId);
      console.log('🔍 LOADED MEMBERS FROM BACKEND:', membersList);

      // Get creator userId as string for comparison
      const creatorUserId = String(projectData.userId);
      console.log('🔍 Creator userId:', creatorUserId);

      // Filter out the creator from membersList to avoid showing twice
      // Also filter out duplicates
      const seenUserIds = new Set<string>();
      seenUserIds.add(creatorUserId); // Add creator first to prevent duplicates

      const nonCreatorMembers = membersList.filter((member: any) => {
        const memberId = String(member.userId);
        console.log('🔍 Checking member:', memberId, 'vs creator:', creatorUserId, 'equal:', memberId === creatorUserId);
        if (seenUserIds.has(memberId)) {
          return false; // Skip duplicates and creator
        }
        seenUserIds.add(memberId);
        return true;
      });

      console.log('🔍 Non-creator members:', nonCreatorMembers);

      // Add creator as first member
      const allMembers: Member[] = [
        {
          id: 'creator',
          userId: creatorUserId,
          userName: projectData.userName,
          role: 'creator',
          joinedAt: projectData.submittedAt
        },
        ...nonCreatorMembers
      ];

      console.log('👥 ALL MEMBERS (including creator):', allMembers);
      setMembers(allMembers);

      // Load join requests (only for creator) using actual project ID
      if (role === 'creator') {
        console.log('📋 Loading join requests for project:', realProjectId);
        console.log('📋 Current user ID:', user!.id);
        console.log('📋 Project creator ID:', projectData.userId);

        const requests = await fetchJoinRequests(realProjectId);
        console.log('📋 Fetched join requests:', requests);
        setJoinRequests(requests);

        // Auto-fix mismatched project IDs
        if (requests.length === 0) {
          const allRequests = await fetchAllJoinRequestsDebug();
          const needFix = allRequests.filter((r: any) =>
            r.status === 'pending' &&
            r.creatorId === user!.id &&
            r.projectId !== realProjectId
          );

          if (needFix.length > 0 && realProjectId) {
            for (const req of needFix) {
              await fixJoinRequestProjectId(req.id, realProjectId);
            }
            const fixed = await fetchJoinRequests(realProjectId);
            setJoinRequests(fixed);
          }
        }
      }

      // Load tasks, messages, files from backend using actual project ID
      loadTasks(realProjectId);
      loadMessages();
      loadFiles();

    } catch (error) {
      console.error('Error loading project:', error);
      alert('Failed to load project');
      navigate('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (projId?: string) => {
    try {
      const idToUse = projId || actualProjectId || projectId;
      const tasksList = await fetchTasksFromDb(idToUse!);
      setTasks(tasksList.filter((t: any) => !t.deleted));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const projectIdToUse = actualProjectId || projectId;
      const messagesList = await fetchMessagesFromDb(projectIdToUse!);
      setMessages(messagesList);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadFiles = async () => {
    try {
      const projectIdToUse = actualProjectId || projectId;
      const filesList = await fetchFilesFromDb(projectIdToUse!);
      setFiles(filesList);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleApproveRequest = async (requestId: string, userId: string, userName: string) => {
    try {
      const projectIdToUse = actualProjectId || projectId;
      await approveJoinRequest(requestId, projectIdToUse!, userId, userName);
      setJoinRequests(joinRequests.filter(req => req.id !== requestId));

      // Reload members using actual project ID
      const membersList = await getProjectMembers(projectIdToUse!);

      // Get creator userId as string for comparison
      const creatorUserId = String(project.userId);

      // Filter out the creator from membersList to avoid showing twice
      const nonCreatorMembers = membersList.filter((member: any) =>
        String(member.userId) !== creatorUserId
      );

      const allMembers: Member[] = [
        {
          id: 'creator',
          userId: creatorUserId,
          userName: project.userName,
          role: 'creator',
          joinedAt: project.submittedAt
        },
        ...nonCreatorMembers
      ];
      setMembers(allMembers);

      alert(`${userName} has been added to the project!`);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    }
  };

  // Helper function to get member name from username or userId
  const getMemberName = (assignedTo: string): string => {
    // assignedTo is now stored as username (like Firebase), so return it directly
    // But also check by userId for backward compatibility
    if (!assignedTo) return 'Unassigned';
    const memberByName = members.find(m => m.userName === assignedTo);
    if (memberByName) return memberByName.userName;
    const memberById = members.find(m => m.userId === assignedTo);
    return memberById?.userName || assignedTo;
  };

  // Helper function to check if current user is assigned to a task
  const isCurrentUserAssigned = (taskAssignedTo: string): boolean => {
    if (!taskAssignedTo || !user) return false;
    const currentUserName = user.name || user.email?.split('@')[0] || '';
    // Check if assignedTo matches user's name or derived username
    return taskAssignedTo === user.name ||
           taskAssignedTo === user.email?.split('@')[0] ||
           taskAssignedTo.toLowerCase() === currentUserName.toLowerCase();
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectJoinRequest(requestId);
      setJoinRequests(joinRequests.filter(req => req.id !== requestId));
      alert('Join request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const addTask = async () => {
    if (userRole !== 'creator') {
      alert('Only the project creator can add tasks');
      return;
    }
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }
    if (!actualProjectId) {
      console.error('❌ actualProjectId is not set. Project data:', project);
      alert('Project not properly loaded. Please refresh the page.');
      return;
    }

    console.log('📝 Creating task with actualProjectId:', actualProjectId);
    console.log('📝 User role:', userRole);

    try {
      await addTaskToDb(actualProjectId, {
        title: newTask.title,
        description: newTask.description,
        status: 'todo',
        priority: newTask.priority,
        assignedTo: newTask.assignedTo,
        dueDate: newTask.dueDate
      });

      await loadTasks();
      setNewTask({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' });
      setShowTaskForm(false);
    } catch (error: any) {
      console.error('Error adding task:', error);
      alert(`Failed to add task: ${error?.message || 'Unknown error'}`);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'inprogress' | 'completed') => {
    try {
      await updateTaskInDb(actualProjectId || projectId!, taskId, { status: newStatus });
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (userRole !== 'creator') {
      alert('Only the project creator can delete tasks');
      return;
    }

    try {
      await deleteTaskFromDb(actualProjectId || projectId!, taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const markTaskCompletedByMember = async (taskId: string) => {
    if (!user) return;
    try {
      const completerName = user.name || user.email?.split('@')[0] || 'User';
      await updateTaskInDb(actualProjectId || projectId!, taskId, {
        completedBy: user.id,
        completedByName: completerName,
        completedAt: new Date().toISOString(),
        pendingVerification: true
      });

      setTasks(tasks.map(t => t.id === taskId ? {
        ...t,
        completedBy: user.id,
        completedByName: completerName,
        completedAt: new Date().toISOString(),
        pendingVerification: true
      } : t));
    } catch (error) {
      console.error('Error marking task completed:', error);
      alert('Failed to mark task completed');
    }
  };

  const approveTaskVerification = async (taskId: string) => {
    if (userRole !== 'creator') {
      alert('Only the project creator can verify completed tasks');
      return;
    }

    try {
      const feedback = verificationFeedbacks[taskId] || '';
      const verifierName = user?.name || user?.email?.split('@')[0] || 'Creator';
      await updateTaskInDb(actualProjectId || projectId!, taskId, {
        verified: true,
        verifiedBy: user?.id,
        verifiedByName: verifierName,
        verifiedAt: new Date().toISOString(),
        verificationFeedback: feedback,
        pendingVerification: false,
        status: 'completed'
      });

      setTasks(tasks.map(t => t.id === taskId ? {
        ...t,
        verified: true,
        verifiedBy: user?.id || null,
        verifiedByName: verifierName,
        verificationFeedback: feedback,
        pendingVerification: false,
        status: 'completed' as const
      } : t));
      setVerificationFeedbacks(prev => ({ ...prev, [taskId]: '' }));
    } catch (error) {
      console.error('Error approving verification:', error);
      alert('Failed to approve verification');
    }
  };

  const rejectTaskVerification = async (taskId: string) => {
    if (userRole !== 'creator') {
      alert('Only the project creator can reject verification');
      return;
    }

    try {
      const feedback = verificationFeedbacks[taskId] || '';
      await updateTaskInDb(actualProjectId || projectId!, taskId, {
        verified: false,
        verificationFeedback: feedback,
        pendingVerification: false,
        status: 'inprogress',
        // clear completedBy info so member can rework
        completedBy: null,
        completedAt: null,
        completedByName: null
      });

      setTasks(tasks.map(t => t.id === taskId ? {
        ...t,
        verified: false,
        verificationFeedback: feedback,
        pendingVerification: false,
        status: 'inprogress' as const,
        completedBy: null,
        completedAt: undefined,
        completedByName: null
      } : t));
      setVerificationFeedbacks(prev => ({ ...prev, [taskId]: '' }));
    } catch (error) {
      console.error('Error rejecting verification:', error);
      alert('Failed to reject verification');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const projectIdToUse = actualProjectId || projectId;
      await sendMessageToDb(projectIdToUse!, { text: newMessage });
      await loadMessages();
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inprogress': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-semibold">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1 w-full lg:w-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white">{project?.title}</h1>
                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${
                  userRole === 'creator' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  {userRole === 'creator' ? (
                    <><Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1" />CREATOR</>
                  ) : (
                    <><UserCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1" />CONTRIBUTOR</>
                  )}
                </span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">{project?.description}</p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{members.length} members</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{tasks.length} tasks</span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">Progress</div>
              <div className="text-2xl sm:text-3xl font-black text-[#00ADB5]">{calculateProgress()}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${calculateProgress()}%`, backgroundColor: '#00ADB5' }}
            />
          </div>
        </div>

        {/* Join Requests Alert */}
        {userRole === 'creator' && joinRequests.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm sm:text-base font-bold text-yellow-900 dark:text-yellow-200">
                  {joinRequests.length} Pending Join Request{joinRequests.length > 1 ? 's' : ''}
                </h3>
                <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">Review requests in the Members tab</p>
              </div>
              <button
                onClick={() => setActiveTab('members')}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-lg mb-4 sm:mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 min-w-[80px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Tasks</span>
            <span className="sm:hidden">Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 min-w-[80px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Chat</span>
            <span className="sm:hidden">Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 min-w-[80px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'files'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Files</span>
            <span className="sm:hidden">Files</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 min-w-[100px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Members</span>
            <span className="sm:hidden">Team</span>
            {joinRequests.length > 0 && (
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white text-[#00ADB5] rounded-full text-[10px] sm:text-xs font-bold">
                {joinRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 min-w-[90px] py-2 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Activity</span>
            <span className="sm:hidden">Log</span>
          </button>
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Tasks</h2>
              {userRole === 'creator' ? (
                <button
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-[#00ADB5] text-white font-semibold rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  + Add Task
                </button>
              ) : (
                <button
                  disabled
                  title="Only the project creator can add tasks"
                  className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-gray-200 text-gray-500 font-semibold rounded-lg cursor-not-allowed"
                >
                  + Add Task
                </button>
              )}
            </div>

            {showTaskForm && userRole === 'creator' && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 mb-4">
                <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">New Task</h3>
                <div className="space-y-3 sm:space-y-4">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  <textarea
                    placeholder="Task description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    rows={3}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                    <select
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      disabled={userRole !== 'creator'}
                    >
                      <option value="">Assign to...</option>
                      {members.map(member => (
                        <option key={member.id} value={member.userName}>{member.userName}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={addTask}
                      className="flex-1 px-4 py-2 sm:py-3 text-sm sm:text-base bg-[#00ADB5] text-white font-semibold rounded-xl hover:bg-cyan-600 transition-colors"
                    >
                      Create Task
                    </button>
                    <button
                      onClick={() => setShowTaskForm(false)}
                      className="px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tasks.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 sm:p-12 text-center">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">No tasks yet</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Create your first task to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <button
                        onClick={() => {
                          if (task.status === 'completed') updateTaskStatus(task.id, 'todo');
                          else if (task.status === 'todo') updateTaskStatus(task.id, 'inprogress');
                          else updateTaskStatus(task.id, 'completed');
                        }}
                        className="mt-1 flex-shrink-0"
                      >
                        {getStatusIcon(task.status)}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white break-words">{task.title}</h3>
                            {task.description && (
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold ${getPriorityColor(task.priority)}`}>
                              {task.priority.toUpperCase()}
                            </span>
                            {userRole === 'creator' && (
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {task.assignedTo && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="truncate">{getMemberName(task.assignedTo)}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">{new Date(task.dueDate).toLocaleDateString()}</span>
                              <span className="sm:hidden">{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                        {/* Completion / Verification actions */}
                        <div className="mt-3">
                          {task.pendingVerification && userRole === 'creator' && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-2 sm:p-3">
                              <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300 font-semibold">Completion pending verification</p>
                              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Marked completed by: {task.completedByName || 'Member'}</p>
                              <textarea
                                placeholder="Add verification feedback (optional)"
                                value={verificationFeedbacks[task.id] || ''}
                                onChange={(e) => setVerificationFeedbacks(prev => ({ ...prev, [task.id]: e.target.value }))}
                                className="w-full mt-2 p-2 text-sm border dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                              />
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => approveTaskVerification(task.id)} className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-500 text-white rounded-lg">Approve</button>
                                <button onClick={() => rejectTaskVerification(task.id)} className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-500 text-white rounded-lg">Reject</button>
                              </div>
                            </div>
                          )}

                          {/* Show Mark Completed button for assigned user (not pending, not verified) */}
                          {!task.pendingVerification && !task.verified && task.assignedTo && isCurrentUserAssigned(task.assignedTo) && (
                            <div className="mt-2">
                              <button onClick={() => markTaskCompletedByMember(task.id)} className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-[#00ADB5] text-white rounded-lg">Mark Completed</button>
                            </div>
                          )}

                          {task.verified && (
                            <div className="mt-2 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 p-2 rounded">
                              <p className="text-xs sm:text-sm text-green-800 dark:text-green-300 font-semibold">✓ Verified completed</p>
                              {task.completedByName && (
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Completed by: {task.completedByName}</p>
                              )}
                              {task.verifiedByName && (
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Reviewed by: {task.verifiedByName}</p>
                              )}
                              {task.verificationFeedback && <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Feedback: {task.verificationFeedback}</p>}
                            </div>
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

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-3 sm:mb-4">Team Chat</h2>

            <div className="h-64 sm:h-80 md:h-96 overflow-y-auto mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8 sm:py-12">
                  <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className="bg-white dark:bg-gray-900 rounded-lg p-2 sm:p-3 shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate">{msg.senderName || msg.userName}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 break-words">{msg.text || msg.message}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#00ADB5] focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <button
                onClick={sendMessage}
                className="px-3 sm:px-6 py-2 sm:py-3 bg-[#00ADB5] text-white font-semibold rounded-xl hover:bg-cyan-600 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Project Files</h2>
              <label className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-[#00ADB5] text-white font-semibold rounded-xl hover:bg-cyan-600 transition-colors cursor-pointer flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                Upload File
                <input
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // For now, we'll store file metadata only (not actual file upload to storage)
                      // In production, you'd upload to Firebase Storage or similar
                      const fileData = {
                        name: file.name,
                        size: file.size,
                        url: '#' // Placeholder - would be Firebase Storage URL
                      };
                      try {
                        const projectIdToUse = actualProjectId || projectId;
                        await uploadFileToDb(projectIdToUse!, fileData);
                        await loadFiles();
                        alert('File metadata saved! (Note: Actual file upload requires Firebase Storage setup)');
                      } catch (error) {
                        console.error('Error uploading file:', error);
                        alert('Failed to upload file');
                      }
                    }
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {files.length === 0 ? (
                <div className="col-span-2 text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm sm:text-base">No files uploaded yet</p>
                </div>
              ) : (
                files.map(file => (
                  <div key={file.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 hover:border-[#00ADB5] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{file.fileName}</h3>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                          Uploaded by {file.uploaderName}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400">
                          {new Date(file.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {(file.fileSize / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      {userRole === 'creator' && (
                        <button
                          onClick={async () => {
                            try {
                              const projectIdToUse = actualProjectId || projectId;
                              await deleteFileFromDb(projectIdToUse!, file.id);
                              setFiles(files.filter(f => f.id !== file.id));
                            } catch (error) {
                              console.error('Error deleting file:', error);
                              alert('Failed to delete file');
                            }
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              Note: Full file upload/download requires Firebase Storage setup. Currently storing metadata only.
            </p>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Pending Join Requests */}
            {userRole === 'creator' && (
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                  Pending Join Requests {joinRequests.length > 0 && `(${joinRequests.length})`}
                </h2>

                {joinRequests.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-600 dark:text-gray-400 font-semibold">No Pending Requests</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">When someone requests to join your project, they will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">{joinRequests.map(request => (
                    <div key={request.id} className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{request.userName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{request.userEmail}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Applied {new Date(request.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveRequest(request.id, request.userId, request.userName)}
                            className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                          >
                            <UserCheck className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                          >
                            <UserX className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* Application Details */}
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Skills</p>
                          <p className="text-sm text-gray-900 dark:text-white">{request.skills || 'Not provided'}</p>
                        </div>

                        {request.experience && (
                          <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Experience</p>
                            <p className="text-sm text-gray-900 dark:text-white">{request.experience}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Why they want to join</p>
                          <p className="text-sm text-gray-900 dark:text-white">{request.motivation || 'Not provided'}</p>
                        </div>

                        {request.availability && (
                          <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Availability</p>
                            <p className="text-sm text-gray-900 dark:text-white">{request.availability}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* Current Members */}
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Team Members</h2>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ADB5] to-cyan-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {(member.userName?.charAt(0) || '').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{member.userName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          member.role === 'creator'
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400'
                            : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                        }`}>
                          {member.role === 'creator' ? (
                            <><Shield className="w-3 h-3 inline mr-1" />CREATOR</>
                          ) : (
                            <><UserCheck className="w-3 h-3 inline mr-1" />CONTRIBUTOR</>
                          )}
                        </span>
                        {/* Remove member button - only for creator, can't remove creator */}
                        {userRole === 'creator' && member.role !== 'creator' && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Remove ${member.userName} from the project?`)) {
                                try {
                                  if (actualProjectId) {
                                    await removeMemberFromProject(actualProjectId, member.userId);
                                    setMembers(members.filter(m => m.userId !== member.userId));
                                  }
                                } catch (error: any) {
                                  alert(error?.message || 'Failed to remove member');
                                }
                              }
                            }}
                            title="Remove member"
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-12 text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Activity Timeline</h3>
            <p className="text-gray-600 dark:text-gray-400">Track all project activities</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">Coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}



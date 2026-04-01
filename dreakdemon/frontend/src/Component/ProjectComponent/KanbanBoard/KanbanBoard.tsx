import {
    Kanban,
    Plus,
    RefreshCw,
    Search
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../../service/apiConfig';
import BoardColumn from './BoardColumn';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import type { Board, KanbanTask, ProjectMember } from './kanban.types';

interface KanbanBoardProps {
  projectId: string;
  boardId?: string;
  members: ProjectMember[];
  currentUserId: string;
  currentUserName: string;
  isProjectOwner: boolean; // NEW: Only owner can review tasks
}

export default function KanbanBoard({
  projectId,
  boardId: initialBoardId,
  members,
  currentUserId,
  currentUserName,
  isProjectOwner
}: KanbanBoardProps) {
  // Debug: Log isProjectOwner received from parent
  console.log('📋 KanbanBoard - isProjectOwner received:', isProjectOwner);

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [showCreateTask, setShowCreateTask] = useState<{ columnId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [draggingTask, setDraggingTask] = useState<{ taskId: string; columnId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get auth token
  const getToken = () => localStorage.getItem('authToken');

  // Fetch board and tasks
  const fetchBoardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // First, get boards for project
      const boardsRes = await fetch(`${API_URL}/boards/project/${projectId}`, { headers });
      if (!boardsRes.ok) throw new Error('Failed to fetch boards');
      const boards = await boardsRes.json();

      if (boards.length === 0) {
        // Create default board if none exists
        const createRes = await fetch(`${API_URL}/boards/project/${projectId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: 'Main Board' })
        });
        if (!createRes.ok) throw new Error('Failed to create board');
        const newBoard = await createRes.json();
        setBoard(newBoard);

        // No tasks yet
        setTasks([]);
      } else {
        // Use first board or specified board
        const targetBoard = initialBoardId
          ? boards.find((b: Board) => b._id === initialBoardId) || boards[0]
          : boards[0];

        // Fetch board with tasks
        const boardRes = await fetch(`${API_URL}/boards/${targetBoard._id}`, { headers });
        if (!boardRes.ok) throw new Error('Failed to fetch board');
        const boardData = await boardRes.json();

        setBoard(boardData.board || boardData);
        setTasks(boardData.tasks || []);
      }
    } catch (err: any) {
      console.error('Error fetching board:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, initialBoardId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }

      // Assignee filter
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned' && task.assignees.length > 0) return false;
        if (filterAssignee !== 'unassigned' && !task.assignees.some(a => a._id === filterAssignee)) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterAssignee]);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {};
    if (board) {
      board.columns.forEach(col => {
        grouped[col.id] = filteredTasks
          .filter(t => t.columnId === col.id)
          .sort((a, b) => a.position - b.position);
      });
    }
    return grouped;
  }, [board, filteredTasks]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string, columnId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggingTask({ taskId, columnId });
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    setDragOverColumnId(null);

    if (!draggingTask || draggingTask.columnId === targetColumnId) {
      setDraggingTask(null);
      return;
    }

    // Check if task is being dragged FROM "Done" column
    const sourceColumn = board?.columns.find(c => c.id === draggingTask.columnId);
    const isFromDoneColumn = sourceColumn?.title.toLowerCase() === 'done';

    // Prevent moving tasks OUT of Done column - completed tasks cannot be redone
    if (isFromDoneColumn) {
      alert('Completed tasks cannot be moved. Once a task is done, it cannot be redone.');
      setDraggingTask(null);
      return;
    }

    // Get target column info to check if it's "Done" column
    const targetColumn = board?.columns.find(c => c.id === targetColumnId);
    const isDoneColumn = targetColumn?.title.toLowerCase() === 'done';

    // Members cannot drag tasks directly to "Done" column
    // Only the owner can move tasks to Done (via approval)
    if (isDoneColumn && !isProjectOwner) {
      alert('Only the project owner can move tasks to Done by approving them in the Review column.');
      setDraggingTask(null);
      return;
    }

    try {
      const token = getToken();
      // Calculate new position (end of column)
      const targetTasks = tasksByColumn[targetColumnId] || [];
      const newPosition = targetTasks.length;

      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          columnId: targetColumnId,
          position: newPosition
        })
      });

      if (!res.ok) throw new Error('Failed to move task');

      // Update local state
      setTasks(prev => prev.map(t =>
        t._id === taskId ? { ...t, columnId: targetColumnId, position: newPosition } : t
      ));
    } catch (err) {
      console.error('Error moving task:', err);
    }

    setDraggingTask(null);
  };

  // Create task - OPTIMISTIC UPDATE for instant UI feedback
  const handleCreateTask = async (taskData: Partial<KanbanTask>) => {
    if (!board || !showCreateTask) return;

    const columnId = showCreateTask.columnId;
    const token = getToken();

    // Process assignees - handle multiple formats
    const processedAssignees: string[] = [];
    if (Array.isArray(taskData.assignees)) {
      for (const a of taskData.assignees) {
        if (typeof a === 'string') {
          processedAssignees.push(a);
        } else if (a && typeof a === 'object') {
          const id = (a as any)._id || (a as any).userId || (a as any).id;
          if (id) {
            processedAssignees.push(id);
          } else if ((a as any).email) {
            const member = members.find(m => m.email === (a as any).email);
            if (member?.userId) {
              processedAssignees.push(member.userId);
            }
          }
        }
      }
    }

    // Create optimistic task for INSTANT UI update
    const tempId = `temp-${Date.now()}`;
    const currentMember = members.find(m => m.userId === currentUserId);
    const reporter = { _id: currentUserId, name: currentUserName, email: currentMember?.email || '', avatar: currentMember?.avatar };

    const optimisticTask: KanbanTask = {
      _id: tempId,
      boardId: board._id,
      columnId,
      projectId,
      title: taskData.title || '',
      description: taskData.description,
      priority: taskData.priority || 'medium',
      position: (tasksByColumn[columnId]?.length || 0),
      labels: [],
      assignees: processedAssignees.map(id => {
        const member = members.find(m => m.userId === id);
        return { _id: id, name: member?.name || 'Unknown', email: member?.email || '', avatar: member?.avatar };
      }),
      reporter,
      subtasks: [],
      checklists: [],
      comments: [],
      timeEntries: [],
      totalTimeSpent: 0,
      attachments: [],
      watchers: [],
      reviewStatus: 'not_submitted',
      dueDate: taskData.dueDate,
      estimatedHours: taskData.estimatedHours,
      storyPoints: taskData.storyPoints,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // INSTANT: Close modal and add task to UI
    setShowCreateTask(null);
    setTasks(prev => [...prev, optimisticTask]);

    // Background: Make actual API call
    try {
      const res = await fetch(`${API_URL}/boards/${board._id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...taskData,
          columnId,
          labels: Array.isArray(taskData.labels)
            ? taskData.labels.map(l => typeof l === 'string' ? l : (l as any)?.id).filter(Boolean)
            : [],
          assignees: processedAssignees
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create task');
      }

      const newTask = await res.json();
      // Replace optimistic task with real task from server
      setTasks(prev => prev.map(t => t._id === tempId ? newTask : t));
    } catch (err) {
      console.error('Error creating task:', err);
      // Remove optimistic task on failure
      setTasks(prev => prev.filter(t => t._id !== tempId));
      alert('Failed to create task. Please try again.');
    }
  };

  // Update task
  const handleUpdateTask = async (taskId: string, updates: Partial<KanbanTask>) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (!res.ok) throw new Error('Failed to update task');
      const updatedTask = await res.json();

      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      if (selectedTask?._id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete task');

      setTasks(prev => prev.filter(t => t._id !== taskId));
      setSelectedTask(null);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // Add comment
  const handleAddComment = async (taskId: string, content: string, mentions: string[]) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, mentions })
      });

      if (!res.ok) throw new Error('Failed to add comment');

      // Refresh task data
      const taskRes = await fetch(`${API_URL}/boards/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (taskRes.ok) {
        const updatedTask = await taskRes.json();
        setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
        if (selectedTask?._id === taskId) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Add subtask
  const handleAddSubtask = async (taskId: string, text: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });

      if (!res.ok) throw new Error('Failed to add subtask');
      const subtask = await res.json();

      setTasks(prev => prev.map(t =>
        t._id === taskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t
      ));
      if (selectedTask?._id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, subtasks: [...prev.subtasks, subtask] } : null);
      }
    } catch (err) {
      console.error('Error adding subtask:', err);
    }
  };

  // Toggle subtask
  const handleToggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed })
      });

      if (!res.ok) throw new Error('Failed to toggle subtask');
      const updatedSubtask = await res.json();

      setTasks(prev => prev.map(t =>
        t._id === taskId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? updatedSubtask : s) }
          : t
      ));
      if (selectedTask?._id === taskId) {
        setSelectedTask(prev => prev
          ? { ...prev, subtasks: prev.subtasks.map(s => s.id === subtaskId ? updatedSubtask : s) }
          : null
        );
      }
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  // Start timer
  const handleStartTimer = async (taskId: string, description?: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/time/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description })
      });

      if (!res.ok) throw new Error('Failed to start timer');
      const timeEntry = await res.json();

      setTasks(prev => prev.map(t =>
        t._id === taskId ? { ...t, timeEntries: [...t.timeEntries, timeEntry] } : t
      ));
      if (selectedTask?._id === taskId) {
        setSelectedTask(prev => prev
          ? { ...prev, timeEntries: [...prev.timeEntries, timeEntry] }
          : null
        );
      }
    } catch (err) {
      console.error('Error starting timer:', err);
    }
  };

  // Stop timer
  const handleStopTimer = async (taskId: string, timeEntryId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/time/${timeEntryId}/stop`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to stop timer');
      const { timeEntry, totalTimeSpent } = await res.json();

      setTasks(prev => prev.map(t =>
        t._id === taskId
          ? {
              ...t,
              timeEntries: t.timeEntries.map(te => te.id === timeEntryId ? timeEntry : te),
              totalTimeSpent: totalTimeSpent
            }
          : t
      ));
      if (selectedTask?._id === taskId) {
        setSelectedTask(prev => prev
          ? {
              ...prev,
              timeEntries: prev.timeEntries.map(te => te.id === timeEntryId ? timeEntry : te),
              totalTimeSpent: totalTimeSpent
            }
          : null
        );
      }
    } catch (err) {
      console.error('Error stopping timer:', err);
    }
  };

  // Submit task for review
  const handleSubmitForReview = async (taskId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/submit-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to submit task for review');
      const updatedTask = await res.json();

      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      if (selectedTask?._id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error('Error submitting task for review:', err);
    }
  };

  // Approve task (project owner only)
  const handleApproveTask = async (taskId: string, comment?: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to approve task');
      }
      const updatedTask = await res.json();

      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      if (selectedTask?._id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error('Error approving task:', err);
      alert(err instanceof Error ? err.message : 'Failed to approve task');
    }
  };

  // Request changes (project owner only)
  const handleRequestChanges = async (taskId: string, comment: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/boards/tasks/${taskId}/request-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to request changes');
      }
      const updatedTask = await res.json();

      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      if (selectedTask?._id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error('Error requesting changes:', err);
      alert(err instanceof Error ? err.message : 'Failed to request changes');
    }
  };

  // Toggle column collapse
  const handleToggleCollapse = (columnId: string) => {
    if (!board) return;
    setBoard({
      ...board,
      columns: board.columns.map(c =>
        c.id === columnId ? { ...c, isCollapsed: !c.isCollapsed } : c
      )
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block w-12 h-12 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={fetchBoardData}
          className="px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center">
        <Kanban className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No board found</h3>
        <p className="text-gray-600 dark:text-gray-400">Create a new board to get started</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header/Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Board Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-[#00ADB5] to-cyan-600 rounded-lg">
            <Kanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{board?.title || 'Board'}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{filteredTasks.length} tasks</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-600 transition-all text-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m, index) => (
              <option key={m.userId?.toString() || `member-${index}`} value={m.userId?.toString() || ''}>{m.name}</option>
            ))}
          </select>

          <button
            onClick={fetchBoardData}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-[#00ADB5] border border-gray-300 dark:border-gray-600 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-4 min-h-full">
          {board.columns
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] || []}
                labels={board.labels}
                currentUserId={currentUserId}
                isProjectOwner={isProjectOwner}
                onAddTask={(columnId) => {
                  if (!isProjectOwner) {
                    alert('Only the project owner can create tasks');
                    return;
                  }
                  setShowCreateTask({ columnId });
                }}
                onTaskClick={setSelectedTask}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  handleDragOver(e);
                  setDragOverColumnId(column.id);
                }}
                onDrop={handleDrop}
                onToggleCollapse={handleToggleCollapse}
                dragOverColumnId={dragOverColumnId}
              />
            ))}

          {/* Add Column Button */}
          <div className="flex-shrink-0 w-72">
            <button className="w-full h-12 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Plus className="w-5 h-5" />
              Add Column
            </button>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          labels={board.labels}
          columns={board.columns}
          members={members}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isProjectOwner={isProjectOwner}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onAddComment={handleAddComment}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={handleToggleSubtask}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onSubmitForReview={handleSubmitForReview}
          onApprove={handleApproveTask}
          onRequestChanges={handleRequestChanges}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          columnId={showCreateTask.columnId}
          columns={board.columns}
          labels={board.labels}
          members={members}
          onClose={() => setShowCreateTask(null)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
}

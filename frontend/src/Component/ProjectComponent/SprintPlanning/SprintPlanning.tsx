import {
    Clock,
    Play,
    Plus,
    RefreshCw,
    Target,
    Trophy,
    X,
    Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../../service/apiConfig';
import type { KanbanTask } from '../KanbanBoard/kanban.types';

interface Sprint {
  _id: string;
  projectId: string;
  boardId?: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  velocity?: number;
  createdBy: string;
  createdAt: string;
}

interface SprintPlanningProps {
  projectId: string;
  boardId?: string;
  tasks: KanbanTask[];
  onTaskClick: (task: KanbanTask) => void;
  onTaskMoveToSprint: (taskId: string, sprintId: string | null) => void;
}

export default function SprintPlanning({
  projectId,
  boardId,
  tasks,
  onTaskClick,
  onTaskMoveToSprint
}: SprintPlanningProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_selectedSprint, _setSelectedSprint] = useState<Sprint | null>(null);

  // Fetch sprints
  useEffect(() => {
    const fetchSprints = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_URL}/boards/project/${projectId}/sprints`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch sprints');
        const data = await res.json();
        setSprints(data);
      } catch (err: any) {
        console.error('Error fetching sprints:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();
  }, [projectId]);

  // Current/active sprint
  const activeSprint = useMemo(() => {
    return sprints.find(s => s.status === 'active');
  }, [sprints]);

  // Backlog tasks (not in any sprint)
  const backlogTasks = useMemo(() => {
    return tasks.filter(t => !t.sprintId);
  }, [tasks]);

  // Tasks by sprint
  const tasksBySprint = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {};
    sprints.forEach(sprint => {
      grouped[sprint._id] = tasks.filter(t => t.sprintId === sprint._id);
    });
    return grouped;
  }, [sprints, tasks]);

  // Calculate sprint stats
  const getSprintStats = (sprintId: string) => {
    const sprintTasks = tasksBySprint[sprintId] || [];
    const completed = sprintTasks.filter(t => t.completedAt).length;
    const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = sprintTasks
      .filter(t => t.completedAt)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return {
      taskCount: sprintTasks.length,
      completed,
      progress: sprintTasks.length > 0 ? Math.round((completed / sprintTasks.length) * 100) : 0,
      totalPoints,
      completedPoints
    };
  };

  // Days remaining in sprint
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Create sprint
  const handleCreateSprint = async (data: { name: string; goal?: string; startDate: string; endDate: string }) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/boards/project/${projectId}/sprints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...data, boardId })
      });
      if (!res.ok) throw new Error('Failed to create sprint');
      const newSprint = await res.json();
      setSprints(prev => [...prev, newSprint]);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating sprint:', err);
    }
  };

  // Start sprint
  const handleStartSprint = async (sprintId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/boards/sprints/${sprintId}/start`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to start sprint');
      const updatedSprint = await res.json();
      setSprints(prev => prev.map(s => s._id === sprintId ? updatedSprint : s));
    } catch (err) {
      console.error('Error starting sprint:', err);
    }
  };

  // Complete sprint
  const handleCompleteSprint = async (sprintId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/boards/sprints/${sprintId}/complete`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to complete sprint');
      const updatedSprint = await res.json();
      setSprints(prev => prev.map(s => s._id === sprintId ? updatedSprint : s));
    } catch (err) {
      console.error('Error completing sprint:', err);
    }
  };

  // Priority colors
  const priorityColors = {
    low: 'border-l-green-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-orange-500',
    critical: 'border-l-red-500'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
      {/* Backlog Panel */}
      <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[40vh] lg:max-h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-500" />
            Backlog
            <span className="ml-auto text-sm font-normal text-gray-500">
              {backlogTasks.length} tasks
            </span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {backlogTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)} points
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {backlogTasks.map((task) => (
            <div
              key={task._id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('taskId', task._id)}
              onClick={() => onTaskClick(task)}
              className={`
                p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer
                border-l-4 ${priorityColors[task.priority]}
                hover:shadow-md transition-all
              `}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                {task.storyPoints && (
                  <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded">
                    {task.storyPoints} pts
                  </span>
                )}
                {task.assignees.length > 0 && (
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0, 2).map((a) => (
                      <div
                        key={a._id}
                        className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs"
                        title={a.name}
                      >
                        {a.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {backlogTasks.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Backlog is empty</p>
            </div>
          )}
        </div>
      </div>

      {/* Sprints Panel */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Active Sprint */}
        {activeSprint && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 sm:p-4 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap className="w-5 h-5 text-teal-500" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {activeSprint.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                      Active
                    </span>
                  </div>
                  {activeSprint.goal && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {activeSprint.goal}
                    </p>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-gray-500">
                    {getDaysRemaining(activeSprint.endDate)} days remaining
                  </p>
                  <p className="text-xs text-gray-400">
                    Ends {new Date(activeSprint.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Sprint stats */}
              {(() => {
                const stats = getSprintStats(activeSprint._id);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-2 sm:p-3">
                      <p className="text-xs text-gray-500">Tasks</p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {stats.completed}/{stats.taskCount}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-2 sm:p-3">
                      <p className="text-xs text-gray-500">Progress</p>
                      <p className="text-lg sm:text-xl font-bold text-teal-600">
                        {stats.progress}%
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-2 sm:p-3">
                      <p className="text-xs text-gray-500">Points</p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {stats.completedPoints}/{stats.totalPoints}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-2 sm:p-3">
                      <button
                        onClick={() => handleCompleteSprint(activeSprint._id)}
                        className="w-full h-full flex items-center justify-center gap-1 sm:gap-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg text-sm sm:text-base"
                      >
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                        Complete
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sprint tasks */}
            <div
              className="p-4 min-h-[100px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const taskId = e.dataTransfer.getData('taskId');
                if (taskId) onTaskMoveToSprint(taskId, activeSprint._id);
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(tasksBySprint[activeSprint._id] || []).map((task) => (
                  <div
                    key={task._id}
                    onClick={() => onTaskClick(task)}
                    className={`
                      p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer
                      border-l-4 ${priorityColors[task.priority]}
                      ${task.completedAt ? 'opacity-60' : ''}
                      hover:shadow-md transition-all
                    `}
                  >
                    <p className={`text-sm font-medium text-gray-900 dark:text-white ${task.completedAt ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      {task.storyPoints && (
                        <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded">
                          {task.storyPoints} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {(tasksBySprint[activeSprint._id] || []).length === 0 && (
                <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  <p>Drag tasks here to add to sprint</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Planning Sprints */}
        {sprints.filter(s => s.status === 'planning').map((sprint) => {
          const stats = getSprintStats(sprint._id);
          return (
            <div key={sprint._id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {sprint.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                      Planning
                    </span>
                    <span className="text-sm text-gray-500">
                      {stats.taskCount} tasks • {stats.totalPoints} points
                    </span>
                  </div>
                  <button
                    onClick={() => handleStartSprint(sprint._id)}
                    disabled={!!activeSprint}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto justify-center"
                  >
                    <Play className="w-4 h-4" />
                    Start Sprint
                  </button>
                </div>
              </div>

              <div
                className="p-4 min-h-[80px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const taskId = e.dataTransfer.getData('taskId');
                  if (taskId) onTaskMoveToSprint(taskId, sprint._id);
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(tasksBySprint[sprint._id] || []).map((task) => (
                    <div
                      key={task._id}
                      onClick={() => onTaskClick(task)}
                      className={`
                        p-2 bg-gray-50 dark:bg-gray-900 rounded cursor-pointer
                        border-l-4 ${priorityColors[task.priority]}
                        hover:shadow transition-all text-sm
                      `}
                    >
                      {task.title}
                      {task.storyPoints && (
                        <span className="ml-2 text-xs text-teal-600">
                          {task.storyPoints}pts
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {(tasksBySprint[sprint._id] || []).length === 0 && (
                  <div className="text-center text-gray-400 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-sm">Drag tasks from backlog</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Completed Sprints (collapsed) */}
        {sprints.filter(s => s.status === 'completed').length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Completed Sprints
              </h3>
              <div className="mt-3 space-y-2">
                {sprints.filter(s => s.status === 'completed').map((sprint) => (
                  <div
                    key={sprint._id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{sprint.name}</span>
                    <span className="text-sm text-gray-500">
                      Velocity: {sprint.velocity || 0} points
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Sprint Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Sprint
        </button>
      </div>

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <CreateSprintModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSprint}
        />
      )}
    </div>
  );
}

// Create Sprint Modal Component
interface CreateSprintModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; goal?: string; startDate: string; endDate: string }) => void;
}

function CreateSprintModal({ onClose, onCreate }: CreateSprintModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Set default dates (2 weeks from today)
  useEffect(() => {
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(twoWeeksLater.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    onCreate({
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate,
      endDate
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Sprint
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sprint Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 1"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sprint Goal
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should be achieved in this sprint?"
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              Create Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

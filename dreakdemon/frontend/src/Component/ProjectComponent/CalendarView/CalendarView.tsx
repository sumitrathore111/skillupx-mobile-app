import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useMemo, useState } from 'react';

// Define types locally to avoid Vite module resolution issues
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

interface TaskComment {
  id: string;
  content: string;
  author: string;
  authorName: string;
  authorAvatar?: string;
  mentions: string[];
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
}

interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime?: string;
  duration: number;
  description?: string;
}

interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface Assignee {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface KanbanTask {
  _id: string;
  boardId: string;
  columnId: string;
  projectId: string;
  title: string;
  description?: string;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
  assignees: Assignee[];
  reporter: Assignee;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  subtasks: ChecklistItem[];
  checklists: { id: string; title: string; items: ChecklistItem[] }[];
  comments: TaskComment[];
  timeEntries: TimeEntry[];
  totalTimeSpent: number;
  attachments: TaskAttachment[];
  watchers: string[];
  sprintId?: string;
  storyPoints?: number;
  epicId?: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface BoardLabel {
  id: string;
  name: string;
  color: string;
}

interface ProjectMember {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
}

interface CalendarViewProps {
  tasks: KanbanTask[];
  labels: BoardLabel[];
  members: ProjectMember[];
  onTaskClick: (task: KanbanTask) => void;
  onAddTask?: (date: Date) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: KanbanTask[];
}

export default function CalendarView({
  tasks,
  // labels - available but not currently used
  onTaskClick,
  onAddTask
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Get calendar days for current month
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date)
      });
    }

    // Next month days (fill to complete the grid)
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date)
      });
    }

    return days;
  }, [currentDate, tasks]);

  // Get tasks for a specific date
  function getTasksForDate(date: Date): KanbanTask[] {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    });
  }

  // Navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Priority colors
  const priorityColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500'
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              viewMode === 'month'
                ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              viewMode === 'week'
                ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              min-h-[100px] p-1 border-b border-r border-gray-100 dark:border-gray-800
              ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : ''}
              ${day.isToday ? 'bg-teal-50 dark:bg-teal-900/10' : ''}
              group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
            `}
          >
            {/* Date number */}
            <div className="flex items-center justify-between mb-1">
              <span
                className={`
                  w-7 h-7 flex items-center justify-center text-sm rounded-full
                  ${day.isToday
                    ? 'bg-teal-500 text-white'
                    : day.isCurrentMonth
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-600'
                  }
                `}
              >
                {day.date.getDate()}
              </span>

              {/* Add task button (visible on hover) */}
              {onAddTask && (
                <button
                  onClick={() => onAddTask(day.date)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Tasks */}
            <div className="space-y-1 overflow-y-auto max-h-[80px]">
              {day.tasks.slice(0, 3).map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completedAt;

                return (
                  <button
                    key={task._id}
                    onClick={() => onTaskClick(task)}
                    className={`
                      w-full text-left px-2 py-1 rounded text-xs truncate
                      ${isOverdue
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                      }
                      hover:ring-2 hover:ring-teal-400 transition-all
                    `}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${priorityColors[task.priority]}`} />
                    {task.title}
                  </button>
                );
              })}

              {/* Show more indicator */}
              {day.tasks.length > 3 && (
                <div className="text-xs text-gray-400 px-2">
                  +{day.tasks.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t border-gray-200 dark:border-gray-700 text-xs">
        <span className="text-gray-500">Priority:</span>
        {Object.entries(priorityColors).map(([priority, color]) => (
          <div key={priority} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <span className="capitalize text-gray-600 dark:text-gray-400">{priority}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-4">
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span className="text-gray-600 dark:text-gray-400">Overdue</span>
        </div>
      </div>
    </div>
  );
}

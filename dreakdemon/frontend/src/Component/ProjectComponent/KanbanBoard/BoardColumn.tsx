import {
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useRef } from 'react';
import TaskCard from './TaskCard';
import type { BoardColumn as BoardColumnType, BoardLabel, KanbanTask } from './kanban.types';

interface BoardColumnProps {
  column: BoardColumnType;
  tasks: KanbanTask[];
  labels: BoardLabel[];
  currentUserId?: string;
  isProjectOwner?: boolean;
  onAddTask: (columnId: string) => void;
  onTaskClick: (task: KanbanTask) => void;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onToggleCollapse?: (columnId: string) => void;
  dragOverColumnId?: string | null;
}

export default function BoardColumn({
  column,
  tasks,
  labels,
  currentUserId,
  isProjectOwner,
  onAddTask,
  onTaskClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggleCollapse,
  dragOverColumnId
}: BoardColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);

  const taskCount = tasks.length;
  const isOverLimit = column.taskLimit && taskCount > column.taskLimit;
  const isDragOver = dragOverColumnId === column.id;

  // Sort tasks: current user's tasks first, then others
  const sortedTasks = [...tasks].sort((a, b) => {
    const aIsCurrentUser = a.assignees?.some((assignee: any) => {
      const id = typeof assignee === 'string' ? assignee : assignee?._id || assignee?.userId;
      return id === currentUserId;
    });
    const bIsCurrentUser = b.assignees?.some((assignee: any) => {
      const id = typeof assignee === 'string' ? assignee : assignee?._id || assignee?.userId;
      return id === currentUserId;
    });

    if (aIsCurrentUser && !bIsCurrentUser) return -1; // a comes first
    if (!aIsCurrentUser && bIsCurrentUser) return 1;  // b comes first
    return a.position - b.position; // maintain original position order
  });

  if (column.isCollapsed) {
    return (
      <div
        className="flex-shrink-0 w-12 bg-white dark:bg-gray-900 rounded-xl p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg border border-gray-200 dark:border-gray-700"
        onClick={() => onToggleCollapse?.(column.id)}
      >
        <div className="flex flex-col items-center gap-2">
          <ChevronRight className="w-4 h-4 text-[#00ADB5]" />
          <span
            className="writing-mode-vertical text-xs font-medium text-gray-700 dark:text-gray-300"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {column.title}
          </span>
          <span className="bg-[#00ADB5]/10 text-[#00ADB5] px-1.5 py-0.5 rounded-full text-xs font-medium">
            {taskCount}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={columnRef}
      className={`
        flex-shrink-0 w-72 bg-white dark:bg-gray-900 rounded-xl flex flex-col shadow-lg border border-gray-200 dark:border-gray-700
        transition-all duration-200
        ${isDragOver ? 'ring-2 ring-[#00ADB5] bg-[#00ADB5]/5 dark:bg-[#00ADB5]/10' : ''}
      `}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {/* Color indicator */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />

          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {column.title}
          </h3>

          {/* Task count badge */}
          <span
            className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              ${isOverLimit
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }
            `}
          >
            {taskCount}
            {column.taskLimit && ` / ${column.taskLimit}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Collapse button */}
          <button
            onClick={() => onToggleCollapse?.(column.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Collapse column"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>

          {/* Add task button - Only for project owner */}
          {isProjectOwner && (
            <button
              onClick={() => onAddTask(column.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Add task"
            >
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* WIP Limit Warning */}
      {isOverLimit && (
        <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400">
            ⚠️ WIP limit exceeded ({taskCount}/{column.taskLimit})
          </p>
        </div>
      )}

      {/* Tasks Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[100px]">
        {sortedTasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <p className="text-sm text-gray-400">Drop tasks here</p>
          </div>
        ) : (
          sortedTasks.map((task, index) => (
            <TaskCard
              key={typeof task._id === 'string' ? task._id : String(task._id) || `task-${index}`}
              task={task}
              labels={labels}
              currentUserId={currentUserId}
              isProjectOwner={isProjectOwner}
              columnTitle={column.title}
              onClick={() => onTaskClick(task)}
              onDragStart={(e) => onDragStart(e, task._id, column.id)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>

      {/* Add Task Footer - Only show for project owner */}
      {isProjectOwner && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onAddTask(column.id)}
            className="w-full flex items-center justify-center gap-1 py-2.5 text-sm text-[#00ADB5] font-medium hover:bg-[#00ADB5]/10 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      )}
    </div>
  );
}

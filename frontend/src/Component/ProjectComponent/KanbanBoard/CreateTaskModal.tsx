import {
    Calendar,
    Tag,
    User,
    X
} from 'lucide-react';
import { useState } from 'react';
import type { BoardColumn, BoardLabel, KanbanTask, ProjectMember } from './kanban.types';

interface CreateTaskModalProps {
  columnId: string;
  columns: BoardColumn[];
  labels: BoardLabel[];
  members: ProjectMember[];
  onClose: () => void;
  onCreate: (task: Partial<KanbanTask>) => void;
}

export default function CreateTaskModal({
  columnId,
  columns,
  labels,
  members,
  onClose,
  onCreate
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [storyPoints, setStoryPoints] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (selectedAssignees.length === 0) {
      alert('Please assign at least one team member to this task');
      return;
    }

    // Call onCreate immediately - parent handles optimistic update
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      labels: selectedLabels,
      assignees: selectedAssignees as any,
      dueDate: dueDate || undefined,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      storyPoints: storyPoints ? parseInt(storyPoints) : undefined
    });
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev =>
      prev.includes(labelId)
        ? prev.filter(l => l !== labelId)
        : [...prev, labelId]
    );
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(a => a !== userId)
        : [...prev, userId]
    );
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-700 border-green-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    critical: 'bg-red-100 text-red-700 border-red-300'
  };

  const column = columns.find(c => c.id === columnId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column?.color }}
            />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              New Task in {column?.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#00ADB5] focus:border-[#00ADB5]"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-[#00ADB5] focus:border-[#00ADB5]"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg border text-sm capitalize transition-all ${
                    priority === p
                      ? priorityColors[p] + ' ring-2 ring-offset-1'
                      : 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Labels
            </label>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className={`px-2 py-1 rounded-full text-xs transition-all ${
                    selectedLabels.includes(label.id)
                      ? 'text-white ring-2 ring-offset-1'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Assignee *
              <span className="text-xs text-red-500 ml-1">(Required)</span>
            </label>
            {selectedAssignees.length === 0 && (
              <p className="text-xs text-red-500 mb-2">Please select at least one assignee</p>
            )}
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => toggleAssignee(member.userId)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm transition-all ${
                    selectedAssignees.includes(member.userId)
                      ? 'bg-[#00ADB5]/10 dark:bg-[#00ADB5]/20 text-[#00ADB5] ring-2 ring-[#00ADB5] ring-offset-1'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#00ADB5] to-cyan-500 flex items-center justify-center text-white text-xs">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  {member.name}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Estimates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Est. Hours
              </label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Story Points
              </label>
              <input
                type="number"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white font-medium rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

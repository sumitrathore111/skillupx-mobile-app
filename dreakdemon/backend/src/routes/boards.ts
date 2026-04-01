import express, { Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { auth, AuthRequest } from '../middleware/auth';
import { Board, BoardTask } from '../models/Board';
import Project from '../models/Project';
import ProjectActivity from '../models/ProjectActivity';
import Sprint from '../models/Sprint';
import emailNotifications from '../services/emailService';

const router = express.Router();

// Helper to find project by ID or ideaId
async function findProject(projectIdOrIdeaId: string) {
  // First try to find by project ID
  let project = await Project.findById(projectIdOrIdeaId);

  // If not found, try to find by ideaId
  if (!project) {
    project = await Project.findOne({ ideaId: projectIdOrIdeaId });
  }

  return project;
}

// Helper to check project membership (supports both project ID and idea ID)
async function checkProjectAccess(projectIdOrIdeaId: string, userId: string): Promise<{ hasAccess: boolean; role?: string; project?: any }> {
  const project = await findProject(projectIdOrIdeaId);
  if (!project) return { hasAccess: false };

  if (project.owner.toString() === userId) {
    return { hasAccess: true, role: 'owner', project };
  }

  const member = project.members.find(m => m.userId.toString() === userId);
  if (member) {
    return { hasAccess: true, role: member.role, project };
  }

  return { hasAccess: false, project };
}

// Helper to log activity
async function logActivity(
  projectId: string,
  userId: string,
  userName: string,
  type: string,
  title: string,
  metadata: any = {},
  boardId?: string,
  taskId?: string
) {
  try {
    await ProjectActivity.create({
      projectId,
      boardId,
      taskId,
      userId,
      userName,
      type,
      title,
      metadata
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// ==================== BOARD ROUTES ====================

// Create a new board for a project (supports both project ID and idea ID)
router.post('/project/:projectId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const access = await checkProjectAccess(projectId, userId);
    if (!access.hasAccess || !access.project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use the actual project ID from the found project
    const actualProjectId = access.project._id;

    // Default columns for Kanban
    const defaultColumns = [
      { id: uuidv4(), title: 'To Do', position: 0, color: '#6B7280', isCollapsed: false },
      { id: uuidv4(), title: 'In Progress', position: 1, color: '#3B82F6', isCollapsed: false },
      { id: uuidv4(), title: 'Review', position: 2, color: '#F59E0B', isCollapsed: false },
      { id: uuidv4(), title: 'Done', position: 3, color: '#10B981', isCollapsed: false }
    ];

    // Default labels
    const defaultLabels = [
      { id: uuidv4(), name: 'Bug', color: '#EF4444' },
      { id: uuidv4(), name: 'Feature', color: '#3B82F6' },
      { id: uuidv4(), name: 'Enhancement', color: '#8B5CF6' },
      { id: uuidv4(), name: 'Documentation', color: '#10B981' },
      { id: uuidv4(), name: 'Urgent', color: '#F59E0B' }
    ];

    const board = await Board.create({
      projectId: actualProjectId,
      title: title || 'Main Board',
      description,
      columns: defaultColumns,
      labels: defaultLabels,
      settings: {
        defaultView: 'kanban',
        showTaskIds: true,
        enableTimeTracking: true,
        enableStoryPoints: false
      },
      createdBy: userId
    });

    await logActivity(actualProjectId.toString(), userId, req.user?.name || 'Unknown', 'board_created', `Created board "${title || 'Main Board'}"`, {}, board._id.toString());

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${actualProjectId}`).emit('board:created', { board });

    res.status(201).json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ message: 'Failed to create board' });
  }
});

// Get all boards for a project (supports both project ID and idea ID)
router.get('/project/:projectId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const access = await checkProjectAccess(projectId, userId);
    if (!access.hasAccess || !access.project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use the actual project ID from the found project
    const actualProjectId = access.project._id;
    const boards = await Board.find({ projectId: actualProjectId }).sort({ createdAt: 1 });
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ message: 'Failed to fetch boards' });
  }
});

// Get a single board with all tasks
router.get('/:boardId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const access = await checkProjectAccess(board.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await BoardTask.find({ boardId })
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .sort({ position: 1 });

    res.json({ board, tasks });
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ message: 'Failed to fetch board' });
  }
});

// Update board settings/columns
router.patch('/:boardId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const access = await checkProjectAccess(board.projectId.toString(), userId);
    if (!access.hasAccess || (access.role !== 'owner' && access.role !== 'admin')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedBoard = await Board.findByIdAndUpdate(
      boardId,
      { $set: updates },
      { new: true }
    );

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${board.projectId}`).emit('board:updated', { board: updatedBoard });

    res.json(updatedBoard);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ message: 'Failed to update board' });
  }
});

// Add a new column to board
router.post('/:boardId/columns', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const { title, color } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const access = await checkProjectAccess(board.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newColumn = {
      id: uuidv4(),
      title,
      position: board.columns.length,
      color: color || '#6B7280',
      isCollapsed: false
    };

    board.columns.push(newColumn);
    await board.save();

    await logActivity(
      board.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'column_added',
      `Added column "${title}"`,
      { columnId: newColumn.id },
      boardId
    );

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${board.projectId}`).emit('column:added', { boardId, column: newColumn });

    res.json(board);
  } catch (error) {
    console.error('Error adding column:', error);
    res.status(500).json({ message: 'Failed to add column' });
  }
});

// Reorder columns
router.patch('/:boardId/columns/reorder', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const { columns } = req.body; // Array of { id, position }
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const access = await checkProjectAccess(board.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update positions
    for (const col of columns) {
      const column = board.columns.find(c => c.id === col.id);
      if (column) {
        column.position = col.position;
      }
    }

    board.columns.sort((a, b) => a.position - b.position);
    await board.save();

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${board.projectId}`).emit('columns:reordered', { boardId, columns: board.columns });

    res.json(board);
  } catch (error) {
    console.error('Error reordering columns:', error);
    res.status(500).json({ message: 'Failed to reorder columns' });
  }
});

// ==================== TASK ROUTES ====================

// Create a new task
router.post('/:boardId/tasks', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const { columnId, title, description, priority, labels, assignees, dueDate, startDate, estimatedHours, storyPoints } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate boardId
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const access = await checkProjectAccess(board.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate columnId exists in board
    const columnExists = board.columns.some(col => col.id === columnId);
    if (!columnExists) {
      return res.status(400).json({ message: 'Invalid column ID' });
    }

    // Validate and filter assignees - convert strings to ObjectIds
    console.log('📥 Creating task - received assignees:', assignees);
    const validAssignees: mongoose.Types.ObjectId[] = [];
    if (Array.isArray(assignees)) {
      for (const assignee of assignees) {
        // Handle both string IDs and object format
        const assigneeId = typeof assignee === 'string' ? assignee : assignee?._id || assignee?.userId;
        console.log('   - Processing assignee:', assignee, '-> assigneeId:', assigneeId, '-> isValid:', mongoose.Types.ObjectId.isValid(assigneeId));
        if (assigneeId && mongoose.Types.ObjectId.isValid(assigneeId)) {
          validAssignees.push(new mongoose.Types.ObjectId(assigneeId));
        }
      }
    }
    console.log('📤 Valid assignees to save:', validAssignees);

    // Validate and filter labels - ensure they are strings
    const validLabels: string[] = Array.isArray(labels)
      ? labels.filter((label: any) => typeof label === 'string')
      : [];

    // Get the highest position in the column
    const maxPositionTask = await BoardTask.findOne({ boardId, columnId }).sort({ position: -1 });
    const position = maxPositionTask ? maxPositionTask.position + 1 : 0;

    const task = await BoardTask.create({
      boardId,
      columnId,
      projectId: board.projectId,
      title,
      description,
      position,
      priority: priority || 'medium',
      labels: validLabels,
      assignees: validAssignees,
      reporter: userId,
      dueDate,
      startDate,
      estimatedHours,
      storyPoints,
      subtasks: [],
      checklists: [],
      comments: [],
      timeEntries: [],
      attachments: [],
      watchers: [userId]
    });

    await task.populate('assignees', 'name email avatar');
    await task.populate('reporter', 'name email avatar');

    // Send email notifications to assignees
    if (task.assignees && task.assignees.length > 0) {
      const project = await Project.findById(board.projectId);
      const projectTitle = project?.title || 'Project';
      const assignedByName = req.user?.name || 'Someone';

      for (const assignee of task.assignees as any[]) {
        if (assignee.email && assignee._id.toString() !== userId) {
          // Don't send email to yourself if you're assigning to yourself
          try {
            await emailNotifications.notifyTaskAssigned(
              projectTitle,
              title,
              assignedByName,
              priority || 'medium',
              dueDate,
              assignee.email
            );
            console.log(`📧 Sent task assignment email to ${assignee.email}`);
          } catch (emailError) {
            console.error(`Failed to send task assignment email to ${assignee.email}:`, emailError);
          }
        }
      }
    }

    await logActivity(
      board.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'task_created',
      `Created task "${title}"`,
      { taskTitle: title, columnId },
      boardId,
      task._id.toString()
    );

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${board.projectId}`).emit('task:created', { task });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// Get task details
router.get('/tasks/:taskId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('comments.author', 'name email avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

// Update task
router.patch('/tasks/:taskId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedTask = await BoardTask.findByIdAndUpdate(
      taskId,
      { $set: updates },
      { new: true }
    )
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar');

    await logActivity(
      task.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'task_updated',
      `Updated task "${task.title}"`,
      { updates },
      task.boardId.toString(),
      taskId
    );

    // Emit socket event
    const io = req.app.get('io');
    const board = await Board.findById(task.boardId);
    if (board) {
      io?.to(`project:${board.projectId}`).emit('task:updated', { task: updatedTask });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// Move task (drag and drop)
router.patch('/tasks/:taskId/move', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { columnId, position } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if target column is "Done" - only owner can move tasks to Done
    const board = await Board.findById(task.boardId);
    const doneColumn = board?.columns.find(c => c.title.toLowerCase() === 'done');
    const reviewColumn = board?.columns.find(c => c.title.toLowerCase() === 'review');

    if (doneColumn && columnId === doneColumn.id && access.role !== 'owner') {
      return res.status(403).json({
        message: 'Only the project owner can move tasks to Done. Tasks must be approved in Review column first.'
      });
    }

    const oldColumnId = task.columnId;
    const oldPosition = task.position;

    // Update positions of other tasks
    if (oldColumnId === columnId) {
      // Moving within the same column
      if (position < oldPosition) {
        await BoardTask.updateMany(
          { boardId: task.boardId, columnId, position: { $gte: position, $lt: oldPosition } },
          { $inc: { position: 1 } }
        );
      } else {
        await BoardTask.updateMany(
          { boardId: task.boardId, columnId, position: { $gt: oldPosition, $lte: position } },
          { $inc: { position: -1 } }
        );
      }
    } else {
      // Moving to a different column
      await BoardTask.updateMany(
        { boardId: task.boardId, columnId: oldColumnId, position: { $gt: oldPosition } },
        { $inc: { position: -1 } }
      );
      await BoardTask.updateMany(
        { boardId: task.boardId, columnId, position: { $gte: position } },
        { $inc: { position: 1 } }
      );
    }

    // Update the task
    task.columnId = columnId;
    task.position = position;

    // Auto-set reviewStatus to 'pending' when task is moved to Review column
    if (reviewColumn && columnId === reviewColumn.id) {
      task.reviewStatus = 'pending';
    }

    // Mark as completed if moved to done column (only by owner through approval)
    if (doneColumn && columnId === doneColumn.id && !task.completedAt) {
      task.completedAt = new Date();
      task.completedBy = new mongoose.Types.ObjectId(userId);
    }

    await task.save();

    await logActivity(
      task.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'task_moved',
      `Moved task "${task.title}"`,
      { columnFrom: oldColumnId, columnTo: columnId, taskTitle: task.title },
      task.boardId.toString(),
      taskId
    );

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('task:moved', {
      taskId,
      columnId,
      position,
      oldColumnId,
      movedBy: { id: userId, name: req.user?.name }
    });

    res.json(task);
  } catch (error) {
    console.error('Error moving task:', error);
    res.status(500).json({ message: 'Failed to move task' });
  }
});

// Delete task
router.delete('/tasks/:taskId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await BoardTask.findByIdAndDelete(taskId);

    // Update positions of remaining tasks
    await BoardTask.updateMany(
      { boardId: task.boardId, columnId: task.columnId, position: { $gt: task.position } },
      { $inc: { position: -1 } }
    );

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('task:deleted', { taskId, columnId: task.columnId });

    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// ==================== REVIEW ROUTES ====================

// Submit task for review (moves to Review column and sets status to pending)
router.post('/tasks/:taskId/submit-review', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update task review status
    task.reviewStatus = 'pending';
    await task.save();

    await task.populate('assignees', 'name email avatar');
    await task.populate('reporter', 'name email avatar');
    await task.populate('reviewedBy', 'name email avatar');

    await logActivity(
      task.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'task_submitted_review',
      `Submitted "${task.title}" for review`,
      { taskTitle: task.title },
      task.boardId.toString(),
      taskId
    );

    // Send email notification to project owner
    try {
      const project = await Project.findById(task.projectId).populate('owner', 'name email');
      if (project && (project.owner as any).email) {
        const ownerEmail = (project.owner as any).email;
        const submitterName = req.user?.name || 'A team member';

        // Don't send email if submitter is the owner
        if ((project.owner as any)._id.toString() !== userId) {
          await emailNotifications.notifyTaskSubmittedForReview(
            project.title,
            task.title,
            submitterName,
            ownerEmail
          );
          console.log(`📧 Sent task review notification email to owner: ${ownerEmail}`);
        }
      }
    } catch (emailError) {
      console.error('Failed to send task review notification email:', emailError);
    }

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('task:updated', { task });

    res.json(task);
  } catch (error) {
    console.error('Error submitting task for review:', error);
    res.status(500).json({ message: 'Failed to submit task for review' });
  }
});

// Approve task (Only project creator can do this)
router.post('/tasks/:taskId/approve', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is project owner
    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only project owner can approve
    if (access.role !== 'owner') {
      return res.status(403).json({ message: 'Only project creator can approve tasks' });
    }

    // Get the board to find the "Done" column
    const board = await Board.findById(task.boardId);
    const doneColumn = board?.columns.find(c => c.title.toLowerCase() === 'done');

    // Update task
    task.reviewStatus = 'approved';
    task.reviewedBy = new mongoose.Types.ObjectId(userId);
    task.reviewedAt = new Date();
    task.reviewComment = comment || 'Approved';

    // Move to Done column if exists
    if (doneColumn) {
      const maxPositionTask = await BoardTask.findOne({
        boardId: task.boardId,
        columnId: doneColumn.id
      }).sort({ position: -1 });

      task.columnId = doneColumn.id;
      task.position = maxPositionTask ? maxPositionTask.position + 1 : 0;
      task.completedAt = new Date();
      task.completedBy = new mongoose.Types.ObjectId(userId);
    }

    await task.save();

    await task.populate('assignees', 'name email avatar');
    await task.populate('reporter', 'name email avatar');
    await task.populate('reviewedBy', 'name email avatar');

    await logActivity(
      task.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'task_approved',
      `Approved "${task.title}"`,
      { taskTitle: task.title, comment },
      task.boardId.toString(),
      taskId
    );

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('task:updated', { task });

    // Notify assignees
    task.assignees.forEach((assignee: any) => {
      io?.to(`user:${assignee._id || assignee}`).emit('notification', {
        type: 'task_approved',
        title: 'Task Approved',
        message: `Your task "${task.title}" has been approved by ${req.user?.name}`,
        taskId
      });
    });

    res.json(task);
  } catch (error) {
    console.error('Error approving task:', error);
    res.status(500).json({ message: 'Failed to approve task' });
  }
});

// Request changes (Only project creator can do this)
router.post('/tasks/:taskId/request-changes', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!comment) {
      return res.status(400).json({ message: 'Comment is required when requesting changes' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is project owner
    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only project owner can request changes
    if (access.role !== 'owner') {
      return res.status(403).json({ message: 'Only project creator can request changes' });
    }

    // Get the board to find the "In Progress" column
    const board = await Board.findById(task.boardId);
    const inProgressColumn = board?.columns.find(c =>
      c.title.toLowerCase() === 'in progress' || c.title.toLowerCase() === 'in-progress'
    );

    // Update task
    task.reviewStatus = 'changes_requested';
    task.reviewedBy = new mongoose.Types.ObjectId(userId);
    task.reviewedAt = new Date();
    task.reviewComment = comment;

    // Move back to In Progress column if exists
    if (inProgressColumn) {
      const maxPositionTask = await BoardTask.findOne({
        boardId: task.boardId,
        columnId: inProgressColumn.id
      }).sort({ position: -1 });

      task.columnId = inProgressColumn.id;
      task.position = maxPositionTask ? maxPositionTask.position + 1 : 0;
    }

    // Add a comment about the change request
    task.comments.push({
      id: uuidv4(),
      content: `📝 **Changes Requested:** ${comment}`,
      author: new mongoose.Types.ObjectId(userId),
      authorName: req.user?.name || 'Unknown',
      mentions: [],
      createdAt: new Date(),
      isEdited: false
    });

    await task.save();

    await task.populate('assignees', 'name email avatar');
    await task.populate('reporter', 'name email avatar');
    await task.populate('reviewedBy', 'name email avatar');

    await logActivity(
      task.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'task_changes_requested',
      `Requested changes on "${task.title}"`,
      { taskTitle: task.title, comment },
      task.boardId.toString(),
      taskId
    );

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('task:updated', { task });

    // Notify assignees
    task.assignees.forEach((assignee: any) => {
      io?.to(`user:${assignee._id || assignee}`).emit('notification', {
        type: 'task_changes_requested',
        title: 'Changes Requested',
        message: `Changes requested on "${task.title}": ${comment}`,
        taskId
      });
    });

    res.json(task);
  } catch (error) {
    console.error('Error requesting changes:', error);
    res.status(500).json({ message: 'Failed to request changes' });
  }
});

// Add comment to task
router.post('/tasks/:taskId/comments', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { content, mentions } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comment = {
      id: uuidv4(),
      content,
      author: new mongoose.Types.ObjectId(userId),
      authorName: req.user?.name || 'Unknown',
      mentions: mentions || [],
      createdAt: new Date(),
      isEdited: false
    };

    task.comments.push(comment);
    await task.save();

    await logActivity(
      task.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'task_commented',
      `Commented on "${task.title}"`,
      { taskTitle: task.title },
      task.boardId.toString(),
      taskId
    );

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('task:commented', { taskId, comment });

    // Notify mentioned users
    if (mentions?.length > 0) {
      mentions.forEach((mentionedUserId: string) => {
        io?.to(`user:${mentionedUserId}`).emit('notification', {
          type: 'mention',
          title: 'You were mentioned',
          message: `${req.user?.name} mentioned you in a comment on "${task.title}"`,
          projectId: task.projectId,
          taskId
        });
      });
    }

    res.json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// Add subtask
router.post('/tasks/:taskId/subtasks', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subtask = {
      id: uuidv4(),
      text,
      completed: false
    };

    task.subtasks.push(subtask);
    await task.save();

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('subtask:added', { taskId, subtask });

    res.json(subtask);
  } catch (error) {
    console.error('Error adding subtask:', error);
    res.status(500).json({ message: 'Failed to add subtask' });
  }
});

// Toggle subtask completion
router.patch('/tasks/:taskId/subtasks/:subtaskId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, subtaskId } = req.params;
    const { completed } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    subtask.completed = completed;
    if (completed) {
      subtask.completedAt = new Date();
      subtask.completedBy = new mongoose.Types.ObjectId(userId);
    } else {
      subtask.completedAt = undefined;
      subtask.completedBy = undefined;
    }

    await task.save();

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('subtask:updated', { taskId, subtask });

    res.json(subtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ message: 'Failed to update subtask' });
  }
});

// Start time tracking
router.post('/tasks/:taskId/time/start', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const timeEntry = {
      id: uuidv4(),
      userId: new mongoose.Types.ObjectId(userId),
      userName: req.user?.name || 'Unknown',
      startTime: new Date(),
      duration: 0,
      description
    };

    task.timeEntries.push(timeEntry);
    await task.save();

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('time:started', { taskId, timeEntry, userName: req.user?.name });

    res.json(timeEntry);
  } catch (error) {
    console.error('Error starting time:', error);
    res.status(500).json({ message: 'Failed to start time tracking' });
  }
});

// Stop time tracking
router.patch('/tasks/:taskId/time/:timeEntryId/stop', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, timeEntryId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const timeEntry = task.timeEntries.find(t => t.id === timeEntryId);
    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    timeEntry.endTime = new Date();
    timeEntry.duration = Math.round((timeEntry.endTime.getTime() - timeEntry.startTime.getTime()) / 60000); // Convert to minutes

    // Update total time spent
    task.totalTimeSpent = task.timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);

    await task.save();

    // Emit socket event
    const io = req.app.get('io');
    io?.to(`project:${task.projectId}`).emit('time:stopped', { taskId, timeEntry, totalTimeSpent: task.totalTimeSpent });

    res.json(timeEntry);
  } catch (error) {
    console.error('Error stopping time:', error);
    res.status(500).json({ message: 'Failed to stop time tracking' });
  }
});

// ==================== SPRINT ROUTES ====================

// Create a sprint (supports both project ID and idea ID)
router.post('/project/:projectId/sprints', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { boardId, name, goal, startDate, endDate } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const access = await checkProjectAccess(projectId, userId);
    if (!access.hasAccess || !access.project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use the actual project ID from the found project
    const actualProjectId = access.project._id;
    const sprint = await Sprint.create({
      projectId: actualProjectId,
      boardId,
      name,
      goal,
      startDate,
      endDate,
      status: 'planning',
      createdBy: userId
    });

    res.status(201).json(sprint);
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ message: 'Failed to create sprint' });
  }
});

// Get sprints for a project (supports both project ID and idea ID)
router.get('/project/:projectId/sprints', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const access = await checkProjectAccess(projectId, userId);
    if (!access.hasAccess || !access.project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use the actual project ID from the found project
    const actualProjectId = access.project._id;
    const sprints = await Sprint.find({ projectId: actualProjectId }).sort({ startDate: -1 });
    res.json(sprints);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({ message: 'Failed to fetch sprints' });
  }
});

// Start a sprint
router.patch('/sprints/:sprintId/start', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { sprintId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    const access = await checkProjectAccess(sprint.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    sprint.status = 'active';
    await sprint.save();

    await logActivity(
      sprint.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'sprint_started',
      `Started sprint "${sprint.name}"`,
      { sprintId: sprint._id }
    );

    res.json(sprint);
  } catch (error) {
    console.error('Error starting sprint:', error);
    res.status(500).json({ message: 'Failed to start sprint' });
  }
});

// Complete a sprint
router.patch('/sprints/:sprintId/complete', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { sprintId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    const access = await checkProjectAccess(sprint.projectId.toString(), userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Calculate velocity (sum of story points of completed tasks)
    const completedTasks = await BoardTask.find({
      sprintId: sprint._id,
      completedAt: { $exists: true }
    });
    sprint.velocity = completedTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
    sprint.status = 'completed';
    await sprint.save();

    await logActivity(
      sprint.projectId.toString(),
      userId,
      req.user?.name || 'Unknown',
      'sprint_completed',
      `Completed sprint "${sprint.name}" with velocity ${sprint.velocity}`,
      { sprintId: sprint._id, velocity: sprint.velocity }
    );

    res.json(sprint);
  } catch (error) {
    console.error('Error completing sprint:', error);
    res.status(500).json({ message: 'Failed to complete sprint' });
  }
});

// ==================== ACTIVITY ROUTES ====================

// Get project activity feed (supports both project ID and idea ID)
router.get('/project/:projectId/activity', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const access = await checkProjectAccess(projectId, userId);
    if (!access.hasAccess || !access.project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use the actual project ID from the found project
    const actualProjectId = access.project._id;
    const activities = await ProjectActivity.find({ projectId: actualProjectId })
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

// ==================== ANALYTICS ROUTES ====================

// Get project analytics (supports both project ID and idea ID)
router.get('/project/:projectId/analytics', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const access = await checkProjectAccess(projectId, userId);
    if (!access.hasAccess || !access.project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use the actual project ID from the found project
    const actualProjectId = access.project._id;
    const boards = await Board.find({ projectId: actualProjectId });
    const boardIds = boards.map(b => b._id);

    // Get all tasks
    const tasks = await BoardTask.find({ boardId: { $in: boardIds } });

    // Task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completedAt).length;
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completedAt).length;

    // Tasks by priority
    const tasksByPriority = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      critical: tasks.filter(t => t.priority === 'critical').length
    };

    // Tasks by column
    const tasksByColumn: Record<string, number> = {};
    for (const board of boards) {
      for (const column of board.columns) {
        tasksByColumn[column.title] = tasks.filter(t => t.columnId === column.id).length;
      }
    }

    // Time tracking stats
    const totalTimeSpent = tasks.reduce((sum, t) => sum + (t.totalTimeSpent || 0), 0);
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    // Sprint stats
    const sprints = await Sprint.find({ projectId });
    const completedSprints = sprints.filter(s => s.status === 'completed');
    const averageVelocity = completedSprints.length > 0
      ? completedSprints.reduce((sum, s) => sum + (s.velocity || 0), 0) / completedSprints.length
      : 0;

    // Team productivity (tasks completed per member)
    const project = await Project.findById(projectId);
    const memberCount = (project?.members.length || 0) + 1; // +1 for owner

    res.json({
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        overdue: overdueTasks,
        byPriority: tasksByPriority,
        byColumn: tasksByColumn
      },
      time: {
        totalSpent: totalTimeSpent,
        totalEstimated: totalEstimatedHours * 60, // Convert to minutes
        efficiency: totalEstimatedHours > 0 ? Math.round((totalTimeSpent / (totalEstimatedHours * 60)) * 100) : 0
      },
      sprints: {
        total: sprints.length,
        completed: completedSprints.length,
        averageVelocity: Math.round(averageVelocity)
      },
      team: {
        memberCount,
        tasksPerMember: memberCount > 0 ? Math.round(totalTasks / memberCount) : 0,
        completedPerMember: memberCount > 0 ? Math.round(completedTasks / memberCount) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

export default router;

import { AnimatePresence, motion } from 'framer-motion';
import {
  FolderPlus,
  MessageSquare,
  ShoppingBag,
  Swords,
  UserPlus,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  action: () => void;
}

interface QuickActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string;
  targetUserName?: string;
  targetProjectId?: string;
  targetProjectTitle?: string;
  position?: { x: number; y: number };
  context: 'developer' | 'project' | 'battle' | 'bazaar';
}

export default function QuickActionsMenu({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  targetProjectId,
  targetProjectTitle,
  position,
  context
}: QuickActionsMenuProps) {
  const navigate = useNavigate();

  const getActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    // Message action - available for developers
    if (targetUserId) {
      actions.push({
        id: 'message',
        label: 'Send Message',
        description: `Chat with ${targetUserName || 'this developer'}`,
        icon: <MessageSquare className="w-5 h-5" />,
        color: '#00ADB5',
        bgColor: 'rgba(0, 173, 181, 0.1)',
        action: () => {
          onClose();
          navigate('/dashboard/courses', { state: { selectedChat: targetUserId } });
        }
      });
    }

    // Challenge to battle - available from developer connect or project context
    if (targetUserId && context !== 'battle') {
      actions.push({
        id: 'battle',
        label: 'Challenge to Battle',
        description: `Start a coding battle with ${targetUserName || 'this developer'}`,
        icon: <Swords className="w-5 h-5" />,
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        action: () => {
          onClose();
          navigate('/dashboard/arena', { state: { challengeUser: targetUserId, challengeUserName: targetUserName } });
        }
      });
    }

    // Invite to project - from developer context
    if (targetUserId && context === 'developer') {
      actions.push({
        id: 'invite',
        label: 'Invite to Project',
        description: `Invite ${targetUserName || 'this developer'} to collaborate`,
        icon: <UserPlus className="w-5 h-5" />,
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        action: () => {
          onClose();
          navigate('/dashboard/projects', { state: { inviteUser: targetUserId, inviteUserName: targetUserName } });
        }
      });
    }

    // Connect with player - from battle context
    if (targetUserId && context === 'battle') {
      actions.push({
        id: 'connect',
        label: 'Connect',
        description: `Add ${targetUserName || 'this player'} to your network`,
        icon: <UserPlus className="w-5 h-5" />,
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        action: () => {
          onClose();
          navigate('/dashboard/courses', { state: { addConnection: targetUserId } });
        }
      });
    }

    // Sell on bazaar - from project context
    if (targetProjectId && context === 'project') {
      actions.push({
        id: 'sell',
        label: 'Sell on Bazaar',
        description: `List "${targetProjectTitle || 'this project'}" on marketplace`,
        icon: <ShoppingBag className="w-5 h-5" />,
        color: '#a855f7',
        bgColor: 'rgba(168, 85, 247, 0.1)',
        action: () => {
          onClose();
          navigate('/dashboard/bazaar', { 
            state: { 
              createListing: true, 
              projectId: targetProjectId,
              projectTitle: targetProjectTitle 
            } 
          });
        }
      });
    }

    // View project from bazaar
    if (targetProjectId && context === 'bazaar') {
      actions.push({
        id: 'view-project',
        label: 'View Original Project',
        description: 'See this project in Creator Corner',
        icon: <FolderPlus className="w-5 h-5" />,
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        action: () => {
          onClose();
          navigate('/dashboard/projects', { state: { viewProject: targetProjectId } });
        }
      });
    }

    return actions;
  };

  const actions = getActions();

  if (!isOpen || actions.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100]"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[101] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-64 overflow-hidden"
            style={{
              left: position?.x ? Math.min(position.x, window.innerWidth - 280) : '50%',
              top: position?.y ? Math.min(position.y + 10, window.innerHeight - (actions.length * 70 + 60)) : '50%',
              transform: position ? 'none' : 'translate(-50%, -50%)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Quick Actions
              </span>
              <button
                onClick={onClose}
                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Actions */}
            <div className="p-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: action.bgColor, color: action.color }}
                  >
                    {action.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for using quick actions
export function useQuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | undefined>();
  const [context, setContext] = useState<'developer' | 'project' | 'battle' | 'bazaar'>('developer');
  const [targetUserId, setTargetUserId] = useState<string | undefined>();
  const [targetUserName, setTargetUserName] = useState<string | undefined>();
  const [targetProjectId, setTargetProjectId] = useState<string | undefined>();
  const [targetProjectTitle, setTargetProjectTitle] = useState<string | undefined>();

  const openQuickActions = (
    event: React.MouseEvent,
    options: {
      context: 'developer' | 'project' | 'battle' | 'bazaar';
      userId?: string;
      userName?: string;
      projectId?: string;
      projectTitle?: string;
    }
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setPosition({ x: event.clientX, y: event.clientY });
    setContext(options.context);
    setTargetUserId(options.userId);
    setTargetUserName(options.userName);
    setTargetProjectId(options.projectId);
    setTargetProjectTitle(options.projectTitle);
    setIsOpen(true);
  };

  const closeQuickActions = () => {
    setIsOpen(false);
  };

  const QuickActionsComponent = () => (
    <QuickActionsMenu
      isOpen={isOpen}
      onClose={closeQuickActions}
      position={position}
      context={context}
      targetUserId={targetUserId}
      targetUserName={targetUserName}
      targetProjectId={targetProjectId}
      targetProjectTitle={targetProjectTitle}
    />
  );

  return {
    openQuickActions,
    closeQuickActions,
    QuickActionsComponent
  };
}

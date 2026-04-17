import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, MessageCircle, Package, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../Context/AuthContext';
import {
    acceptChatRequest,
    debugChatSystem,
    rejectChatRequest,
    subscribeToPendingRequests,
} from '../../../service/marketplaceChatService';
import type { MarketplaceChat } from '../../../types/marketplace';

interface ChatRequestsProps {
  onChatAccepted?: (chat: MarketplaceChat) => void;
}

export default function ChatRequests({ onChatAccepted }: ChatRequestsProps) {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<MarketplaceChat[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      console.log('ChatRequests: No user logged in');
      return;
    }

    console.log('ChatRequests: User ID is:', user.id);
    console.log('ChatRequests: Subscribing to pending requests for seller:', user.id);
    
    // Debug: Run a direct query to check the database
    debugChatSystem(user.id).then(result => {
      console.log('ChatRequests: Debug result:', result);
    }).catch(err => {
      console.error('ChatRequests: Debug error:', err);
    });
    
    const unsubscribe = subscribeToPendingRequests(user.id, (requests) => {
      console.log('ChatRequests: Received pending requests:', requests.length, requests);
      setPendingRequests(requests);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleAccept = async (chat: MarketplaceChat) => {
    setProcessingId(chat.id);
    try {
      await acceptChatRequest(chat.id);
      toast.success('Chat request accepted!');
      if (onChatAccepted) {
        onChatAccepted({ ...chat, status: 'accepted' });
      }
    } catch (error) {
      console.error('Error accepting chat request:', error);
      toast.error('Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (chatId: string) => {
    setProcessingId(chatId);
    try {
      await rejectChatRequest(chatId);
      toast.success('Chat request declined');
    } catch (error) {
      console.error('Error rejecting chat request:', error);
      toast.error('Failed to decline request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (isNaN(diff)) return '';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600 dark:text-white" />
        {pendingRequests.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: '#00ADB5' }}
          >
            {pendingRequests.length}
          </motion.span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat Requests
                </h3>
                <p className="text-white/80 text-sm">
                  {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Requests List */}
              <div className="max-h-80 overflow-y-auto">
                {pendingRequests.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No pending requests</p>
                  </div>
                ) : (
                  pendingRequests.map((request) => {
                    const requesterName = request.participantNames[request.requesterId] || 'User';
                    const requesterAvatar = request.participantAvatars[request.requesterId] || '';

                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid #00ADB5' }}>
                            {requesterAvatar ? (
                              <img
                                src={requesterAvatar}
                                alt={requesterName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#00ADB5' }}>
                                {requesterName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {requesterName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              <span className="truncate">{request.projectTitle}</span>
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {formatTime(request.lastMessageTime)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAccept(request)}
                            disabled={processingId === request.id}
                            className="flex-1 py-2 px-3 rounded-lg text-white font-medium flex items-center justify-center gap-1 hover:opacity-90 transition-opacity disabled:opacity-50"
                            style={{ backgroundColor: '#00ADB5' }}
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={processingId === request.id}
                            className="flex-1 py-2 px-3 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-1 hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

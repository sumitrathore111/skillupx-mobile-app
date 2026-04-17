import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../Context/AuthContext';
import { subscribeToAcceptedChats } from '../../../service/marketplaceChatService';
import type { MarketplaceChat } from '../../../types/marketplace';
import ChatWindow from './ChatWindow';

export default function MessagesPanel() {
  const { user } = useAuth();
  const [chats, setChats] = useState<MarketplaceChat[]>([]);
  const [activeChat, setActiveChat] = useState<MarketplaceChat | null>(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToAcceptedChats(user.id, (acceptedChats) => {
      setChats(acceptedChats);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const filteredChats = chats.filter((chat) => {
    const otherUserId = chat.participants.find((id) => id !== user?.id) || '';
    const otherUserName = chat.participantNames[otherUserId] || '';
    return (
      otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.projectTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalUnread = chats.reduce((sum, chat) => {
    return sum + (chat.unreadCount[user?.id || ''] || 0);
  }, 0);

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (isNaN(diff)) return '';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const openChat = (chat: MarketplaceChat) => {
    setActiveChat(chat);
    setShowChatWindow(true);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative">
        {/* Messages Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <MessageCircle className="w-6 h-6 text-gray-600 dark:text-white" />
          {totalUnread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: '#00ADB5' }}
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </motion.span>
          )}
        </button>

        {/* Messages Panel */}
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
                className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Messages
                    </h3>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  
                  {/* Search */}
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                    />
                  </div>
                </div>

                {/* Chat List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredChats.length === 0 ? (
                    <div className="p-6 text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {chats.length === 0 ? 'No conversations yet' : 'No matching conversations'}
                      </p>
                    </div>
                  ) : (
                    filteredChats.map((chat) => {
                      const otherUserId = chat.participants.find((id) => id !== user?.id) || '';
                      const otherUserName = chat.participantNames[otherUserId] || 'User';
                      const otherUserAvatar = chat.participantAvatars[otherUserId] || '';
                      const unreadCount = chat.unreadCount[user?.id || ''] || 0;

                      return (
                        <motion.button
                          key={chat.id}
                          onClick={() => openChat(chat)}
                          whileHover={{ backgroundColor: 'rgba(0, 173, 181, 0.05)' }}
                          className="w-full p-4 border-b border-gray-100 dark:border-gray-700 flex items-start gap-3 text-left transition-colors"
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-12 h-12 rounded-full overflow-hidden"
                              style={{ border: unreadCount > 0 ? '2px solid #00ADB5' : '2px solid transparent' }}
                            >
                              {otherUserAvatar ? (
                                <img
                                  src={otherUserAvatar}
                                  alt={otherUserName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#00ADB5' }}>
                                  {otherUserName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            {unreadCount > 0 && (
                              <span
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                                style={{ backgroundColor: '#00ADB5' }}
                              >
                                {unreadCount}
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`font-semibold truncate ${unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {otherUserName}
                              </h4>
                              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                {formatTime(chat.lastMessageTime)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                              {chat.projectTitle}
                            </p>
                            <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                              {chat.lastMessage || 'No messages yet'}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Window */}
      {activeChat && (
        <ChatWindow
          chat={activeChat}
          isOpen={showChatWindow}
          onClose={() => {
            setShowChatWindow(false);
            setActiveChat(null);
          }}
        />
      )}
    </>
  );
}

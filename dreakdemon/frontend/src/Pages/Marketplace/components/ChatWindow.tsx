import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, Maximize2, Minimize2, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../Context/AuthContext';
import { useDataContext } from '../../../Context/UserDataContext';
import {
  markMessagesAsRead,
  sendMessage,
  subscribeToMessages,
} from '../../../service/marketplaceChatService';
import type { MarketplaceChat, MarketplaceMessage } from '../../../types/marketplace';

interface ChatWindowProps {
  chat: MarketplaceChat;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatWindow({ chat, isOpen, onClose }: ChatWindowProps) {
  const { user } = useAuth();
  const { userprofile, avatrUrl } = useDataContext();
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUserId = chat.participants.find((id) => id !== user?.id) || '';
  const otherUserName = chat.participantNames[otherUserId] || 'User';
  const otherUserAvatar = chat.participantAvatars[otherUserId] || '';
  const myAvatar = avatrUrl || chat.participantAvatars[user?.id || ''] || '';

  useEffect(() => {
    if (!isOpen || !chat.id) {
      console.log('ChatWindow: Not open or no chat id', { isOpen, chatId: chat.id });
      return;
    }

    console.log('ChatWindow: Subscribing to messages for chat:', chat.id);

    const unsubscribe = subscribeToMessages(chat.id, (newMessages) => {
      console.log('ChatWindow: Received messages:', newMessages.length, newMessages);
      setMessages(newMessages);
      // Mark messages as read
      if (user?.id) {
        markMessagesAsRead(chat.id, user.id);
      }
    });

    return () => unsubscribe();
  }, [isOpen, chat.id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id || isSending) return;

    console.log('ChatWindow: Sending message to chat:', chat.id);
    setIsSending(true);
    try {
      await sendMessage(chat.id, user.id, userprofile?.name || 'User', newMessage, otherUserId);
      setNewMessage('');
      console.log('ChatWindow: Message sent successfully');
    } catch (error) {
      console.error('ChatWindow: Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      }).format(date);
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: MarketplaceMessage[] }[] = [];
  messages.forEach((message) => {
    const dateStr = formatDate(message.timestamp);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.messages.push(message);
    } else {
      groupedMessages.push({ date: dateStr, messages: [message] });
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            height: isMinimized ? '64px' : '500px',
          }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 overflow-hidden"
        >
          {/* Header - WhatsApp Style */}
          <div className="p-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative">
                {otherUserAvatar ? (
                  <img
                    src={otherUserAvatar}
                    alt={otherUserName}
                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                    {otherUserName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{otherUserName}</h3>
                <p className="text-xs text-white/80 truncate">{chat.projectTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area - WhatsApp Style */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  background: 'linear-gradient(180deg, #e5ddd5 0%, #d5c9be 100%)',
                }}
              >
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 inline-block shadow-sm">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        👋 Say hello! Start the conversation.
                      </p>
                    </div>
                  </div>
                ) : (
                  groupedMessages.map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-2">
                      {/* Date Separator */}
                      <div className="flex justify-center my-3">
                        <span className="bg-white/90 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full shadow-sm">
                          {group.date}
                        </span>
                      </div>

                      {/* Messages for this date */}
                      {group.messages.map((message, msgIndex) => {
                        const isOwn = message.senderId === user?.id;
                        const showAvatar = msgIndex === 0 || group.messages[msgIndex - 1]?.senderId !== message.senderId;

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            {/* Avatar for received messages */}
                            {!isOwn && (
                              <div className="w-7 h-7 flex-shrink-0">
                                {showAvatar && (
                                  otherUserAvatar ? (
                                    <img
                                      src={otherUserAvatar}
                                      alt={otherUserName}
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#00ADB5' }}>
                                      {otherUserName.charAt(0).toUpperCase()}
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm relative ${
                                isOwn
                                  ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-gray-900 dark:text-white rounded-br-none'
                                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                              }`}
                            >
                              {!isOwn && showAvatar && (
                                <p className="text-xs font-semibold mb-1" style={{ color: '#00ADB5' }}>
                                  {message.senderName}
                                </p>
                              )}
                              
                              <p className="text-sm break-words whitespace-pre-wrap">{message.message}</p>
                              
                              {/* Time and read status */}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {formatTime(message.timestamp)}
                                </span>
                                {isOwn && (
                                  message.read ? (
                                    <CheckCheck className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <Check className="w-4 h-4 text-gray-400" />
                                  )
                                )}
                              </div>
                            </div>

                            {/* Avatar for sent messages */}
                            {isOwn && (
                              <div className="w-7 h-7 flex-shrink-0">
                                {showAvatar && (
                                  myAvatar ? (
                                    <img
                                      src={myAvatar}
                                      alt="You"
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#00ADB5' }}>
                                      {(userprofile?.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area - WhatsApp Style */}
              <div className="p-3 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border-0 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5] shadow-sm"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                    style={{ backgroundColor: '#00ADB5' }}
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}



import { Check, MoreVertical, Pencil, Send, Trash2, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../../service/apiConfig';
import {
    initializeSocket,
    joinProjectRoom,
    leaveProjectRoom,
    offMessageDeleted,
    offMessageEdited,
    offNewMessage,
    onMessageDeleted,
    onMessageEdited,
    onNewMessage
} from '../../../service/socketService';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string | Date;
  updatedAt?: string | Date;
}

interface ProjectMember {
  userId: string;
  name: string;
  email?: string;
  role: string;
  avatar?: string;
}

interface ProjectChatProps {
  projectId: string;
  currentUserId: string;
  currentUserName: string;
  members?: ProjectMember[];
  projectTitle?: string;
}

export function ProjectChat({
  projectId,
  currentUserId,
  currentUserName,
  members = [],
  projectTitle = 'Project Chat'
}: ProjectChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem('authToken');

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Edit message
  const handleEditMessage = async (messageId: string) => {
    if (!editText.trim()) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: editText.trim() })
      });

      if (response.ok) {
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, text: editText.trim(), updatedAt: new Date().toISOString() } : m
        ));
        setEditingMessageId(null);
        setEditText('');
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Fetch messages (isInitial = true for first load, false for polling)
  const fetchMessages = useCallback(async (isInitial = true) => {
    if (!projectId) return;

    try {
      // Only show loading spinner on initial load
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      const token = getToken();

      const response = await fetch(`${API_URL}/projects/${projectId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];

        // Only update if messages have changed (compare by length and last message id)
        setMessages(prev => {
          // Keep any optimistic messages that haven't been confirmed yet
          const optimisticMessages = prev.filter(m => m.id.startsWith('temp-'));

          // Check if we actually have new data
          const prevRealMessages = prev.filter(m => !m.id.startsWith('temp-'));
          if (prevRealMessages.length === newMessages.length &&
              prevRealMessages.length > 0 &&
              prevRealMessages[prevRealMessages.length - 1]?.id === newMessages[newMessages.length - 1]?.id) {
            // No changes, keep current state with optimistic messages
            return prev;
          }

          // Merge: new messages + optimistic ones not yet in server response
          const pendingOptimistic = optimisticMessages.filter(m => {
            // Keep optimistic if no matching message from server
            return !newMessages.some((nm: Message) => nm.text === m.text && nm.senderId === m.senderId);
          });

          return [...newMessages, ...pendingOptimistic];
        });

        if (isInitial) setError(null);
      } else if (isInitial) {
        let errorMessage = 'Failed to fetch messages';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore parse error
        }

        if (response.status === 401) {
          setError('Please log in to view messages.');
        } else if (response.status === 403) {
          setError('You do not have permission to view these messages.');
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      if (isInitial) {
        console.error('📨 Network error fetching messages:', err);
        setError('Failed to connect to server');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [projectId]);

  // Initialize socket and fetch messages
  useEffect(() => {
    if (!projectId) return;

    // Initialize socket connection
    initializeSocket();

    // Join project room for real-time updates
    joinProjectRoom(projectId);

    // Fetch initial messages
    fetchMessages(true);

    // Listen for new messages from socket
    const handleNewMessage = (data: Message) => {
      console.log('📨 Real-time message received:', data.id);
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === data.id)) {
          return prev;
        }
        // Replace optimistic message with same text from same sender
        const updated = prev.map(m => {
          if (m.id.startsWith('temp-') && m.text === data.text && m.senderId === data.senderId) {
            return data; // Replace optimistic with real
          }
          return m;
        });
        // If no optimistic was replaced, add new message
        if (!prev.some(m => m.id.startsWith('temp-') && m.text === data.text && m.senderId === data.senderId)) {
          return [...updated, data];
        }
        return updated;
      });
      setError(null);
    };

    onNewMessage(handleNewMessage);

    // Listen for message deletions
    const handleMessageDeleted = (data: { messageId: string }) => {
      console.log('🗑️ Real-time message deleted:', data.messageId);
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    };

    onMessageDeleted(handleMessageDeleted);

    // Listen for message edits
    const handleMessageEdited = (data: { id: string; text: string; updatedAt: string }) => {
      console.log('✏️ Real-time message edited:', data.id);
      setMessages(prev => prev.map(m =>
        m.id === data.id ? { ...m, text: data.text, updatedAt: data.updatedAt } : m
      ));
    };

    onMessageEdited(handleMessageEdited);

    // Polling fallback - less frequent (15 seconds) since we have sockets
    const pollInterval = setInterval(() => {
      fetchMessages(false); // false = silent polling, no loading state
    }, 15000);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      leaveProjectRoom(projectId);
      offNewMessage(handleNewMessage);
      offMessageDeleted(handleMessageDeleted);
      offMessageEdited(handleMessageEdited);
    };
  }, [projectId, fetchMessages]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const messageText = newMessage.trim();
    if (!messageText || sending) return;

    try {
      setSending(true);
      setError(null);
      const token = getToken();

      // Optimistic update - show message immediately
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        text: messageText,
        senderId: currentUserId,
        senderName: currentUserName,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      console.log('📨 Sending message:', messageText);

      const response = await fetch(`${API_URL}/projects/${projectId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: messageText })
      });

      console.log('📨 Send response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📨 Message sent successfully:', data.message?.id);
        // Replace optimistic message with real one from server
        setMessages(prev => prev.map(m =>
          m.id === optimisticMessage.id ? data.message : m
        ));
        setError(null);
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setNewMessage(messageText); // Restore the message so user can try again

        let errorMessage = 'Failed to send message';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore parse error
        }

        console.error('📨 Send error:', response.status, errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('📨 Network error sending message:', err);
      setError('Failed to send message. Check your connection.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
           ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get member avatar color
  const getMemberColor = (senderId: string) => {
    const colors = ['bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-green-500'];
    const index = senderId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Get member by ID
  const getMember = (senderId: string) => {
    return members.find(m => m.userId === senderId || String(m.userId) === String(senderId));
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg h-[calc(100vh-180px)] min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg h-[calc(100vh-180px)] min-h-[500px] flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{projectTitle}</h3>
            <p className="text-sm text-gray-500">{members.length} members • {messages.length} messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-2 rounded-lg transition-colors ${
              showMembers
                ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
            }`}
            title="Show members"
          >
            <Users className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {error && !loading && (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm text-center">
                {error}
                <button onClick={() => { setError(null); fetchMessages(); }} className="ml-2 underline">Retry</button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    No messages yet
                  </h3>
                  <p className="text-gray-500">
                    Be the first to send a message to your team!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwn = message.senderId === currentUserId || String(message.senderId) === String(currentUserId);
                const member = getMember(message.senderId);
                const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                const isEditing = editingMessageId === message.id;

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} group`}
                  >
                    {!isOwn && showAvatar && (
                      <div className={`w-8 h-8 rounded-full ${getMemberColor(message.senderId)} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
                        {member?.avatar ? (
                          <img src={member.avatar} alt="" className="w-full h-full rounded-full" />
                        ) : (
                          message.senderName?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                    )}
                    {!isOwn && !showAvatar && <div className="w-8" />}

                    <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''} relative`}>
                      {!isOwn && showAvatar && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>
                      )}

                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditMessage(message.id);
                              if (e.key === 'Escape') { setEditingMessageId(null); setEditText(''); }
                            }}
                          />
                          <button onClick={() => handleEditMessage(message.id)} className="p-1.5 bg-teal-500 text-white rounded-full hover:bg-teal-600">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingMessageId(null); setEditText(''); }} className="p-1.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? 'bg-teal-500 text-white rounded-br-md'
                                : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                            {message.updatedAt && (
                              <p className={`text-[10px] mt-1 ${isOwn ? 'text-teal-100' : 'text-gray-400'}`}>(edited)</p>
                            )}
                          </div>

                          {/* Edit/Delete menu for own messages */}
                          {isOwn && !message.id.startsWith('temp-') && (
                            <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={() => { setEditingMessageId(message.id); setEditText(message.text); }}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className={`p-3 rounded-full transition-colors ${
                  newMessage.trim() && !sending
                    ? 'bg-teal-500 text-white hover:bg-teal-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Team Members</h4>
              <div className="space-y-2">
                {members.map((member, idx) => (
                  <div key={member.userId || idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className={`w-8 h-8 rounded-full ${getMemberColor(member.userId)} flex items-center justify-center text-white text-sm font-medium`}>
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        member.name?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.name}
                        {member.userId === currentUserId && (
                          <span className="text-xs text-teal-500 ml-1">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectChat;

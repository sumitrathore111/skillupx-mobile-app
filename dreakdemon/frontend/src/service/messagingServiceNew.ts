import { apiRequest } from "./api";

// Send message
export const sendMessage = async (messageData: {
  senderName: string;
  senderAvatar?: string;
  receiverId?: string;
  groupId?: string;
  content: string;
  type?: 'text' | 'image' | 'file';
}): Promise<any> => {
  try {
    const response = await apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    return response.message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get conversation with a user
export const getConversation = async (userId: string): Promise<any[]> => {
  try {
    const response = await apiRequest(`/messages/conversation/${userId}`);
    return response.messages;
  } catch (error) {
    console.error('Error getting conversation:', error);
    return [];
  }
};

// Get group messages
export const getGroupMessages = async (groupId: string): Promise<any[]> => {
  try {
    const response = await apiRequest(`/messages/group/${groupId}`);
    return response.messages;
  } catch (error) {
    console.error('Error getting group messages:', error);
    return [];
  }
};

// Get user's conversations list
export const getConversationsList = async (): Promise<any[]> => {
  try {
    const response = await apiRequest('/messages/conversations');
    return response.conversations;
  } catch (error) {
    console.error('Error getting conversations list:', error);
    return [];
  }
};

// Create or get developer chat
export const createOrGetDeveloperChat = async (user1Id: string, user2Id: string): Promise<string> => {
  try {
    const response = await apiRequest('/messages/developer-chat', {
      method: 'POST',
      body: JSON.stringify({ user1Id, user2Id })
    });
    return response.chatId;
  } catch (error) {
    console.error('Error creating developer chat:', error);
    throw error;
  }
};

// Get conversations with messages
export const getConversationsWithMessages = async (userId: string): Promise<any[]> => {
  try {
    const response = await apiRequest(`/messages/conversations-with-messages?userId=${userId}`);
    return response.conversations || [];
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
};

// Subscribe to messages (polling)
export const subscribeToMessages = (chatId: string, callback: (messages: any[]) => void) => {
  const fetchMessages = async () => {
    try {
      const response = await apiRequest(`/messages/chat/${chatId}`);
      callback(response.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  fetchMessages();
  const interval = setInterval(fetchMessages, 10000);

  return () => clearInterval(interval);
};

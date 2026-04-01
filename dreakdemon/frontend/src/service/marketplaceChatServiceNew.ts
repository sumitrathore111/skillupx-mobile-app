// Marketplace chat service using custom backend API
import { apiRequest } from './api';

export interface MarketplaceChat {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantAvatars: { [userId: string]: string };
  projectId: string;
  projectTitle: string;
  sellerId: string;
  sellerName: string;
  requesterId: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: { [userId: string]: number };
  status: 'pending' | 'accepted' | 'rejected';
}

export interface MarketplaceMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type?: 'text' | 'image' | 'file';
}

export interface CreateOrGetChatResult {
  chatId: string;
  status: 'pending' | 'accepted' | 'rejected';
  isNew: boolean;
}

// Get all chats for a user
export const getUserChats = async (userId: string): Promise<MarketplaceChat[]> => {
  try {
    const response = await apiRequest(`/marketplace/chats?userId=${userId}`);
    return response.chats || [];
  } catch (error) {
    console.error('Error fetching user chats:', error);
    return [];
  }
};

// Create or get chat between buyer and seller
// MATCHES COMPONENT CALL: createOrGetChat(userId, userName, userAvatar, sellerId, sellerName, sellerAvatar, projectId, projectTitle)
export const createOrGetChat = async (
  requesterId: string,
  requesterName: string,
  requesterAvatar: string,
  sellerId: string,
  sellerName: string,
  sellerAvatar: string,
  projectId: string,
  projectTitle: string
): Promise<CreateOrGetChatResult> => {
  try {
    const response = await apiRequest('/marketplace/chats', {
      method: 'POST',
      body: JSON.stringify({
        requesterId,
        requesterName,
        requesterAvatar,
        sellerId,
        sellerName,
        sellerAvatar,
        projectId,
        projectTitle
      })
    });
    return {
      chatId: response.chatId,
      status: response.status,
      isNew: response.isNew || false
    };
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  content: string,
  recipientId: string
): Promise<void> => {
  try {
    await apiRequest(`/marketplace/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        senderId,
        senderName,
        content,
        recipientId
      })
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get messages for a chat
export const getChatMessages = async (chatId: string): Promise<MarketplaceMessage[]> => {
  try {
    const response = await apiRequest(`/marketplace/chats/${chatId}/messages`);
    const messages = response.messages || [];
    
    return messages.map((msg: any) => ({
      ...msg,
      id: msg.id || msg._id,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

// Mark messages as read
export const markMessagesAsRead = async (chatId: string, userId: string): Promise<void> => {
  try {
    await apiRequest(`/marketplace/chats/${chatId}/read`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Get chat by ID
export const getChatById = async (chatId: string): Promise<MarketplaceChat | null> => {
  try {
    const response = await apiRequest(`/marketplace/chats/${chatId}`);
    return response.chat || null;
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
};

// Archive/delete chat
export const archiveChat = async (chatId: string): Promise<void> => {
  try {
    await apiRequest(`/marketplace/chats/${chatId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error archiving chat:', error);
    throw error;
  }
};

// Get seller chats
export const getSellerChats = async (sellerId: string): Promise<MarketplaceChat[]> => {
  try {
    const response = await apiRequest(`/marketplace/chats/seller/${sellerId}`);
    return response.chats || [];
  } catch (error) {
    console.error('Error fetching seller chats:', error);
    return [];
  }
};

// Subscribe to chat updates (polling-based for now, can be upgraded to WebSocket)
export const subscribeToUserChats = (userId: string, callback: (chats: MarketplaceChat[]) => void) => {
  const fetchChats = async () => {
    const chats = await getUserChats(userId);
    callback(chats);
  };

  fetchChats();
  const interval = setInterval(fetchChats, 15000); // Poll every 15 seconds

  return () => clearInterval(interval);
};

// Subscribe to messages (polling-based)
export const subscribeToMessages = (chatId: string, callback: (messages: MarketplaceMessage[]) => void) => {
  const fetchMessages = async () => {
    const messages = await getChatMessages(chatId);
    callback(messages);
  };

  fetchMessages();
  const interval = setInterval(fetchMessages, 10000); // Poll every 10 seconds

  return () => clearInterval(interval);
};

// Chat request functions - MATCHES COMPONENT CALL: acceptChatRequest(chatId)
export const acceptChatRequest = async (chatId: string): Promise<void> => {
  try {
    await apiRequest(`/marketplace/chats/${chatId}/accept`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error accepting chat request:', error);
    throw error;
  }
};

// MATCHES COMPONENT CALL: rejectChatRequest(chatId)
export const rejectChatRequest = async (chatId: string): Promise<void> => {
  try {
    await apiRequest(`/marketplace/chats/${chatId}/reject`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error rejecting chat request:', error);
    throw error;
  }
};

export const subscribeToPendingRequests = (userId: string, callback: (requests: any[]) => void) => {
  const fetchRequests = async () => {
    try {
      const response = await apiRequest(`/marketplace/chats/pending?userId=${userId}`);
      const requests = response.requests || [];
      
      // Transform dates
      const transformedRequests = requests.map((req: any) => ({
        ...req,
        id: req.id || req._id,
        lastMessageTime: new Date(req.lastMessageTime),
      }));
      
      callback(transformedRequests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      callback([]);
    }
  };

  fetchRequests();
  const interval = setInterval(fetchRequests, 10000);

  return () => clearInterval(interval);
};

export const subscribeToAcceptedChats = (userId: string, callback: (chats: MarketplaceChat[]) => void) => {
  return subscribeToUserChats(userId, callback);
};

// Debug function - MATCHES COMPONENT CALL: debugChatSystem(userId)
export const debugChatSystem = async (userId?: string): Promise<any> => {
  try {
    const url = userId ? `/marketplace/chats/debug?userId=${userId}` : '/marketplace/chats/debug';
    const response = await apiRequest(url);
    return response;
  } catch (error) {
    console.error('Error debugging chat system:', error);
    return { error: 'Debug failed' };
  }
};

import type {
    Conversation,
    DeveloperProfile,
    HelpRequest,
    Message,
    StudyGroup,
    TechReview,
} from '@apptypes/index';
import { apiRequest } from './api';

// ============ DEVELOPERS DIRECTORY ============
export async function fetchDevelopers(params?: {
  search?: string;
  skills?: string[];
  lookingFor?: string;
  sortBy?: string;
  page?: number;
}): Promise<DeveloperProfile[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.lookingFor) query.set('lookingFor', params.lookingFor);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.page) query.set('page', String(params.page));
  if (params?.skills?.length) query.set('skills', params.skills.join(','));

  return apiRequest<DeveloperProfile[]>('GET', `/developers?${query.toString()}`);
}

export async function fetchDeveloperById(id: string): Promise<DeveloperProfile> {
  return apiRequest<DeveloperProfile>('GET', `/developers/${id}`);
}

// ============ 1:1 MESSAGES ============
export async function fetchConversations(): Promise<Conversation[]> {
  return apiRequest<Conversation[]>('GET', '/chats');
}

export async function fetchOrCreateChat(participantId: string): Promise<{ chatId: string; messages: Message[] }> {
  return apiRequest<{ chatId: string; messages: Message[] }>('POST', '/chats/open', { participantId });
}

export async function sendMessage(chatId: string, content: string): Promise<Message> {
  return apiRequest<Message>('POST', `/chats/${chatId}/messages`, { content });
}

export async function editMessage(chatId: string, messageId: string, content: string): Promise<Message> {
  return apiRequest<Message>('PUT', `/chats/${chatId}/messages/${messageId}`, { content });
}

export async function deleteMessage(chatId: string, messageId: string): Promise<void> {
  return apiRequest<void>('DELETE', `/chats/${chatId}/messages/${messageId}`);
}

export async function markChatRead(chatId: string): Promise<void> {
  return apiRequest<void>('PATCH', `/chats/${chatId}/read`, {});
}

// ============ STUDY GROUPS ============
export async function fetchStudyGroups(search?: string): Promise<StudyGroup[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<StudyGroup[]>('GET', `/study-groups${query}`);
}

export async function createStudyGroup(data: {
  name: string;
  description: string;
  topic: string;
  level: string;
  maxMembers: number;
}): Promise<StudyGroup> {
  return apiRequest<StudyGroup>('POST', '/study-groups', data);
}

export async function requestJoinGroup(groupId: string): Promise<void> {
  return apiRequest<void>('POST', `/study-groups/${groupId}/request`, {});
}

export async function fetchGroupMessages(groupId: string): Promise<any[]> {
  return apiRequest<any[]>('GET', `/study-groups/${groupId}/messages`);
}

export async function sendGroupMessage(groupId: string, content: string): Promise<any> {
  return apiRequest<any>('POST', `/study-groups/${groupId}/messages`, { content });
}

export async function deleteStudyGroup(groupId: string): Promise<void> {
  return apiRequest<void>('DELETE', `/study-groups/${groupId}`);
}

export async function approveJoinRequest(groupId: string, requestId: string): Promise<void> {
  return apiRequest<void>('POST', `/study-groups/${groupId}/approve/${requestId}`, {});
}

export async function rejectJoinRequest(groupId: string, requestId: string): Promise<void> {
  return apiRequest<void>('POST', `/study-groups/${groupId}/reject/${requestId}`, {});
}

// ============ TECH REVIEWS ============
export async function fetchTechReviews(search?: string): Promise<TechReview[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<TechReview[]>('GET', `/discussions${query}`);
}

export async function createTechReview(data: Partial<TechReview>): Promise<TechReview> {
  return apiRequest<TechReview>('POST', '/discussions', data);
}

// ============ HELP REQUESTS ============
export async function fetchHelpRequests(): Promise<HelpRequest[]> {
  return apiRequest<HelpRequest[]>('GET', '/discussions/help');
}

export async function createHelpRequest(data: {
  title: string;
  description: string;
  tags: string;
}): Promise<HelpRequest> {
  return apiRequest<HelpRequest>('POST', '/discussions/help', data);
}

export async function replyToHelpRequest(requestId: string, content: string): Promise<void> {
  return apiRequest<void>('POST', `/discussions/help/${requestId}/reply`, { content });
}

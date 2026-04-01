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

export async function fetchOrCreateChat(
  currentUserId: string,
  currentUserName: string,
  currentUserAvatar: string,
  participantId: string,
  participantName: string,
  participantAvatar: string
): Promise<any> {
  return apiRequest<any>('POST', '/chats', {
    participantIds: [currentUserId, participantId],
    participantNames: [currentUserName, participantName],
    participantAvatars: [currentUserAvatar, participantAvatar],
  });
}

export async function sendMessage(chatId: string, content: string): Promise<Message> {
  return apiRequest<Message>('POST', `/chats/${chatId}/messages`, { message: content });
}

export async function editMessage(chatId: string, messageId: string, content: string): Promise<Message> {
  return apiRequest<Message>('PATCH', `/chats/${chatId}/messages/${messageId}`, { message: content });
}

export async function deleteMessage(chatId: string, messageId: string): Promise<void> {
  return apiRequest<void>('DELETE', `/chats/${chatId}/messages/${messageId}`);
}

export async function fetchMessages(chatId: string): Promise<Message[]> {
  return apiRequest<Message[]>('GET', `/chats/${chatId}/messages`);
}

export async function markChatRead(chatId: string): Promise<void> {
  return apiRequest<void>('PATCH', `/chats/${chatId}/read`, {});
}

// ============ STUDY GROUPS ============
export async function fetchStudyGroups(search?: string): Promise<StudyGroup[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await apiRequest<{ groups: StudyGroup[] } | StudyGroup[]>('GET', `/study-groups${query}`);
  return (data as any).groups ?? (data as StudyGroup[]) ?? [];
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
  return apiRequest<void>('POST', `/study-groups/${groupId}/join`, {});
}

export async function fetchGroupMessages(groupId: string): Promise<any[]> {
  return apiRequest<any[]>('GET', `/study-groups/${groupId}/messages`);
}

export async function sendGroupMessage(groupId: string, content: string): Promise<any> {
  return apiRequest<any>('POST', `/study-groups/${groupId}/messages`, { content });
}

export async function fetchGroupDetail(groupId: string): Promise<any> {
  const data = await apiRequest<any>('GET', `/study-groups/${groupId}`);
  return data.group ?? data;
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
  const data = await apiRequest<{ reviews: TechReview[] } | TechReview[]>('GET', `/developers/tech-reviews${query}`);
  return (data as any).reviews ?? (data as TechReview[]) ?? [];
}

export async function createTechReview(data: Partial<TechReview>): Promise<TechReview> {
  const res = await apiRequest<{ review: TechReview } | TechReview>('POST', '/developers/tech-reviews', data);
  return (res as any).review ?? (res as TechReview);
}

// ============ HELP REQUESTS ============
export async function fetchHelpRequests(): Promise<HelpRequest[]> {
  const data = await apiRequest<{ requests: HelpRequest[] } | HelpRequest[]>('GET', '/developers/help-requests');
  return (data as any).requests ?? (data as HelpRequest[]) ?? [];
}

export async function createHelpRequest(data: {
  title: string;
  description: string;
  tags: string | string[];
}): Promise<HelpRequest> {
  const tags = Array.isArray(data.tags)
    ? data.tags
    : data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [];
  const res = await apiRequest<{ request: HelpRequest } | HelpRequest>('POST', '/developers/help-requests', { ...data, tags });
  return (res as any).request ?? (res as HelpRequest);
}

export async function replyToHelpRequest(requestId: string, content: string): Promise<void> {
  return apiRequest<void>('POST', `/developers/help-requests/${requestId}/respond`, { content });
}

export async function likeReview(reviewId: string): Promise<void> {
  return apiRequest<void>('POST', `/developers/tech-reviews/${reviewId}/like`, {});
}

export async function markHelpful(reviewId: string): Promise<void> {
  return apiRequest<void>('POST', `/developers/tech-reviews/${reviewId}/helpful`, {});
}

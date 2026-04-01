import api from './api';

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string;
  username?: string;
  phone: string;
  location: string;
  institute: string;
  bio: string;
  skills: string[];
  education: { degree: string; school: string; year: string }[];
  experience: { title: string; company: string; year: string; desc: string }[];
  achievements: string[];
  links: { platform: string; url: string }[];
  profileCompletion: number;
  languages: string[];
  yearOfStudy: number;
  portfolio: string;
  resume_objective: string;
  streakCount: number;
  role: 'student' | 'admin';
  isprofileComplete: boolean;
}

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const { data } = await api.get(`/users/${userId}`);
  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
  const { data } = await api.put(`/users/${userId}`, updates);
  return data;
};

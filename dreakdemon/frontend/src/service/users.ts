import { apiRequest } from "./api";

interface Education {
  degree: string;
  school: string;
  year: string;
}

interface Experience {
  title: string;
  company: string;
  year: string;
  desc: string;
}

interface Link {
  platform: string;
  url: string;
}

interface Project {
  project_id: string;
  role: string;
  project_status: "Complete" | "Running" | "Not Started";
}

interface Target {
  Compnay_id: string;
}

export type UserProfile = {
  uid: string;
  email: string | null;
  createdAt: any;
  role: "student" | "admin";
  isprofileComplete: boolean;
  name: string;
  username?: string;
  phone: string;
  location: string;
  institute: string;
  bio: string;
  skills: string[];
  education: Education[];
  experience: Experience[];
  achievements: string[];
  links: Link[];
  profileCompletion: number;
  languages: Array<String>;
  yearOfStudy: number;
  projects: Project[];
  portfolio: string;
  resume_objective: string;
  target_compnay: Target[];
  marathon_rank: Number;
  last_active_date: string;
  streakCount: number;
};

export async function createUserProfileIfNeeded(_user: any, _name: string): Promise<void> {
  // Profile is automatically created during signup
  // This function is kept for compatibility
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const response = await apiRequest(`/users/${userId}`);
  return response.user;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const response = await apiRequest(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return response.user;
}

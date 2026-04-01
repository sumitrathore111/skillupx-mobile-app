import crypto from 'crypto';
import GitHubIntegration, { ProjectGitHubConnection } from '../models/GitHubIntegration';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23liUCOv2SlyGPyI1s';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '619c17b059ac1b9d43703d8f0fd50b0d0f4ba834';
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'https://nextstepbackend-qhxw.onrender.com/api/github/callback';
// Use a stable fallback key for development - in production, set ENCRYPTION_KEY env var
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

// Encryption utilities for storing tokens securely
export const encryptToken = (token: string): string => {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

export const decryptToken = (encryptedToken: string): string => {
  try {
    const parts = encryptedToken.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid token format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Token decryption failed - user may need to reconnect GitHub');
    throw new Error('Token decryption failed. Please reconnect your GitHub account.');
  }
};

// GitHub OAuth URLs
export const getGitHubAuthUrl = (state: string): string => {
  const scopes = ['repo', 'read:user', 'user:email', 'admin:repo_hook'];
  return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=${scopes.join(' ')}&state=${state}`;
};

// Exchange code for access token
export const exchangeCodeForToken = async (code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
}> => {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return response.json() as Promise<{ access_token: string; token_type: string; scope: string }>;
};

// Get GitHub user info
export const getGitHubUser = async (accessToken: string): Promise<{
  id: number;
  login: string;
  avatar_url: string;
  email: string;
  name: string;
}> => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get GitHub user');
  }

  return response.json() as Promise<{ id: number; login: string; avatar_url: string; email: string; name: string }>;
};

// Get user's repositories
export const getUserRepositories = async (accessToken: string, page = 1, perPage = 30): Promise<any[]> => {
  const response = await fetch(
    `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get repositories');
  }

  return response.json() as Promise<any[]>;
};

// Get repository details
export const getRepository = async (accessToken: string, owner: string, repo: string): Promise<any> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get repository');
  }

  return response.json();
};

// Get repository commits
export const getRepositoryCommits = async (
  accessToken: string,
  owner: string,
  repo: string,
  options: { sha?: string; since?: string; until?: string; perPage?: number; page?: number } = {}
): Promise<any[]> => {
  const params = new URLSearchParams();
  if (options.sha) params.append('sha', options.sha);
  if (options.since) params.append('since', options.since);
  if (options.until) params.append('until', options.until);
  params.append('per_page', String(options.perPage || 30));
  params.append('page', String(options.page || 1));

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get commits');
  }

  return response.json() as Promise<any[]>;
};

// Get repository pull requests
export const getRepositoryPullRequests = async (
  accessToken: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'all'
): Promise<any[]> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=50`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get pull requests');
  }

  return response.json() as Promise<any[]>;
};

// Get repository issues
export const getRepositoryIssues = async (
  accessToken: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'all'
): Promise<any[]> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=50`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get issues');
  }

  return response.json() as Promise<any[]>;
};

// Get repository branches
export const getRepositoryBranches = async (
  accessToken: string,
  owner: string,
  repo: string
): Promise<any[]> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get branches');
  }

  return response.json() as Promise<any[]>;
};

// Create webhook for repository
export const createWebhook = async (
  accessToken: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  secret: string
): Promise<{ id: number; url: string }> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/hooks`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'issues', 'issue_comment', 'create', 'delete', 'pull_request_review'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0'
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to create webhook');
  }

  return response.json() as Promise<{ id: number; url: string }>;
};

// Delete webhook
export const deleteWebhook = async (
  accessToken: string,
  owner: string,
  repo: string,
  hookId: number
): Promise<void> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/hooks/${hookId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete webhook');
  }
};

// Verify webhook signature
export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

// Create GitHub issue from task
export const createGitHubIssue = async (
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels?: string[]
): Promise<any> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        labels: labels || []
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create issue');
  }

  return response.json();
};

// Close GitHub issue
export const closeGitHubIssue = async (
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<any> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state: 'closed'
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to close issue');
  }

  return response.json();
};

// Get user's GitHub integration
export const getUserGitHubIntegration = async (userId: string) => {
  return GitHubIntegration.findOne({ userId });
};

// Get project's GitHub connection
export const getProjectGitHubConnection = async (projectId: string) => {
  return ProjectGitHubConnection.findOne({ projectId });
};

// Generate webhook secret
export const generateWebhookSecret = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// ==========================================
// COLLABORATOR MANAGEMENT
// ==========================================

// Invite a collaborator to a repository
export const inviteCollaborator = async (
  accessToken: string,
  owner: string,
  repo: string,
  username: string,
  permission: 'pull' | 'push' | 'admin' | 'maintain' | 'triage' = 'push'
): Promise<{ id: number; invitee: { login: string; avatar_url: string }; permissions: string; html_url: string }> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        permission
      })
    }
  );

  // 201 = invitation sent, 204 = user already has access
  if (response.status === 204) {
    return {
      id: 0,
      invitee: { login: username, avatar_url: '' },
      permissions: permission,
      html_url: `https://github.com/${owner}/${repo}`
    };
  }

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to invite collaborator');
  }

  return response.json() as Promise<{ id: number; invitee: { login: string; avatar_url: string }; permissions: string; html_url: string }>;
};

// Remove a collaborator from a repository
export const removeCollaborator = async (
  accessToken: string,
  owner: string,
  repo: string,
  username: string
): Promise<void> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to remove collaborator');
  }
};

// Get repository collaborators
export const getRepositoryCollaborators = async (
  accessToken: string,
  owner: string,
  repo: string
): Promise<Array<{
  id: number;
  login: string;
  avatar_url: string;
  permissions: { admin: boolean; maintain: boolean; push: boolean; triage: boolean; pull: boolean };
  role_name: string;
}>> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/collaborators?per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to get collaborators');
  }

  return response.json() as Promise<Array<{
    id: number;
    login: string;
    avatar_url: string;
    permissions: { admin: boolean; maintain: boolean; push: boolean; triage: boolean; pull: boolean };
    role_name: string;
  }>>;
};

// Get pending invitations for a repository
export const getRepositoryInvitations = async (
  accessToken: string,
  owner: string,
  repo: string
): Promise<Array<{
  id: number;
  invitee: { login: string; avatar_url: string };
  inviter: { login: string; avatar_url: string };
  permissions: string;
  created_at: string;
  html_url: string;
}>> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/invitations?per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to get invitations');
  }

  return response.json() as Promise<Array<{
    id: number;
    invitee: { login: string; avatar_url: string };
    inviter: { login: string; avatar_url: string };
    permissions: string;
    created_at: string;
    html_url: string;
  }>>;
};

// Cancel a pending invitation
export const cancelRepositoryInvitation = async (
  accessToken: string,
  owner: string,
  repo: string,
  invitationId: number
): Promise<void> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/invitations/${invitationId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to cancel invitation');
  }
};

// Search GitHub users by username
export const searchGitHubUsers = async (
  accessToken: string,
  query: string
): Promise<Array<{ id: number; login: string; avatar_url: string; html_url: string }>> => {
  const response = await fetch(
    `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=10`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to search users');
  }

  const data = await response.json() as { items: Array<{ id: number; login: string; avatar_url: string; html_url: string }> };
  return data.items;
};

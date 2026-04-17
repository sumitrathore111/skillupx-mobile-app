import {
    AlertCircle,
    Check,
    Clock,
    Loader2,
    Mail,
    RefreshCw,
    Search,
    Shield,
    UserMinus,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
    cancelInvitation,
    getProjectCollaborators,
    getProjectInvitations,
    inviteCollaborator,
    removeCollaborator,
    searchGitHubUsers
} from '../../../service/githubService';

interface Collaborator {
  id: number;
  login: string;
  avatarUrl: string;
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  roleName: string;
}

interface Invitation {
  id: number;
  invitee: { login: string; avatarUrl: string };
  inviter: { login: string; avatarUrl: string };
  permissions: string;
  createdAt: string;
  url: string;
}

interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
  profileUrl: string;
}

interface GitHubCollaboratorsProps {
  projectId: string;
  isOwner: boolean;
  repoFullName?: string;
}

export default function GitHubCollaborators({ projectId, isOwner }: GitHubCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GitHubUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<'pull' | 'push' | 'maintain' | 'admin'>('push');
  const [inviting, setInviting] = useState(false);

  // Action states
  const [removingUser, setRemovingUser] = useState<string | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<number | null>(null);

  const loadCollaborators = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [collabData, inviteData] = await Promise.all([
        getProjectCollaborators(projectId),
        isOwner ? getProjectInvitations(projectId) : Promise.resolve({ invitations: [] })
      ]);
      setCollaborators(collabData.collaborators || []);
      setInvitations(inviteData.invitations || []);
    } catch (err) {
      console.error('Error loading collaborators:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  }, [projectId, isOwner]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  // Search for GitHub users
  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await searchGitHubUsers(query.trim());
      // Filter out users who are already collaborators
      const existingLogins = new Set(collaborators.map(c => c.login.toLowerCase()));
      const pendingLogins = new Set(invitations.map(i => i.invitee.login.toLowerCase()));

      const filteredResults = data.users.filter(
        u => !existingLogins.has(u.login.toLowerCase()) && !pendingLogins.has(u.login.toLowerCase())
      );
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  }, [collaborators, invitations]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Invite a collaborator
  const handleInvite = async (username: string) => {
    setInviting(true);
    setError(null);
    try {
      const result = await inviteCollaborator(projectId, username, selectedPermission);
      setSuccess(result.message);
      setShowInviteModal(false);
      setSearchQuery('');
      setSearchResults([]);
      loadCollaborators();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite collaborator');
    } finally {
      setInviting(false);
    }
  };

  // Remove a collaborator
  const handleRemove = async (username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from the repository?`)) {
      return;
    }

    setRemovingUser(username);
    setError(null);
    try {
      await removeCollaborator(projectId, username);
      setSuccess(`${username} has been removed from the repository`);
      setCollaborators(prev => prev.filter(c => c.login !== username));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove collaborator');
    } finally {
      setRemovingUser(null);
    }
  };

  // Cancel an invitation
  const handleCancelInvitation = async (invitationId: number) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    setCancellingInvitation(invitationId);
    setError(null);
    try {
      await cancelInvitation(projectId, invitationId);
      setSuccess('Invitation cancelled');
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    } finally {
      setCancellingInvitation(null);
    }
  };

  // Get permission badge color
  const getPermissionBadge = (permissions: Collaborator['permissions'] | string) => {
    if (typeof permissions === 'string') {
      switch (permissions) {
        case 'admin':
          return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Admin' };
        case 'maintain':
          return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Maintain' };
        case 'push':
        case 'write':
          return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Write' };
        case 'triage':
          return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Triage' };
        default:
          return { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'Read' };
      }
    }

    if (permissions.admin) {
      return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Admin' };
    }
    if (permissions.maintain) {
      return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Maintain' };
    }
    if (permissions.push) {
      return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Write' };
    }
    if (permissions.triage) {
      return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Triage' };
    }
    return { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'Read' };
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Clear messages after timeout
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading collaborators...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Repository Collaborators</h3>
          <span className="text-sm text-gray-500">({collaborators.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCollaborators}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Invite Collaborator
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700 dark:text-green-400">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="w-4 h-4 text-green-500" />
          </button>
        </div>
      )}

      {/* Pending Invitations */}
      {isOwner && invitations.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg overflow-hidden">
          <div className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium text-yellow-800 dark:text-yellow-300 text-sm">
                Pending Invitations ({invitations.length})
              </span>
            </div>
          </div>
          <div className="divide-y divide-yellow-200 dark:divide-yellow-800">
            {invitations.map((invitation) => {
              const badge = getPermissionBadge(invitation.permissions);
              return (
                <div
                  key={invitation.id}
                  className="p-3 flex items-center gap-3 hover:bg-yellow-100/30 dark:hover:bg-yellow-900/10"
                >
                  <img
                    src={invitation.invitee.avatarUrl || `https://github.com/${invitation.invitee.login}.png`}
                    alt={invitation.invitee.login}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        @{invitation.invitee.login}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Invited {formatRelativeTime(invitation.createdAt)} by @{invitation.inviter.login}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    disabled={cancellingInvitation === invitation.id}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                    title="Cancel invitation"
                  >
                    {cancellingInvitation === invitation.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collaborators List */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        {collaborators.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No collaborators yet</p>
            {isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-3 text-teal-600 hover:underline text-sm"
              >
                Invite your first collaborator
              </button>
            )}
          </div>
        ) : (
          collaborators.map((collaborator) => {
            const badge = getPermissionBadge(collaborator.permissions);
            return (
              <div
                key={collaborator.id}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <img
                  src={collaborator.avatarUrl || `https://github.com/${collaborator.login}.png`}
                  alt={collaborator.login}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://github.com/${collaborator.login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400"
                    >
                      @{collaborator.login}
                    </a>
                    <span className={`px-2 py-0.5 rounded text-xs ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {collaborator.roleName || 'Collaborator'}
                  </p>
                </div>
                {isOwner && !collaborator.permissions.admin && (
                  <button
                    onClick={() => handleRemove(collaborator.login)}
                    disabled={removingUser === collaborator.login}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove collaborator"
                  >
                    {removingUser === collaborator.login ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Invite Collaborator</h3>
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by GitHub username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Permission Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Permission Level
                </label>
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value as 'pull' | 'push' | 'maintain' | 'admin')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="pull">Read - Can view and clone the repository</option>
                  <option value="triage">Triage - Can manage issues and PRs</option>
                  <option value="push">Write - Can push to the repository</option>
                  <option value="maintain">Maintain - Can manage without admin access</option>
                  <option value="admin">Admin - Full access to the repository</option>
                </select>
              </div>

              {/* Search Results */}
              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {searching ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 text-teal-500 animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">Searching...</p>
                  </div>
                ) : searchQuery.length < 2 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Type at least 2 characters to search
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No users found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleInvite(user.login)}
                        disabled={inviting}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                      >
                        <img
                          src={user.avatarUrl}
                          alt={user.login}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            @{user.login}
                          </p>
                        </div>
                        {inviting ? (
                          <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Text */}
              <p className="text-xs text-gray-500 text-center">
                The user will receive an email invitation to collaborate on the repository.
                They must accept the invitation to gain access.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

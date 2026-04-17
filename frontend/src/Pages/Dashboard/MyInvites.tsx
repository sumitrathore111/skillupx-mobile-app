import { Check, Clock, Mail, User, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { API_URL } from '../../service/apiConfig';

interface ProjectInvite {
  id: string;
  _id?: string;
  projectId: {
    _id: string;
    title: string;
    description?: string;
    status?: string;
    category?: string;
  };
  projectTitle: string;
  invitedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  invitedByName: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export default function MyInvites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('authToken');

  const fetchInvites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/project-invites/my-invites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch invites');

      const data = await response.json();
      setInvites(data.invites || []);
    } catch (err) {
      console.error('Error fetching invites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchInvites();
  }, [user, fetchInvites, navigate]);

  const handleRespond = async (inviteId: string, response: 'accepted' | 'declined') => {
    try {
      setRespondingTo(inviteId);
      const token = getToken();

      const res = await fetch(`${API_URL}/project-invites/${inviteId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to respond');

      if (response === 'accepted' && data.invite?.projectId) {
        const projectId = typeof data.invite.projectId === 'object'
          ? data.invite.projectId._id
          : data.invite.projectId;
        navigate(`/dashboard/projects/workspace/${projectId}`);
      } else {
        setInvites(prev => prev.filter(inv =>
          inv.id !== inviteId && inv._id !== inviteId
        ));
      }
    } catch (err) {
      console.error('Error responding:', err);
      alert(err instanceof Error ? err.message : 'Failed to respond');
    } finally {
      setRespondingTo(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d remaining`;
    return `${hours}h remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-8 h-8 text-teal-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Invites
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {invites.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No pending invites
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              When someone invites you to a project, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.id || invite._id}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {invite.invitedBy?.avatar ? (
                      <img src={invite.invitedBy.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      invite.invitedBy?.name?.charAt(0).toUpperCase() || <User className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {invite.projectTitle || invite.projectId?.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Invited by <span className="font-medium">{invite.invitedBy?.name || invite.invitedByName}</span>
                    </p>
                    {invite.message && (
                      <p className="mt-2 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg italic">
                        "{invite.message}"
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {getTimeRemaining(invite.expiresAt)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleRespond(invite.id || invite._id!, 'accepted')}
                    disabled={respondingTo === (invite.id || invite._id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-lg font-medium"
                  >
                    {respondingTo === (invite.id || invite._id) ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Accept & Join
                  </button>
                  <button
                    onClick={() => handleRespond(invite.id || invite._id!, 'declined')}
                    disabled={respondingTo === (invite.id || invite._id)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

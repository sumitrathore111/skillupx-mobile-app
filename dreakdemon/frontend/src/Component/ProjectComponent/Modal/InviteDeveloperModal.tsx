import { ChevronLeft, ChevronRight, Link2, Mail, Search, Send, User, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../../service/apiConfig';

interface Developer {
  _id: string;
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  skills?: string[];
  bio?: string;
  institute?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface Props {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
  onInviteSent?: () => void;
}

export default function InviteDeveloperModal({ projectId, projectTitle, onClose, onInviteSent }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeveloper, setSelectedDeveloper] = useState<Developer | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const getToken = () => localStorage.getItem('authToken');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch all developers (paginated)
  const fetchDevelopers = useCallback(async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();

      console.log('Fetching developers for projectId:', projectId);

      let url = `${API_URL}/project-invites/developers/${projectId}?page=${page}&limit=10`;
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      console.log('Full URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Fetch developers response:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Fetch developers error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch developers');
      }

      const data = await response.json();
      setDevelopers(data.developers || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error('Error fetching developers:', err);
      setError('Failed to load developers');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial load
  useEffect(() => {
    fetchDevelopers(1, '');
  }, [fetchDevelopers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDevelopers(1, searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchDevelopers]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchDevelopers(newPage, searchQuery);
  };

  // Send invite
  const handleSendInvite = async () => {
    if (!selectedDeveloper) return;

    try {
      setSending(true);
      setError(null);
      const token = getToken();

      const response = await fetch(`${API_URL}/project-invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          invitedUserId: selectedDeveloper._id || selectedDeveloper.id,
          message: message.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setSuccess(`Invite sent to ${selectedDeveloper.name}!`);
      setInviteLink(data.invite?.inviteLink || null);

      onInviteSent?.();
    } catch (err) {
      console.error('Error sending invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  // Copy invite link
  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied to clipboard!');
    }
  };

  // Reset for new invite
  const handleSendAnother = () => {
    setSelectedDeveloper(null);
    setMessage('');
    setSuccess(null);
    setInviteLink(null);
    fetchDevelopers(1, searchQuery);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invite Developer
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              to {projectTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Success with Invite Link */}
          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-400 font-medium mb-2">
                ✅ {success}
              </p>
              {inviteLink && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share this link with {selectedDeveloper?.name}:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium"
                    >
                      <Link2 className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Expires in 7 days</p>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSendAnother}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium"
                >
                  Invite Another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Main Content */}
          {!success && (
            <>
              {/* Search */}
              {!selectedDeveloper && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search developers by name, email, or skills..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Developer List */}
              {!selectedDeveloper && !loading && developers.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                    {pagination?.total || developers.length} developer{(pagination?.total || developers.length) !== 1 ? 's' : ''} available
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                    {developers.map((dev) => (
                      <button
                        key={dev._id || dev.id}
                        onClick={() => setSelectedDeveloper(dev)}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors text-left group border border-transparent hover:border-teal-300 dark:hover:border-teal-700"
                      >
                        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {dev.avatar ? (
                            <img src={dev.avatar} alt={dev.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            dev.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                            {dev.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {dev.email}
                          </p>
                          {dev.skills && dev.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {dev.skills.slice(0, 2).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                              {dev.skills.length > 2 && (
                                <span className="text-[10px] text-gray-400">+{dev.skills.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Mail className="w-4 h-4 text-gray-400 group-hover:text-teal-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasMore}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* No Results */}
              {!loading && developers.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>No developers available to invite</p>
                  <p className="text-sm mt-1">All developers are already members or have pending invites</p>
                </div>
              )}

              {/* Selected Developer */}
              {selectedDeveloper && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                      {selectedDeveloper.avatar ? (
                        <img src={selectedDeveloper.avatar} alt={selectedDeveloper.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedDeveloper.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedDeveloper.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedDeveloper.email}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDeveloper(null)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Personal Message (optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Hi! I'd like to invite you to join our project..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      <Link2 className="w-4 h-4 inline mr-1" />
                      A unique join link will be generated. Share it with {selectedDeveloper.name} to join directly.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSendInvite}
              disabled={!selectedDeveloper || sending}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Invite Link
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

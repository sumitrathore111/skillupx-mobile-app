import { motion } from 'framer-motion';
import {
    AlertCircle,
    CheckCircle,
    Database,
    Loader2,
    RefreshCw, Trash2,
    Upload
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../service/api';
import { defaultChallenges } from '../../service/challenges';

// Collection name for reference - used in backend
// const CHALLENGES_COLLECTION = 'CodeArena_Challenges';

const SeedChallenges = () => {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [existingCount, setExistingCount] = useState<number | null>(null);

  const checkExistingChallenges = async () => {
    try {
      const response = await apiRequest('/challenges');
      const count = response.challenges?.length || 0;
      setExistingCount(count);
      return count;
    } catch (error) {
      console.error('Error checking challenges:', error);
      return 0;
    }
  };

  const seedChallenges = async () => {
    setLoading(true);
    setMessage(null);

    try {
      let added = 0;
      for (const challenge of defaultChallenges) {
        await apiRequest('/challenges', {
          method: 'POST',
          body: JSON.stringify({
            ...challenge,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        });
        added++;
      }

      setMessage({
        type: 'success',
        text: `Successfully added ${added} challenges to backend!`
      });
      await checkExistingChallenges();
    } catch (error: any) {
      console.error('Error seeding challenges:', error);
      setMessage({
        type: 'error',
        text: `Error: ${error.message || 'Failed to seed challenges'}`
      });
    }

    setLoading(false);
  };

  const deleteAllChallenges = async () => {
    if (!confirm('Are you sure you want to delete ALL challenges? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const response = await apiRequest('/challenges');
      const challenges = response.challenges || [];

      let deleted = 0;
      for (const challenge of challenges) {
        await apiRequest(`/challenges/${challenge.id}`, {
          method: 'DELETE'
        });
        deleted++;
      }

      setMessage({
        type: 'info',
        text: `Deleted ${deleted} challenges from backend.`
      });
      setExistingCount(0);
    } catch (error: any) {
      console.error('Error deleting challenges:', error);
      setMessage({
        type: 'error',
        text: `Error: ${error.message || 'Failed to delete challenges'}`
      });
    }

    setDeleting(false);
  };

  // Check on mount
  useEffect(() => {
    checkExistingChallenges();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-[#00ADB5]/20 dark:bg-blue-900/50 rounded-full mb-4">
            <Database className="w-8 h-8 text-[#00ADB5] dark:text-[#00ADB5]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">CodeArena Seed Tool</h1>
          <p className="text-gray-500 dark:text-white">Add sample challenges to your backend database</p>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-white">Challenges to add:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{defaultChallenges.length}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-gray-600 dark:text-white">Existing in backend:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {existingCount !== null ? existingCount : (
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              )}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
                : message.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
                : 'bg-[#00ADB5]/10 dark:bg-[#00ADB5]/20 border border-[#00ADB5]/30 dark:border-blue-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#00ADB5] dark:text-[#00ADB5] flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${
              message.type === 'success'
                ? 'text-green-700 dark:text-green-400'
                : message.type === 'error'
                ? 'text-red-700 dark:text-red-400'
                : 'text-blue-700 dark:text-[#00ADB5]'
            }`}>
              {message.text}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={seedChallenges}
            disabled={loading || deleting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#00ADB5] text-white font-medium rounded-lg hover:bg-[#00ADB5]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {loading ? 'Adding Challenges...' : 'Seed Challenges'}
          </button>

          <button
            onClick={() => checkExistingChallenges()}
            disabled={loading || deleting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Count
          </button>

          <button
            onClick={deleteAllChallenges}
            disabled={loading || deleting || existingCount === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-200 dark:border-red-700"
          >
            {deleting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            {deleting ? 'Deleting...' : 'Delete All Challenges'}
          </button>
        </div>

        {/* Challenge Preview */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Challenges to be added:</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {defaultChallenges.map((challenge, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{challenge.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  challenge.difficulty === 'easy'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                    : challenge.difficulty === 'medium'
                    ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                }`}>
                  {challenge.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SeedChallenges;

import { AlertCircle, ArrowLeft, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';

export default function ProjectAccessDiagnostic() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { user } = useAuth();
  const { userprofile } = useDataContext();
  const navigate = useNavigate();

  // Placeholder functions - these need to be implemented in backend
  const checkAccessDiagnostics = async (_projectId: string, _userId: string) => {
    // TODO: Implement with backend API
    return { hasAccess: false, issues: ['Not implemented yet'] };
  };
  const forceAddMember = async (_projectId: string, _userId: string, _userName: string) => {
    // TODO: Implement with backend API
    console.log('Force add member not implemented');
  };

  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const runDiagnostics = async () => {
    if (!projectId || !user) return;

    setLoading(true);
    try {
      const results = await checkAccessDiagnostics(projectId, user.id);
      setDiagnostics(results);
      console.log('🔍 DIAGNOSTIC RESULTS:', results);
    } catch (error) {
      console.error('Error running diagnostics:', error);
      alert('Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const fixAccess = async () => {
    if (!projectId || !user || !diagnostics) return;

    setFixing(true);
    try {
      const userName = userprofile?.name || user.email?.split('@')[0] || 'User';
      await forceAddMember(projectId, user.id, userName);

      alert('✅ Access fixed! You have been added to the project. Redirecting...');
      setTimeout(() => {
        navigate(`/dashboard/projects/workspace/${projectId}`);
      }, 1500);
    } catch (error) {
      console.error('Error fixing access:', error);
      alert('Failed to fix access. Please contact project creator.');
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/dashboard/projects')}
          className="mb-4 sm:mb-6 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
        >
          <ArrowLeft size={18} className="sm:hidden" />
          <ArrowLeft size={20} className="hidden sm:block" />
          Back to Projects
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">Project Access Diagnostic</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Troubleshoot and fix access issues</p>
          </div>

          {!diagnostics ? (
            <div className="text-center py-8 sm:py-12">
              <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-yellow-500" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Run Diagnostic Check</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 px-4">
                Click the button below to analyze your access to this project
              </p>
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg sm:rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Diagnostic Results */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Diagnostic Results</h3>

                {/* Project Exists */}
                <div className="flex items-start gap-2 sm:gap-3">
                  {diagnostics.projectExists ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Project Exists</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {diagnostics.projectExists ? 'Project found in database' : 'Project not found'}
                    </p>
                  </div>
                </div>

                {/* Is Creator */}
                <div className="flex items-start gap-2 sm:gap-3">
                  {diagnostics.isCreator ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Creator Status</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {diagnostics.isCreator ? 'You are the project creator' : 'You are not the creator'}
                    </p>
                    {diagnostics.projectCreatorId && (
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-1 break-all">
                        Creator ID: {diagnostics.projectCreatorId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Is Member */}
                <div className="flex items-start gap-2 sm:gap-3">
                  {diagnostics.isMember ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Member Status</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {diagnostics.isMember ? 'You are in Project_Members collection' : 'You are NOT in Project_Members collection'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Total project members: {diagnostics.totalMembers}
                    </p>
                  </div>
                </div>

                {/* Join Requests */}
                <div className="flex items-start gap-3">
                  {diagnostics.userRequests.length > 0 ? (
                    <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">Join Requests</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      You have {diagnostics.userRequests.length} join request(s) on record
                    </p>
                    {diagnostics.userRequests.length > 0 && (
                      <div className="space-y-2">
                        {diagnostics.userRequests.map((req: any) => (
                          <div key={req.id} className="bg-white dark:bg-gray-900 rounded p-3 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900 dark:text-white">Request ID: {req.id}</span>
                              <span className={`px-2 py-1 rounded ${
                                req.status === 'approved' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' :
                                req.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' :
                                'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">Project ID: {req.projectId}</p>
                            {req.approvedAt && (
                              <p className="text-green-600 dark:text-green-400 mt-1">
                                Approved: {new Date(req.approvedAt.seconds * 1000).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Problem Summary */}
              <div className={`rounded-xl p-6 ${
                diagnostics.isMember || diagnostics.isCreator
                  ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700'
              }`}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {diagnostics.isMember || diagnostics.isCreator ? '✅ Access OK' : '❌ Access Issue Detected'}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {diagnostics.isMember || diagnostics.isCreator
                    ? 'You have proper access to this project. You can navigate to the project workspace.'
                    : diagnostics.userRequests.some((r: any) => r.status === 'approved')
                    ? "Your request was approved, but you're not in the members list. This is a database sync issue."
                    : "You don't have access to this project. You may need to request to join or wait for approval."
                  }
                </p>

                {/* Fix Button */}
                {!diagnostics.isMember && !diagnostics.isCreator && diagnostics.userRequests.some((r: any) => r.status === 'approved') && (
                  <button
                    onClick={fixAccess}
                    disabled={fixing}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-5 h-5 ${fixing ? 'animate-spin' : ''}`} />
                    {fixing ? 'Fixing Access...' : '🔧 Fix Access Issue'}
                  </button>
                )}

                {diagnostics.isMember || diagnostics.isCreator ? (
                  <button
                    onClick={() => navigate(`/dashboard/projects/workspace/${projectId}`)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                  >
                    Go to Project Workspace →
                  </button>
                ) : null}
              </div>

              {/* Refresh Button */}
              <div className="text-center">
                <button
                  onClick={runDiagnostics}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Diagnostics
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info */}
        {diagnostics && (
          <div className="mt-6 bg-gray-800 text-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-3">Debug Information (for developers)</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

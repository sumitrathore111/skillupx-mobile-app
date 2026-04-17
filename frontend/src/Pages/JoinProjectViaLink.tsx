import { AlertCircle, Check, FolderOpen, Link2, Loader2, LogIn, Rocket, Shield, UserCheck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { API_URL } from '../service/apiConfig';

/* ─── types ─── */
interface InviteInfo {
  projectTitle: string;
  projectDescription?: string;
  invitedByName: string;
  expiresAt: string;
  status: string;
}

/* ─── flowchart step descriptor ─── */
interface FlowStep {
  id: number;
  label: string;
  description: string;
  icon: React.ReactNode;
}

/* ─── animated connector between cards ─── */
function FlowConnector({ active, direction }: { active: boolean; direction: 'down' | 'right' }) {
  const isDown = direction === 'down';
  return (
    <div className={`flex items-center justify-center ${isDown ? 'h-10 w-full' : 'w-14 h-full'}`}>
      <svg
        className={isDown ? 'w-2 h-10' : 'w-14 h-2'}
        viewBox={isDown ? '0 0 8 40' : '0 0 56 8'}
        fill="none"
      >
        {isDown ? (
          <line x1="4" y1="0" x2="4" y2="40" stroke="url(#grad-v)" strokeWidth="2.5"
            strokeDasharray="6 4"
            className={active ? 'animate-dash-down' : 'opacity-30'}
          />
        ) : (
          <line x1="0" y1="4" x2="56" y2="4" stroke="url(#grad-h)" strokeWidth="2.5"
            strokeDasharray="6 4"
            className={active ? 'animate-dash-right' : 'opacity-30'}
          />
        )}
        <defs>
          <linearGradient id="grad-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="grad-h" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ─── single flowchart card ─── */
function FlowCard({
  step,
  state,
  delay,
}: {
  step: FlowStep;
  state: 'done' | 'active' | 'pending';
  delay: number;
}) {
  const ring =
    state === 'done'
      ? 'ring-2 ring-green-400/60 shadow-green-500/20'
      : state === 'active'
        ? 'ring-2 ring-teal-400/80 shadow-teal-500/30 animate-pulse-subtle'
        : 'ring-1 ring-gray-300 dark:ring-gray-700';

  const iconBg =
    state === 'done'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-500'
      : state === 'active'
        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-500'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500';

  return (
    <div
      className={`relative flex flex-col items-center text-center rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md
        px-5 py-4 w-44 shadow-lg transition-all duration-700 ${ring}`}
      style={{ animationDelay: `${delay}ms`, animation: `fadeSlideUp 0.6s ease ${delay}ms both` }}
    >
      {/* step badge */}
      <span className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 text-white text-[11px] font-bold flex items-center justify-center shadow">
        {step.id}
      </span>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 ${iconBg}`}>
        {step.icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{step.label}</h3>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">{step.description}</p>
      {state === 'done' && (
        <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
          <Check className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}

/* ================================================================== */
/* Main component                                                      */
/* ================================================================== */

export default function JoinProjectViaLink() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getToken = () => localStorage.getItem('authToken');

  /* ── determine which flowchart step is active ── */
  const activeStep = useMemo(() => {
    if (success) return 5;          // past last step
    if (joining) return 4;           // joining in progress
    if (inviteInfo && user) return 3; // ready to join
    if (inviteInfo) return 2;        // invite validated, need auth
    if (loading) return 1;           // validating
    return 0;                        // error / nothing
  }, [loading, inviteInfo, user, joining, success]);

  const steps: FlowStep[] = [
    { id: 1, label: 'Validate Link', description: 'Checking invite token validity', icon: <Link2 className="w-5 h-5" /> },
    { id: 2, label: 'Authenticate', description: 'Verify your identity', icon: <Shield className="w-5 h-5" /> },
    { id: 3, label: 'Review Project', description: 'View project details', icon: <FolderOpen className="w-5 h-5" /> },
    { id: 4, label: 'Accept Invite', description: 'Join the team', icon: <UserCheck className="w-5 h-5" /> },
  ];

  function stepState(id: number): 'done' | 'active' | 'pending' {
    if (id < activeStep) return 'done';
    if (id === activeStep) return 'active';
    return 'pending';
  }

  /* ── API calls (unchanged logic) ── */
  useEffect(() => {
    const validateInvite = async () => {
      if (!inviteToken) { setError('Invalid invite link'); setLoading(false); return; }
      try {
        const token = getToken();
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`${API_URL}/project-invites/join/${inviteToken}`, { headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Invalid invite link');
        setInviteInfo(data.invite);
      } catch (err) {
        console.error('Error validating invite:', err);
        setError(err instanceof Error ? err.message : 'Failed to validate invite');
      } finally { setLoading(false); }
    };
    validateInvite();
  }, [inviteToken]);

  const handleJoin = async () => {
    if (!user) { localStorage.setItem('pendingInvite', `/project/join/${inviteToken}`); navigate('/login'); return; }
    try {
      setJoining(true); setError(null);
      const token = getToken();
      const response = await fetch(`${API_URL}/project-invites/join/${inviteToken}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to join project');
      setSuccess(true);
      setTimeout(() => navigate(`/dashboard/projects/workspace/${data.projectId}`), 1500);
    } catch (err) {
      console.error('Error joining project:', err);
      setError(err instanceof Error ? err.message : 'Failed to join project');
    } finally { setJoining(false); }
  };

  /* ────────────────────── Render ────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-6 overflow-hidden">

      {/* inline keyframes */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes dash-right {
          to { stroke-dashoffset: -20; }
        }
        @keyframes dash-down {
          to { stroke-dashoffset: -20; }
        }
        @keyframes pulse-subtle {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.25); }
          50%      { box-shadow: 0 0 16px 4px rgba(20,184,166,0.18); }
        }
        .animate-dash-right  { animation: dash-right  1.2s linear infinite; }
        .animate-dash-down   { animation: dash-down   1.2s linear infinite; }
        .animate-pulse-subtle { animation: pulse-subtle 2s   ease-in-out infinite; }
      `}</style>

      {/* ─── Title ─── */}
      <div className="text-center mb-10" style={{ animation: 'fadeSlideUp 0.6s ease both' }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm font-medium mb-3 backdrop-blur">
          <Rocket className="w-4 h-4" />
          Project Invitation Flow
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
          You're <span className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-transparent">Invited!</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto text-sm">
          Follow the steps below to join the project
        </p>
      </div>

      {/* ═══════════════════  FLOWCHART  ═══════════════════ */}

      {/* Desktop: 2×2 grid with connectors  ··· 1 → 2
                                                       ↓
                                                 4 ← 3  */}
      <div className="hidden md:block mb-10">
        <div className="flex flex-col items-center">
          {/* Row 1: Step 1 → Step 2 */}
          <div className="flex items-center">
            <FlowCard step={steps[0]} state={stepState(1)} delay={0} />
            <FlowConnector active={activeStep > 1} direction="right" />
            <FlowCard step={steps[1]} state={stepState(2)} delay={150} />
          </div>

          {/* Turn: right‑side vertical connector under Step 2 */}
          <div className="flex w-full justify-end pr-[86px]">
            <FlowConnector active={activeStep > 2} direction="down" />
          </div>

          {/* Row 2: Step 4 ← Step 3 */}
          <div className="flex items-center">
            <FlowCard step={steps[3]} state={stepState(4)} delay={450} />
            <FlowConnector active={activeStep > 3} direction="right" />
            <FlowCard step={steps[2]} state={stepState(3)} delay={300} />
          </div>
        </div>
      </div>

      {/* Mobile: vertical linear flow */}
      <div className="flex md:hidden flex-col items-center mb-10">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-col items-center">
            <FlowCard step={step} state={stepState(step.id)} delay={i * 150} />
            {i < steps.length - 1 && <FlowConnector active={activeStep > step.id} direction="down" />}
          </div>
        ))}
      </div>

      {/* ═══════════════  INFO / ACTION PANEL  ═══════════════ */}
      <div
        className="w-full max-w-md rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 p-6"
        style={{ animation: 'fadeSlideUp 0.6s ease 500ms both' }}
      >
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Validating invite link…</p>
          </div>
        )}

        {/* Error state (no invite info) */}
        {error && !inviteInfo && !loading && (
          <div className="text-center py-2">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Invalid Invite</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium text-sm transition">
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className="text-center py-2">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Successfully Joined!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting to project workspace…</p>
          </div>
        )}

        {/* Normal invite info + action */}
        {inviteInfo && !success && !loading && (
          <>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 mb-5">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-0.5">{inviteInfo.projectTitle}</h2>
              {inviteInfo.projectDescription && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-1.5">{inviteInfo.projectDescription}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Invited by <span className="font-medium text-gray-600 dark:text-gray-300">{inviteInfo.invitedByName}</span>
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {!user && (
              <div className="p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
                Please log in to accept this invite
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600 disabled:opacity-50 transition-all shadow-md shadow-teal-500/20"
            >
              {joining ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Joining…</>
              ) : user ? (
                <><Check className="w-5 h-5" /> Accept & Join Project</>
              ) : (
                <><LogIn className="w-5 h-5" /> Login to Join</>
              )}
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { COLORS, RADIUS, SHADOWS, SIZES } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '@services/api';
import { fetchWallet, getBattleHistory } from '@services/arenaService';
import { fetchMyIdeas, fetchMyProjects } from '@services/creatorService';
import { getUnreadCount } from '@services/notificationService';
import { getSocket, initializeSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
    Circle,
    Defs,
    Line,
    LinearGradient,
    Polygon,
    Polyline,
    Stop,
    Text as SvgText,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Badge Definitions (same as frontend) ─────────────────────────────────
const BADGE_DEFINITIONS = [
  { id: 'gold_badge', name: 'Gold Badge', icon: '💻', description: 'Finish 5 Projects', requirement: { type: 'projects', count: 5 } },
  { id: 'battle_master', name: '+500 Coins', icon: '⚔️', description: 'Win 50 CodeArena Battles', requirement: { type: 'battles', count: 50 } },
  { id: 'collaborator_badge', name: 'Collaborator Badge', icon: '👥', description: 'Join 3 Teams', requirement: { type: 'teams', count: 3 } },
  { id: 'elite_status', name: 'Elite Status', icon: '🏆', description: 'Get 3 Certificates', requirement: { type: 'certificates', count: 3 } },
  { id: 'star_developer', name: 'Star Developer', icon: '⭐', description: 'Reach 4.8+ Rating', requirement: { type: 'rating', count: 4.8 } },
  { id: 'coding_master', name: 'Coding Master', icon: '🎯', description: 'Solve 100+ DSA Problems', requirement: { type: 'challenges', count: 100 } },
];



// ─── Interfaces ────────────────────────────────────────────────────────────
interface WeeklyDay { day: string; challenges: number; battles: number; projects: number }
interface MonthlyItem { name: string; value: number; color: string; percentage: number }
interface ActivityCell { date: string; value: number }

// ─── SVG: Circular Progress Ring ──────────────────────────────────────────
const CircularProgress = ({
  percentage, size = 100, strokeWidth = 8, color = '#3b82f6',
}: { percentage: number; size?: number; strokeWidth?: number; color?: string }) => {
  const r = (size - strokeWidth) / 2;
  const circ = r * 2 * Math.PI;
  const filled = (Math.min(percentage, 100) / 100) * circ;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#1E1E2E" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: size < 90 ? 11 : 15, fontWeight: '800', color }}>{percentage}%</Text>
      </View>
    </View>
  );
};

// ─── SVG: Pie Chart (Activity Breakdown) ──────────────────────────────────
const PieChart = ({ data }: { data: MonthlyItem[] }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>No activity data yet. Start solving challenges!</Text>
      </View>
    );
  }
  const r = 64; const cx = 76; const cy = 76;
  const circ = 2 * Math.PI * r;
  let cumPct = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ position: 'relative', width: 152, height: 152 }}>
        <Svg width={152} height={152} style={{ transform: [{ rotate: '-90deg' }] }}>
          {data.map((item, i) => {
            const pct = item.value / total;
            const filled = pct * circ;
            const offset = -(cumPct * circ);
            cumPct += pct;
            return (
              <Circle key={i} cx={cx} cy={cy} r={r} stroke={item.color} strokeWidth={22} fill="none"
                strokeDasharray={`${filled} ${circ}`} strokeDashoffset={offset} />
            );
          })}
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary }}>{total}</Text>
          <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Total</Text>
        </View>
      </View>
      <View style={{ gap: 10, flex: 1 }}>
        {data.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>{item.name}</Text>
              <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{item.value} ({item.percentage}%)</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── SVG: Skill Radar Chart ────────────────────────────────────────────────
const SkillRadarChart = ({ skills }: { skills: { name: string; value: number }[] }) => {
  if (!skills.length) return null;
  const cx = 130; const cy = 130; const maxR = 90;
  const levels = 5;
  const angleSlice = (Math.PI * 2) / skills.length;
  const levelPts = (lv: number) => {
    const r = (maxR * lv) / levels;
    return skills.map((_, i) => {
      const a = angleSlice * i - Math.PI / 2;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
  };
  const dataPts = skills.map((s, i) => {
    const a = angleSlice * i - Math.PI / 2;
    const r = (Math.min(s.value, 100) / 100) * maxR;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={260} height={260} viewBox="0 0 260 260">
        {[1, 2, 3, 4, 5].map(lv => (
          <Polygon key={lv} points={levelPts(lv)} fill="none" stroke="#1E1E2E" strokeWidth="1" />
        ))}
        {skills.map((_, i) => {
          const a = angleSlice * i - Math.PI / 2;
          return <Line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="#1E1E2E" strokeWidth="1" />;
        })}
        <Polygon points={dataPts} fill="rgba(0,173,181,0.25)" stroke="#00ADB5" strokeWidth="2" />
        {skills.map((s, i) => {
          const a = angleSlice * i - Math.PI / 2;
          const r = (Math.min(s.value, 100) / 100) * maxR;
          const lr = maxR + 22;
          return (
            <React.Fragment key={i}>
              <Circle cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={4} fill="#00ADB5" stroke="white" strokeWidth="1.5" />
              <SvgText x={cx + lr * Math.cos(a)} y={cy + lr * Math.sin(a)}
                textAnchor="middle" fill="#6B7280" fontSize={10} fontWeight="600">
                {s.name}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

// ─── SVG: Monthly Line Chart ───────────────────────────────────────────────
const MonthlyLineChart = ({
  data,
}: { data: { month: string; challenges: number; battles: number; projects: number }[] }) => {
  const chartW = SCREEN_WIDTH - 64;
  const chartH = 160;
  const pad = { top: 16, right: 12, bottom: 28, left: 30 };
  const gW = chartW - pad.left - pad.right;
  const gH = chartH - pad.top - pad.bottom;
  const maxVal = Math.max(1, ...data.flatMap(d => [d.challenges, d.battles, d.projects]));
  const total = data.reduce((s, d) => s + d.challenges + d.battles + d.projects, 0);
  if (!data.length) {
    return <View style={{ height: chartH, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: COLORS.textMuted }}>No data</Text></View>;
  }
  const getX = (i: number) => data.length <= 1 ? pad.left + gW / 2 : pad.left + (gW / (data.length - 1)) * i;
  const getY = (v: number) => pad.top + gH - (v / maxVal) * gH;
  const mkPts = (key: 'challenges' | 'battles' | 'projects') =>
    data.map((d, i) => `${getX(i)},${getY(d[key])}`).join(' ');
  const hasChal = data.some(d => d.challenges > 0);
  const hasBatt = data.some(d => d.battles > 0);
  const hasProj = data.some(d => d.projects > 0);
  return (
    <View style={{ position: 'relative' }}>
      {total === 0 && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>No activity recorded in this period</Text>
        </View>
      )}
      <Svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
        {[0, 25, 50, 75, 100].map(pct => {
          const y = pad.top + gH - (pct / 100) * gH;
          return (
            <React.Fragment key={pct}>
              <Line x1={pad.left} y1={y} x2={chartW - pad.right} y2={y} stroke="#1E1E2E" strokeDasharray="4" />
              <SvgText x={pad.left - 4} y={y} textAnchor="end" fill="#6B7280" fontSize={9}>
                {Math.round((pct / 100) * maxVal)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {hasChal && <Polyline points={mkPts('challenges')} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
        {hasBatt && <Polyline points={mkPts('battles')} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
        {hasProj && <Polyline points={mkPts('projects')} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
        {data.map((d, i) => (
          <React.Fragment key={i}>
            {d.challenges > 0 && <Circle cx={getX(i)} cy={getY(d.challenges)} r={3.5} fill="#3b82f6" stroke="white" strokeWidth={1.5} />}
            {d.battles > 0 && <Circle cx={getX(i)} cy={getY(d.battles)} r={3.5} fill="#10b981" stroke="white" strokeWidth={1.5} />}
            {d.projects > 0 && <Circle cx={getX(i)} cy={getY(d.projects)} r={3.5} fill="#f59e0b" stroke="white" strokeWidth={1.5} />}
            <SvgText x={getX(i)} y={chartH - 6} textAnchor="middle" fill="#6B7280" fontSize={9}>{d.month}</SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

// ─── SVG: Coin Sparkline ───────────────────────────────────────────────────
const CoinsTrendChart = ({ data }: { data: number[] }) => {
  if (!data.length) return null;
  const w = 120; const h = 40;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const fillPts = `0,${h} ${pts} ${w},${h}`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f59e0b" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polygon points={fillPts} fill="url(#coinGrad)" />
      <Polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ─── Main Dashboard Component ──────────────────────────────────────────────
export default function DevFeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  // Core stats
  const [coins, setCoins] = useState(0);
  const [battlesWon, setBattlesWon] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Charts
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyDay[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyItem[]>([]);
  const [activityHeatmap, setActivityHeatmap] = useState<ActivityCell[][]>([]);

  // Raw data for monthly trend
  const [rawBattles, setRawBattles] = useState<any[]>([]);
  const [rawProjects, setRawProjects] = useState<any[]>([]);

  // Monthly chart filters
  const [trendPeriod, setTrendPeriod] = useState<'3m' | '6m' | '1y'>('6m');
  const [trendFilter, setTrendFilter] = useState<'all' | 'battles' | 'projects'>('all');

  // Project stats
  const [projectsCreated, setProjectsCreated] = useState(0);
  const [projectsApproved, setProjectsApproved] = useState(0);
  const [projectsContributing, setProjectsContributing] = useState(0);

  // Badges
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const parseDate = (v: any): number => {
    if (!v) return 0;
    if (typeof v === 'string') return new Date(v).getTime();
    if (typeof v === 'number') return v;
    if (v instanceof Date) return v.getTime();
    return 0;
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── Badge logic ────────────────────────────────────────────────────────────
  const checkAndAwardBadges = useCallback(async (
    stats: { projects: number; battles: number; teams: number; certificates: number; rating: number; challenges: number },
    existingBadges: any[],
  ) => {
    if (!user) return;
    const newBadges: any[] = [];
    for (const badge of BADGE_DEFINITIONS) {
      if (existingBadges.some((b: any) => b.id === badge.id)) continue;
      const { type, count } = badge.requirement;
      const earned =
        (type === 'projects' && stats.projects >= count) ||
        (type === 'battles' && stats.battles >= count) ||
        (type === 'teams' && stats.teams >= count) ||
        (type === 'certificates' && stats.certificates >= count) ||
        (type === 'rating' && stats.rating >= count) ||
        (type === 'challenges' && stats.challenges >= count);
      if (earned) {
        newBadges.push({ id: badge.id, name: badge.name, icon: badge.icon, description: badge.description, earnedAt: new Date().toISOString() });
      }
    }
    if (!newBadges.length) { setEarnedBadges(existingBadges); return; }
    try {
      const resp = await apiRequest<any>('POST', `/users/${user.id}/badges`, { badges: newBadges });
      // Only use badges the backend confirms as truly new — never fall back to local list
      const actualNew: any[] = resp?.newBadges || [];
      if (actualNew.length > 0) {
        const bm = actualNew.find((b: any) => b.id === 'battle_master');
        if (bm) {
          try { await apiRequest('POST', `/wallet/${user.id}/add`, { amount: 500, reason: 'Badge Reward: Won 50 Battles! ⚔️' }); } catch { /* silent */ }
        }
        Alert.alert('🏆 Badge Unlocked!', `${actualNew[0].icon} ${actualNew[0].name}\n${actualNew[0].description}`);
      }
      setEarnedBadges(resp?.badges || [...existingBadges, ...newBadges]);
    } catch {
      setEarnedBadges([...existingBadges, ...newBadges]);
    }
  }, [user]);

  // Share badge
  const shareBadge = async (badge: any) => {
    try {
      await Share.share({
        message: `🏆 I just earned "${badge.icon} ${badge.name}" on CodeTermite!\n\n${badge.description}\n\nJoin me and start your coding journey! 🚀`,
      });
    } catch { /* user cancelled */ }
  };

  // ── Main data load ─────────────────────────────────────────────────────────
  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (!isRefresh) setLoading(true);
    try {
      const [walletRes, battlesRes, ideasRes, projectsRes, profileRes, unreadRes] =
        await Promise.allSettled([
          fetchWallet(user.id),
          getBattleHistory(),
          fetchMyIdeas(),
          fetchMyProjects(),
          apiRequest<any>('GET', `/users/${user.id}`),
          getUnreadCount(),
        ]);

      const wallet = walletRes.status === 'fulfilled' ? walletRes.value : null;
      const battles: any[] = battlesRes.status === 'fulfilled' ? (battlesRes.value || []) : [];
      // Unread notification count
      if (unreadRes.status === 'fulfilled') setUnreadNotifCount(unreadRes.value);
      // Backend returns { ideas: [...] } — unwrap safely
      const ideasRaw: any = ideasRes.status === 'fulfilled' ? ideasRes.value : null;
      const ideas: any[] = Array.isArray(ideasRaw) ? ideasRaw : (ideasRaw?.ideas || []);
      // Backend returns { projects: [...] } — unwrap safely
      const projRaw: any = projectsRes.status === 'fulfilled' ? projectsRes.value : null;
      const myProjects: any[] = Array.isArray(projRaw) ? projRaw : (projRaw?.projects || []);
      // Backend returns { user: {...} } — unwrap
      const profileRaw: any = profileRes.status === 'fulfilled' ? profileRes.value : null;
      const profile: any = profileRaw?.user || profileRaw;

      const wins = battles.filter((b: any) => b.winnerId === user.id).length || wallet?.stats?.battlesWon || 0;
      const streak = profile?.streakCount || wallet?.stats?.currentStreak || 0;
      const c = wallet?.coins || 0;

      setBattlesWon(wins);
      setCurrentStreak(streak);
      setCoins(c);

      // Store raw data for monthly trend chart
      setRawBattles(battles);
      setRawProjects([...ideas, ...myProjects]);

      const created = ideas.length;
      const approved = ideas.filter((i: any) => i.status === 'approved').length;
      const contributing = myProjects.length;
      setProjectsCreated(created);
      setProjectsApproved(approved);
      setProjectsContributing(contributing);

      // Weekly activity last 7 days
      const last7: WeeklyDay[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
        const dayEnd = dayStart + 86399999;
        const dayBattles = battles.filter((b: any) => { const t = parseDate(b.createdAt); return t >= dayStart && t <= dayEnd; }).length;
        const dayProjects = [...ideas, ...myProjects].filter((p: any) => { const t = parseDate(p.createdAt) || parseDate(p.updatedAt); return t >= dayStart && t <= dayEnd; }).length;
        return { day: d.toLocaleDateString('en', { weekday: 'short' }), challenges: 0, battles: dayBattles, projects: dayProjects };
      });
      setWeeklyActivity(last7);

      const totalAct = wins + created + contributing;
      setMonthlyStats([
        { name: 'Battle Wins', value: wins, color: '#10b981', percentage: totalAct > 0 ? Math.round((wins / totalAct) * 100) : 0 },
        { name: 'Projects Created', value: created, color: '#f59e0b', percentage: totalAct > 0 ? Math.round((created / totalAct) * 100) : 0 },
        { name: 'Collaborations', value: contributing, color: '#8b5cf6', percentage: totalAct > 0 ? Math.round((contributing / totalAct) * 100) : 0 },
      ]);

      const totalActivity = wins + created + contributing;
      const heatmap: ActivityCell[][] = Array.from({ length: 4 }, (_, weekIndex) =>
        Array.from({ length: 7 }, (_, dayIndex) => {
          const d = new Date();
          d.setDate(d.getDate() - (3 - weekIndex) * 7 - (6 - dayIndex));
          const daysAgo = (3 - weekIndex) * 7 + (6 - dayIndex);
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
          const dayEnd = dayStart + 86399999;
          const dayAct = battles.filter((b: any) => { const t = parseDate(b.createdAt); return t >= dayStart && t <= dayEnd; }).length;
          let value = dayAct;
          if (value === 0 && daysAgo < streak) {
            value = Math.min(Math.ceil(totalActivity / Math.max(streak, 1)), 4);
          }
          return { date: d.toLocaleDateString(), value };
        })
      );
      setActivityHeatmap(heatmap);

      const existingBadges = profile?.badges || [];
      await checkAndAwardBadges(
        { projects: approved, battles: wins, teams: contributing, certificates: 0, rating: profile?.rating || 0, challenges: 0 },
        existingBadges,
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, checkAndAwardBadges]);

  // ── Monthly trend data (same logic as frontend) ────────────────────────────
  const monthlyData = useMemo(() => {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const count = trendPeriod === '3m' ? 3 : trendPeriod === '6m' ? 6 : 12;
    return Array.from({ length: count }, (_, i) => {
      const target = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
      const mStart = new Date(target.getFullYear(), target.getMonth(), 1, 0, 0, 0, 0).getTime();
      const mEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const batts = (trendFilter === 'all' || trendFilter === 'battles')
        ? rawBattles.filter((b: any) => { const t = parseDate(b.createdAt); return t >= mStart && t <= mEnd; }).length : 0;
      const projs = (trendFilter === 'all' || trendFilter === 'projects')
        ? rawProjects.filter((p: any) => { const t = parseDate(p.createdAt) || parseDate(p.updatedAt); return t >= mStart && t <= mEnd; }).length : 0;
      return { month: MONTHS[target.getMonth()], challenges: 0, battles: batts, projects: projs };
    });
  }, [rawBattles, rawProjects, trendPeriod, trendFilter]);

  // ── Skill radar data ───────────────────────────────────────────────────────
  const skillData = useMemo(() => [
    { name: 'Battles', value: Math.min(100, battlesWon * 5) },
    { name: 'Projects', value: Math.min(100, (projectsCreated + projectsContributing) * 10) },
    { name: 'Streak', value: Math.min(100, Math.round(currentStreak * 3.3)) },
    { name: 'Collab', value: Math.min(100, projectsContributing * 15) },
    { name: 'Approved', value: (projectsCreated + projectsContributing) > 0 ? Math.min(100, Math.round((projectsApproved / (projectsCreated + projectsContributing)) * 100)) : 0 },
  ], [battlesWon, currentStreak, projectsCreated, projectsContributing, projectsApproved]);

  // ── Coin sparkline ─────────────────────────────────────────────────────────
  const coinTrendData = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => Math.max(0, coins - (6 - i) * Math.floor(coins * 0.1)))
  , [coins]);

  // ── Heatmap stats ──────────────────────────────────────────────────────────
  const heatFlat = activityHeatmap.flat();
  const totalHeatAct = heatFlat.reduce((s, d) => s + d.value, 0);
  const activeDays = heatFlat.filter(d => d.value > 0).length;
  const consistency = Math.round((activeDays / 28) * 100);

  // ── Achievements ───────────────────────────────────────────────────────────
  const achievements = useMemo(() => {
    const list: { title: string; date: string; type: string; value: number }[] = [];
    if (projectsApproved > 0) list.push({ title: `${projectsApproved} Project${projectsApproved > 1 ? 's' : ''} Approved`, date: 'Recent', type: 'project', value: projectsApproved * 50 });
    if (currentStreak >= 7) list.push({ title: `${currentStreak}-Day Streak!`, date: 'Active', type: 'streak', value: currentStreak * 5 });
    if (battlesWon > 0) list.push({ title: `${battlesWon} Battle${battlesWon > 1 ? 's' : ''} Won!`, date: 'Recent', type: 'battle', value: battlesWon * 40 });
    if (!list.length) list.push({ title: 'Start your journey!', date: 'Win battles & build projects', type: 'battle', value: 0 });
    return list;
  }, [projectsApproved, currentStreak, battlesWon]);

  const getHeatColor = (v: number) => {
    if (v === 0) return COLORS.surface;
    if (v <= 1) return '#166534';
    if (v <= 3) return '#15803d';
    if (v <= 5) return '#16a34a';
    return '#22c55e';
  };

  // ── Socket real-time updates ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const EVENTS = ['battleWon', 'battleCompleted', 'challengeSolved', 'submissionResult',
      'walletUpdated', 'coinsEarned', 'projectApproved', 'projectCreated', 'memberJoined',
      'badgeEarned', 'statsUpdated', 'dashboardUpdate'];
    (async () => {
      try {
        const sock = await initializeSocket();
        if (!mounted) return;
        sock.emit('join-user', user.id);
        sock.emit('join-dashboard', user.id);
        EVENTS.forEach(e => sock.on(e, () => { if (mounted) loadData(true); }));
      } catch { /* socket optional */ }
    })();
    return () => {
      mounted = false;
      try {
        const sock = getSocket();
        if (sock) {
          EVENTS.forEach(e => sock.off(e));
          sock.emit('leave-user', user.id);
          sock.emit('leave-dashboard', user.id);
        }
      } catch { /* ignore */ }
    };
  }, [user, loadData]);

  // ── Initial load + 30s auto-refresh ───────────────────────────────────────
  useEffect(() => {
    loadData();
    refreshIntervalRef.current = setInterval(() => loadData(true), 30000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [loadData]);

  // ── Socket notification listener ──────────────────────────────────────────
  useEffect(() => {
    const initSocket = async () => {
      try {
        const sock = await initializeSocket();
        const handleNotification = () => {
          // Refresh unread count when a new notification arrives
          getUnreadCount().then(count => setUnreadNotifCount(count)).catch(() => {});
        };
        sock.on('notification', handleNotification);
        return () => { sock.off('notification', handleNotification); };
      } catch (e) {
        console.warn('Socket notification listener setup failed:', e);
      }
    };
    let cleanup: (() => void) | undefined;
    initSocket().then(fn => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, []);

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  const BAR_MAX_H = 60;
  const maxWeekly = Math.max(1, ...weeklyActivity.map(d => d.challenges + d.battles + d.projects));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Developer'} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={19} color={COLORS.textSecondary} />
              {unreadNotifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.coinBadge}>
              <Text style={styles.coinIcon}>🪙</Text>
              <Text style={styles.coinText}>{coins}</Text>
            </View>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Last updated + refresh */}
        {lastUpdated && (
          <View style={styles.refreshRow}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{formatLastUpdated()}</Text>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
              <Ionicons name="refresh-outline" size={14} color={COLORS.primary} />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Streak card */}
        {currentStreak > 0 && (
          <View style={styles.streakCard}>
            <View style={styles.streakLeft}>
              <Text style={styles.streakFire}>🔥</Text>
              <View>
                <Text style={styles.streakCount}>{currentStreak} Day Streak!</Text>
                <Text style={styles.streakSub}>Keep it up, you're on fire</Text>
              </View>
            </View>
            <View style={styles.streakBadge}><Text style={styles.streakBadgeText}>ACTIVE</Text></View>
          </View>
        )}

        {/* ── Stats Grid 2×3 ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Battle Wins', value: battlesWon, icon: '⚔️', color: COLORS.primary },
            { label: 'Day Streak', value: currentStreak, icon: '🔥', color: COLORS.warning },
            { label: 'Coins', value: coins, icon: '🪙', color: '#f59e0b' },
            { label: 'Projects Created', value: projectsCreated, icon: '📁', color: '#f59e0b' },
            { label: 'Approved', value: projectsApproved, icon: '✅', color: COLORS.success },
            { label: 'Collabs', value: projectsContributing, icon: '👥', color: COLORS.accent },
          ].map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>



        {/* ── Performance Bars ─────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.card}>
          {[
            { label: 'Projects Approved', value: (projectsCreated + projectsContributing) > 0 ? Math.round((projectsApproved / (projectsCreated + projectsContributing)) * 100) : 0, color: '#8b5cf6' },
            { label: 'Streak Goal (30d)', value: Math.min(Math.round((currentStreak / 30) * 100), 100), color: '#f59e0b' },
          ].map((item, i) => (
            <View key={i} style={{ marginBottom: i < 1 ? 16 : 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{item.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }}>{item.value}%</Text>
              </View>
              <View style={styles.progBarBg}>
                <View style={[styles.progBarFill, { width: `${item.value}%` as any, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* ── Weekly Activity Bar Chart ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <View style={styles.card}>
          <View style={styles.weeklyChart}>
            {weeklyActivity.map((day, idx) => {
              const total = day.challenges + day.battles + day.projects;
              const barH = total > 0 ? Math.max(4, Math.round((total / maxWeekly) * BAR_MAX_H)) : 4;
              const chalH = total > 0 ? Math.round((day.challenges / Math.max(total, 1)) * barH) : 0;
              const battleH = total > 0 ? Math.round((day.battles / Math.max(total, 1)) * barH) : 0;
              const projH = Math.max(0, barH - chalH - battleH);
              return (
                <View key={idx} style={styles.barGroup}>
                  <View style={[styles.bar, { height: BAR_MAX_H }]}>
                    {projH > 0 && <View style={[styles.barSegment, { height: projH, backgroundColor: '#f59e0b99' }]} />}
                    {battleH > 0 && <View style={[styles.barSegment, { height: battleH, backgroundColor: COLORS.danger + 'CC' }]} />}
                    {chalH > 0 && <View style={[styles.barSegment, { height: chalH, backgroundColor: COLORS.primary + 'CC' }]} />}
                    {total === 0 && <View style={[styles.barSegment, { height: 4, backgroundColor: COLORS.border }]} />}
                  </View>
                  <Text style={styles.barDayLabel}>{day.day}</Text>
                  {total > 0 && <Text style={styles.barValueLabel}>{total}</Text>}
                </View>
              );
            })}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} /><Text style={styles.legendText}>Battles</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendText}>Projects</Text></View>
          </View>
        </View>

        {/* ── Activity Breakdown — Pie Chart ───────────────────────────────── */}
        <Text style={styles.sectionTitle}>Activity Breakdown</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
            <View style={styles.liveTag}><View style={[styles.liveDot, { width: 6, height: 6 }]} /><Text style={styles.liveTagText}>Real-time</Text></View>
          </View>
          <PieChart data={monthlyStats.filter(s => s.value > 0)} />
        </View>

        {/* ── Performance Metrics — 4× Circular Progress ───────────────────── */}
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={[styles.card, { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }]}>
          {[
            { label: 'Battle Wins', value: Math.min(battlesWon * 10, 100), color: '#10b981' },
            { label: 'Projects Done', value: (projectsCreated + projectsContributing) > 0 ? Math.round((projectsApproved / (projectsCreated + projectsContributing)) * 100) : 0, color: '#8b5cf6' },
            { label: 'Streak Goal', value: Math.min(Math.round((currentStreak / 30) * 100), 100), color: '#f59e0b' },
          ].map((m, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 8 }}>
              <CircularProgress percentage={m.value} color={m.color} size={88} strokeWidth={8} />
              <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' }}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Skill Radar Chart ────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Skill Radar</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
            <View style={styles.infoTag}><Text style={styles.infoTagText}>Profile Analysis</Text></View>
          </View>
          <SkillRadarChart skills={skillData} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {skillData.slice(0, 3).map((s, i) => (
              <View key={i} style={styles.skillMiniCard}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#00ADB5' }}>{Math.round(s.value)}%</Text>
                <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{s.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Wallet Overview ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Wallet Overview</Text>
        <View style={styles.walletGradient}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Total Balance</Text>
              <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800' }}>{coins}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 }}>NextStep Coins</Text>
            </View>
            <View style={styles.walletIconBox}><Text style={{ fontSize: 28 }}>⭐</Text></View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>7-day trend</Text>
            <CoinsTrendChart data={coinTrendData} />
          </View>
        </View>
        <View style={styles.walletBottom}>
          {[
            { label: 'Battle Rewards', value: battlesWon, color: '#10b981', bg: '#10b98120' },
            { label: 'Projects Done', value: projectsApproved, color: '#8b5cf6', bg: '#8b5cf620' },
            { label: 'Badge Rewards', value: earnedBadges.length, color: '#a855f7', bg: '#a855f720' },
          ].map((w, i) => (
            <View key={i} style={[styles.walletStat, { backgroundColor: w.bg, flex: 1 }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: w.color }}>{w.value}</Text>
              <Text style={{ fontSize: 10, color: COLORS.textMuted, textAlign: 'center' }}>{w.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Monthly Progress Line Chart ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Monthly Progress Trend</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <View style={styles.filterPill}>
              {(['3m', '6m', '1y'] as const).map(p => (
                <TouchableOpacity key={p} onPress={() => setTrendPeriod(p)}
                  style={[styles.filterBtn, trendPeriod === p && styles.filterBtnActive]}>
                  <Text style={[styles.filterBtnTxt, trendPeriod === p && styles.filterBtnTxtActive]}>
                    {p === '3m' ? '3M' : p === '6m' ? '6M' : '1Y'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterPill}>
              {([
                { v: 'all' as const, l: 'All', c: COLORS.primary },
                { v: 'battles' as const, l: 'Battles', c: '#10b981' },
                { v: 'projects' as const, l: 'Projects', c: '#f59e0b' },
              ]).map(opt => (
                <TouchableOpacity key={opt.v} onPress={() => setTrendFilter(opt.v)}
                  style={[styles.filterBtn, trendFilter === opt.v && { ...styles.filterBtnActive, backgroundColor: opt.c }]}>
                  <Text style={[styles.filterBtnTxt, trendFilter === opt.v && styles.filterBtnTxtActive]}>{opt.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <MonthlyLineChart data={monthlyData} />
          {trendFilter === 'all' && (
            <View style={[styles.chartLegend, { marginTop: 12 }]}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>Battles</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendText}>Projects</Text></View>
            </View>
          )}
        </View>

        {/* ── Feature Cards (Learning Roadmaps + Dev Connect) ─────────────── */}
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <TouchableOpacity style={[styles.featureCard, { backgroundColor: '#10b981' }]}
            onPress={() => navigation.navigate('Roadmaps')} activeOpacity={0.8}>
            <View style={styles.featureIconBox}><Ionicons name="map-outline" size={22} color="#fff" /></View>
            <Text style={styles.featureTitle}>Learning Roadmaps</Text>
            <Text style={styles.featureSub}>Your learning path</Text>
            <View style={styles.featureStats}>
              <View><Text style={styles.featureStatVal}>{projectsCreated}</Text><Text style={styles.featureStatLbl}>Completed</Text></View>
              <View><Text style={styles.featureStatVal}>{projectsContributing}</Text><Text style={styles.featureStatLbl}>In Progress</Text></View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.featureCard, { backgroundColor: '#8b5cf6' }]}
            onPress={() => navigation.navigate('Connect')} activeOpacity={0.8}>
            <View style={styles.featureIconBox}><Ionicons name="people-outline" size={22} color="#fff" /></View>
            <Text style={styles.featureTitle}>Developer Connect</Text>
            <Text style={styles.featureSub}>Network & collaborate</Text>
            <View style={styles.featureStats}>
              <View><Text style={styles.featureStatVal}>{battlesWon}</Text><Text style={styles.featureStatLbl}>Battles</Text></View>
              <View><Text style={styles.featureStatVal}>{projectsContributing}</Text><Text style={styles.featureStatLbl}>Collabs</Text></View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Activity Heatmap ─────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Activity Heatmap</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
            <View style={styles.infoTag}><Text style={styles.infoTagText}>Last 4 weeks</Text></View>
          </View>
          <View style={styles.heatmapDayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={styles.heatmapDayLabel}>{d}</Text>
            ))}
          </View>
          {activityHeatmap.map((week, wi) => (
            <View key={wi} style={styles.heatmapWeekRow}>
              {week.map((cell, di) => (
                <View key={di} style={[styles.heatCell, { backgroundColor: getHeatColor(cell.value) }]} />
              ))}
            </View>
          ))}
          <View style={styles.heatmapLegend}>
            <Text style={styles.legendText}>Less</Text>
            {[0, 1, 2, 4, 6].map(v => (
              <View key={v} style={[styles.heatCell, { backgroundColor: getHeatColor(v), marginHorizontal: 2 }]} />
            ))}
            <Text style={styles.legendText}>More</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {[
              { label: 'Total Activities', value: totalHeatAct, color: '#22c55e' },
              { label: 'Active Days', value: activeDays, color: '#22c55e' },
              { label: 'Consistency', value: `${consistency}%`, color: '#22c55e' },
            ].map((s, i) => (
              <View key={i} style={styles.heatStat}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: COLORS.textMuted, textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Activity Distribution ────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Activity Distribution</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {monthlyStats.map((stat, i) => (
            <View key={i} style={[styles.distCard, { backgroundColor: `${stat.color}15`, minWidth: (SCREEN_WIDTH - SIZES.base * 2 - 30) / 2 }]}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 3 }}>{stat.name}</Text>
            </View>
          ))}
        </View>

        {/* ── Projects ─────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Projects</Text>
        <View style={styles.projectStatsRow}>
          {[
            { label: 'Created', value: projectsCreated, icon: '📁', color: '#f59e0b' },
            { label: 'Approved', value: projectsApproved, icon: '✅', color: COLORS.success },
            { label: 'Contributing', value: projectsContributing, icon: '👥', color: COLORS.accent },
          ].map(p => (
            <View key={p.label} style={styles.projectStatCard}>
              <Text style={styles.statIcon}>{p.icon}</Text>
              <Text style={[styles.statValue, { color: p.color }]}>{p.value}</Text>
              <Text style={styles.statLabel}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {[
            { label: 'Practice', icon: 'code-slash-outline', color: COLORS.primary, nav: () => navigation.navigate('Arena', { screen: 'ProblemList' }) },
            { label: 'Battle', icon: 'flash-outline', color: COLORS.danger, nav: () => navigation.navigate('Arena', { screen: 'BattleLobby' }) },
            { label: 'Roadmaps', icon: 'map-outline', color: COLORS.accent, nav: () => navigation.navigate('Roadmaps') },
            { label: 'Connect', icon: 'people-outline', color: COLORS.success, nav: () => navigation.navigate('Connect') },
            { label: 'Creator', icon: 'sparkles-outline', color: '#a78bfa', nav: () => navigation.navigate('Creator') },
          ].map(action => (
            <TouchableOpacity key={action.label} style={styles.actionCard} onPress={action.nav} activeOpacity={0.75}>
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Badges Section ───────────────────────────────────────────────── */}
        <View style={styles.badgesHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.badgeCount}>{earnedBadges.length}/{BADGE_DEFINITIONS.length} Earned</Text>
        </View>

        {/* Earned badges */}
        {earnedBadges.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={styles.badgeSubTitle}>⭐ Earned Badges</Text>
            <View style={{ gap: 10 }}>
              {earnedBadges.map((badge, i) => (
                <View key={i} style={styles.earnedBadgeCard}>
                  <Text style={{ fontSize: 28 }}>{badge.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>{badge.name}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{badge.description}</Text>
                    {badge.earnedAt && (
                      <Text style={{ fontSize: 10, color: '#10b981', marginTop: 3 }}>
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => shareBadge(badge)} style={styles.shareBtn}>
                    <Ionicons name="share-social-outline" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Available badges with progress bars */}
        <Text style={styles.badgeSubTitle}>🎯 Available Badges</Text>
        <View style={{ gap: 10, marginBottom: 16 }}>
          {BADGE_DEFINITIONS.filter(b => !earnedBadges.some((eb: any) => eb.id === b.id)).map((badge, i) => {
            let current = 0;
            const target = badge.requirement.count;
            if (badge.requirement.type === 'projects') current = projectsApproved;
            else if (badge.requirement.type === 'battles') current = battlesWon;
            else if (badge.requirement.type === 'teams') current = projectsContributing;
            else if (badge.requirement.type === 'challenges') current = 0;
            const pct = Math.min((current / target) * 100, 100);
            return (
              <View key={i} style={styles.lockedBadgeCard}>
                <Text style={{ fontSize: 26, opacity: 0.4 }}>{badge.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMuted }}>{badge.name}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>{badge.description}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Progress</Text>
                    <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{Math.round(pct)}%</Text>
                  </View>
                  <View style={styles.progBarBg}>
                    <View style={[styles.progBarFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
                    {current} / {target} {badge.requirement.type}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {earnedBadges.length === BADGE_DEFINITIONS.length && (
          <View style={[styles.card, { alignItems: 'center', padding: 24, marginBottom: 24 }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#f59e0b', marginBottom: 4 }}>Congratulations!</Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center' }}>
              You've earned all badges! You're a true coding master.
            </Text>
          </View>
        )}

        {/* ── Recent Achievements ──────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {achievements.slice(0, 4).map((ach, i) => (
            <View key={i} style={[styles.achCard, { minWidth: (SCREEN_WIDTH - SIZES.base * 2 - 10) / 2 - 5 }]}>
              <View style={styles.achIconBox}>
                <Ionicons
                  name={ach.type === 'challenge' ? 'code-slash' : ach.type === 'project' ? 'folder-open' : ach.type === 'battle' ? 'trophy' : 'flame'}
                  size={16} color="#f59e0b"
                />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, marginTop: 6 }} numberOfLines={2}>{ach.title}</Text>
              {ach.value > 0 && <Text style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>+{ach.value} pts</Text>}
            </View>
          ))}
        </View>



      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  scroll: { padding: SIZES.base, paddingBottom: 40 },

  // Header
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  greeting: { fontSize: 13, color: COLORS.textMuted },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  notifBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f59e0b20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  coinIcon: { fontSize: 13 },
  coinText: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Status row
  refreshRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#10b98115', borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#10b98130' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981' },
  liveText: { fontSize: 11, fontWeight: '600', color: '#10b981' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.full },
  refreshBtnText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  // Streak
  streakCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${COLORS.warning}15`, borderRadius: RADIUS.lg, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: `${COLORS.warning}35` },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakFire: { fontSize: 28 },
  streakCount: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  streakSub: { fontSize: 12, color: COLORS.textMuted },
  streakBadge: { backgroundColor: COLORS.warning, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  streakBadgeText: { fontSize: 10, fontWeight: '800', color: '#000' },

  // Shared
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: (SCREEN_WIDTH - SIZES.base * 2 - 20) / 3, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  statIcon: { fontSize: 20, marginBottom: 5 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  // Progress bars
  progBarBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progBarFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  // Weekly bar chart
  weeklyChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, marginBottom: 12 },
  barGroup: { flex: 1, alignItems: 'center', gap: 3 },
  bar: { width: '100%', borderRadius: 4, overflow: 'hidden', flexDirection: 'column', justifyContent: 'flex-end' },
  barSegment: { width: '100%' },
  barDayLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  barValueLabel: { fontSize: 9, color: COLORS.textSecondary, textAlign: 'center' },
  chartLegend: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textMuted },

  // Tags
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#ec489920', borderRadius: RADIUS.full },
  liveTagText: { fontSize: 10, fontWeight: '600', color: '#ec4899' },
  infoTag: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: `${COLORS.accent}20`, borderRadius: RADIUS.full },
  infoTagText: { fontSize: 10, fontWeight: '600', color: COLORS.accent },

  // Skill mini
  skillMiniCard: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, alignItems: 'center', minWidth: 72 },

  // Wallet
  walletGradient: { backgroundColor: '#f59e0b', borderRadius: RADIUS.lg, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20 },
  walletIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  walletBottom: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 14, borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.border, marginBottom: 24 },
  walletStat: { padding: 12, borderRadius: RADIUS.md, alignItems: 'center', gap: 4 },

  // Monthly chart filters
  filterPill: { flexDirection: 'row', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, padding: 3, gap: 1 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterBtnTxt: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  filterBtnTxtActive: { color: '#fff' },

  // Feature cards
  featureCard: { flex: 1, borderRadius: RADIUS.lg, padding: 16 },
  featureIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  featureSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  featureStats: { flexDirection: 'row', gap: 16 },
  featureStatVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  featureStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },

  // Heatmap
  heatmapDayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  heatmapDayLabel: { fontSize: 10, color: COLORS.textMuted, width: 20, textAlign: 'center' },
  heatmapWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  heatCell: { width: 20, height: 20, borderRadius: 3 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 8 },
  heatStat: { flex: 1, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, padding: 10, alignItems: 'center', gap: 3 },

  // Activity distribution
  distCard: { padding: 16, borderRadius: RADIUS.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, flex: 1 },

  // Projects
  projectStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  projectStatCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },

  // Quick actions
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionCard: { width: (SCREEN_WIDTH - SIZES.base * 2 - 40) / 5, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },

  // Badges
  badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  badgeCount: { fontSize: 13, color: COLORS.textMuted },
  badgeSubTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10, marginTop: 12 },
  earnedBadgeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#10b98115', borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: '#10b98130' },
  lockedBadgeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  shareBtn: { padding: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },

  // Achievements
  achCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  achIconBox: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: '#f59e0b20', justifyContent: 'center', alignItems: 'center' },

});



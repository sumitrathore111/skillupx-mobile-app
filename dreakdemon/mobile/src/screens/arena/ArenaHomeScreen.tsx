import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { acceptBattleInvite, fetchWallet, getBattleInvites, rejectBattleInvite } from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ArenaHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [w, inv] = await Promise.allSettled([fetchWallet(), getBattleInvites()]);
      if (w.status === 'fulfilled') setWallet(w.value);
      if (inv.status === 'fulfilled') setInvites(inv.value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = () => { setRefreshing(true); load(); };

  async function acceptInvite(inviteId: string) {
    try {
      const battle = await acceptBattleInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      navigation.navigate('BattleRoom', { battleId: battle.id || battle._id });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept invite');
    }
  }

  async function rejectInvite(inviteId: string) {
    try {
      await rejectBattleInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (e) {}
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Code Arena</Text>
            <Text style={styles.pageSubtitle}>⚔️ Compete, learn, and rank up</Text>
          </View>
          <View style={styles.coinBadge}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinText}>{wallet?.balance ?? 0}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          {[
            { label: 'Practice', icon: 'code-slash', color: COLORS.primary, onPress: () => navigation.navigate('ProblemList') },
            { label: 'Battle', icon: 'flash', color: '#FF6B6B', onPress: () => navigation.navigate('BattleLobby') },
            { label: 'Leaderboard', icon: 'trophy', color: COLORS.warning, onPress: () => navigation.navigate('Leaderboard') },
            { label: 'Wallet', icon: 'wallet', color: COLORS.success, onPress: () => navigation.navigate('Wallet') },
          ].map(action => (
            <TouchableOpacity key={action.label} style={styles.actionCard} onPress={action.onPress} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Battle Invites */}
        {invites.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Battle Invites 🎮</Text>
            {invites.map(invite => (
              <View key={invite.id || invite._id} style={styles.inviteCard}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteFrom}>{invite.senderName} challenged you!</Text>
                  <Text style={styles.inviteChallenge}>{invite.challengeTitle || 'Random problem'}</Text>
                </View>
                <View style={styles.inviteButtons}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptInvite(invite.id || invite._id)}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectInvite(invite.id || invite._id)}>
                    <Ionicons name="close" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Stats */}
        {wallet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              {[
                { label: 'Problems Solved', value: wallet.problemsSolved ?? 0, icon: '✅' },
                { label: 'Battles Won', value: wallet.battlesWon ?? 0, icon: '🏆' },
                { label: 'Battle Win Rate', value: `${wallet.winRate ?? 0}%`, icon: '⚔️' },
                { label: 'Total Earnings', value: `${wallet.totalEarned ?? 0} 🪙`, icon: '💰' },
              ].map(stat => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statEmoji}>{stat.icon}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Battle History */}
        <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('BattleHistory')}>
          <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.historyBtnText}>View Battle History</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  pageSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.warning}20`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: `${COLORS.warning}40` },
  coinEmoji: { fontSize: 16 },
  coinText: { fontSize: 15, fontWeight: '800', color: COLORS.warning },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 20 },
  actionCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 18, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: `${COLORS.primary}30`, marginBottom: 8, gap: 12 },
  inviteInfo: { flex: 1 },
  inviteFrom: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  inviteChallenge: { fontSize: 12, color: COLORS.textMuted },
  inviteButtons: { flexDirection: 'row', gap: 8 },
  acceptBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${COLORS.error}20`, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  historyBtnText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
});

import type { ProjectInvite } from '@apptypes/index';
import { COLORS, RADIUS, SHADOWS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchMyInvites, respondToInvite } from '@services/creatorService';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY = COLORS.primary;
const GLASS = 'rgba(255,255,255,0.05)';
const GLASS_BORDER = 'rgba(255,255,255,0.08)';

export default function MyInvitesScreen() {
  const navigation = useNavigation<any>();
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      const data = await fetchMyInvites();
      setInvites(data.filter(i => i.status === 'pending'));
    } catch (e) {
      console.error('loadInvites', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  const handleRespond = async (inviteId: string, response: 'accepted' | 'declined') => {
    setResponding(inviteId);
    try {
      const result = await respondToInvite(inviteId, response);
      setInvites(prev => prev.filter(i => (i._id || i.id) !== inviteId));
      if (response === 'accepted' && result.projectId) {
        Alert.alert('Welcome!', 'You\'ve joined the project.', [
          {
            text: 'Open Workspace',
            onPress: () => navigation.navigate('ProjectWorkspace', {
              projectId: result.projectId,
              projectTitle: '',
            }),
          },
          { text: 'OK' },
        ]);
      } else if (response === 'declined') {
        Alert.alert('Declined', 'Invitation has been declined.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e.message || 'Failed to respond');
    } finally {
      setResponding(null);
    }
  };

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';

  const renderInvite = ({ item }: { item: ProjectInvite }) => {
    const id = item._id || item.id;
    const isResponding = responding === id;
    const timeLeft = getTimeLeft(item.expiresAt);
    const isExpired = timeLeft === 'Expired';

    return (
      <View style={S.inviteCard}>
        {/* Gradient accent */}
        <LinearGradient
          colors={[PRIMARY + '30', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.cardGradient}
        />

        {/* Inviter */}
        <View style={S.inviterRow}>
          <View style={S.inviterAvatar}>
            <Text style={S.inviterAvatarText}>{getInitials(item.invitedBy?.name || 'U')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.inviterName}>{item.invitedBy?.name || 'Someone'}</Text>
            <Text style={S.inviterAction}>invited you to a project</Text>
          </View>
          <View style={[S.timeBadge, isExpired && { backgroundColor: COLORS.danger + '20' }]}>
            <Ionicons name="time-outline" size={11} color={isExpired ? COLORS.danger : COLORS.warning} />
            <Text style={[S.timeText, isExpired && { color: COLORS.danger }]}>{timeLeft}</Text>
          </View>
        </View>

        {/* Project Info */}
        <View style={S.projectSection}>
          <View style={S.projectIcon}>
            <Ionicons name="rocket" size={20} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.projectTitle}>{item.projectId?.title || 'Unknown Project'}</Text>
            {item.projectId?.description && (
              <Text style={S.projectDesc} numberOfLines={2}>{item.projectId.description}</Text>
            )}
            <View style={S.projectMeta}>
              {item.projectId?.category && (
                <View style={S.categoryChip}>
                  <Text style={S.categoryText}>{item.projectId.category}</Text>
                </View>
              )}
              {item.projectId?.status && (
                <View style={[S.statusChip, { backgroundColor: COLORS.success + '15' }]}>
                  <Text style={[S.statusText, { color: COLORS.success }]}>{item.projectId.status}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Personal Message */}
        {item.message && (
          <View style={S.messageBox}>
            <Ionicons name="chatbubble-ellipses" size={12} color={COLORS.textMuted} />
            <Text style={S.messageText}>"{item.message}"</Text>
          </View>
        )}

        {/* Actions */}
        {!isExpired && (
          <View style={S.actions}>
            <TouchableOpacity
              style={S.declineBtn}
              onPress={() => handleRespond(id, 'declined')}
              disabled={isResponding}
            >
              <Ionicons name="close" size={16} color={COLORS.danger} />
              <Text style={S.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.acceptBtn, isResponding && { opacity: 0.6 }]}
              onPress={() => handleRespond(id, 'accepted')}
              disabled={isResponding}
            >
              <LinearGradient
                colors={[COLORS.success, '#16A34A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.acceptBtnGradient}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={S.acceptBtnText}>Accept & Join</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={S.root} edges={['top']}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>My Invitations</Text>
          <Text style={S.headerSub}>{invites.length} pending invite{invites.length !== 1 ? 's' : ''}</Text>
        </View>
        {invites.length > 0 && (
          <View style={S.badge}>
            <Text style={S.badgeText}>{invites.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={S.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={item => item._id || item.id}
          renderItem={renderInvite}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInvites(); }} tintColor={PRIMARY} />}
          ListEmptyComponent={
            <View style={S.centered}>
              <View style={S.emptyIconWrap}>
                <Ionicons name="mail-unread-outline" size={56} color={COLORS.textMuted} />
              </View>
              <Text style={S.emptyTitle}>No Pending Invitations</Text>
              <Text style={S.emptyDesc}>When someone invites you to a project, it'll appear here.</Text>
              <TouchableOpacity style={S.browseBtn} onPress={() => navigation.goBack()}>
                <Text style={S.browseBtnText}>Browse Projects</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: GLASS_BORDER, gap: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GLASS, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  badge: {
    minWidth: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.danger,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // Invite Card
  inviteCard: {
    backgroundColor: GLASS, borderRadius: RADIUS.xl, padding: 18,
    borderWidth: 1, borderColor: GLASS_BORDER, gap: 16, overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },

  inviterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 1 },
  inviterAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: PRIMARY + '25',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: PRIMARY + '40',
  },
  inviterAvatarText: { fontSize: 14, fontWeight: '800', color: PRIMARY },
  inviterName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  inviterAction: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: COLORS.warning + '15', borderRadius: RADIUS.full,
  },
  timeText: { fontSize: 10, fontWeight: '700', color: COLORS.warning },

  projectSection: { flexDirection: 'row', gap: 12 },
  projectIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  projectTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  projectDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginTop: 3 },
  projectMeta: { flexDirection: 'row', gap: 8, marginTop: 8 },
  categoryChip: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: PRIMARY + '15', borderRadius: RADIUS.full },
  categoryText: { fontSize: 10, fontWeight: '600', color: PRIMARY },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 10, fontWeight: '600' },

  messageBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.md,
    borderLeftWidth: 3, borderLeftColor: PRIMARY + '40',
  },
  messageText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 17 },

  actions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.danger + '40',
  },
  declineBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.danger },
  acceptBtn: { flex: 2, borderRadius: RADIUS.lg, overflow: 'hidden' },
  acceptBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Empty
  emptyIconWrap: { marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  browseBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: PRIMARY, borderRadius: RADIUS.lg },
  browseBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getMyInvites, respondToInvite } from '@services/notificationService';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyInvitesScreen() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getMyInvites();
      setInvites(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (id: string, response: 'accept' | 'decline') => {
    setResponding(id);
    try {
      await respondToInvite(id, response);
      setInvites(prev => prev.filter(i => (i._id || i.id) !== id));
      Alert.alert('Done', response === 'accept' ? 'Invite accepted! You have joined the project.' : 'Invite declined.');
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to respond'); }
    finally { setResponding(null); }
  };

  const getTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const expiry = created + 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const remaining = expiry - now;
    if (remaining <= 0) return 'Expired';
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
  };

  const renderInvite = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}><Text style={{ fontSize: 20 }}>{item.inviterAvatar || '🧑‍💻'}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviterName}>{item.inviterName || 'A developer'}</Text>
          <Text style={styles.inviteText}>invited you to join</Text>
        </View>
        <View style={styles.timeBadge}><Ionicons name="time-outline" size={12} color={COLORS.warning} /><Text style={styles.timeText}>{getTimeRemaining(item.createdAt)}</Text></View>
      </View>
      <View style={styles.projectInfo}>
        <Ionicons name="rocket" size={16} color={COLORS.primary} />
        <Text style={styles.projectTitle}>{item.projectTitle || item.projectName || 'Untitled Project'}</Text>
      </View>
      {item.message && <Text style={styles.message}>{item.message}</Text>}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineBtn} onPress={() => handleRespond(item._id || item.id, 'decline')} disabled={responding === (item._id || item.id)}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRespond(item._id || item.id, 'accept')} disabled={responding === (item._id || item.id)}>
          {responding === (item._id || item.id) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptText}>Accept</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Project Invites</Text></View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={invites} renderItem={renderInvite} keyExtractor={i => i._id || i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<View style={styles.centered}><Ionicons name="mail-open-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No pending invites</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  inviterName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  inviteText: { fontSize: 12, color: COLORS.textMuted },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.warning + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  timeText: { fontSize: 10, color: COLORS.warning, fontWeight: '600' },
  projectInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.background, padding: 10, borderRadius: RADIUS.md },
  projectTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  message: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.danger + '15', alignItems: 'center' },
  declineText: { fontSize: 13, fontWeight: '700', color: COLORS.danger },
  acceptBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.success, alignItems: 'center' },
  acceptText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});

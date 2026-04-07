import type { ConnectionRequest } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    acceptConnectionRequest,
    fetchReceivedRequests,
    fetchSentRequests,
    rejectConnectionRequest,
} from '@services/connectService';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EMOJIS = ['😎', '🚀', '💻', '🔥', '⚡', '🎯', '🧠', '✨', '🎮', '🤖'];

export default function ConnectionRequestsScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [received, setReceived] = useState<ConnectionRequest[]>([]);
  const [sent, setSent] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([fetchReceivedRequests(), fetchSentRequests()]);
      setReceived(r);
      setSent(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(req: ConnectionRequest) {
    const reqId = req.id || req._id!;
    setProcessing(reqId);
    try {
      await acceptConnectionRequest(reqId);
      setReceived((prev) => prev.filter((r) => (r.id || r._id) !== reqId));
    } catch {
      Alert.alert('Error', 'Failed to accept');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(req: ConnectionRequest) {
    const reqId = req.id || req._id!;
    setProcessing(reqId);
    try {
      await rejectConnectionRequest(reqId);
      setReceived((prev) => prev.filter((r) => (r.id || r._id) !== reqId));
    } catch {
      Alert.alert('Error', 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  }

  function renderReceived({ item }: { item: ConnectionRequest }) {
    const reqId = item.id || item._id!;
    const emoji = EMOJIS[item.senderId.charCodeAt(0) % EMOJIS.length];
    const isProcessing = processing === reqId;
    return (
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.avatarEmoji}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{item.senderName}</Text>
          <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={s.acceptBtn}
          onPress={() => handleAccept(item)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size={12} color="#fff" />
          ) : (
            <Text style={s.acceptBtnText}>Accept</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={s.rejectBtnSmall}
          onPress={() => handleReject(item)}
          disabled={isProcessing}
        >
          <Ionicons name="close" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderSent({ item }: { item: ConnectionRequest }) {
    const emoji = EMOJIS[item.receiverId.charCodeAt(0) % EMOJIS.length];
    return (
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.avatarEmoji}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{item.receiverName}</Text>
          <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        <View style={s.pendingChip}>
          <Ionicons name="time-outline" size={12} color={COLORS.warning} />
          <Text style={s.pendingChipText}>Pending</Text>
        </View>
      </View>
    );
  }

  const data = tab === 'received' ? received : sent;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Connection Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'received' && s.tabActive]}
          onPress={() => setTab('received')}
        >
          <Text style={[s.tabText, tab === 'received' && s.tabTextActive]}>
            Received{received.length > 0 ? ` (${received.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'sent' && s.tabActive]}
          onPress={() => setTab('sent')}
        >
          <Text style={[s.tabText, tab === 'sent' && s.tabTextActive]}>
            Sent{sent.length > 0 ? ` (${sent.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={tab === 'received' ? renderReceived : renderSent}
          keyExtractor={(item, i) => item.id || item._id || String(i)}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons
                name={tab === 'received' ? 'mail-open-outline' : 'paper-plane-outline'}
                size={40}
                color={COLORS.textMuted}
              />
              <Text style={s.emptyText}>
                {tab === 'received' ? 'No pending requests' : 'No sent requests'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },

  tabs: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },

  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 22 },
  name: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  time: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  acceptBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtnSmall: { padding: 6 },

  pendingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.warning}15`, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  pendingChipText: { fontSize: 11, color: COLORS.warning, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});

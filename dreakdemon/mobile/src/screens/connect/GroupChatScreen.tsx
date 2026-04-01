import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    approveJoinRequest,
    fetchGroupDetail,
    fetchGroupMessages,
    rejectJoinRequest,
    requestJoinGroup,
    sendGroupMessage,
} from '@services/connectService';
import { getSocket, initializeSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert,
    FlatList,
    KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { groupId: string; groupName: string };

const LEVEL_COLORS: Record<string, string> = {
  Beginner: COLORS.success,
  Intermediate: COLORS.warning,
  Advanced: COLORS.danger,
};

export default function GroupChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { groupId, groupName } = route.params as RouteParams;
  const { user } = useAuthStore();

  const [group, setGroup] = useState<any>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const isMember = group?.members?.some(
    (m: any) => (m.userId || m._id || m.id) === user?.id
  );
  const isAdmin =
    isMember &&
    group?.members?.some(
      (m: any) =>
        (m.userId || m._id || m.id) === user?.id &&
        (m.role === 'admin' || m.role === 'creator')
    );
  const hasPendingRequest = group?.joinRequests?.some(
    (r: any) => r.userId === user?.id && r.status === 'pending'
  );

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  async function loadGroup() {
    try {
      const data = await fetchGroupDetail(groupId);
      setGroup(data);
    } catch (e) {
      console.error('Failed to load group detail:', e);
    } finally {
      setLoadingGroup(false);
    }
  }

  useEffect(() => {
    if (!isMember) return;
    setLoadingMessages(true);
    loadMessages();
    initializeSocket().then(() => {
      const socket = getSocket();
      if (socket) {
        socket.emit('join-group', groupId);
        socket.on('groupMessage', (msg: any) => {
          setMessages(prev => {
            const exists = prev.some(m => (m._id || m.id) === (msg._id || msg.id));
            return exists ? prev : [msg, ...prev];
          });
        });
        socket.on('newGroupMessage', (data: any) => {
          if (data.groupId === groupId && data.message) {
            setMessages(prev => {
              const exists = prev.some(m => (m._id || m.id) === (data.message._id || data.message.id));
              return exists ? prev : [data.message, ...prev];
            });
          }
        });
        socket.on('requestApproved', (data: any) => {
          if (data.groupId === groupId) loadGroup();
        });
        socket.on('requestRejected', (data: any) => {
          if (data.groupId === groupId) loadGroup();
        });
        socket.on('memberJoined', (data: any) => {
          if (data.groupId === groupId) loadGroup();
        });
        socket.on('groupUpdated', (data: any) => {
          if (data.groupId === groupId && data.group) setGroup(data.group);
        });
      }
    });
    return () => {
      const s = getSocket();
      s?.emit('leave-group', groupId);
      s?.off('groupMessage');
      s?.off('newGroupMessage');
      s?.off('requestApproved');
      s?.off('requestRejected');
      s?.off('memberJoined');
      s?.off('groupUpdated');
    };
  }, [isMember, groupId]);

  async function loadMessages() {
    try {
      const msgs = await fetchGroupMessages(groupId);
      setMessages([...msgs].reverse());
    } catch (e) { console.error(e); }
    finally { setLoadingMessages(false); }
  }

  async function handleSend() {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId, content: text, message: text,
      senderId: user?.id, senderName: user?.name,
      createdAt: new Date().toISOString(), _optimistic: true,
    };
    setMessages(prev => [optimistic, ...prev]);
    try {
      const sent = await sendGroupMessage(groupId, text);
      setMessages(prev => prev.map(m => m._id === tempId ? { ...sent, _optimistic: false } : m));
    } catch {
      Alert.alert('Error', 'Failed to send');
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setInputText(text);
    } finally { setSending(false); }
  }

  async function handleJoin() {
    setJoining(true);
    try {
      await requestJoinGroup(groupId);
      Alert.alert('Request Sent', 'Your join request has been sent to the group admin.', [
        { text: 'OK', onPress: loadGroup },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send join request');
    } finally { setJoining(false); }
  }

  async function handleApprove(requestUserId: string) {
    setProcessingRequest(requestUserId);
    try {
      await approveJoinRequest(groupId, requestUserId);
      await loadGroup();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve request');
    } finally { setProcessingRequest(null); }
  }

  async function handleReject(requestUserId: string) {
    setProcessingRequest(requestUserId);
    try {
      await rejectJoinRequest(groupId, requestUserId);
      await loadGroup();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject request');
    } finally { setProcessingRequest(null); }
  }

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isOwn = item.senderId === user?.id || item.sender?._id === user?.id;
    const name = item.senderName || item.sender?.name || '';
    return (
      <View style={[styles.messageWrapper, isOwn ? styles.ownWrapper : styles.theirWrapper]}>
        {!isOwn && (
          <View style={styles.msgAvatar}>
            <Text style={styles.msgAvatarText}>{name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={styles.msgContent}>
          {!isOwn && <Text style={styles.senderName}>{name}</Text>}
          <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.theirBubble, item._optimistic && { opacity: 0.6 }]}>
            <Text style={[styles.messageText, isOwn && styles.ownText]}>
              {item.content || item.message}
            </Text>
          </View>
          <Text style={[styles.timeText, isOwn && { textAlign: 'right' }]}>
            {item.createdAt ? formatTime(item.createdAt) : ''}
          </Text>
        </View>
      </View>
    );
  }, [user]);

  if (loadingGroup) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle} numberOfLines={1}>{group?.name || groupName}</Text>
          <Text style={styles.headerSub}>
            {group?.members?.length || 0}/{group?.maxMembers || '?'} members
          </Text>
        </View>
        {group?.level && (
          <View style={[styles.levelBadge, {
            backgroundColor: `${LEVEL_COLORS[group.level] || COLORS.primary}25`,
            borderColor: LEVEL_COLORS[group.level] || COLORS.primary,
          }]}>
            <Text style={[styles.levelText, { color: LEVEL_COLORS[group.level] || COLORS.primary }]}>
              {group.level[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Group Info Card */}
      {group && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.topicChip}>
              <Ionicons name="bookmark-outline" size={11} color={COLORS.accent} />
              <Text style={styles.topicText}>{group.topic}</Text>
            </View>
            <Text style={styles.levelFullText}>{group.level}</Text>
          </View>
          {!!group.description && (
            <Text style={styles.infoDesc} numberOfLines={2}>{group.description}</Text>
          )}
          {/* Member avatars */}
          {group.members?.length > 0 && (
            <View style={styles.membersRow}>
              {group.members.slice(0, 8).map((m: any, i: number) => (
                <View
                  key={m.userId || m._id || i}
                  style={[styles.memberAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 20 - i },
                    m.role === 'creator' && styles.creatorAvatar]}
                >
                  <Text style={styles.memberAvatarText}>
                    {(m.name || m.userName || '?')[0].toUpperCase()}
                  </Text>
                  {m.role === 'creator' && <Text style={styles.crownEmoji}>👑</Text>}
                </View>
              ))}
              {group.members.length > 8 && (
                <View style={[styles.memberAvatar, styles.moreAvatar, { marginLeft: -8 }]}>
                  <Text style={styles.moreAvatarText}>+{group.members.length - 8}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Admin: pending join requests */}
      {isAdmin && group?.joinRequests?.filter((r: any) => r.status === 'pending').length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>
            ⏳ {group.joinRequests.filter((r: any) => r.status === 'pending').length} Pending Request(s)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {group.joinRequests.filter((r: any) => r.status === 'pending').map((req: any) => (
              <View key={req.userId} style={styles.pendingCard}>
                <View style={styles.pendingAvatar}>
                  <Text style={styles.pendingAvatarText}>{(req.userName || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.pendingName} numberOfLines={1}>{req.userName}</Text>
                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={[styles.approveBtn, processingRequest === req.userId && { opacity: 0.5 }]}
                    onPress={() => handleApprove(req.userId)}
                    disabled={processingRequest === req.userId}
                  >
                    {processingRequest === req.userId
                      ? <ActivityIndicator size={10} color="#fff" />
                      : <Ionicons name="checkmark" size={13} color="#fff" />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, processingRequest === req.userId && { opacity: 0.5 }]}
                    onPress={() => handleReject(req.userId)}
                    disabled={processingRequest === req.userId}
                  >
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Non-member: join prompt */}
      {!isMember ? (
        <View style={styles.joinSection}>
          <View style={styles.joinIcon}>
            <Ionicons name="people" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.joinTitle}>Join this group</Text>
          <Text style={styles.joinDesc}>
            {hasPendingRequest
              ? 'Your request is pending approval from the group admin.'
              : 'Request to join and start chatting with this community.'}
          </Text>
          {!hasPendingRequest ? (
            <TouchableOpacity
              style={[styles.joinBtn, joining && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.joinBtnText}>Request to Join</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={14} color={COLORS.warning} />
              <Text style={styles.pendingBadgeText}>Request Pending</Text>
            </View>
          )}
        </View>
      ) : (
        /* Member: chat */
        <>
          {loadingMessages ? (
            <View style={styles.centered}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, i) => item._id || item.id || String(i)}
              inverted
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No messages yet, say hi! 👋</Text>}
            />
          )}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Message group..."
                placeholderTextColor={COLORS.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() || sending) && styles.disabled]}
                onPress={handleSend}
                disabled={!inputText.trim() || sending}
              >
                {sending ? <ActivityIndicator size={16} color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerMeta: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 11, color: COLORS.textMuted },
  levelBadge: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  levelText: { fontSize: 12, fontWeight: '800' },
  infoCard: {
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topicChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.accent}15`, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  topicText: { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  levelFullText: { fontSize: 11, color: COLORS.textMuted },
  infoDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  membersRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  memberAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.surface, position: 'relative',
  },
  creatorAvatar: { borderColor: COLORS.warning },
  memberAvatarText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  crownEmoji: { position: 'absolute', top: -9, right: -4, fontSize: 9 },
  moreAvatar: { backgroundColor: COLORS.border },
  moreAvatarText: { fontSize: 8, color: COLORS.textMuted, fontWeight: '700' },
  pendingSection: {
    marginHorizontal: 12, marginBottom: 6,
    backgroundColor: `${COLORS.warning}12`, borderRadius: RADIUS.lg,
    padding: 10, borderWidth: 1, borderColor: `${COLORS.warning}30`,
  },
  pendingTitle: { fontSize: 12, color: COLORS.warning, fontWeight: '700', marginBottom: 8 },
  pendingCard: {
    alignItems: 'center', gap: 4, marginRight: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 8, width: 72,
  },
  pendingAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  pendingAvatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pendingName: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', maxWidth: 60, textAlign: 'center' },
  pendingActions: { flexDirection: 'row', gap: 4 },
  approveBtn: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center',
  },
  rejectBtn: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.danger,
    justifyContent: 'center', alignItems: 'center',
  },
  joinSection: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  joinIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${COLORS.primary}20`, justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  joinTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  joinDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: RADIUS.lg, marginTop: 8,
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${COLORS.warning}20`, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: `${COLORS.warning}50`,
  },
  pendingBadgeText: { color: COLORS.warning, fontWeight: '600', fontSize: 13 },
  list: { padding: 12, paddingBottom: 4 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 60, fontSize: 14 },
  messageWrapper: { marginVertical: 3, maxWidth: '78%', flexDirection: 'row', gap: 6 },
  ownWrapper: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  theirWrapper: { alignSelf: 'flex-start' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', flexShrink: 0,
  },
  msgAvatarText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  msgContent: { flex: 1, gap: 2 },
  senderName: { fontSize: 10, color: COLORS.accent, fontWeight: '600', marginLeft: 2 },
  bubble: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  ownBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 19 },
  ownText: { color: '#fff' },
  timeText: { fontSize: 10, color: COLORS.textMuted, marginHorizontal: 2 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 110, backgroundColor: COLORS.background,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.45 },
});

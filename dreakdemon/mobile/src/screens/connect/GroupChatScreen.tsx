import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    approveJoinRequest,
    createRoom,
    deleteGroupMessage,
    deleteRoom,
    editGroupMessage,
    fetchGroupDetail,
    fetchGroupMessages,
    leaveGroup,
    rejectJoinRequest,
    removeMemberFromGroup,
    requestJoinGroup,
    sendGroupMessage,
} from '@services/connectService';
import { getSocket, initializeSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { groupId: string; groupName: string };

function getDiceBearUri(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(seed)}&size=96`;
}

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
  const [showMembers, setShowMembers] = useState(false);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [activeRoom, setActiveRoom] = useState('general');
  const [rooms, setRooms] = useState<any[]>([]);
  const [showRooms, setShowRooms] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'text' | 'voice'>('text');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const activeRoomRef = useRef(activeRoom);

  // Keep ref in sync for socket callbacks
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  const isMember = group?.members?.some(
    (m: any) => (m.userId || m._id || m.id) === user?.id,
  );
  const isAdmin =
    isMember &&
    group?.members?.some(
      (m: any) =>
        (m.userId || m._id || m.id) === user?.id &&
        (m.role === 'admin' || m.role === 'creator'),
    );
  const hasPendingRequest = group?.joinRequests?.some(
    (r: any) => r.userId === user?.id && r.status === 'pending',
  );
  const isOpen = group?.isPrivate === false;

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  async function loadGroup() {
    try {
      const data = await fetchGroupDetail(groupId);
      setGroup(data);
      setRooms(data.rooms?.length ? data.rooms : [{ roomId: 'general', name: 'general', type: 'text' }]);
    } catch (e) {
      console.error('Failed to load group:', e);
    } finally {
      setLoadingGroup(false);
    }
  }

  // Load messages when room changes
  useEffect(() => {
    if (!isMember) return;
    setLoadingMessages(true);
    loadMessages();
  }, [isMember, activeRoom]);

  // Socket connection — only subscribe once per group (not per room change)
  useEffect(() => {
    if (!isMember) return;
    let mounted = true;
    initializeSocket().then(() => {
      if (!mounted) return;
      const socket = getSocket();
      if (!socket) return;
      socket.emit('join-group', groupId);
      socket.on('groupMessage', (msg: any) => {
        if (!mounted) return;
        onNewMsg(msg);
      });
      socket.on('newGroupMessage', (data: any) => {
        if (!mounted || data.groupId !== groupId || !data.message) return;
        onNewMsg(data.message);
      });
      socket.on('groupMessageEdited', (data: any) => {
        if (!mounted || data.groupId !== groupId || !data.message) return;
        setMessages((prev) =>
          prev.map((m) =>
            (m._id || m.id) === (data.message._id || data.message.id) ? data.message : m,
          ),
        );
      });
      socket.on('groupMessageDeleted', (data: any) => {
        if (!mounted || data.groupId !== groupId || !data.messageId) return;
        setMessages((prev) => prev.filter((m) => (m._id || m.id) !== data.messageId));
      });
      socket.on('requestApproved', (d: any) => d.groupId === groupId && loadGroup());
      socket.on('requestRejected', (d: any) => d.groupId === groupId && loadGroup());
      socket.on('memberJoined', (d: any) => d.groupId === groupId && loadGroup());
      socket.on('memberRemoved', (d: any) => d.groupId === groupId && loadGroup());
      socket.on('roomCreated', (d: any) => {
        if (d.groupId === groupId && d.room) setRooms(prev => [...prev, d.room]);
      });
      socket.on('roomDeleted', (d: any) => {
        if (d.groupId === groupId) {
          setRooms(prev => prev.filter(r => r.roomId !== d.roomId));
          if (activeRoomRef.current === d.roomId) { setActiveRoom('general'); }
        }
      });
      socket.on('groupUpdated', (d: any) => {
        if (d.groupId === groupId && d.group) setGroup(d.group);
      });
    });
    return () => {
      mounted = false;
      const s = getSocket();
      s?.emit('leave-group', groupId);
      [
        'groupMessage',
        'newGroupMessage',
        'groupMessageEdited',
        'groupMessageDeleted',
        'requestApproved',
        'requestRejected',
        'memberJoined',
        'memberRemoved',
        'roomCreated',
        'roomDeleted',
        'groupUpdated',
      ].forEach((e) => s?.off(e));
    };
  }, [isMember, groupId]);

  function onNewMsg(msg: any) {
    const msgId = msg._id || msg.id;
    setMessages((prev) => {
      // If this message already exists (by real ID), skip
      if (prev.some((m) => (m._id || m.id) === msgId)) return prev;
      // Remove any optimistic message that matches this content (sent by us)
      const filtered = prev.filter(
        (m) => !(m._optimistic && m.content === msg.content && m.senderId === msg.senderId),
      );
      return [msg, ...filtered];
    });
  }

  async function loadMessages() {
    try {
      const msgs = await fetchGroupMessages(groupId, activeRoom);
      setMessages([...msgs].reverse());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleSend() {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    if (editingMsg) {
      try {
        await editGroupMessage(groupId, editingMsg._id || editingMsg.id, text);
        setEditingMsg(null);
      } catch {
        Alert.alert('Error', 'Failed to edit message');
        setInputText(text);
      } finally {
        setSending(false);
      }
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      content: text,
      message: text,
      senderId: user?.id,
      senderName: user?.name,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [optimistic, ...prev]);
    try {
      const sent = await sendGroupMessage(groupId, text, activeRoom);
      const sentId = sent._id || sent.id;
      setMessages((prev) => {
        // If socket already delivered this message, just remove the optimistic one
        const alreadyFromSocket = prev.some(
          (m) => !m._optimistic && (m._id || m.id) === sentId,
        );
        if (alreadyFromSocket) {
          return prev.filter((m) => m._id !== tempId);
        }
        // Otherwise replace optimistic with the real message
        return prev.map((m) => (m._id === tempId ? { ...sent, _optimistic: false } : m));
      });
    } catch {
      Alert.alert('Error', 'Failed to send');
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  function handleMsgLongPress(msg: any) {
    const isOwn = msg.senderId === user?.id || msg.sender?._id === user?.id;
    if (!isOwn && !isAdmin) return;

    const options: any[] = [];
    if (isOwn) {
      options.push({
        text: 'Edit',
        onPress: () => {
          setEditingMsg(msg);
          setInputText(msg.content || msg.message);
        },
      });
    }
    options.push({
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          await deleteGroupMessage(groupId, msg._id || msg.id);
        } catch {
          Alert.alert('Error', 'Failed to delete');
        }
      },
    });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message Options', undefined, options);
  }

  async function handleJoin() {
    setJoining(true);
    try {
      await requestJoinGroup(groupId);
      if (isOpen) {
        await loadGroup();
      } else {
        Alert.alert('Request Sent', 'Waiting for admin approval.', [
          { text: 'OK', onPress: loadGroup },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  }

  async function handleApprove(requestUserId: string) {
    setProcessingRequest(requestUserId);
    try {
      await approveJoinRequest(groupId, requestUserId);
      await loadGroup();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve');
    } finally {
      setProcessingRequest(null);
    }
  }

  async function handleReject(requestUserId: string) {
    setProcessingRequest(requestUserId);
    try {
      await rejectJoinRequest(groupId, requestUserId);
      await loadGroup();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject');
    } finally {
      setProcessingRequest(null);
    }
  }

  function handleRemoveMember(memberId: string, memberName: string) {
    Alert.alert('Remove Member', `Remove ${memberName} from the group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMemberFromGroup(groupId, memberId);
            await loadGroup();
          } catch {
            Alert.alert('Error', 'Failed to remove member');
          }
        },
      },
    ]);
  }

  function handleLeaveGroup() {
    Alert.alert('Leave Group', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(groupId);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to leave');
          }
        },
      },
    ]);
  }

  function switchRoom(roomId: string) {
    setActiveRoom(roomId);
    setShowRooms(false);
    setMessages([]);
  }

  async function handleCreateRoom() {
    if (!newRoomName.trim()) return;
    setCreatingRoom(true);
    try {
      const res = await createRoom(groupId, newRoomName.trim(), newRoomType);
      if (res.group) {
        setRooms(res.group.rooms || []);
      }
      setNewRoomName('');
      setNewRoomType('text');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleDeleteRoom(roomId: string) {
    Alert.alert('Delete Room', `Delete #${roomId}? All messages will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await deleteRoom(groupId, roomId);
            if (res.group) setRooms(res.group.rooms || []);
            if (activeRoom === roomId) setActiveRoom('general');
          } catch {
            Alert.alert('Error', 'Failed to delete room');
          }
        }
      }
    ]);
  }

  const renderMessage = useCallback(
    ({ item }: { item: any }) => {
      const isOwn = item.senderId === user?.id || item.sender?._id === user?.id;
      const name = item.senderName || item.sender?.name || item.name || '';
      return (
        <TouchableOpacity
          onLongPress={() => handleMsgLongPress(item)}
          activeOpacity={0.9}
          style={[st.msgRow, isOwn ? st.msgRowOwn : st.msgRowTheir]}
        >
          {!isOwn && (
            <View style={st.msgAvatar}>
              <Image source={{ uri: getDiceBearUri(name) }} style={{ width: 26, height: 26, borderRadius: 13 }} />
            </View>
          )}
          <View style={{ maxWidth: '80%', gap: 2 }}>
            {!isOwn && <Text style={st.senderName}>{name}</Text>}
            <View
              style={[
                st.bubble,
                isOwn ? st.bubbleOwn : st.bubbleTheir,
                item._optimistic && { opacity: 0.6 },
              ]}
            >
              <Text style={[st.bubbleText, isOwn && { color: '#fff' }]}>
                {item.content || item.message}
              </Text>
              {item.isEdited && (
                <Text style={[st.editedLbl, !isOwn && { color: COLORS.textMuted }]}>(edited)</Text>
              )}
            </View>
            <Text style={[st.time, isOwn && { textAlign: 'right' }]}>
              {(item.createdAt || item.timestamp) ? formatTime(item.createdAt || item.timestamp) : ''}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [user, isAdmin],
  );

  if (loadingGroup) {
    return (
      <View style={st.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const pendingRequests =
    group?.joinRequests?.filter((r: any) => r.status === 'pending') || [];

  return (
    <SafeAreaView style={st.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons
              name={isOpen ? 'globe-outline' : 'lock-closed-outline'}
              size={14}
              color={COLORS.textMuted}
            />
            <Text style={st.headerTitle} numberOfLines={1}>
              {group?.name || groupName}
            </Text>
          </View>
          <Text style={st.headerSub}>
            {group?.members?.length || 0} members · {group?.topic}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowMembers(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="people-outline" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
        {isMember && !isAdmin && (
          <TouchableOpacity onPress={handleLeaveGroup} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="exit-outline" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Room channel bar (Discord-like) */}
      {isMember && rooms.length > 0 && (
        <View style={st.roomBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingHorizontal: 12 }}>
            {rooms.filter((r: any) => r.type !== 'voice').map((room: any) => (
              <TouchableOpacity
                key={room.roomId}
                style={[st.roomChip, activeRoom === room.roomId && st.roomChipActive]}
                onPress={() => switchRoom(room.roomId)}
                onLongPress={() => isAdmin && room.roomId !== 'general' ? handleDeleteRoom(room.roomId) : null}
              >
                <Text style={st.roomHash}>#</Text>
                <Text style={[st.roomChipText, activeRoom === room.roomId && st.roomChipTextActive]}>{room.name}</Text>
              </TouchableOpacity>
            ))}
            {rooms.filter((r: any) => r.type === 'voice').map((room: any) => (
              <TouchableOpacity
                key={room.roomId}
                style={[st.roomChip, st.voiceRoomChip]}
                onPress={() => navigation.navigate('VoiceRoom', { groupId, roomId: room.roomId, roomName: room.name, groupName: group?.name || groupName })}
                onLongPress={() => isAdmin && room.roomId !== 'general' ? handleDeleteRoom(room.roomId) : null}
              >
                <Ionicons name="mic" size={12} color={COLORS.success} />
                <Text style={[st.roomChipText, { color: COLORS.success }]}>{room.name}</Text>
              </TouchableOpacity>
            ))}
            {isAdmin && (
              <TouchableOpacity style={st.roomAddBtn} onPress={() => setShowRooms(true)}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Admin: pending join requests */}
      {isAdmin && pendingRequests.length > 0 && (
        <View style={st.pendingBar}>
          <Text style={st.pendingBarText}>
            {pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {pendingRequests.map((req: any) => (
              <View key={req.userId} style={st.pendingItem}>
                <View style={st.pendingAvatar}>
                  <Image source={{ uri: getDiceBearUri(req.userName || '?') }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                </View>
                <Text style={st.pendingName} numberOfLines={1}>
                  {req.userName}
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity
                    style={st.approveBtn}
                    onPress={() => handleApprove(req.userId)}
                    disabled={processingRequest === req.userId}
                  >
                    {processingRequest === req.userId ? (
                      <ActivityIndicator size={10} color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.rejectBtn}
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
        <View style={st.joinSection}>
          <Ionicons
            name={isOpen ? 'globe-outline' : 'lock-closed-outline'}
            size={48}
            color={COLORS.primary}
          />
          <Text style={st.joinTitle}>{isOpen ? 'Open Group' : 'Private Group'}</Text>
          <Text style={st.joinDesc}>
            {hasPendingRequest
              ? 'Your request is pending admin approval.'
              : isOpen
              ? 'This group is open. Tap to join!'
              : 'Send a join request to participate.'}
          </Text>
          {!hasPendingRequest ? (
            <TouchableOpacity
              style={[st.joinBtn, joining && { opacity: 0.5 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={isOpen ? 'enter-outline' : 'add-circle-outline'} size={18} color="#fff" />
                  <Text style={st.joinBtnText}>{isOpen ? 'Join Group' : 'Request to Join'}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={st.pendingBadge}>
              <Ionicons name="time-outline" size={14} color={COLORS.warning} />
              <Text style={st.pendingBadgeText}>Request Pending</Text>
            </View>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          enabled={Platform.OS === 'ios'}
        >
          {loadingMessages ? (
            <View style={st.centered}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, i) => item._id || item.id || String(i)}
              inverted
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 6 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 80 }}>
                  <Text style={{ fontSize: 36 }}>👥</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 8 }}>
                    No messages yet. Say hi! 👋
                  </Text>
                </View>
              }
            />
          )}
          <View style={st.inputBar}>
            {editingMsg && (
              <View style={st.editBanner}>
                <Ionicons name="pencil" size={13} color={COLORS.primary} />
                <Text style={st.editBannerText}>Editing message</Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingMsg(null);
                    setInputText('');
                  }}
                >
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            <View style={st.inputRow}>
              <TextInput
                style={st.input}
                placeholder={`Message #${rooms.find(r => r.roomId === activeRoom)?.name || 'general'}...`}
                placeholderTextColor={COLORS.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[st.sendBtn, (!inputText.trim() || sending) && { opacity: 0.35 }]}
                onPress={handleSend}
                disabled={!inputText.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size={14} color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Create Room Modal */}
      <Modal visible={showRooms} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Create Room</Text>
              <TouchableOpacity onPress={() => setShowRooms(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                Create text channels or voice rooms for your group.
              </Text>
              {/* Room type toggle */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[st.typeChip, newRoomType === 'text' && st.typeChipActive]}
                  onPress={() => setNewRoomType('text')}
                >
                  <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>#</Text>
                  <Text style={[st.typeChipText, newRoomType === 'text' && { color: COLORS.primary }]}>Text</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.typeChip, newRoomType === 'voice' && st.typeChipActive]}
                  onPress={() => setNewRoomType('voice')}
                >
                  <Ionicons name="mic" size={14} color={newRoomType === 'voice' ? COLORS.success : COLORS.textMuted} />
                  <Text style={[st.typeChipText, newRoomType === 'voice' && { color: COLORS.success }]}>Voice</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 }}>
                  {newRoomType === 'voice' ? (
                    <Ionicons name="mic" size={14} color={COLORS.success} style={{ marginRight: 4 }} />
                  ) : (
                    <Text style={{ color: COLORS.textMuted, fontSize: 16, marginRight: 4 }}>#</Text>
                  )}
                  <TextInput
                    style={{ flex: 1, color: COLORS.textPrimary, fontSize: 14, height: 40 }}
                    placeholder={newRoomType === 'voice' ? 'voice-room-name' : 'room-name'}
                    placeholderTextColor={COLORS.textMuted}
                    value={newRoomName}
                    onChangeText={(t) => setNewRoomName(t.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    maxLength={30}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[st.sendBtn, (!newRoomName.trim() || creatingRoom) && { opacity: 0.4 }]}
                  onPress={handleCreateRoom}
                  disabled={!newRoomName.trim() || creatingRoom}
                >
                  {creatingRoom ? <ActivityIndicator size={14} color="#fff" /> : <Ionicons name="add" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 8 }}>Existing Rooms</Text>
              {rooms.map((room: any) => (
                <View key={room.roomId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border }}>
                  {room.type === 'voice' ? (
                    <Ionicons name="mic" size={14} color={COLORS.success} />
                  ) : (
                    <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>#</Text>
                  )}
                  <Text style={{ flex: 1, fontSize: 14, color: room.type === 'voice' ? COLORS.success : COLORS.textPrimary, fontWeight: '600' }}>{room.name}</Text>
                  {room.type === 'voice' && <Text style={{ fontSize: 10, color: COLORS.success, fontWeight: '600' }}>VOICE</Text>}
                  {room.roomId !== 'general' && isAdmin && (
                    <TouchableOpacity onPress={() => handleDeleteRoom(room.roomId)}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Members Modal */}
      <Modal visible={showMembers} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Members ({group?.members?.length || 0})</Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {group?.members?.map((m: any, i: number) => {
                const memberId = m.userId || m._id || m.id;
                const memberName = m.name || m.userName || 'Unknown';
                const memberRole = m.role || 'member';
                const isCreator = memberRole === 'creator' || memberRole === 'admin';
                const canRemove = isAdmin && memberId !== user?.id && !isCreator;
                return (
                  <View key={memberId || i} style={st.memberRow}>
                    <View style={st.memberAvatar}>
                      <Image source={{ uri: getDiceBearUri(memberName) }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.memberName}>{memberName}</Text>
                      {isCreator && (
                        <Text style={st.memberRole}>
                          {memberRole === 'creator' ? '👑 Creator' : 'Admin'}
                        </Text>
                      )}
                    </View>
                    {canRemove && (
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(memberId, memberName)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="remove-circle-outline" size={22} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  /* Room channel bar */
  roomBar: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
    paddingVertical: 8, backgroundColor: COLORS.background,
  },
  roomChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    backgroundColor: 'transparent',
  },
  roomChipActive: { backgroundColor: `${COLORS.primary}18` },
  roomHash: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  roomChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  roomChipTextActive: { color: COLORS.primary },
  roomAddBtn: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },

  /* Pending requests bar */
  pendingBar: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  pendingBarText: { fontSize: 12, fontWeight: '700', color: COLORS.warning },
  pendingItem: {
    alignItems: 'center', gap: 4, marginRight: 12, width: 70,
  },
  pendingAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  pendingAvatarLetter: { fontSize: 16 },
  pendingName: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', maxWidth: 60, textAlign: 'center' },
  approveBtn: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center',
  },
  rejectBtn: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.danger,
    justifyContent: 'center', alignItems: 'center',
  },

  /* Join section */
  joinSection: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  joinTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  joinDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: RADIUS.md, marginTop: 8,
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${COLORS.warning}18`, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: `${COLORS.warning}40`,
  },
  pendingBadgeText: { color: COLORS.warning, fontWeight: '600', fontSize: 13 },

  /* Messages */
  msgRow: { marginVertical: 2, flexDirection: 'row', gap: 6 },
  msgRowOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgRowTheir: { alignSelf: 'flex-start' },
  msgAvatar: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', flexShrink: 0,
  },
  senderName: { fontSize: 10, color: COLORS.primary, fontWeight: '600', marginLeft: 2 },
  bubble: { borderRadius: 18, paddingVertical: 8, paddingHorizontal: 13 },
  bubbleOwn: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleTheir: {
    backgroundColor: COLORS.surface, borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  bubbleText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  editedLbl: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  time: { fontSize: 10, color: COLORS.textMuted, marginHorizontal: 2 },

  /* Input */
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.background,
  },
  editBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6,
    paddingVertical: 4, paddingHorizontal: 8, backgroundColor: `${COLORS.primary}12`, borderRadius: RADIUS.md,
  },
  editBannerText: { flex: 1, fontSize: 12, color: COLORS.primary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, minHeight: 38, maxHeight: 110, backgroundColor: COLORS.surface,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    color: COLORS.textPrimary, fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },

  /* Members modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarLetter: { fontSize: 18 },
  memberName: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  memberRole: { fontSize: 11, color: COLORS.warning, marginTop: 1 },

  /* Voice room chip */
  voiceRoomChip: { backgroundColor: `${COLORS.success}12`, borderWidth: 1, borderColor: `${COLORS.success}30`, borderRadius: 12 },

  /* Room type toggle */
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  typeChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
});

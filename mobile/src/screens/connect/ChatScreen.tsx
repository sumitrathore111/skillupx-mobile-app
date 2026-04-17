import type { Message } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    deleteMessage,
    editMessage,
    fetchMessages,
    fetchOrCreateChat,
    markChatRead,
    sendMessage,
} from '@services/connectService';
import { getSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = {
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  isOnline?: boolean;
};

function getDiceBearUri(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(seed)}&size=96`;
}

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { participantId, participantName, isOnline } = route.params as RouteParams;
  const { user } = useAuthStore();

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarUri = getDiceBearUri(participantId);

  useEffect(() => {
    initChat();
    return cleanup;
  }, []);

  async function initChat() {
    try {
      const chat = await fetchOrCreateChat(participantId);
      const resolvedChatId = chat.chatId || chat._id || chat.id;
      setChatId(resolvedChatId);
      const msgs = await fetchMessages(resolvedChatId);
      setMessages(msgs.reverse());
      markChatRead(resolvedChatId).catch(() => {});
      subscribeToSocket(resolvedChatId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToSocket(id: string) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join-chat', id);
    socket.on('newMessage', (msg: Message) => {
      setMessages((prev) => [msg, ...prev]);
      markChatRead(id).catch(() => {});
    });
    socket.on('messageEdited', (updated: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id || m._id === updated._id) ? updated : m),
      );
    });
    socket.on('messageDeleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId && m._id !== messageId));
    });
    socket.on('typing', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setIsTyping(true);
    });
    socket.on('stopTyping', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setIsTyping(false);
    });
  }

  function cleanup() {
    const socket = getSocket();
    if (socket) {
      if (chatId) socket.emit('leave-chat', chatId);
      socket.off('newMessage');
      socket.off('messageEdited');
      socket.off('messageDeleted');
      socket.off('typing');
      socket.off('stopTyping');
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }

  function handleInputChange(text: string) {
    setInputText(text);
    const socket = getSocket();
    if (socket && chatId) {
      socket.emit('typing', { chatId, userId: user?.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { chatId, userId: user?.id });
      }, 1500);
    }
  }

  async function handleSend() {
    if (!inputText.trim() || !chatId) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      if (editingMessage) {
        await editMessage(chatId, editingMessage.id || editingMessage._id!, text);
        setEditingMessage(null);
      } else {
        await sendMessage(chatId, text);
      }
    } catch {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function handleLongPress(msg: Message) {
    if (msg.senderId !== user?.id && msg.sender?._id !== user?.id) return;
    Alert.alert('Message Options', undefined, [
      {
        text: 'Edit',
        onPress: () => {
          setEditingMessage(msg);
          setInputText(msg.message || msg.content);
        },
      },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(msg) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleDelete(msg: Message) {
    if (!chatId) return;
    try {
      await deleteMessage(chatId, msg.id || msg._id!);
    } catch {
      Alert.alert('Error', 'Failed to delete message');
    }
  }

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isOwn = item.senderId === user?.id || item.sender?._id === user?.id;
      return (
        <TouchableOpacity
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.9}
          style={[st.msgRow, isOwn ? st.msgRowOwn : st.msgRowTheir]}
        >
          <View style={[st.bubble, isOwn ? st.bubbleOwn : st.bubbleTheir]}>
            <Text style={[st.bubbleText, isOwn && { color: '#fff' }]}>
              {item.message || item.content || item.text}
            </Text>
            {item.isEdited && (
              <Text style={[st.editedLbl, !isOwn && { color: COLORS.textMuted }]}>(edited)</Text>
            )}
          </View>
          <Text style={st.time}>{formatTime(item.createdAt)}</Text>
        </TouchableOpacity>
      );
    },
    [user],
  );

  if (loading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top', 'bottom']}>
      {/* Header — clean, no card */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={st.headerAvatar}>
          <Image source={{ uri: avatarUri }} style={{ width: 38, height: 38, borderRadius: 19 }} />
          {isOnline && <View style={st.headerOnline} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerName} numberOfLines={1}>{participantName}</Text>
          <Text style={[st.headerStatus, isOnline && { color: COLORS.success }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() =>
            navigation.navigate('DevProfile', { developerId: participantId })
          }
        >
          <Ionicons name="person-circle-outline" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, i) => item.id || item._id || String(i)}
          inverted
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 6 }}
          ListHeaderComponent={
            isTyping ? (
              <View style={[st.bubble, st.bubbleTheir, { paddingVertical: 12, paddingHorizontal: 16 }]}>
                <View style={st.typingDots}>
                  <View style={st.dot} />
                  <View style={st.dot} />
                  <View style={st.dot} />
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Image source={{ uri: avatarUri }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              <Text style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 8 }}>
                Say hi to {participantName}!
              </Text>
            </View>
          }
        />

        {/* Input area */}
        <View style={st.inputWrap}>
          {editingMessage && (
            <View style={st.editBanner}>
              <Ionicons name="pencil" size={13} color={COLORS.primary} />
              <Text style={st.editBannerText}>Editing message</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingMessage(null);
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
              placeholder="Message..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={handleInputChange}
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
    </SafeAreaView>
  );
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  /* Header — plain, no card */
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
  },
  headerEmojiMain: { fontSize: 20 },
  headerOnline: {
    position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.success, borderWidth: 1.5, borderColor: COLORS.background,
  },
  headerName: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  headerStatus: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  /* Messages */
  msgRow: { marginVertical: 2, maxWidth: '78%' },
  msgRowOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgRowTheir: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 18 },
  bubbleOwn: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleTheir: {
    backgroundColor: COLORS.surface, borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: COLORS.textPrimary },
  editedLbl: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  time: { fontSize: 10, color: COLORS.textMuted, marginTop: 1, paddingHorizontal: 2 },
  typingDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },

  /* Input */
  inputWrap: {
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
});

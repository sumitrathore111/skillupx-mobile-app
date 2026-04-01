import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    deleteMessage,
    editMessage,
    fetchMessages,
    fetchOrCreateChat,
    markChatRead,
    sendMessage
} from '@services/connectService';
import { getSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';
import type { Message } from '@apptypes/index';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert,
    FlatList,
    KeyboardAvoidingView, Platform,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { participantId: string; participantName: string; participantAvatar?: string };

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { participantId, participantName } = route.params as RouteParams;
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

  useEffect(() => {
    navigation.setOptions({ title: participantName, headerBackTitle: 'Back' });
    initChat();
    return cleanup;
  }, []);

  async function initChat() {
    try {
      const chat = await fetchOrCreateChat(participantId);
      setChatId(chat._id || chat.id);
      const msgs = await fetchMessages(chat._id || chat.id);
      setMessages(msgs.reverse());
      await markChatRead(chat._id || chat.id);
      subscribeToSocket(chat._id || chat.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToSocket(id: string) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('joinChat', id);
    socket.on('newMessage', (msg: Message) => {
      setMessages(prev => [msg, ...prev]);
      markChatRead(id).catch(() => {});
    });
    socket.on('messageEdited', (updated: Message) => {
      setMessages(prev => prev.map(m => (m.id === updated.id || m._id === updated._id) ? updated : m));
    });
    socket.on('messageDeleted', ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId && m._id !== messageId));
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
    } catch (e) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function handleLongPress(msg: Message) {
    if (msg.senderId !== user?.id && msg.sender?._id !== user?.id) return;
    Alert.alert('Message Options', undefined, [
      { text: 'Edit', onPress: () => { setEditingMessage(msg); setInputText(msg.content); } },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(msg) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleDelete(msg: Message) {
    if (!chatId) return;
    try {
      await deleteMessage(chatId, msg.id || msg._id!);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete message');
    }
  }

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwn = item.senderId === user?.id || item.sender?._id === user?.id;
    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.9}
        style={[styles.messageWrapper, isOwn ? styles.ownMessageWrapper : styles.theirMessageWrapper]}
      >
        <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.theirMessageText]}>
            {item.content}
          </Text>
          {item.isEdited && <Text style={styles.editedLabel}>(edited)</Text>}
        </View>
        <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
      </TouchableOpacity>
    );
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, i) => item.id || item._id || String(i)}
        inverted
        contentContainerStyle={styles.messagesList}
        ListHeaderComponent={
          isTyping ? (
            <View style={[styles.messageBubble, styles.theirBubble, styles.typingBubble]}>
              <View style={styles.typingDots}>
                <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
              </View>
            </View>
          ) : null
        }
      />
      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.inputContainer}>
          {editingMessage && (
            <View style={styles.editBanner}>
              <Ionicons name="pencil" size={13} color={COLORS.primary} />
              <Text style={styles.editBannerText}>Editing message</Text>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.disabledBtn]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size={16} color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  messagesList: { padding: 12, paddingBottom: 4 },
  messageWrapper: { marginVertical: 3, maxWidth: '78%' },
  ownMessageWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirMessageWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageBubble: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18 },
  ownBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
  messageText: { fontSize: 14, lineHeight: 20 },
  ownMessageText: { color: '#fff' },
  theirMessageText: { color: COLORS.textPrimary },
  editedLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  messageTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, paddingHorizontal: 2 },
  typingDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.textMuted },
  inputContainer: { borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8 },
  editBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md },
  editBannerText: { flex: 1, fontSize: 12, color: COLORS.primary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 110, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  disabledBtn: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
});

import { COLORS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchGroupMessages, sendGroupMessage } from '@services/connectService';
import { getSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';
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

type RouteParams = { groupId: string; groupName: string };

export default function GroupChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { groupId, groupName } = route.params as RouteParams;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ title: groupName });
    loadMessages();
    const socket = getSocket();
    if (socket) {
      socket.emit('joinGroup', groupId);
      socket.on('groupMessage', (msg: any) => {
        setMessages(prev => [msg, ...prev]);
      });
    }
    return () => {
      const s = getSocket();
      s?.off('groupMessage');
    };
  }, []);

  async function loadMessages() {
    try {
      const msgs = await fetchGroupMessages(groupId);
      setMessages(msgs.reverse());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleSend() {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      await sendGroupMessage(groupId, text);
    } catch {
      Alert.alert('Error', 'Failed to send');
      setInputText(text);
    } finally { setSending(false); }
  }

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isOwn = item.senderId === user?.id || item.sender?._id === user?.id;
    return (
      <View style={[styles.messageWrapper, isOwn ? styles.ownWrapper : styles.theirWrapper]}>
        {!isOwn && <Text style={styles.senderName}>{item.senderName || item.sender?.name}</Text>}
        <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isOwn && styles.ownText]}>{item.content}</Text>
        </View>
        <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  }, [user]);

  if (loading) return <View style={styles.loading}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, i) => item._id || item.id || String(i)}
        inverted
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet, say hi! 👋</Text>}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.inputContainer}>
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
            {sending ? <ActivityIndicator size={16} color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  list: { padding: 12, paddingBottom: 4 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 60, fontSize: 14 },
  messageWrapper: { marginVertical: 4, maxWidth: '75%' },
  ownWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderName: { fontSize: 11, color: COLORS.accent, marginBottom: 2, marginLeft: 3 },
  bubble: { borderRadius: 16, paddingVertical: 9, paddingHorizontal: 13 },
  ownBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  ownText: { color: '#fff' },
  timeText: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 110, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.45 },
});

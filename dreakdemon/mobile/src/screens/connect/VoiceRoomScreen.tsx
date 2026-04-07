import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { initializeSocket } from '@services/socketService';
import {
    joinVoiceRoom,
    leaveVoiceRoom,
    setVoiceCallbacks,
    toggleMute,
    VoiceParticipant
} from '@services/voiceService';
import { useAuthStore } from '@store/authStore';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { groupId: string; roomId: string; roomName: string; groupName: string };

const EMOJIS = ['😎', '🚀', '💻', '🔥', '⚡', '🎯', '🧠', '💡', '🎨', '🛠️', '✨', '🌟', '👾', '🤖', '🦊'];
function getEmoji(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return EMOJIS[Math.abs(h) % EMOJIS.length];
}

export default function VoiceRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { groupId, roomId, roomName, groupName } = route.params as RouteParams;
  const { user } = useAuthStore();

  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;

    async function start() {
      await initializeSocket();

      setVoiceCallbacks({
        onParticipantsChanged: (p) => { if (mounted) setParticipants(p); },
      });

      await joinVoiceRoom(groupId, roomId, user?.id || '', user?.name || 'User');
      if (mounted) setConnected(true);
    }

    start().catch((e) => {
      console.error('Failed to join voice room:', e);
      Alert.alert('Error', 'Failed to join voice room. Check microphone permissions.');
    });

    return () => {
      mounted = false;
      leaveVoiceRoom();
    };
  }, [groupId, roomId]);

  // Pulse animation for active state
  useEffect(() => {
    if (connected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [connected]);

  function handleToggleMute() {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  }

  function handleLeave() {
    leaveVoiceRoom();
    navigation.goBack();
  }

  return (
    <SafeAreaView style={st.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={handleLeave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="mic" size={14} color={COLORS.success} />
            <Text style={st.headerTitle} numberOfLines={1}>{roomName}</Text>
          </View>
          <Text style={st.headerSub}>{groupName}</Text>
        </View>
        <View style={st.liveBadge}>
          <View style={st.liveDot} />
          <Text style={st.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Participants grid */}
      <View style={st.participantsArea}>
        {!connected ? (
          <View style={st.connectingWrap}>
            <Ionicons name="cellular-outline" size={32} color={COLORS.textMuted} />
            <Text style={st.connectingText}>Connecting...</Text>
          </View>
        ) : participants.length === 0 ? (
          <View style={st.connectingWrap}>
            <Text style={{ fontSize: 40 }}>🎙️</Text>
            <Text style={st.connectingText}>You're the first one here!</Text>
            <Text style={st.connectingSub}>Others will see this room as active</Text>
          </View>
        ) : (
          <View style={st.grid}>
            {/* Show self first */}
            <View style={st.participantCard}>
              <Animated.View style={[st.avatarRing, !muted && { borderColor: COLORS.success }, { transform: [{ scale: !muted ? pulseAnim : 1 }] }]}>
                <View style={st.avatar}>
                  <Text style={st.avatarEmoji}>{getEmoji(user?.name || 'U')}</Text>
                </View>
              </Animated.View>
              <Text style={st.participantName} numberOfLines={1}>You</Text>
              {muted && <Ionicons name="mic-off" size={12} color={COLORS.danger} style={{ marginTop: 2 }} />}
            </View>
            {/* Other participants */}
            {participants
              .filter((p) => p.userId !== user?.id)
              .map((p) => (
                <View key={p.userId} style={st.participantCard}>
                  <View style={[st.avatarRing, { borderColor: COLORS.success }]}>
                    <View style={st.avatar}>
                      <Text style={st.avatarEmoji}>{getEmoji(p.userName)}</Text>
                    </View>
                  </View>
                  <Text style={st.participantName} numberOfLines={1}>{p.userName}</Text>
                </View>
              ))}
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={st.controls}>
        <TouchableOpacity style={[st.controlBtn, muted && st.controlBtnActive]} onPress={handleToggleMute}>
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={muted ? COLORS.danger : '#fff'} />
          <Text style={[st.controlLabel, muted && { color: COLORS.danger }]}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.leaveBtn} onPress={handleLeave}>
          <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={st.leaveLabel}>Leave</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${COLORS.success}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  liveText: { fontSize: 10, fontWeight: '800', color: COLORS.success, letterSpacing: 1 },

  participantsArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  connectingWrap: { alignItems: 'center', gap: 12 },
  connectingText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  connectingSub: { fontSize: 13, color: COLORS.textMuted },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24,
  },
  participantCard: { alignItems: 'center', width: 80, gap: 6 },
  avatarRing: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 3, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  participantName: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },

  controls: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32,
    paddingVertical: 20, paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
  },
  controlBtn: {
    alignItems: 'center', gap: 4,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.surface, justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: `${COLORS.danger}20` },
  controlLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  leaveBtn: {
    alignItems: 'center', gap: 4,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.danger, justifyContent: 'center',
  },
  leaveLabel: { fontSize: 10, fontWeight: '700', color: '#fff' },
});

import type { ConnectionStatus, DeveloperProfile } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    fetchConnectionStatus,
    fetchDeveloperById,
    fetchOrCreateChat,
    removeConnection,
    sendConnectionRequest,
} from '@services/connectService';
import { useAuthStore } from '@store/authStore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { developerId: string };

const EMOJIS = ['😎', '🚀', '💻', '🔥', '⚡', '🎯', '🧠', '✨', '🎮', '🤖'];

export default function DevProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { developerId } = route.params as RouteParams;
  const { user } = useAuthStore();
  const [developer, setDeveloper] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>({ status: 'none' });
  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const emoji = EMOJIS[developerId.charCodeAt(0) % EMOJIS.length];

  useEffect(() => {
    loadProfile();
    loadConnectionStatus();
  }, []);

  async function loadProfile() {
    try {
      const dev = await fetchDeveloperById(developerId);
      setDeveloper(dev);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadConnectionStatus() {
    try {
      const s = await fetchConnectionStatus(developerId);
      setConnStatus(s);
    } catch {
      // not connected
    }
  }

  async function handleConnect() {
    setActionLoading(true);
    try {
      await sendConnectionRequest(developerId);
      setConnStatus({ status: 'pending', isSender: true });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send request');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveConnection() {
    Alert.alert('Remove Connection', `Remove ${developer?.name} from connections?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await removeConnection(developerId);
            setConnStatus({ status: 'none' });
          } catch {
            Alert.alert('Error', 'Failed to remove');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  async function handleMessage() {
    if (!developer) return;
    setChatLoading(true);
    try {
      await fetchOrCreateChat(developer.id || developer._id!);
      navigation.navigate('Chat', {
        participantId: developer.id || developer._id,
        participantName: developer.name,
        isOnline: developer.isOnline,
      });
    } catch {
      Alert.alert('Error', 'Could not start chat');
    } finally {
      setChatLoading(false);
    }
  }

  if (loading)
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  if (!developer)
    return (
      <View style={s.centered}>
        <Text style={s.muted}>Developer not found</Text>
      </View>
    );

  const isConnected = connStatus.status === 'accepted';
  const isPending = connStatus.status === 'pending';
  const isSelf = developer.id === user?.id || developer._id === user?.id;

  return (
    <SafeAreaView style={s.container}>
      {/* Header bar */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {developer.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile top */}
        <View style={s.profileTop}>
          {/* Avatar with emoji */}
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarEmoji}>{emoji}</Text>
            </View>
            {developer.isOnline && <View style={s.onlineDot} />}
          </View>

          {/* Instagram-like stats row */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{developer.challenges_solved ?? developer.stats?.problemsSolved ?? 0}</Text>
              <Text style={s.statLbl}>Solved</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{developer.battlesWon ?? developer.stats?.battlesWon ?? 0}</Text>
              <Text style={s.statLbl}>Battles</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{developer.streakCount ?? developer.stats?.currentStreak ?? 0}</Text>
              <Text style={s.statLbl}>Streak</Text>
            </View>
          </View>
        </View>

        {/* Name & bio */}
        <View style={s.infoSection}>
          <Text style={s.name}>{developer.name}</Text>
          <Text style={s.username}>@{developer.username}</Text>
          {!!developer.rating && (
            <View style={s.ratingRow}>
              <Ionicons name="star" size={12} color={COLORS.warning} />
              <Text style={s.ratingVal}>{developer.rating.toFixed(1)}</Text>
            </View>
          )}
          {!!developer.bio && <Text style={s.bio}>{developer.bio}</Text>}
        </View>

        {/* Action buttons */}
        {!isSelf && (
          <View style={s.actionsRow}>
            {isConnected ? (
              <>
                <TouchableOpacity style={s.connectedBtn} onPress={handleRemoveConnection} disabled={actionLoading}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={s.connectedBtnText}>Connected</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.messageBtn} onPress={handleMessage} disabled={chatLoading}>
                  {chatLoading ? (
                    <ActivityIndicator size={14} color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="chatbubble" size={15} color="#fff" />
                      <Text style={s.messageBtnText}>Message</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : isPending ? (
              <View style={s.pendingBtn}>
                <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                <Text style={s.pendingBtnText}>
                  {connStatus.isSender ? 'Request Sent' : 'Wants to Connect'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={s.connectBtn} onPress={handleConnect} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size={14} color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={s.connectBtnText}>Connect</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Divider */}
        <View style={s.divider} />

        {/* Location & Institute info row */}
        {(developer.location && developer.location !== 'Not specified' || developer.institute && developer.institute !== 'Not specified') && (
          <View style={s.infoRow}>
            {!!developer.location && developer.location !== 'Not specified' && (
              <View style={s.infoItem}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={s.infoText}>{developer.location}</Text>
              </View>
            )}
            {!!developer.institute && developer.institute !== 'Not specified' && (
              <View style={s.infoItem}>
                <Ionicons name="school-outline" size={14} color={COLORS.textMuted} />
                <Text style={s.infoText}>{developer.institute}</Text>
              </View>
            )}
          </View>
        )}

        {/* Skills */}
        {developer.skills?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Skills</Text>
            <View style={s.chips}>
              {developer.skills.map((skill) => (
                <View key={skill} style={s.chip}>
                  <Text style={s.chipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Languages */}
        {(developer.languages?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Languages</Text>
            <View style={s.chips}>
              {developer.languages!.map((lang) => (
                <View key={lang} style={[s.chip, s.langChip]}>
                  <Text style={[s.chipText, { color: COLORS.accent }]}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interests */}
        {(developer.interests?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Interests</Text>
            <View style={s.chips}>
              {developer.interests!.map((int) => (
                <View key={int} style={[s.chip, s.interestChip]}>
                  <Text style={[s.chipText, { color: COLORS.accent }]}>{int}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Experience */}
        {(developer.experience?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Experience</Text>
            {developer.experience!.map((exp, i) => (
              <View key={i} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.cardIconWrap}>
                    <Ionicons name="briefcase" size={16} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{exp.title}</Text>
                    <Text style={s.cardSub}>{exp.company}{exp.year ? ` · ${exp.year}` : ''}</Text>
                  </View>
                </View>
                {!!exp.desc && <Text style={s.cardDesc}>{exp.desc}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {(developer.education?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Education</Text>
            {developer.education!.map((edu, i) => (
              <View key={i} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={[s.cardIconWrap, { backgroundColor: `${COLORS.warning}15` }]}>
                    <Ionicons name="school" size={16} color={COLORS.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{edu.degree}</Text>
                    <Text style={s.cardSub}>{edu.school}{edu.year ? ` · ${edu.year}` : ''}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Achievements */}
        {(developer.achievements?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Achievements</Text>
            {developer.achievements!.map((ach, i) => (
              <View key={i} style={s.achievementRow}>
                <Text style={s.achievementIcon}>🏆</Text>
                <Text style={s.achievementText}>{ach}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Badges */}
        {(developer.badges?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Badges</Text>
            <View style={s.badgeGrid}>
              {developer.badges!.map((badge, i) => (
                <View key={i} style={s.badgeItem}>
                  <Text style={s.badgeIcon}>{badge.icon || '🎖️'}</Text>
                  <Text style={s.badgeName} numberOfLines={1}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Target Companies */}
        {(developer.target_company?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Target Companies</Text>
            <View style={s.chips}>
              {developer.target_company!.map((comp) => (
                <View key={comp} style={[s.chip, { backgroundColor: `${COLORS.success}12`, borderColor: `${COLORS.success}30` }]}>
                  <Text style={[s.chipText, { color: COLORS.success }]}>{comp}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Links */}
        {(developer.githubUsername || developer.portfolio || (developer.links?.length ?? 0) > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Links</Text>
            {!!developer.githubUsername && (
              <TouchableOpacity
                style={s.linkRow}
                onPress={() => Linking.openURL(`https://github.com/${developer.githubUsername}`)}
              >
                <Ionicons name="logo-github" size={18} color={COLORS.textMuted} />
                <Text style={s.linkText}>github.com/{developer.githubUsername}</Text>
                <Ionicons name="open-outline" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
            {!!developer.portfolio && (
              <TouchableOpacity
                style={s.linkRow}
                onPress={() => Linking.openURL(developer.portfolio!.startsWith('http') ? developer.portfolio! : `https://${developer.portfolio}`)}
              >
                <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
                <Text style={s.linkText}>{developer.portfolio}</Text>
                <Ionicons name="open-outline" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
            {developer.links?.map((link, i) => {
              const icon = link.platform?.toLowerCase().includes('github') ? 'logo-github'
                : link.platform?.toLowerCase().includes('linkedin') ? 'logo-linkedin'
                : link.platform?.toLowerCase().includes('twitter') ? 'logo-twitter'
                : 'link-outline';
              const iconColor = link.platform?.toLowerCase().includes('linkedin') ? '#0A66C2'
                : link.platform?.toLowerCase().includes('twitter') ? '#1DA1F2'
                : COLORS.textMuted;
              return (
                <TouchableOpacity
                  key={i}
                  style={s.linkRow}
                  onPress={() => Linking.openURL(link.url.startsWith('http') ? link.url : `https://${link.url}`)}
                >
                  <Ionicons name={icon as any} size={18} color={iconColor} />
                  <Text style={s.linkText}>{link.platform || link.url}</Text>
                  <Ionicons name="open-outline" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  muted: { color: COLORS.textMuted, fontSize: 15 },

  /* Header bar */
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },

  /* Profile top — Instagram layout */
  profileTop: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 20,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 38 },
  onlineDot: {
    position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.background,
  },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  statLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  /* Info */
  infoSection: { paddingHorizontal: 20, paddingBottom: 12 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  username: { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingVal: { fontSize: 12, fontWeight: '600', color: COLORS.warning },
  bio: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: 6 },

  /* Actions */
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  connectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  connectBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pendingBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: `${COLORS.warning}18`, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: `${COLORS.warning}40`,
  },
  pendingBtnText: { color: COLORS.warning, fontWeight: '600', fontSize: 13 },
  connectedBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: `${COLORS.success}15`, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: `${COLORS.success}40`,
  },
  connectedBtnText: { color: COLORS.success, fontWeight: '600', fontSize: 13 },
  messageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  messageBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  /* Divider */
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: 20, marginBottom: 8 },

  /* Sections */
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}15`, borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  interestChip: { backgroundColor: `${COLORS.accent}12`, borderColor: `${COLORS.accent}30` },
  langChip: { backgroundColor: `${COLORS.accent}12`, borderColor: `${COLORS.accent}30` },

  /* Info row (location / institute) */
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginBottom: 4 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: COLORS.textMuted },

  /* Cards (experience / education) */
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginTop: 8 },

  /* Achievements */
  achievementRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  achievementIcon: { fontSize: 16 },
  achievementText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  /* Badges */
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeItem: { alignItems: 'center', width: 64 },
  badgeIcon: { fontSize: 28 },
  badgeName: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  /* Links */
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  linkText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
});

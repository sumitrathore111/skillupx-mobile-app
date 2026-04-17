import type { InvitableDeveloper } from '@apptypes/index';
import { COLORS, RADIUS, SHADOWS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getInvitableDevelopers, sendProjectInvite } from '@services/creatorService';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY = COLORS.primary;
const GLASS = 'rgba(255,255,255,0.05)';
const GLASS_BORDER = 'rgba(255,255,255,0.08)';

type Step = 'search' | 'compose' | 'success';

export default function InviteMemberScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { projectId, projectTitle } = route.params || {};

  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [developers, setDevelopers] = useState<InvitableDeveloper[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [selectedDev, setSelectedDev] = useState<InvitableDeveloper | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const loadDevelopers = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    try {
      const result = await getInvitableDevelopers(projectId, p, searchQuery);
      if (append) {
        setDevelopers(prev => [...prev, ...result.developers]);
      } else {
        setDevelopers(result.developers);
      }
      setTotal(result.total);
      setHasMore(result.developers.length === 10);
      setPage(p);
    } catch (e) {
      console.error('loadDevelopers', e);
    } finally {
      setLoading(false);
    }
  }, [projectId, searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => loadDevelopers(1), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { loadDevelopers(1); }, []);

  const handleSelect = (dev: InvitableDeveloper) => {
    setSelectedDev(dev);
    setStep('compose');
  };

  const handleSendInvite = async () => {
    if (!selectedDev) return;
    setSending(true);
    try {
      const result = await sendProjectInvite(projectId, selectedDev._id || selectedDev.id || '', message.trim() || undefined);
      setInviteLink(result.inviteLink || null);
      setStep('success');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const handleShareLink = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `You've been invited to join "${projectTitle}" on SkillUpX!\n\n${inviteLink}`,
        url: inviteLink,
      });
    } catch { /* cancelled */ }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(inviteLink);
    }
    Alert.alert('Copied!', 'Invite link copied to clipboard');
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';

  // ── Search Step ──────────────────────────────────────────
  const renderSearch = () => (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View style={S.searchContainer}>
        <View style={S.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={S.searchInput}
            placeholder="Search by name, email, or skills..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={S.resultCount}>
          {total > 0 ? `${total} developer${total !== 1 ? 's' : ''} available` : 'Search to find developers'}
        </Text>
      </View>

      {/* Developer List */}
      <FlatList
        data={developers}
        keyExtractor={item => item._id || item.id || ''}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={S.devCard} onPress={() => handleSelect(item)} activeOpacity={0.7}>
            <View style={S.devAvatar}>
              <Text style={S.devAvatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.devName}>{item.name}</Text>
              <Text style={S.devEmail}>{item.email}</Text>
              {item.skills && item.skills.length > 0 && (
                <View style={S.skillsRow}>
                  {item.skills.slice(0, 4).map(skill => (
                    <View key={skill} style={S.skillTag}>
                      <Text style={S.skillText}>{skill}</Text>
                    </View>
                  ))}
                  {item.skills.length > 4 && (
                    <Text style={S.moreSkills}>+{item.skills.length - 4}</Text>
                  )}
                </View>
              )}
              {item.institute && (
                <View style={S.instituteRow}>
                  <Ionicons name="school-outline" size={11} color={COLORS.textMuted} />
                  <Text style={S.instituteText}>{item.institute}</Text>
                </View>
              )}
            </View>
            <View style={S.inviteArrow}>
              <Ionicons name="paper-plane" size={16} color={PRIMARY} />
            </View>
          </TouchableOpacity>
        )}
        onEndReached={() => {
          if (hasMore && !loading) loadDevelopers(page + 1, true);
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View style={S.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
          ) : (
            <View style={S.centered}>
              <Ionicons name="people-outline" size={56} color={COLORS.textMuted} />
              <Text style={S.emptyTitle}>No developers found</Text>
              <Text style={S.emptyDesc}>Try a different search query</Text>
            </View>
          )
        }
        ListFooterComponent={loading && developers.length > 0 ? (
          <ActivityIndicator size="small" color={PRIMARY} style={{ paddingVertical: 16 }} />
        ) : null}
      />
    </View>
  );

  // ── Compose Step ─────────────────────────────────────────
  const renderCompose = () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
      {/* Selected Developer */}
      <View style={S.composeCard}>
        <View style={S.composeHeader}>
          <View style={S.devAvatarLg}>
            <Text style={S.devAvatarLgText}>{getInitials(selectedDev?.name || '')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.composeName}>{selectedDev?.name}</Text>
            <Text style={S.composeEmail}>{selectedDev?.email}</Text>
          </View>
          <TouchableOpacity onPress={() => { setStep('search'); setSelectedDev(null); }}>
            <Ionicons name="swap-horizontal" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {selectedDev?.skills && selectedDev.skills.length > 0 && (
          <View style={[S.skillsRow, { marginTop: 12 }]}>
            {selectedDev.skills.map(skill => (
              <View key={skill} style={S.skillTag}>
                <Text style={S.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Project Info */}
      <View style={S.projectInfoCard}>
        <Ionicons name="rocket" size={18} color={PRIMARY} />
        <View style={{ flex: 1 }}>
          <Text style={S.projectInfoLabel}>Inviting to</Text>
          <Text style={S.projectInfoTitle}>{projectTitle}</Text>
        </View>
      </View>

      {/* Message */}
      <View style={S.messageSection}>
        <Text style={S.fieldLabel}>Personal Message <Text style={S.optional}>(optional)</Text></Text>
        <TextInput
          style={S.messageInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Add a personal note to your invitation..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={5}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={S.charCount}>{message.length}/500</Text>
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[S.sendBtn, sending && { opacity: 0.6 }]}
        onPress={handleSendInvite}
        disabled={sending}
      >
        <LinearGradient
          colors={[PRIMARY, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={S.sendBtnGradient}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <Text style={S.sendBtnText}>Send Invitation</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Success Step ─────────────────────────────────────────
  const renderSuccess = () => (
    <View style={S.successContainer}>
      <View style={S.successIconWrap}>
        <LinearGradient
          colors={[COLORS.success, '#16A34A']}
          style={S.successIconGradient}
        >
          <Ionicons name="checkmark" size={40} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={S.successTitle}>Invitation Sent!</Text>
      <Text style={S.successDesc}>
        {selectedDev?.name} has been invited to join {projectTitle}. They'll receive a notification.
      </Text>

      {inviteLink && (
        <View style={S.linkCard}>
          <Text style={S.linkLabel}>Shareable Invite Link</Text>
          <Text style={S.linkText} numberOfLines={2}>{inviteLink}</Text>
          <View style={S.linkActions}>
            <TouchableOpacity style={S.linkBtn} onPress={handleCopyLink}>
              <Ionicons name="copy-outline" size={16} color={PRIMARY} />
              <Text style={S.linkBtnText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.linkBtn} onPress={handleShareLink}>
              <Ionicons name="share-social-outline" size={16} color={PRIMARY} />
              <Text style={S.linkBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.linkExpiry}>Expires in 7 days</Text>
        </View>
      )}

      <View style={S.successActions}>
        <TouchableOpacity
          style={S.inviteAnotherBtn}
          onPress={() => {
            setStep('search');
            setSelectedDev(null);
            setMessage('');
            setInviteLink(null);
          }}
        >
          <Ionicons name="person-add" size={16} color={PRIMARY} />
          <Text style={S.inviteAnotherText}>Invite Another</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={S.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={S.root} edges={['top']}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => step === 'search' ? navigation.goBack() : setStep('search')} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>Invite Members</Text>
          <Text style={S.headerSub}>{projectTitle}</Text>
        </View>
        {/* Step indicator */}
        <View style={S.stepRow}>
          {(['search', 'compose', 'success'] as Step[]).map((s, i) => (
            <View key={s} style={[S.stepDot, step === s && S.stepDotActive, (['compose', 'success'].indexOf(step) >= i) && S.stepDotDone]} />
          ))}
        </View>
      </View>

      {step === 'search' && renderSearch()}
      {step === 'compose' && renderCompose()}
      {step === 'success' && renderSuccess()}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: GLASS_BORDER, gap: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GLASS, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  stepRow: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  stepDotActive: { backgroundColor: PRIMARY, width: 20 },
  stepDotDone: { backgroundColor: PRIMARY },

  // Search
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, gap: 8, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: GLASS,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: GLASS_BORDER, paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  resultCount: { fontSize: 12, color: COLORS.textMuted },

  // Developer Card
  devCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: GLASS, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: GLASS_BORDER,
    ...SHADOWS.sm,
  },
  devAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY + '25',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: PRIMARY + '40',
  },
  devAvatarText: { fontSize: 14, fontWeight: '800', color: PRIMARY },
  devName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  devEmail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  skillTag: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: PRIMARY + '15', borderRadius: RADIUS.full },
  skillText: { fontSize: 10, fontWeight: '600', color: PRIMARY },
  moreSkills: { fontSize: 10, color: COLORS.textMuted, alignSelf: 'center' },
  instituteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  instituteText: { fontSize: 11, color: COLORS.textMuted },
  inviteArrow: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center',
  },

  // Compose
  composeCard: {
    backgroundColor: GLASS, borderRadius: RADIUS.xl, padding: 18,
    borderWidth: 1, borderColor: GLASS_BORDER, ...SHADOWS.sm,
  },
  composeHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  devAvatarLg: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY + '25',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: PRIMARY + '50',
  },
  devAvatarLgText: { fontSize: 18, fontWeight: '800', color: PRIMARY },
  composeName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  composeEmail: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  projectInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: PRIMARY + '10', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PRIMARY + '25',
  },
  projectInfoLabel: { fontSize: 11, color: COLORS.textMuted },
  projectInfoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },

  messageSection: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  optional: { fontWeight: '400', color: COLORS.textMuted },
  messageInput: {
    backgroundColor: GLASS, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: GLASS_BORDER,
    padding: 14, color: COLORS.textPrimary, fontSize: 14, minHeight: 120,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },

  sendBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  sendBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, paddingHorizontal: 24,
  },
  sendBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  successIconWrap: { marginBottom: 8 },
  successIconGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  successDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  linkCard: {
    width: '100%', backgroundColor: GLASS, borderRadius: RADIUS.xl, padding: 18,
    borderWidth: 1, borderColor: GLASS_BORDER, gap: 10, marginTop: 8,
  },
  linkLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  linkText: { fontSize: 13, color: PRIMARY, lineHeight: 18 },
  linkActions: { flexDirection: 'row', gap: 12 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: PRIMARY + '15', borderRadius: RADIUS.full,
  },
  linkBtnText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  linkExpiry: { fontSize: 11, color: COLORS.textMuted },

  successActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  inviteAnotherBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: PRIMARY,
  },
  inviteAnotherText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  doneBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: PRIMARY, borderRadius: RADIUS.lg },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});

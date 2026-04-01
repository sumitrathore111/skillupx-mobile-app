import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchConversations, fetchDevelopers, fetchHelpRequests, fetchStudyGroups, fetchTechReviews } from '@services/connectService';
import { useAuthStore } from '@store/authStore';
import type { Conversation, DeveloperProfile, StudyGroup } from '@apptypes/index';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'directory' | 'messages' | 'groups' | 'reviews';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'directory', label: 'Devs', icon: 'people-outline' },
  { id: 'messages', label: 'Messages', icon: 'chatbubbles-outline' },
  { id: 'groups', label: 'Groups', icon: 'people-circle-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
];

const SORT_OPTIONS = [
  { value: 'rank', label: 'Top Ranked' },
  { value: 'newest', label: 'Newest' },
  { value: 'codearena', label: 'Code Arena' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'creator', label: 'Creator' },
];

export default function ConnectHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [developers, setDevelopers] = useState<DeveloperProfile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('rank');

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'directory') {
        const devs = await fetchDevelopers({ search: searchQuery, sortBy });
        setDevelopers(devs);
      } else if (activeTab === 'messages') {
        const convos = await fetchConversations();
        setConversations(convos);
      } else if (activeTab === 'groups') {
        const grps = await fetchStudyGroups(searchQuery);
        setGroups(grps);
      } else if (activeTab === 'reviews') {
        const [rev, help] = await Promise.allSettled([fetchTechReviews(), fetchHelpRequests()]);
        if (rev.status === 'fulfilled') setReviews(rev.value);
        if (help.status === 'fulfilled') setHelpRequests(help.value);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery, sortBy]);

  useEffect(() => { setLoading(true); loadData(); }, [activeTab, sortBy]);
  useEffect(() => {
    const t = setTimeout(() => loadData(), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const renderDev = ({ item }: { item: DeveloperProfile }) => (
    <TouchableOpacity
      style={styles.devCard}
      onPress={() => navigation.navigate('DevProfile', { developerId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.devAvatar}>
        <Text style={styles.devAvatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.devInfo}>
        <View style={styles.devNameRow}>
          <Text style={styles.devName}>{item.name}</Text>
          {item.rating && <Text style={styles.devRating}>⭐ {item.rating.toFixed(1)}</Text>}
        </View>
        <Text style={styles.devUsername}>@{item.username}</Text>
        <Text numberOfLines={2} style={styles.devBio}>{item.bio}</Text>
        {item.skills?.length > 0 && (
          <View style={styles.skillsRow}>
            {item.skills.slice(0, 3).map(skill => (
              <View key={skill} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
              </View>
            ))}
            {item.skills.length > 3 && <Text style={styles.moreSkills}>+{item.skills.length - 3}</Text>}
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.messageBtn}
        onPress={() => navigation.navigate('Chat', { participantId: item.id, participantName: item.name, participantAvatar: item.avatar })}
      >
        <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convoCard}
      onPress={() => navigation.navigate('Chat', { participantId: item.participant.id, participantName: item.participant.name })}
      activeOpacity={0.8}
    >
      <View style={styles.devAvatar}>
        <Text style={styles.devAvatarText}>{item.participant.name?.[0]?.toUpperCase() || '?'}</Text>
        {item.participant.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.convoInfo}>
        <View style={styles.convoTopRow}>
          <Text style={styles.devName}>{item.participant.name}</Text>
          {item.lastMessage && <Text style={styles.convoTime}>{formatRelativeTime(item.lastMessage.createdAt)}</Text>}
        </View>
        <Text numberOfLines={1} style={styles.lastMessage}>{item.lastMessage?.content || 'Start a conversation'}</Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>
      )}
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: StudyGroup }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
      activeOpacity={0.8}
    >
      <View style={styles.groupIcon}><Text style={styles.groupIconText}>👥</Text></View>
      <View style={styles.groupInfo}>
        <Text style={styles.devName}>{item.name}</Text>
        <Text style={styles.groupMeta}>{item.topic} • {item.level} • {item.members}/{item.maxMembers} members</Text>
        <Text numberOfLines={2} style={styles.devBio}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const renderReview = ({ item }: { item: any }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>{item.title || item.website}</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>⭐ {item.rating}/5</Text>
        </View>
      </View>
      <Text style={styles.reviewCategory}>{item.category}</Text>
      <Text numberOfLines={3} style={styles.reviewContent}>{item.content}</Text>
      <Text style={styles.reviewAuthor}>by {item.authorName}</Text>
    </View>
  );

  const renderHelpRequest = ({ item }: { item: any }) => (
    <View style={styles.helpCard}>
      <Text style={styles.helpTitle}>{item.title}</Text>
      <Text numberOfLines={2} style={styles.helpDesc}>{item.description}</Text>
      <View style={styles.helpFooter}>
        <Text style={styles.helpAuthor}>by {item.authorName}</Text>
        <TouchableOpacity style={styles.replyBtn} onPress={() => navigation.navigate('SubmitHelpRequest')}>
          <Text style={styles.replyBtnText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Developer Connect</Text>
        {activeTab === 'reviews' && (
          <TouchableOpacity onPress={() => navigation.navigate('WriteReview')} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        {activeTab === 'groups' && (
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      {(activeTab === 'directory' || activeTab === 'groups') && (
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'directory' ? 'Search developers...' : 'Search groups...'}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Sort (directory only) */}
      {activeTab === 'directory' && (
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortChip, sortBy === opt.value && styles.activeSortChip]}
              onPress={() => setSortBy(opt.value)}
            >
              <Text style={[styles.sortChipText, sortBy === opt.value && styles.activeSortChipText]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          {activeTab === 'directory' && (
            <FlatList data={developers} renderItem={renderDev} keyExtractor={i => i.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No developers found</Text>}
            />
          )}
          {activeTab === 'messages' && (
            <FlatList data={conversations} renderItem={renderConversation} keyExtractor={i => i.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No conversations yet</Text>}
            />
          )}
          {activeTab === 'groups' && (
            <FlatList data={groups} renderItem={renderGroup} keyExtractor={i => i.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No study groups found</Text>}
            />
          )}
          {activeTab === 'reviews' && (
            <FlatList
              data={[...reviews.map(r => ({ ...r, _type: 'review' })), ...helpRequests.map(h => ({ ...h, _type: 'help' }))]}
              renderItem={({ item }) => item._type === 'review' ? renderReview({ item }) : renderHelpRequest({ item })}
              keyExtractor={i => i.id || i._id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No reviews yet</Text>}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${COLORS.primary}20`, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  activeTab: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  tabLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  activeTabLabel: { color: COLORS.primary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, color: COLORS.textPrimary, fontSize: 14 },
  sortRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeSortChip: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  sortChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  activeSortChipText: { color: COLORS.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, gap: 10, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
  devCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'flex-start', gap: 12 },
  devAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  devAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, borderWidth: 1.5, borderColor: COLORS.surface },
  devInfo: { flex: 1 },
  devNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  devName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  devRating: { fontSize: 12, color: COLORS.warning },
  devUsername: { fontSize: 12, color: COLORS.textMuted, marginBottom: 3 },
  devBio: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillTag: { backgroundColor: `${COLORS.accent}15`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  skillTagText: { fontSize: 10, color: COLORS.accent, fontWeight: '600' },
  moreSkills: { fontSize: 10, color: COLORS.textMuted, alignSelf: 'center' },
  messageBtn: { padding: 8, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md },
  convoCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 12 },
  convoInfo: { flex: 1 },
  convoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  convoTime: { fontSize: 11, color: COLORS.textMuted },
  lastMessage: { fontSize: 13, color: COLORS.textMuted },
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  groupCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 12 },
  groupIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${COLORS.accent}20`, justifyContent: 'center', alignItems: 'center' },
  groupIconText: { fontSize: 22 },
  groupInfo: { flex: 1 },
  groupMeta: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  ratingBadge: { backgroundColor: `${COLORS.warning}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  ratingText: { fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  reviewCategory: { fontSize: 11, color: COLORS.accent, fontWeight: '600', marginBottom: 6 },
  reviewContent: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  reviewAuthor: { fontSize: 11, color: COLORS.textMuted },
  helpCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: `${COLORS.warning}30` },
  helpTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  helpDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  helpFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  helpAuthor: { fontSize: 11, color: COLORS.textMuted },
  replyBtn: { backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  replyBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});

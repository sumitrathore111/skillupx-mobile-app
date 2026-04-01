import type { Conversation, DeveloperProfile, StudyGroup } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    createStudyGroup, fetchConversations, fetchDevelopers, fetchHelpRequests,
    fetchStudyGroups, fetchTechReviews,
    likeReview, markHelpful, replyToHelpRequest
} from '@services/connectService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'directory' | 'messages' | 'groups' | 'reviews';
type ReviewSubTab = 'reviews' | 'requests';

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

function nameColor(name: string): string {
  const palette = ['#6C63FF','#00D9FF','#FF4757','#00E676','#FFB300','#a855f7','#f59e0b','#ec4899'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

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

  // Reviews sub-state
  const [reviewSubTab, setReviewSubTab] = useState<ReviewSubTab>('reviews');
  const [reviewSearch, setReviewSearch] = useState('');
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

  // Create Group modal state
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupTopic, setNewGroupTopic] = useState('');
  const [newGroupLevel, setNewGroupLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [newGroupMax, setNewGroupMax] = useState('10');
  const [creatingGroup, setCreatingGroup] = useState(false);

  async function handleCreateGroup() {
    if (!newGroupName.trim() || !newGroupTopic.trim()) {
      Alert.alert('Missing Fields', 'Please fill in group name and topic.');
      return;
    }
    setCreatingGroup(true);
    try {
      await createStudyGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        topic: newGroupTopic.trim(),
        level: newGroupLevel,
        maxMembers: parseInt(newGroupMax) || 10,
      });
      setCreateGroupVisible(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupTopic('');
      setNewGroupLevel('Beginner');
      setNewGroupMax('10');
      setRefreshing(true);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  }

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

  // ─── helpers ───────────────────────────────────────────────────────────────
  async function handleLike(reviewId: string, currentLikes: number) {
    const wasLiked = !!likedByMe[reviewId];
    setLikedByMe(prev => ({ ...prev, [reviewId]: !wasLiked }));
    setLocalLikes(l => ({ ...l, [reviewId]: currentLikes + (wasLiked ? -1 : 1) }));
    try { await likeReview(reviewId); } catch { /* revert silently */ }
  }

  async function handleHelpful(reviewId: string) {
    try { await markHelpful(reviewId); } catch {}
  }

  async function handleReply() {
    if (!replyText.trim() || !selectedRequest) return;
    setSendingReply(true);
    try {
      await replyToHelpRequest(selectedRequest.id, replyText.trim());
      setReplyText('');
      setReplyModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send reply');
    } finally { setSendingReply(false); }
  }

  // ─── render helpers ────────────────────────────────────────────────────────
  const filteredReviews = reviews.filter(r => {
    if (!reviewSearch) return true;
    const q = reviewSearch.toLowerCase();
    return (r.title || r.website || '').toLowerCase().includes(q)
      || (r.category || '').toLowerCase().includes(q)
      || (r.content || '').toLowerCase().includes(q);
  });

  const filteredRequests = helpRequests.filter(r => {
    if (!reviewSearch) return true;
    const q = reviewSearch.toLowerCase();
    return (r.title || '').toLowerCase().includes(q)
      || (r.description || '').toLowerCase().includes(q);
  });

  const renderDev = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.devCard}
      onPress={() => navigation.navigate('DevProfile', { developerId: item.id || item.userId || item._id })}
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
            {item.skills.slice(0, 3).map((skill: string) => (
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
        onPress={() => navigation.navigate('Chat', { participantId: item.id || item.userId || item._id, participantName: item.name, participantAvatar: item.avatar, isOnline: !!item.isOnline })}
      >
        <Ionicons name="chatbubble-outline" size={15} color={COLORS.primary} />
        <Text style={styles.messageBtnText}>Chat</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }: { item: any }) => {
    const pId = item.participant?.id || item.participant?.userId || item.participantId || '';
    const pName = item.participant?.name || item.participantName || 'Unknown';
    const isOnline = item.participant?.isOnline || false;
    const lastMsgContent = item.lastMessage?.content || (typeof item.lastMessage === 'string' ? item.lastMessage : '') || 'Start a conversation...';
    const lastMsgTime = item.lastMessage?.createdAt || item.lastMessageAt;
    const unread = item.unreadCount || 0;
    const initials = pName.split(' ').map((w: string) => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
    const avatarBg = nameColor(pName);
    return (
      <TouchableOpacity
        style={styles.dmRow}
        onPress={() => navigation.navigate('Chat', { participantId: pId, participantName: pName, isOnline })}
        activeOpacity={0.6}
      >
        <View style={[styles.dmAvatarWrap, unread > 0 && styles.dmAvatarUnread]}>
          <View style={[styles.dmAvatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.dmAvatarText}>{initials}</Text>
          </View>
          {isOnline && <View style={styles.dmOnlineDot} />}
        </View>
        <View style={styles.dmBody}>
          <View style={styles.dmTopRow}>
            <Text style={[styles.dmName, unread > 0 && { fontWeight: '800' }]} numberOfLines={1}>{pName}</Text>
            {lastMsgTime && <Text style={styles.dmTime}>{formatRelativeTime(lastMsgTime)}</Text>}
          </View>
          <Text numberOfLines={1} style={[styles.dmPreview, unread > 0 && { color: COLORS.textPrimary, fontWeight: '600' }]}>
            {lastMsgContent}
          </Text>
        </View>
        {unread > 0 && (
          <View style={styles.dmUnread}>
            <Text style={styles.dmUnreadText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item }: { item: StudyGroup }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
      activeOpacity={0.8}
    >
      <View style={styles.groupIcon}><Text style={styles.groupIconText}>👥</Text></View>
      <View style={styles.groupInfo}>
        <Text style={styles.devName}>{item.name}</Text>
        <Text style={styles.groupMeta}>{item.topic} • {item.level} • {Array.isArray(item.members) ? item.members.length : (item.members ?? 0)}/{item.maxMembers} members</Text>
        <Text numberOfLines={2} style={styles.devBio}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  // Rich review card — matches web
  const renderReview = ({ item }: { item: any }) => {
    const likes = localLikes[item.id] ?? item.likes ?? 0;
    const liked = !!likedByMe[item.id];
    const prosArr: string[] = Array.isArray(item.pros)
      ? item.pros
      : typeof item.pros === 'string' && item.pros
      ? item.pros.split('\n').filter(Boolean)
      : [];
    const consArr: string[] = Array.isArray(item.cons)
      ? item.cons
      : typeof item.cons === 'string' && item.cons
      ? item.cons.split('\n').filter(Boolean)
      : [];
    return (
      <View style={styles.reviewCard}>
        {/* Author row */}
        <View style={styles.reviewAuthorRow}>
          <View style={styles.reviewAvatar}>
            <Text style={styles.reviewAvatarText}>
              {(item.authorName || item.userName || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewAuthorName}>{item.authorName || item.userName || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>{item.createdAt ? formatRelativeTime(item.createdAt) : ''}</Text>
          </View>
          {item.category && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{item.category}</Text>
            </View>
          )}
        </View>

        {/* Title + website */}
        <Text style={styles.reviewTitle}>{item.title || item.website}</Text>
        {item.website && item.title && (
          <Text style={styles.reviewWebsite}>{item.website}</Text>
        )}

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <Ionicons
              key={s}
              name={s <= (item.rating || 0) ? 'star' : 'star-outline'}
              size={14}
              color={s <= (item.rating || 0) ? COLORS.warning : COLORS.textMuted}
            />
          ))}
          <Text style={styles.ratingNum}>{item.rating}/5</Text>
        </View>

        {/* Content */}
        <Text style={styles.reviewContent}>{item.content}</Text>

        {/* Pros / Cons */}
        {(prosArr.length > 0 || consArr.length > 0) && (
          <View style={styles.prosConsRow}>
            {prosArr.length > 0 && (
              <View style={[styles.prosConsBox, styles.prosBox]}>
                <Text style={[styles.prosConsLabel, { color: COLORS.success }]}>✓ Pros</Text>
                {prosArr.slice(0, 3).map((p, i) => (
                  <Text key={i} style={[styles.prosConsItem, { color: COLORS.success }]}>• {p}</Text>
                ))}
              </View>
            )}
            {consArr.length > 0 && (
              <View style={[styles.prosConsBox, styles.consBox]}>
                <Text style={[styles.prosConsLabel, { color: COLORS.danger }]}>✗ Cons</Text>
                {consArr.slice(0, 3).map((c, i) => (
                  <Text key={i} style={[styles.prosConsItem, { color: COLORS.danger }]}>• {c}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.reviewActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id, item.likes || 0)}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? COLORS.danger : COLORS.textMuted} />
            <Text style={[styles.actionText, liked && { color: COLORS.danger }]}>{likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleHelpful(item.id)}>
            <Ionicons name="trending-up-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.actionText}>{item.helpful || 0} helpful</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Rich help request card — matches web
  const renderHelpRequest = ({ item }: { item: any }) => {
    const isExpanded = !!expandedRequests[item.id];
    const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
    const replies = item.replies || [];
    return (
      <View style={styles.helpCard}>
        {/* Author row */}
        <View style={styles.reviewAuthorRow}>
          <View style={[styles.reviewAvatar, styles.helpAvatar]}>
            <Text style={styles.reviewAvatarText}>
              {(item.authorName || item.userName || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewAuthorName}>{item.authorName || item.userName || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>{item.createdAt ? formatRelativeTime(item.createdAt) : ''}</Text>
          </View>
        </View>

        <Text style={styles.helpTitle}>{item.title}</Text>
        <Text numberOfLines={isExpanded ? undefined : 3} style={styles.helpDesc}>{item.description}</Text>

        {/* Tags */}
        {tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
            {tags.map((tag, i) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Replies preview */}
        {isExpanded && replies.length > 0 && (
          <View style={styles.repliesSection}>
            <Text style={styles.repliesHeader}>{replies.length} {replies.length === 1 ? 'Response' : 'Responses'}</Text>
            {replies.map((reply: any, i: number) => (
              <View key={i} style={styles.replyItem}>
                <View style={styles.replyAvatar}>
                  <Text style={styles.replyAvatarText}>{(reply.authorName || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.replyAuthorName}>{reply.authorName}</Text>
                  <Text style={styles.replyContent}>{reply.content}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.helpFooter}>
          {replies.length > 0 && (
            <TouchableOpacity
              onPress={() => setExpandedRequests(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
            >
              <Text style={styles.repliesCount}>
                {replies.length} {replies.length === 1 ? 'response' : 'responses'}
                {' '}
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={11} color={COLORS.primary} />
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.replyBtn}
            onPress={() => { setSelectedRequest(item); setReplyModalVisible(true); }}
          >
            <Ionicons name="chatbubble-outline" size={13} color={COLORS.primary} />
            <Text style={styles.replyBtnText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Developer Connect</Text>
          <Text style={styles.pageSubtitle}>Connect with top developers</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
        {activeTab === 'reviews' && reviewSubTab === 'reviews' && (
          <TouchableOpacity onPress={() => navigation.navigate('WriteReview')} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        {activeTab === 'reviews' && reviewSubTab === 'requests' && (
          <TouchableOpacity onPress={() => navigation.navigate('SubmitHelpRequest')} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        {activeTab === 'groups' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setCreateGroupVisible(true)}>
            <Ionicons name="add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.id ? '#fff' : COLORS.textMuted} />
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, sortBy === opt.value && styles.activeSortChip]}
                onPress={() => setSortBy(opt.value)}
              >
                <Text style={[styles.sortChipText, sortBy === opt.value && styles.activeSortChipText]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Reviews: sub-tabs + search */}
      {activeTab === 'reviews' && (
        <>
          {/* Sub-tab toggle */}
          <View style={styles.subTabBar}>
            <TouchableOpacity
              style={[styles.subTab, reviewSubTab === 'reviews' && styles.activeSubTab]}
              onPress={() => setReviewSubTab('reviews')}
            >
              <Ionicons name="star" size={13} color={reviewSubTab === 'reviews' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.subTabText, reviewSubTab === 'reviews' && styles.activeSubTabText]}>
                Reviews ({filteredReviews.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTab, reviewSubTab === 'requests' && styles.activeSubTab]}
              onPress={() => setReviewSubTab('requests')}
            >
              <Ionicons name="chatbubble-ellipses" size={13} color={reviewSubTab === 'requests' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.subTabText, reviewSubTab === 'requests' && styles.activeSubTabText]}>
                Help ({filteredRequests.length})
              </Text>
            </TouchableOpacity>
          </View>
          {/* Search within reviews */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={reviewSubTab === 'reviews' ? 'Search reviews...' : 'Search help requests...'}
              placeholderTextColor={COLORS.textMuted}
              value={reviewSearch}
              onChangeText={setReviewSearch}
            />
            {reviewSearch.length > 0 && (
              <TouchableOpacity onPress={() => setReviewSearch('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          {activeTab === 'directory' && (
            <FlatList data={developers} renderItem={renderDev} keyExtractor={i => i.id || i.userId || i._id || String(Math.random())}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No developers found</Text>}
            />
          )}
          {activeTab === 'messages' && (
            <FlatList data={conversations} renderItem={renderConversation} keyExtractor={i => i.id || i.chatId || i._id || i.participantId || String(Math.random())}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.dmListContent}
              ListEmptyComponent={
                <View style={styles.dmEmpty}>
                  <Text style={{ fontSize: 48 }}>💬</Text>
                  <Text style={styles.emptyTitle}>No conversations yet</Text>
                  <Text style={styles.emptySubtitle}>Find a developer and start chatting!</Text>
                </View>
              }
            />
          )}
          {activeTab === 'groups' && (
            <FlatList data={groups} renderItem={renderGroup} keyExtractor={i => i.id || i._id || String(Math.random())}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No study groups found</Text>}
            />
          )}
          {activeTab === 'reviews' && reviewSubTab === 'reviews' && (
            <FlatList
              data={filteredReviews}
              renderItem={renderReview}
              keyExtractor={(i, idx) => i.id || i._id || String(idx)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="star-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No reviews yet</Text>
                  <Text style={styles.emptySubtitle}>Be the first to share a learning resource!</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('WriteReview')}>
                    <Text style={styles.emptyBtnText}>Write First Review</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
          {activeTab === 'reviews' && reviewSubTab === 'requests' && (
            <FlatList
              data={filteredRequests}
              renderItem={renderHelpRequest}
              keyExtractor={(i, idx) => i.id || i._id || String(idx)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No help requests yet</Text>
                  <Text style={styles.emptySubtitle}>Need recommendations? Ask the community!</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('SubmitHelpRequest')}>
                    <Text style={styles.emptyBtnText}>Ask for Help</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Reply Modal */}
      <Modal
        visible={replyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reply to Help Request</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedRequest && (
              <Text style={styles.modalRequestTitle} numberOfLines={2}>{selectedRequest.title}</Text>
            )}
            <TextInput
              style={styles.replyInput}
              placeholder="Write a helpful reply..."
              placeholderTextColor={COLORS.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={5}
              maxLength={1000}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.replySubmitBtn, (!replyText.trim() || sendingReply) && { opacity: 0.5 }]}
              onPress={handleReply}
              disabled={!replyText.trim() || sendingReply}
            >
              {sendingReply ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.replySubmitText}>Submit Reply</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal
        visible={createGroupVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateGroupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Study Group</Text>
              <TouchableOpacity onPress={() => setCreateGroupVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.cgLabel}>Group Name *</Text>
              <TextInput
                style={styles.cgInput}
                placeholder="e.g. React Native Learners"
                placeholderTextColor={COLORS.textMuted}
                value={newGroupName}
                onChangeText={setNewGroupName}
                maxLength={60}
              />
              <Text style={styles.cgLabel}>Topic *</Text>
              <TextInput
                style={styles.cgInput}
                placeholder="e.g. React Native, System Design..."
                placeholderTextColor={COLORS.textMuted}
                value={newGroupTopic}
                onChangeText={setNewGroupTopic}
                maxLength={50}
              />
              <Text style={styles.cgLabel}>Description</Text>
              <TextInput
                style={[styles.cgInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="What will the group focus on?"
                placeholderTextColor={COLORS.textMuted}
                value={newGroupDescription}
                onChangeText={setNewGroupDescription}
                multiline
                maxLength={200}
              />
              <Text style={styles.cgLabel}>Level</Text>
              <View style={styles.cgLevelRow}>
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map(lvl => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.cgLevelChip, newGroupLevel === lvl && styles.cgLevelActive]}
                    onPress={() => setNewGroupLevel(lvl)}
                  >
                    <Text style={[styles.cgLevelText, newGroupLevel === lvl && styles.cgLevelActiveText]}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.cgLabel}>Max Members</Text>
              <TextInput
                style={[styles.cgInput, { width: 100 }]}
                placeholder="10"
                placeholderTextColor={COLORS.textMuted}
                value={newGroupMax}
                onChangeText={setNewGroupMax}
                keyboardType="number-pad"
                maxLength={3}
              />
            </ScrollView>
            <TouchableOpacity
              style={[styles.replySubmitBtn, { marginTop: 12 }, (!newGroupName.trim() || !newGroupTopic.trim() || creatingGroup) && { opacity: 0.5 }]}
              onPress={handleCreateGroup}
              disabled={!newGroupName.trim() || !newGroupTopic.trim() || creatingGroup}
            >
              {creatingGroup ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="people" size={16} color="#fff" />
                  <Text style={styles.replySubmitText}>Create Group</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${COLORS.primary}20`, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: RADIUS.lg },
  activeTab: { backgroundColor: COLORS.primary },
  tabLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  activeTabLabel: { color: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: 14 },
  sortRow: { paddingHorizontal: 16, marginBottom: 10 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeSortChip: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  sortChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  activeSortChipText: { color: COLORS.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },

  // Sub-tabs (reviews)
  subTabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 3, gap: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  subTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: RADIUS.md,
  },
  activeSubTab: { backgroundColor: `${COLORS.primary}20` },
  subTabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  activeSubTabText: { color: COLORS.primary },

  // Instagram DM rows
  dmRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, gap: 13 },
  dmListContent: { paddingBottom: 32 },
  dmEmpty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  dmAvatarWrap: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  dmAvatarUnread: { borderColor: COLORS.primary },
  dmAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  dmAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  dmOnlineDot: { position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 2.5, borderColor: COLORS.background },
  dmBody: { flex: 1, justifyContent: 'center' },
  dmTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  dmName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1, marginRight: 8 },
  dmTime: { fontSize: 11, color: COLORS.textMuted },
  dmPreview: { fontSize: 13, color: COLORS.textMuted },
  dmUnread: { backgroundColor: COLORS.primary, borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  dmUnreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Dev card
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
  messageBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md, borderWidth: 1, borderColor: `${COLORS.primary}30` },
  messageBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  // Group card
  groupCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 12 },
  groupIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${COLORS.accent}20`, justifyContent: 'center', alignItems: 'center' },
  groupIconText: { fontSize: 22 },
  groupInfo: { flex: 1 },
  groupMeta: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },

  // Review card
  reviewCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  reviewAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  helpAvatar: { backgroundColor: COLORS.warning },
  reviewAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewAuthorName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  reviewDate: { fontSize: 11, color: COLORS.textMuted },
  categoryChip: {
    backgroundColor: `${COLORS.accent}15`, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, flexShrink: 0,
  },
  categoryChipText: { fontSize: 10, color: COLORS.accent, fontWeight: '600' },
  reviewTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  reviewWebsite: { fontSize: 12, color: COLORS.accent },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingNum: { fontSize: 11, color: COLORS.textMuted, marginLeft: 4 },
  reviewContent: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  prosConsRow: { flexDirection: 'row', gap: 8 },
  prosConsBox: {
    flex: 1, borderRadius: RADIUS.md, padding: 8, gap: 3,
  },
  prosBox: { backgroundColor: `${COLORS.success}12`, borderWidth: 1, borderColor: `${COLORS.success}25` },
  consBox: { backgroundColor: `${COLORS.danger}10`, borderWidth: 1, borderColor: `${COLORS.danger}20` },
  prosConsLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  prosConsItem: { fontSize: 11, lineHeight: 16 },
  reviewActions: { flexDirection: 'row', gap: 16, paddingTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 12, color: COLORS.textMuted },

  // Help request card
  helpCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: `${COLORS.warning}30`, gap: 8,
  },
  helpTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  helpDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  tagsScroll: { flexGrow: 0 },
  tagChip: {
    backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: RADIUS.full, marginRight: 6, borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  tagChipText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  repliesSection: { gap: 8, paddingTop: 4 },
  repliesHeader: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  replyItem: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 8 },
  replyAvatar: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  replyAvatarText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  replyAuthorName: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  replyContent: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  helpFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border },
  repliesCount: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  replyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  replyBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Reply modal
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32, gap: 12, borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  modalRequestTitle: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  replyInput: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, color: COLORS.textPrimary, fontSize: 14,
    minHeight: 100, textAlignVertical: 'top',
  },
  replySubmitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 13,
  },
  replySubmitText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Create Group form styles
  cgLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, marginTop: 10 },
  cgInput: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: 14,
  },
  cgLevelRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  cgLevelChip: {
    flex: 1, paddingVertical: 8, borderRadius: RADIUS.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  cgLevelActive: { backgroundColor: `${COLORS.primary}25`, borderColor: COLORS.primary },
  cgLevelText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  cgLevelActiveText: { color: COLORS.primary },
});

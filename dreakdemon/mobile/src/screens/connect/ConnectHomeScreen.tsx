import type { ConnectionRequest as ConnectionReqType, Conversation, DeveloperProfile, StudyGroup } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    acceptConnectionRequest, createStudyGroup, fetchConversations, fetchDevelopers,
    fetchHelpRequests, fetchReceivedRequests, fetchStudyGroups, fetchTechReviews,
    likeReview, markHelpful, rejectConnectionRequest, replyToHelpRequest
} from '@services/connectService';
import { getSocket } from '@services/socketService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useRef, useState } from 'react';
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

const EMOJIS = ['😎', '🚀', '💻', '🔥', '⚡', '🎯', '🧠', '💡', '🎨', '🛠️', '✨', '🌟', '👾', '🤖', '🦊'];

function getEmoji(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return EMOJIS[Math.abs(h) % EMOJIS.length];
}

function nameColor(name: string): string {
  const palette = ['#6C63FF', '#00D9FF', '#FF4757', '#00E676', '#FFB300', '#a855f7', '#f59e0b', '#ec4899'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
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
  const [connectionRequests, setConnectionRequests] = useState<ConnectionReqType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('rank');

  const [reviewSubTab, setReviewSubTab] = useState<ReviewSubTab>('reviews');
  const [reviewSearch, setReviewSearch] = useState('');
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupTopic, setNewGroupTopic] = useState('');
  const [newGroupLevel, setNewGroupLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [newGroupMax, setNewGroupMax] = useState('10');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
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
        isPrivate: newGroupPrivate,
      });
      setCreateGroupVisible(false);
      setNewGroupName(''); setNewGroupDescription(''); setNewGroupTopic('');
      setNewGroupLevel('Beginner'); setNewGroupMax('10'); setNewGroupPrivate(false);
      setRefreshing(true);
      refreshTab('groups');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create group');
    } finally { setCreatingGroup(false); }
  }

  const isFirstRender = useRef(true);

  // Refresh a specific tab's data
  const refreshTab = useCallback(async (tab: Tab) => {
    try {
      if (tab === 'directory') {
        const devs = await fetchDevelopers({ search: searchQuery, sortBy });
        setDevelopers(devs);
      } else if (tab === 'messages') {
        const [convos, reqs] = await Promise.all([fetchConversations(), fetchReceivedRequests()]);
        setConversations(convos);
        setConnectionRequests(reqs);
      } else if (tab === 'groups') {
        const grps = await fetchStudyGroups(searchQuery);
        setGroups(grps);
      } else if (tab === 'reviews') {
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
  }, [searchQuery, sortBy]);

  // Load ALL tabs once on mount — no per-tab-switch API calls
  useEffect(() => {
    (async () => {
      try {
        const [devs, convosAndReqs, grps, revAndHelp] = await Promise.all([
          fetchDevelopers({ sortBy: 'rank' }),
          Promise.all([fetchConversations(), fetchReceivedRequests()]),
          fetchStudyGroups(''),
          Promise.allSettled([fetchTechReviews(), fetchHelpRequests()]),
        ]);
        setDevelopers(devs);
        setConversations(convosAndReqs[0]);
        setConnectionRequests(convosAndReqs[1]);
        setGroups(grps);
        if (revAndHelp[0].status === 'fulfilled') setReviews(revAndHelp[0].value);
        if (revAndHelp[1].status === 'fulfilled') setHelpRequests(revAndHelp[1].value);
      } catch (e) { console.error(e); }
      finally { setLoading(false); isFirstRender.current = false; }
    })();
  }, []);

  // Sort change → refresh directory only (skip initial mount)
  useEffect(() => {
    if (isFirstRender.current) return;
    refreshTab('directory');
  }, [sortBy]);

  // Search → debounced refresh for current tab (skip initial mount)
  useEffect(() => {
    if (isFirstRender.current) return;
    const t = setTimeout(() => refreshTab(activeTab), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Socket-driven real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const refreshMessages = () => refreshTab('messages');
    const refreshGroups = () => refreshTab('groups');

    socket.on('newMessage', refreshMessages);
    socket.on('conversationUpdated', refreshMessages);
    socket.on('connectionRequest', refreshMessages);
    socket.on('connectionAccepted', refreshMessages);
    socket.on('connectionRejected', refreshMessages);
    socket.on('connectionRemoved', refreshMessages);
    socket.on('newGroupMessage', refreshGroups);
    socket.on('memberJoined', refreshGroups);
    socket.on('memberRemoved', refreshGroups);

    return () => {
      socket.off('newMessage', refreshMessages);
      socket.off('conversationUpdated', refreshMessages);
      socket.off('connectionRequest', refreshMessages);
      socket.off('connectionAccepted', refreshMessages);
      socket.off('connectionRejected', refreshMessages);
      socket.off('connectionRemoved', refreshMessages);
      socket.off('newGroupMessage', refreshGroups);
      socket.off('memberJoined', refreshGroups);
      socket.off('memberRemoved', refreshGroups);
    };
  }, [refreshTab]);

  const onRefresh = () => { setRefreshing(true); refreshTab(activeTab); };

  async function handleAcceptRequest(reqId: string) {
    try {
      await acceptConnectionRequest(reqId);
      refreshTab('messages');
    } catch { Alert.alert('Error', 'Failed to accept'); }
  }

  async function handleRejectRequest(reqId: string) {
    try {
      await rejectConnectionRequest(reqId);
      refreshTab('messages');
    } catch { Alert.alert('Error', 'Failed to reject'); }
  }

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
      setReplyText(''); setReplyModalVisible(false);
      refreshTab('reviews');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send reply');
    } finally { setSendingReply(false); }
  }

  const filteredReviews = reviews.filter(r => {
    if (!reviewSearch) return true;
    const q = reviewSearch.toLowerCase();
    return (r.title || r.website || '').toLowerCase().includes(q)
      || (r.category || '').toLowerCase().includes(q);
  });

  const filteredRequests = helpRequests.filter(r => {
    if (!reviewSearch) return true;
    const q = reviewSearch.toLowerCase();
    return (r.title || '').toLowerCase().includes(q)
      || (r.description || '').toLowerCase().includes(q);
  });

  // ─── RENDER: Developer Row (no card, clean row) ─────────────────
  const renderDev = ({ item }: { item: DeveloperProfile }) => (
    <TouchableOpacity
      style={styles.devRow}
      onPress={() => navigation.navigate('DevProfile', { developerId: item.id || item.userId || item._id })}
      activeOpacity={0.6}
    >
      <View style={styles.devAvatar}>
        <Text style={styles.devEmojiMain}>{getEmoji(item.name)}</Text>
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.devInfo}>
        <View style={styles.devNameRow}>
          <Text style={styles.devName} numberOfLines={1}>{item.name}</Text>
          {item.rating ? <Text style={styles.devRating}>⭐ {item.rating.toFixed(1)}</Text> : null}
        </View>
        <Text style={styles.devUsername}>@{item.username}</Text>
        {item.skills?.length > 0 && (
          <View style={styles.skillsRow}>
            {item.skills.slice(0, 3).map((skill: string) => (
              <Text key={skill} style={styles.skillInline}>{skill}</Text>
            ))}
            {item.skills.length > 3 && <Text style={styles.skillMore}>+{item.skills.length - 3}</Text>}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  // ─── RENDER: Conversation Row (Instagram DM style) ──────────────
  const renderConversation = ({ item }: { item: Conversation }) => {
    const pId = item.participant?.id || item.participant?.userId || item.participantId || '';
    const pName = item.participant?.name || item.participantName || 'Unknown';
    const isOnline = item.participant?.isOnline || false;
    const lastMsgContent = typeof item.lastMessage === 'object' ? item.lastMessage?.content || item.lastMessage?.message || '' : item.lastMessage || 'Start a conversation...';
    const lastMsgTime = typeof item.lastMessage === 'object' ? item.lastMessage?.createdAt : item.lastMessageAt;
    const unread = item.unreadCount || 0;
    const initials = pName.split(' ').map((w: string) => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
    const avatarBg = nameColor(pName);
    return (
      <TouchableOpacity
        style={styles.dmRow}
        onPress={() => navigation.navigate('Chat', { participantId: pId, participantName: pName, isOnline })}
        activeOpacity={0.5}
      >
        <View style={styles.dmAvatarWrap}>
          <View style={styles.dmAvatar}>
            <Text style={styles.dmEmojiMain}>{getEmoji(pName)}</Text>
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

  // ─── RENDER: Connection Request Row ─────────────────────────────
  const renderConnectionRequest = ({ item }: { item: ConnectionReqType }) => (
    <View style={styles.requestRow}>
      <View style={styles.requestAvatar}>
        <Text style={styles.requestEmojiMain}>{getEmoji(item.senderName)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.requestName}>{item.senderName}</Text>
        <Text style={styles.requestTime}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(item._id || item.id)}>
        <Text style={styles.acceptBtnText}>Accept</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRequest(item._id || item.id)}>
        <Text style={styles.rejectBtnText}>Reject</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── RENDER: Group Row (clean, no card) ─────────────────────────
  const renderGroup = ({ item }: { item: StudyGroup }) => {
    const memberCount = Array.isArray(item.members) ? item.members.length : (item.members ?? 0);
    return (
      <TouchableOpacity
        style={styles.groupRow}
        onPress={() => navigation.navigate('GroupChat', { groupId: item.id || item._id, groupName: item.name })}
        activeOpacity={0.5}
      >
        <View style={styles.groupAvatar}>
          <Text style={styles.groupAvatarText}>👥</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
            {item.isPrivate ? (
              <Ionicons name="lock-closed" size={11} color={COLORS.textMuted} />
            ) : (
              <Ionicons name="globe-outline" size={11} color={COLORS.success} />
            )}
          </View>
          <Text style={styles.groupMeta}>{item.topic} · {item.level} · {memberCount}/{item.maxMembers}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  // ─── RENDER: Review ─────────────────────────────────────────────
  const renderReview = ({ item }: { item: any }) => {
    const likes = localLikes[item.id] ?? item.likes ?? 0;
    const liked = !!likedByMe[item.id];
    const prosArr: string[] = Array.isArray(item.pros) ? item.pros : typeof item.pros === 'string' && item.pros ? item.pros.split('\n').filter(Boolean) : [];
    const consArr: string[] = Array.isArray(item.cons) ? item.cons : typeof item.cons === 'string' && item.cons ? item.cons.split('\n').filter(Boolean) : [];
    return (
      <View style={styles.reviewItem}>
        <View style={styles.reviewAuthorRow}>
          <View style={styles.reviewAvatar}>
            <Text style={styles.reviewEmojiMain}>{getEmoji(item.authorName || item.userName || 'A')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewAuthorName}>{item.authorName || item.userName || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>{item.createdAt ? formatRelativeTime(item.createdAt) : ''}</Text>
          </View>
          {item.category && <Text style={styles.categoryTag}>{item.category}</Text>}
        </View>
        <Text style={styles.reviewTitle}>{item.title || item.website}</Text>
        {item.website && item.title && <Text style={styles.reviewWebsite}>{item.website}</Text>}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <Ionicons key={s} name={s <= (item.rating || 0) ? 'star' : 'star-outline'} size={13} color={s <= (item.rating || 0) ? COLORS.warning : COLORS.textMuted} />
          ))}
          <Text style={styles.ratingNum}>{item.rating}/5</Text>
        </View>
        <Text style={styles.reviewContent} numberOfLines={4}>{item.content}</Text>
        {(prosArr.length > 0 || consArr.length > 0) && (
          <View style={styles.prosConsRow}>
            {prosArr.length > 0 && (
              <View style={[styles.prosConsBox, { backgroundColor: `${COLORS.success}08` }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.success }}>✓ Pros</Text>
                {prosArr.slice(0, 2).map((p, i) => <Text key={i} style={{ fontSize: 11, color: COLORS.success }}>• {p}</Text>)}
              </View>
            )}
            {consArr.length > 0 && (
              <View style={[styles.prosConsBox, { backgroundColor: `${COLORS.danger}08` }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.danger }}>✗ Cons</Text>
                {consArr.slice(0, 2).map((c, i) => <Text key={i} style={{ fontSize: 11, color: COLORS.danger }}>• {c}</Text>)}
              </View>
            )}
          </View>
        )}
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

  // ─── RENDER: Help Request ──────────────────────────────────────
  const renderHelpRequest = ({ item }: { item: any }) => {
    const isExpanded = !!expandedRequests[item.id];
    const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
    const replies = item.replies || [];
    return (
      <View style={styles.helpItem}>
        <View style={styles.reviewAuthorRow}>
          <View style={styles.reviewAvatar}>
            <Text style={styles.reviewEmojiMain}>{getEmoji(item.authorName || item.userName || 'A')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewAuthorName}>{item.authorName || item.userName || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>{item.createdAt ? formatRelativeTime(item.createdAt) : ''}</Text>
          </View>
        </View>
        <Text style={styles.helpTitle}>{item.title}</Text>
        <Text numberOfLines={isExpanded ? undefined : 3} style={styles.helpDesc}>{item.description}</Text>
        {tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {tags.map((tag, i) => <Text key={i} style={styles.tagInline}>{tag}</Text>)}
          </ScrollView>
        )}
        {isExpanded && replies.length > 0 && (
          <View style={{ gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary }}>{replies.length} response{replies.length > 1 ? 's' : ''}</Text>
            {replies.map((reply: any, i: number) => (
              <View key={i} style={styles.replyRow}>
                <View style={styles.replyDot}>
                  <Text style={{ fontSize: 12 }}>{getEmoji(reply.authorName || 'A')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary }}>{reply.authorName}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{reply.content}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={styles.helpFooter}>
          {replies.length > 0 && (
            <TouchableOpacity onPress={() => setExpandedRequests(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
              <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>
                {replies.length} response{replies.length > 1 ? 's' : ''} {isExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.replyInlineBtn}
            onPress={() => { setSelectedRequest(item); setReplyModalVisible(true); }}
          >
            <Ionicons name="chatbubble-outline" size={12} color={COLORS.primary} />
            <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>Reply</Text>
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
          <Text style={styles.pageTitle}>Developer Connect 🤝</Text>
          <Text style={styles.pageSubtitle}>Find teammates, build together, grow your network</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {activeTab === 'messages' && connectionRequests.length > 0 && (
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('ConnectionRequests')}>
              <Ionicons name="person-add" size={18} color={COLORS.primary} />
              <View style={styles.badgeDot}><Text style={styles.badgeDotText}>{connectionRequests.length}</Text></View>
            </TouchableOpacity>
          )}
          {activeTab === 'reviews' && (
            <TouchableOpacity onPress={() => navigation.navigate(reviewSubTab === 'reviews' ? 'WriteReview' : 'SubmitHelpRequest')} style={styles.headerBtn}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {activeTab === 'groups' && (
            <TouchableOpacity style={styles.headerBtn} onPress={() => setCreateGroupVisible(true)}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
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
            <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.id ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>{tab.label}</Text>
            {activeTab === tab.id && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      {(activeTab === 'directory' || activeTab === 'groups' || activeTab === 'messages') && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'directory' ? 'Search developers...' : activeTab === 'messages' ? 'Search messages...' : 'Search groups...'}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sort chips */}
      {activeTab === 'directory' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortChip, sortBy === opt.value && styles.activeSortChip]}
              onPress={() => setSortBy(opt.value)}
            >
              <Text style={[styles.sortChipText, sortBy === opt.value && styles.activeSortText]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Reviews sub-tabs */}
      {activeTab === 'reviews' && (
        <>
          <View style={styles.subTabRow}>
            <TouchableOpacity style={[styles.subTab, reviewSubTab === 'reviews' && styles.activeSubTab]} onPress={() => setReviewSubTab('reviews')}>
              <Text style={[styles.subTabText, reviewSubTab === 'reviews' && styles.activeSubTabText]}>Reviews ({filteredReviews.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.subTab, reviewSubTab === 'requests' && styles.activeSubTab]} onPress={() => setReviewSubTab('requests')}>
              <Text style={[styles.subTabText, reviewSubTab === 'requests' && styles.activeSubTabText]}>Help ({filteredRequests.length})</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={reviewSubTab === 'reviews' ? 'Search reviews...' : 'Search help requests...'}
              placeholderTextColor={COLORS.textMuted}
              value={reviewSearch}
              onChangeText={setReviewSearch}
            />
          </View>
        </>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          {activeTab === 'directory' && (
            <FlatList data={developers} renderItem={renderDev}
              keyExtractor={(i, idx) => i.id || i.userId || i._id || String(idx)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={{ paddingBottom: 32 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No developers found</Text>}
            />
          )}
          {activeTab === 'messages' && (
            <FlatList
              data={conversations.filter(c => {
                if (!searchQuery) return true;
                const pName = (c.participant?.name || c.participantName || '').toLowerCase();
                return pName.includes(searchQuery.toLowerCase());
              })}
              renderItem={renderConversation}
              keyExtractor={(i, idx) => i.id || i.chatId || i._id || String(idx)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={{ paddingBottom: 32 }}
              ListHeaderComponent={
                connectionRequests.length > 0 ? (
                  <View style={styles.requestsSection}>
                    <Text style={styles.requestsHeader}>Connection Requests</Text>
                    {connectionRequests.slice(0, 3).map(req => (
                      <View key={req.id || req._id}>
                        {renderConnectionRequest({ item: req })}
                      </View>
                    ))}
                    {connectionRequests.length > 3 && (
                      <TouchableOpacity onPress={() => navigation.navigate('ConnectionRequests')}>
                        <Text style={styles.seeAllBtn}>See all {connectionRequests.length} requests</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null
              }
              ListEmptyComponent={
                connectionRequests.length === 0 ? (
                  <View style={styles.emptyCenter}>
                    <Text style={{ fontSize: 40 }}>💬</Text>
                    <Text style={styles.emptyTitle}>No conversations yet</Text>
                    <Text style={styles.emptySubtitle}>Connect with a developer to start chatting!</Text>
                  </View>
                ) : null
              }
            />
          )}
          {activeTab === 'groups' && (
            <FlatList data={groups} renderItem={renderGroup}
              keyExtractor={(i, idx) => i.id || i._id || String(idx)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={{ paddingBottom: 32 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No study groups found</Text>}
            />
          )}
          {activeTab === 'reviews' && reviewSubTab === 'reviews' && (
            <FlatList data={filteredReviews} renderItem={renderReview}
              keyExtractor={(i, idx) => i.id || i._id || String(idx)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
              ListEmptyComponent={
                <View style={styles.emptyCenter}>
                  <Ionicons name="star-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No reviews yet</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('WriteReview')}>
                    <Text style={styles.emptyBtnText}>Write First Review</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
          {activeTab === 'reviews' && reviewSubTab === 'requests' && (
            <FlatList data={filteredRequests} renderItem={renderHelpRequest}
              keyExtractor={(i, idx) => i.id || i._id || String(idx)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
              ListEmptyComponent={
                <View style={styles.emptyCenter}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No help requests yet</Text>
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
      <Modal visible={replyModalVisible} transparent animationType="slide" onRequestClose={() => setReplyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reply</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedRequest && <Text style={styles.modalSubtitle} numberOfLines={2}>{selectedRequest.title}</Text>}
            <TextInput
              style={styles.modalInput}
              placeholder="Write a helpful reply..."
              placeholderTextColor={COLORS.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={1000}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.submitBtn, (!replyText.trim() || sendingReply) && { opacity: 0.5 }]}
              onPress={handleReply}
              disabled={!replyText.trim() || sendingReply}
            >
              {sendingReply ? <ActivityIndicator color="#fff" size="small" /> : (
                <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.submitBtnText}>Submit</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal visible={createGroupVisible} transparent animationType="slide" onRequestClose={() => setCreateGroupVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Study Group</Text>
              <TouchableOpacity onPress={() => setCreateGroupVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.formLabel}>Group Name *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. React Native Learners" placeholderTextColor={COLORS.textMuted} value={newGroupName} onChangeText={setNewGroupName} maxLength={60} />
              <Text style={styles.formLabel}>Topic *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. React Native, System Design..." placeholderTextColor={COLORS.textMuted} value={newGroupTopic} onChangeText={setNewGroupTopic} maxLength={50} />
              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]} placeholder="What will the group focus on?" placeholderTextColor={COLORS.textMuted} value={newGroupDescription} onChangeText={setNewGroupDescription} multiline maxLength={200} />
              <Text style={styles.formLabel}>Level</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map(lvl => (
                  <TouchableOpacity key={lvl} style={[styles.levelChip, newGroupLevel === lvl && styles.levelChipActive]} onPress={() => setNewGroupLevel(lvl)}>
                    <Text style={[styles.levelChipText, newGroupLevel === lvl && { color: COLORS.primary }]}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Max Members</Text>
              <TextInput style={[styles.formInput, { width: 100 }]} placeholder="10" placeholderTextColor={COLORS.textMuted} value={newGroupMax} onChangeText={setNewGroupMax} keyboardType="number-pad" maxLength={3} />
              <Text style={styles.formLabel}>Visibility</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity style={[styles.levelChip, !newGroupPrivate && styles.levelChipActive]} onPress={() => setNewGroupPrivate(false)}>
                  <Ionicons name="globe-outline" size={14} color={!newGroupPrivate ? COLORS.success : COLORS.textMuted} />
                  <Text style={[styles.levelChipText, !newGroupPrivate && { color: COLORS.success }]}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.levelChip, newGroupPrivate && styles.levelChipActive]} onPress={() => setNewGroupPrivate(true)}>
                  <Ionicons name="lock-closed" size={14} color={newGroupPrivate ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.levelChipText, newGroupPrivate && { color: COLORS.primary }]}>Private</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.submitBtn, { marginTop: 12 }, (!newGroupName.trim() || !newGroupTopic.trim() || creatingGroup) && { opacity: 0.5 }]}
              onPress={handleCreateGroup}
              disabled={!newGroupName.trim() || !newGroupTopic.trim() || creatingGroup}
            >
              {creatingGroup ? <ActivityIndicator color="#fff" size="small" /> : (
                <><Ionicons name="people" size={16} color="#fff" /><Text style={styles.submitBtnText}>Create Group</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badgeDot: { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.danger, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Tabs — underline style
  tabBar: { flexDirection: 'row', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, position: 'relative' },
  activeTab: {},
  tabLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  activeTabLabel: { color: COLORS.primary, fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: -1, left: '20%', right: '20%', height: 2, backgroundColor: COLORS.primary, borderRadius: 1 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 8, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, gap: 8, height: 40, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, height: '100%' },

  // Sort
  sortRow: { marginBottom: 6, flexGrow: 0, flexShrink: 0, minHeight: 36 },
  sortChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeSortChip: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  sortChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  activeSortText: { color: COLORS.primary, fontWeight: '700' },

  // Sub-tabs
  subTabRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 6, marginBottom: 4, gap: 16 },
  subTab: { paddingBottom: 6 },
  activeSubTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  subTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  activeSubTabText: { color: COLORS.primary },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ─── Developer Row (NO card, plain row) ───
  devRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, gap: 12 },
  devAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', position: 'relative', backgroundColor: COLORS.surface },
  devEmojiMain: { fontSize: 24 },
  onlineDot: { position: 'absolute', top: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, borderWidth: 1.5, borderColor: COLORS.background },
  devInfo: { flex: 1 },
  devNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  devName: { fontSize: 13, fontWeight: '700', color: COLORS.primary, flex: 1 },
  devRating: { fontSize: 11, color: COLORS.warning, fontWeight: '600' },
  devUsername: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  skillsRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  skillInline: { fontSize: 10, color: COLORS.accent, fontWeight: '600' },
  skillMore: { fontSize: 10, color: COLORS.textMuted },

  // ─── DM Row (Instagram style, NO card) ───
  dmRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  dmAvatarWrap: { width: 52, height: 52, position: 'relative' },
  dmAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  dmEmojiMain: { fontSize: 26 },
  dmOnlineDot: { position: 'absolute', top: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.background },
  dmBody: { flex: 1 },
  dmTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  dmName: { fontSize: 13, fontWeight: '600', color: COLORS.primary, flex: 1, marginRight: 8 },
  dmTime: { fontSize: 11, color: COLORS.textMuted },
  dmPreview: { fontSize: 13, color: COLORS.textMuted },
  dmUnread: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  dmUnreadText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // ─── Connection Requests ───
  requestsSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  requestsHeader: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  requestAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  requestEmojiMain: { fontSize: 20 },
  requestName: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  requestTime: { fontSize: 11, color: COLORS.textMuted },
  acceptBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.md },
  acceptBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rejectBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  rejectBtnText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  seeAllBtn: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },

  // ─── Group Row (NO card) ───
  groupRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, gap: 12 },
  groupAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${COLORS.accent}15`, justifyContent: 'center', alignItems: 'center' },
  groupAvatarText: { fontSize: 20 },
  groupName: { fontSize: 13, fontWeight: '700', color: COLORS.primary, flex: 1 },
  groupMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

  // ─── Reviews (minimal styling) ───
  reviewItem: { gap: 6, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  reviewAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  reviewEmojiMain: { fontSize: 18 },
  reviewAuthorName: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  reviewDate: { fontSize: 11, color: COLORS.textMuted },
  categoryTag: { fontSize: 10, color: COLORS.accent, fontWeight: '600' },
  reviewTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  reviewWebsite: { fontSize: 12, color: COLORS.accent },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingNum: { fontSize: 11, color: COLORS.textMuted, marginLeft: 4 },
  reviewContent: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  prosConsRow: { flexDirection: 'row', gap: 8 },
  prosConsBox: { flex: 1, borderRadius: RADIUS.md, padding: 8, gap: 2 },
  reviewActions: { flexDirection: 'row', gap: 16, paddingTop: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 12, color: COLORS.textMuted },

  // ─── Help Requests (minimal) ───
  helpItem: { gap: 6, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  helpTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  helpDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  tagInline: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginRight: 8, backgroundColor: `${COLORS.primary}10`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  helpFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  replyRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  replyDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', flexShrink: 0, backgroundColor: COLORS.surface },
  replyInlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // ─── Empty States ───
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontSize: 14 },
  emptyCenter: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  emptyBtn: { marginTop: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.lg },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ─── Modals ───
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted },
  modalInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.textPrimary, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 13 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  formLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, marginTop: 10 },
  formInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14 },
  levelChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  levelChipActive: { backgroundColor: `${COLORS.primary}15`, borderColor: COLORS.primary },
  levelChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
});

import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  connectProjectToGitHub,
  getGitHubUserStatus,
  getUserGitHubRepos,
  startGitHubAuth,
} from '@services/projectsService';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

type Step = 'checking' | 'auth' | 'repos' | 'connecting';

export default function GitHubConnectScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { projectId, projectTitle } = route.params || {};

  const [step, setStep] = useState<Step>('checking');
  const [authUrl, setAuthUrl] = useState('');
  const [repos, setRepos] = useState<any[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const webviewRef = useRef<WebView>(null);

  // Check if user's GitHub account is already connected
  const checkGitHubStatus = useCallback(async () => {
    try {
      const status = await getGitHubUserStatus();
      if (status.connected) {
        if (status.username) setGithubUsername(status.username);
        setStep('repos');
        loadRepos();
      } else {
        // Need OAuth — get auth URL
        const { authUrl: url } = await startGitHubAuth();
        setAuthUrl(url);
        setStep('auth');
      }
    } catch {
      Alert.alert('Error', 'Failed to check GitHub status');
      navigation.goBack();
    }
  }, []);

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const data = await getUserGitHubRepos(1, 100);
      setRepos(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load repos');
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    checkGitHubStatus();
  }, [checkGitHubStatus]);

  // Handle WebView navigation — detect callback after OAuth
  const handleWebViewChange = async (navState: { url: string }) => {
    const url = navState.url;
    // After GitHub OAuth, backend redirects to a callback URL
    // Detect when the OAuth flow completes (backend usually redirects to a success page or the app)
    if (
      url.includes('/github/callback') ||
      url.includes('github-connected') ||
      url.includes('/api/github/status')
    ) {
      // OAuth completed — check status again
      setStep('checking');
      setTimeout(async () => {
        const status = await getGitHubUserStatus();
        if (status.connected) {
          if (status.username) setGithubUsername(status.username);
          setStep('repos');
          loadRepos();
        } else {
          // Still not connected — might need another attempt
          setStep('auth');
        }
      }, 1500);
    }
  };

  const handleConnectRepo = async (repo: any) => {
    const repoOwner = repo.owner?.login || repo.full_name?.split('/')[0] || '';
    const repoName = repo.name || repo.full_name?.split('/')[1] || '';

    Alert.alert(
      'Connect Repository',
      `Connect "${repo.full_name || repoName}" to "${projectTitle}"?\n\nThis will sync commits, pull requests, and issues.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: async () => {
            setConnecting(true);
            try {
              await connectProjectToGitHub(projectId, repoOwner, repoName, {
                syncIssues: true,
                syncPRs: true,
                syncCommits: true,
              });
              Alert.alert('Connected!', `${repo.full_name || repoName} is now linked to your project.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || e.message || 'Failed to connect');
            } finally {
              setConnecting(false);
            }
          },
        },
      ],
    );
  };

  const filteredRepos = repoSearch.trim()
    ? repos.filter(
        r =>
          (r.name || '').toLowerCase().includes(repoSearch.toLowerCase()) ||
          (r.full_name || '').toLowerCase().includes(repoSearch.toLowerCase()),
      )
    : repos;

  // ── Render: Checking status
  if (step === 'checking') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.checkingText}>Checking GitHub connection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: OAuth WebView
  if (step === 'auth') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Connect GitHub</Text>
            <Text style={s.headerSub}>Sign in to your GitHub account</Text>
          </View>
        </View>
        {authUrl ? (
          <WebView
            ref={webviewRef}
            source={{ uri: authUrl }}
            onNavigationStateChange={handleWebViewChange}
            startInLoadingState
            renderLoading={() => (
              <View style={s.webviewLoader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Render: Connecting overlay
  if (step === 'connecting' || connecting) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.checkingText}>Connecting repository...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Repo selection
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Select Repository</Text>
          <Text style={s.headerSub}>
            {githubUsername ? `Signed in as ${githubUsername}` : `Connect to "${projectTitle}"`}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search repositories..."
          placeholderTextColor={COLORS.textMuted}
          value={repoSearch}
          onChangeText={setRepoSearch}
        />
        {repoSearch.length > 0 && (
          <TouchableOpacity onPress={() => setRepoSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loadingRepos ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.checkingText}>Loading repositories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRepos}
          keyExtractor={(item, idx) => item.id?.toString() || item.full_name || String(idx)}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.repoCard} onPress={() => handleConnectRepo(item)} activeOpacity={0.7}>
              <View style={s.repoIcon}>
                <Ionicons
                  name={item.private ? 'lock-closed' : 'git-branch'}
                  size={18}
                  color={item.private ? COLORS.warning : COLORS.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.repoName}>{item.full_name || item.name}</Text>
                {item.description && (
                  <Text style={s.repoDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <View style={s.repoMeta}>
                  {item.language && (
                    <View style={s.metaChip}>
                      <View style={[s.langDot, { backgroundColor: getLangColor(item.language) }]} />
                      <Text style={s.metaText}>{item.language}</Text>
                    </View>
                  )}
                  {item.stargazers_count > 0 && (
                    <View style={s.metaChip}>
                      <Ionicons name="star" size={10} color={COLORS.warning} />
                      <Text style={s.metaText}>{item.stargazers_count}</Text>
                    </View>
                  )}
                  {item.updated_at && (
                    <Text style={s.metaText}>
                      Updated {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.emptyCenter}>
              <Ionicons name="git-branch-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyText}>
                {repoSearch ? 'No matching repositories' : 'No repositories found'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getLangColor(lang: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#F7DF1E',
    TypeScript: '#3178C6',
    Python: '#3776AB',
    Java: '#B07219',
    Go: '#00ADD8',
    Rust: '#DEA584',
    'C++': '#F34B7D',
    C: '#555555',
    Ruby: '#CC342D',
    PHP: '#4F5D95',
    Swift: '#FA7343',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
  };
  return colors[lang] || COLORS.textMuted;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  checkingText: { fontSize: 14, color: COLORS.textMuted, marginTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

  webviewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 0,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, padding: 0 },

  repoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  repoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repoName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  repoDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  repoMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  langDot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 10, color: COLORS.textMuted },

  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});

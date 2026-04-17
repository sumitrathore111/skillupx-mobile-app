import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getQueries, submitQuery } from '@services/notificationService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QueryScreen() {
  const { user } = useAuthStore();
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getQueries();
      setQueries(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      await submitQuery(question.trim());
      setQuestion('');
      load();
      Alert.alert('Submitted', 'Your question has been posted!');
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const renderQuery = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.questionRow}>
        <View style={styles.qIcon}><Ionicons name="help-circle" size={18} color={COLORS.accent} /></View>
        <Text style={styles.questionText}>{item.question}</Text>
      </View>
      {item.answer ? (
        <View style={styles.answerBox}>
          <View style={styles.answerHeader}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.answeredBy}>Answered by {item.answeredBy || 'Admin'}</Text>
          </View>
          <Text style={styles.answerText}>{item.answer}</Text>
        </View>
      ) : (
        <View style={styles.pendingBox}>
          <Ionicons name="time-outline" size={14} color={COLORS.warning} />
          <Text style={styles.pendingText}>Awaiting answer</Text>
        </View>
      )}
      <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Q&A</Text></View>
      <View style={styles.inputSection}>
        <TextInput style={styles.input} value={question} onChangeText={setQuestion}
          placeholder="Ask a question..." placeholderTextColor={COLORS.textMuted}
          multiline maxLength={500} />
        <TouchableOpacity style={[styles.submitBtn, (!question.trim() || submitting) && { opacity: 0.4 }]}
          onPress={handleSubmit} disabled={!question.trim() || submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={queries} renderItem={renderQuery} keyExtractor={(i, idx) => i._id || i.id || String(idx)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<View style={styles.centered}><Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No questions yet. Be the first!</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  inputSection: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  input: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, maxHeight: 80, borderWidth: 1, borderColor: COLORS.border },
  submitBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  questionRow: { flexDirection: 'row', gap: 8 },
  qIcon: { marginTop: 2 },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 20 },
  answerBox: { backgroundColor: COLORS.success + '10', borderRadius: RADIUS.md, padding: 12, gap: 6, borderLeftWidth: 3, borderLeftColor: COLORS.success },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  answeredBy: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  answerText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  pendingBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  pendingText: { fontSize: 12, color: COLORS.warning, fontStyle: 'italic' },
  timeText: { fontSize: 10, color: COLORS.textMuted },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});

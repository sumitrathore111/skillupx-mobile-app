import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchCareerInfo } from '@services/roadmapService';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEMAND_COLORS: Record<string, string> = { high: COLORS.success, medium: COLORS.warning, low: COLORS.danger };
const EXP_TABS = ['All', 'Fresher', 'Junior', 'Mid', 'Senior', 'Lead'];

export default function CareerInfoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { roadmapId, title } = route.params || {};
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expFilter, setExpFilter] = useState('All');

  const load = useCallback(async () => {
    try { const res = await fetchCareerInfo(roadmapId); setData(res); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [roadmapId]);

  useEffect(() => { load(); }, [load]);

  const roles = (data?.roles || data?.careers || []).filter((r: any) =>
    expFilter === 'All' || (r.experienceLevel || '').toLowerCase() === expFilter.toLowerCase()
  );

  const renderRole = ({ item }: { item: any }) => {
    const demand = (item.demandLevel || 'medium').toLowerCase();
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.roleName}>{item.title || item.role}</Text>
          <View style={[styles.demandBadge, { backgroundColor: (DEMAND_COLORS[demand] || COLORS.textMuted) + '20' }]}>
            <View style={[styles.demandDot, { backgroundColor: DEMAND_COLORS[demand] || COLORS.textMuted }]} />
            <Text style={[styles.demandText, { color: DEMAND_COLORS[demand] || COLORS.textMuted }]}>{demand} demand</Text>
          </View>
        </View>

        {item.experienceLevel && (
          <View style={styles.expRow}>
            <Ionicons name="briefcase-outline" size={14} color={COLORS.accent} />
            <Text style={styles.expText}>{item.experienceLevel}</Text>
          </View>
        )}

        {(item.salaryMin || item.salaryMax || item.salary) && (
          <View style={styles.salaryRow}>
            <Ionicons name="cash-outline" size={14} color={COLORS.success} />
            <Text style={styles.salaryText}>
              {item.salary || `₹${(item.salaryMin / 100000).toFixed(1)}L - ₹${(item.salaryMax / 100000).toFixed(1)}L`}
            </Text>
          </View>
        )}

        {item.skills?.length > 0 && (
          <View style={styles.skillsWrap}>
            {item.skills.map((s: string) => (
              <View key={s} style={styles.skillTag}><Text style={styles.skillTagText}>{s}</Text></View>
            ))}
          </View>
        )}

        {item.description && <Text style={styles.roleDescription}>{item.description}</Text>}

        {item.growthPath && (
          <View style={styles.growthRow}>
            <Ionicons name="trending-up" size={14} color={COLORS.primary} />
            <Text style={styles.growthText}>{item.growthPath}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Career Paths</Text>
          {title && <Text style={styles.headerSub}>{title}</Text>}
        </View>
      </View>

      {/* Experience Filter */}
      <FlatList horizontal data={EXP_TABS} keyExtractor={i => i} showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.expChip, expFilter === item && styles.expChipActive]}
            onPress={() => setExpFilter(item)}>
            <Text style={[styles.expChipText, expFilter === item && { color: '#fff' }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={roles} renderItem={renderRole} keyExtractor={(i, idx) => i._id || String(idx)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListHeaderComponent={
            data?.overview ? (
              <View style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>Market Overview</Text>
                <View style={styles.overviewGrid}>
                  {data.overview.highDemandRoles !== undefined && (
                    <View style={styles.overviewItem}><Text style={styles.overviewValue}>{data.overview.highDemandRoles}</Text><Text style={styles.overviewLabel}>High Demand</Text></View>
                  )}
                  {data.overview.fresherFriendly !== undefined && (
                    <View style={styles.overviewItem}><Text style={styles.overviewValue}>{data.overview.fresherFriendly}</Text><Text style={styles.overviewLabel}>Fresher-Friendly</Text></View>
                  )}
                  {data.overview.maxSalary && (
                    <View style={styles.overviewItem}><Text style={styles.overviewValue}>{data.overview.maxSalary}</Text><Text style={styles.overviewLabel}>Max Salary</Text></View>
                  )}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={<View style={styles.centered}><Ionicons name="briefcase-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No career data available</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted },
  expChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  expChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  expChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  overviewCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 4 },
  overviewTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  overviewGrid: { flexDirection: 'row', gap: 10 },
  overviewItem: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: COLORS.background, padding: 10, borderRadius: RADIUS.md },
  overviewValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  overviewLabel: { fontSize: 10, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  roleName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  demandBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  demandDot: { width: 6, height: 6, borderRadius: 3 },
  demandText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  expText: { fontSize: 12, color: COLORS.textSecondary },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  salaryText: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillTag: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  skillTagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  roleDescription: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  growthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  growthText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});

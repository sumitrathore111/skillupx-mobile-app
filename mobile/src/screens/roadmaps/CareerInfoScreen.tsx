import type { CareerInfo } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DEMAND_LABELS, getCareerInfo } from '@services/roadmapService';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EXP_TABS = ['All', 'fresher', 'junior', 'mid', 'senior', 'lead'];
const EXP_DISPLAY: Record<string, string> = { fresher: 'Fresher', junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead' };

function formatSalary(val: number, currency: string): string {
  if (currency === 'INR') return `₹${(val / 100000).toFixed(1)}L`;
  return `${currency} ${val.toLocaleString()}`;
}

export default function CareerInfoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { roadmapId, title } = route.params || {};
  const [careers, setCareers] = useState<CareerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expFilter, setExpFilter] = useState('All');

  const load = useCallback(async () => {
    try { const res = await getCareerInfo(roadmapId); setCareers(res || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [roadmapId]);

  useEffect(() => { load(); }, [load]);

  const filtered = careers.filter(c =>
    expFilter === 'All' || c.experienceLevel === expFilter
  );

  const renderRole = ({ item }: { item: CareerInfo }) => {
    const demandInfo = DEMAND_LABELS[item.demandLevel] || { label: item.demandLevel, color: COLORS.textMuted };
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.roleName}>{item.jobTitle}</Text>
          <View style={[styles.demandBadge, { backgroundColor: `${demandInfo.color}20` }]}>
            <View style={[styles.demandDot, { backgroundColor: demandInfo.color }]} />
            <Text style={[styles.demandText, { color: demandInfo.color }]}>{demandInfo.label}</Text>
          </View>
        </View>

        {item.experienceLevel && (
          <View style={styles.expRow}>
            <Ionicons name="briefcase-outline" size={14} color={COLORS.primary} />
            <Text style={styles.expText}>{EXP_DISPLAY[item.experienceLevel] || item.experienceLevel}</Text>
          </View>
        )}

        {item.salaryRange && (
          <View style={styles.salaryRow}>
            <Ionicons name="cash-outline" size={14} color={COLORS.success} />
            <Text style={styles.salaryText}>
              {formatSalary(item.salaryRange.min, item.salaryRange.currency)} - {formatSalary(item.salaryRange.max, item.salaryRange.currency)}
              {item.salaryRange.period ? ` / ${item.salaryRange.period}` : ''}
            </Text>
          </View>
        )}

        {item.description ? <Text style={styles.roleDescription}>{item.description}</Text> : null}

        {/* Required Skills */}
        {item.requiredSkills?.length > 0 && (
          <View style={styles.skillsSection}>
            <Text style={styles.skillsLabel}>Required Skills</Text>
            <View style={styles.skillsWrap}>
              {item.requiredSkills.map(s => (
                <View key={s} style={styles.skillTag}><Text style={styles.skillTagText}>{s}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Preferred Skills */}
        {item.preferredSkills?.length > 0 && (
          <View style={styles.skillsSection}>
            <Text style={styles.skillsLabel}>Nice to Have</Text>
            <View style={styles.skillsWrap}>
              {item.preferredSkills.map(s => (
                <View key={s} style={styles.prefSkillTag}><Text style={styles.prefSkillText}>{s}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Growth Path */}
        {item.growthPath?.length > 0 && (
          <View style={styles.growthSection}>
            <Text style={styles.skillsLabel}>Growth Path</Text>
            <View style={styles.growthRow}>
              {item.growthPath.map((step, i) => (
                <View key={i} style={styles.growthStep}>
                  <View style={styles.growthDot}>
                    <Text style={styles.growthDotText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.growthText}>{step}</Text>
                  {i < item.growthPath.length - 1 && (
                    <Ionicons name="arrow-forward" size={10} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Companies */}
        {item.companies?.length > 0 && (
          <View style={styles.companiesSection}>
            <Text style={styles.skillsLabel}>Companies Hiring</Text>
            <View style={styles.skillsWrap}>
              {item.companies.map(c => (
                <View key={c} style={styles.companyBadge}><Text style={styles.companyBadgeText}>{c}</Text></View>
              ))}
            </View>
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
            <Text style={[styles.expChipText, expFilter === item && { color: '#fff' }]}>
              {item === 'All' ? 'All' : EXP_DISPLAY[item] || item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={filtered} renderItem={renderRole} keyExtractor={(i) => i._id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
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
  roleDescription: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  skillsSection: { gap: 6 },
  skillsLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillTag: { backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  skillTagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  prefSkillTag: { backgroundColor: `${COLORS.warning}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  prefSkillText: { fontSize: 10, color: COLORS.warning, fontWeight: '600' },
  growthSection: { gap: 6 },
  growthRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  growthStep: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  growthDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: `${COLORS.primary}20`, justifyContent: 'center', alignItems: 'center' },
  growthDotText: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  growthText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  companiesSection: { gap: 6 },
  companyBadge: { backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  companyBadgeText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});

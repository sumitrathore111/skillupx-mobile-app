import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { Resource, Topic } from '@apptypes/index';
import React from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { topic: Topic; phaseId: string; roadmapId: string; isEnrolled: boolean };

const RESOURCE_ICONS: Record<string, string> = {
  video: 'logo-youtube',
  article: 'document-text-outline',
  documentation: 'book-outline',
  course: 'school-outline',
  github: 'logo-github',
  practice: 'code-slash-outline',
};

const RESOURCE_COLORS: Record<string, string> = {
  video: '#FF0000',
  article: COLORS.primary,
  documentation: COLORS.accent,
  course: COLORS.warning,
  github: '#171515',
  practice: COLORS.success,
};

export default function TopicDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { topic, isEnrolled } = route.params as RouteParams;

  React.useEffect(() => {
    navigation.setOptions({ title: topic.name });
  }, []);

  async function openResource(resource: Resource) {
    if (!resource.url) { Alert.alert('No URL', 'This resource has no URL'); return; }
    try {
      const supported = await Linking.canOpenURL(resource.url);
      if (supported) await Linking.openURL(resource.url);
      else Alert.alert('Cannot Open', 'Unable to open this URL');
    } catch (e) {
      Alert.alert('Error', 'Failed to open link');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Topic header */}
        <View style={styles.topicHeader}>
          <View style={[styles.checkCircle, topic.isCompleted && styles.checkDone]}>
            <Ionicons name={topic.isCompleted ? 'checkmark' : 'school-outline'} size={24} color={topic.isCompleted ? '#fff' : COLORS.primary} />
          </View>
          <Text style={styles.topicTitle}>{topic.name}</Text>
          {topic.isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {topic.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.descText}>{topic.description}</Text>
          </View>
        )}

        {/* Resources */}
        {topic.resources && topic.resources.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{topic.resources.length} Resources</Text>
            {topic.resources.map((resource, idx) => {
              const iconName = RESOURCE_ICONS[resource.type] || 'link-outline';
              const iconColor = RESOURCE_COLORS[resource.type] || COLORS.primary;
              return (
                <TouchableOpacity
                  key={String(idx)}
                  style={styles.resourceCard}
                  onPress={() => openResource(resource)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.resourceIcon, { backgroundColor: `${iconColor}20` }]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: `${iconColor}15` }]}>
                      <Text style={[styles.typeText, { color: iconColor }]}>{resource.type}</Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!isEnrolled && (
          <View style={styles.enrollHint}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.accent} />
            <Text style={styles.enrollHintText}>Enroll in this roadmap to track your progress</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },
  topicHeader: { alignItems: 'center', padding: 24, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  checkDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  topicTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.success}20`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  completedText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  resourceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  resourceIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resourceInfo: { flex: 1, gap: 4 },
  resourceTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  typeText: { fontSize: 10, fontWeight: '700' },
  enrollHint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 16, backgroundColor: `${COLORS.accent}10`, padding: 12, borderRadius: RADIUS.lg },
  enrollHintText: { fontSize: 13, color: COLORS.accent, flex: 1 },
});

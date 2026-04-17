import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '@services/notificationService';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  battle: { icon: 'flash', color: COLORS.warning },
  battleResult: { icon: 'trophy', color: '#FFD700' },
  message: { icon: 'chatbubble', color: COLORS.accent },
  project: { icon: 'rocket', color: COLORS.primary },
  review: { icon: 'star', color: '#FF6B6B' },
  sale: { icon: 'cash', color: COLORS.success },
  task: { icon: 'checkbox', color: '#9B59B6' },
  general: { icon: 'notifications', color: COLORS.textMuted },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderItem = ({ item }: { item: AppNotification }) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.general;
    return (
      <TouchableOpacity style={[styles.card, !item.read && styles.cardUnread]} onPress={() => !item.read && handleMarkRead(item.id)}>
        <View style={[styles.iconCircle, { backgroundColor: cfg.color + '20' }]}>
          <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.nTitle}>{item.title}</Text>
          <Text style={styles.nMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.nTime}>{new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAll}>Mark all read ({unreadCount})</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={notifications} renderItem={renderItem} keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<View style={styles.centered}><Ionicons name="notifications-off-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No notifications yet</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  markAll: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  nTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  nMessage: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  nTime: { fontSize: 10, color: COLORS.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});

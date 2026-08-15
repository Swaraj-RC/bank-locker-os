import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, unwrap } from '../api/client';
import { NotificationModel } from '../api/types';
import { colors } from '../theme';
import { Card } from '../components/Card';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  REQUEST_UPDATE: 'document-text-outline',
  VERIFICATION: 'shield-checkmark-outline',
  APPROVAL: 'checkmark-circle-outline',
  REJECTION: 'close-circle-outline',
  SCHEDULED_ACCESS: 'time-outline',
  SYSTEM: 'information-circle-outline',
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await unwrap<NotificationModel[]>(await api.get('/api/v1/notifications'));
      setNotifications(data);
    } catch (e) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markRead(n: NotificationModel) {
    if (n.read) return;
    try {
      await api.post(`/api/v1/notifications/${n.id}/read`);
      load();
    } catch (e) {}
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      data={notifications}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={<Text style={styles.muted}>No notifications yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => markRead(item)}>
          <Card style={{ marginBottom: 10, flexDirection: 'row' }}>
            <Ionicons
              name={TYPE_ICONS[item.type] || 'information-circle-outline'}
              size={20}
              color={item.read ? '#94A3B8' : colors.info}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontWeight: item.read ? '500' : '700', color: colors.primary }}>{item.title}</Text>
              <Text style={styles.mutedSmall}>{item.message}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  mutedSmall: { color: '#64748B', fontSize: 13, marginTop: 2 },
  muted: { color: '#64748B', textAlign: 'center', marginTop: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.info, marginLeft: 8, marginTop: 4 },
});

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, unwrap } from '../api/client';
import { LockerRequestModel } from '../api/types';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';

export default function RequestsListScreen({ navigation }: any) {
  const [requests, setRequests] = useState<LockerRequestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await unwrap<LockerRequestModel[]>(await api.get('/api/v1/customers/me/requests'));
      setRequests(data);
    } catch (e) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
      data={requests}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={<Text style={styles.muted}>No requests yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('RequestTracking', { requestId: item.id })}>
          <Card style={{ marginBottom: 10 }}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.reqType}>{item.request_type}</Text>
                <Text style={styles.mutedSmall}>{new Date(item.requested_at).toLocaleDateString()}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqType: { fontWeight: '700', color: colors.primary },
  mutedSmall: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  muted: { color: '#64748B', textAlign: 'center', marginTop: 40 },
});

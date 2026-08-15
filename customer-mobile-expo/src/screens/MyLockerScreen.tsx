import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, unwrap } from '../api/client';
import { LockerModel, LockerRequestModel } from '../api/types';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';

export default function MyLockerScreen() {
  const [locker, setLocker] = useState<LockerModel | null>(null);
  const [history, setHistory] = useState<LockerRequestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [lockerData, requestsData] = await Promise.all([
        unwrap<LockerModel | null>(await api.get('/api/v1/customers/me/locker')),
        unwrap<LockerRequestModel[]>(await api.get('/api/v1/customers/me/requests')),
      ]);
      setLocker(lockerData);
      setHistory(requestsData.filter((r) => r.status === 'COMPLETED'));
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {!locker ? (
        <Card><Text>No locker is currently assigned to your account.</Text></Card>
      ) : (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>Locker {locker.locker_number}</Text>
              <StatusBadge status={locker.status} />
            </View>
            <View style={styles.divider} />
            <Row label="Branch ID" value={locker.branch_id.slice(0, 8)} />
            <Row label="Locker Size" value={locker.locker_size} />
            <Row label="Status" value={locker.status.replace(/_/g, ' ')} />
            <Row label="Last Operation" value={locker.last_operation_at ? new Date(locker.last_operation_at).toLocaleString() : '—'} />
          </Card>

          <Text style={styles.sectionTitle}>Locker History</Text>
          {history.map((r) => (
            <Card key={r.id} style={{ marginTop: 8 }}>
              <View style={styles.rowBetween}>
                <Text>{r.request_type}</Text>
                <Text style={styles.mutedSmall}>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : ''}</Text>
              </View>
            </Card>
          ))}
          {history.length === 0 && <Text style={styles.muted}>No completed operations yet.</Text>}
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.rowBetween, { paddingVertical: 6 }]}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  muted: { color: '#64748B', marginTop: 8 },
  mutedSmall: { color: '#94A3B8', fontSize: 12 },
  value: { fontWeight: '600', color: colors.primary },
  sectionTitle: { fontWeight: '700', color: colors.primary, marginTop: 24, marginBottom: 4 },
});

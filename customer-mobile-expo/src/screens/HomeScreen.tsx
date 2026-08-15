import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api, unwrap } from '../api/client';
import { LockerModel, LockerRequestModel } from '../api/types';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';

const ACTIVE_STATES = ['SUBMITTED', 'VERIFICATION_PENDING', 'TOKEN_A_VERIFIED', 'TOKEN_B_VERIFIED', 'APPROVAL_PENDING', 'APPROVED', 'ACCESS_ACTIVE'];

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [locker, setLocker] = useState<LockerModel | null>(null);
  const [requests, setRequests] = useState<LockerRequestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [lockerData, requestsData] = await Promise.all([
        unwrap<LockerModel | null>(await api.get('/api/v1/customers/me/locker')),
        unwrap<LockerRequestModel[]>(await api.get('/api/v1/customers/me/requests')),
      ]);
      setLocker(lockerData);
      setRequests(requestsData);
    } catch (e) {
      // Keep screen usable; pull-to-refresh lets them retry.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeRequest = requests.find((r) => ACTIVE_STATES.includes(r.status));

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
      <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0] || ''}</Text>
      <Text style={styles.subGreeting}>Here's what's happening with your locker</Text>

      {locker ? (
        <Card style={{ marginTop: 20 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.lockerTitle}>Locker {locker.locker_number}</Text>
            <StatusBadge status={locker.status} />
          </View>
          <Text style={styles.muted}>Size: {locker.locker_size}</Text>
          {locker.last_operation_at && (
            <Text style={styles.mutedSmall}>Last activity: {new Date(locker.last_operation_at).toLocaleString()}</Text>
          )}

          <View style={{ marginTop: 14 }}>
            {activeRequest ? (
              <PrimaryButton
                title="Track Active Request"
                variant="outline"
                onPress={() => navigation.navigate('RequestTracking', { requestId: activeRequest.id })}
              />
            ) : (
              <PrimaryButton
                title="Request Access"
                onPress={() => navigation.navigate('RequestAccess', { locker })}
              />
            )}
          </View>
        </Card>
      ) : (
        <Card style={{ marginTop: 20 }}>
          <Text>No locker is currently assigned to your account.</Text>
        </Card>
      )}

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {requests.slice(0, 5).map((r) => (
        <Card key={r.id} style={{ marginTop: 8 }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.reqType}>{r.request_type}</Text>
              <Text style={styles.mutedSmall}>{new Date(r.requested_at).toLocaleString()}</Text>
            </View>
            <StatusBadge status={r.status} />
          </View>
        </Card>
      ))}
      {requests.length === 0 && <Text style={[styles.muted, { marginTop: 8 }]}>No activity yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.primary },
  subGreeting: { color: '#64748B', marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lockerTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  muted: { color: '#64748B', marginTop: 6 },
  mutedSmall: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  sectionTitle: { fontWeight: '700', color: colors.primary, marginTop: 24, marginBottom: 4 },
  reqType: { fontWeight: '600', color: colors.primary },
});

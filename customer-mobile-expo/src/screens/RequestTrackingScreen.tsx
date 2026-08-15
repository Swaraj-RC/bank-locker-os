import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, unwrap, errorMessage } from '../api/client';
import { LockerRequestModel } from '../api/types';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';

const STEPS = ['SUBMITTED', 'VERIFICATION_PENDING', 'APPROVED', 'ACCESS_ACTIVE', 'COMPLETED'];
const STEP_LABELS: Record<string, string> = {
  SUBMITTED: 'Request Submitted',
  VERIFICATION_PENDING: 'Verification',
  APPROVED: 'Bank Approval',
  ACCESS_ACTIVE: 'Access Active',
  COMPLETED: 'Completed',
};

export default function RequestTrackingScreen({ route }: any) {
  const { requestId } = route.params;
  const [req, setReq] = useState<LockerRequestModel | null>(null);
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await unwrap<LockerRequestModel>(await api.get(`/api/v1/requests/${requestId}`));
      setReq(data);
    } catch (e) {}
  }, [requestId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  async function verify() {
    setVerifying(true);
    setError(null);
    try {
      await api.post(`/api/v1/verification/${requestId}/verify/customer`, { token: token.trim() });
      setToken('');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setVerifying(false);
    }
  }

  if (!req) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentIndex = ['TOKEN_A_VERIFIED', 'TOKEN_B_VERIFIED'].includes(req.status)
    ? STEPS.indexOf('VERIFICATION_PENDING')
    : Math.max(STEPS.indexOf(req.status), 0);
  const isTerminalNegative = ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(req.status);
  const needsCustomerToken = req.status === 'VERIFICATION_PENDING';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{req.request_type}</Text>
          <StatusBadge status={req.status} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Progress</Text>
      <Card>
        {STEPS.map((s, i) => {
          const done = i < currentIndex || req.status === 'COMPLETED';
          const active = i === currentIndex && !isTerminalNegative;
          return (
            <View key={s} style={styles.stepRow}>
              <Ionicons
                name={done ? 'checkmark-circle' : active ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={done || active ? colors.success : '#CBD5E1'}
              />
              <Text style={[styles.stepLabel, (done || active) && { color: colors.primary, fontWeight: '600' }]}>
                {STEP_LABELS[s]}
              </Text>
            </View>
          );
        })}
      </Card>

      {req.status === 'REJECTED' && (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.rejectedTitle}>Request Rejected</Text>
          <Text style={styles.muted}>{req.rejection_reason || 'No reason provided.'}</Text>
        </Card>
      )}

      {needsCustomerToken && (
        <>
          <Text style={styles.sectionTitle}>Dual Control Verification</Text>
          <Card>
            <Text style={styles.muted}>
              Enter the 6-digit verification code shared with you by the bank to confirm your identity.
            </Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit code"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <PrimaryButton title="Verify" onPress={verify} loading={verifying} style={{ marginTop: 8 }} />
          </Card>
        </>
      )}

      {req.status === 'TOKEN_A_VERIFIED' && (
        <Card style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={{ marginLeft: 8, flex: 1 }}>Your identity is verified. Waiting for bank authorization…</Text>
        </Card>
      )}

      {['APPROVED', 'ACCESS_ACTIVE', 'COMPLETED'].includes(req.status) && (
        <Card style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          <Text style={{ marginLeft: 8, fontWeight: '700', color: colors.success }}>ACCESS AUTHORIZED</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '700', fontSize: 16, color: colors.primary },
  sectionTitle: { fontWeight: '700', color: colors.primary, marginTop: 20, marginBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  stepLabel: { marginLeft: 10, color: '#64748B' },
  rejectedTitle: { fontWeight: '700', color: colors.danger, marginBottom: 4 },
  muted: { color: '#64748B', fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 12, fontSize: 15,
  },
  errorText: { color: '#B91C1C', fontSize: 12, marginTop: 6 },
});

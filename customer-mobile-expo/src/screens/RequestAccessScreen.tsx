import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, unwrap, errorMessage } from '../api/client';
import { LockerRequestModel } from '../api/types';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';

const TYPES = [
  { value: 'ACCESS', label: 'Locker Access', icon: 'lock-open-outline' as const },
  { value: 'INSPECTION', label: 'Inspection', icon: 'search-outline' as const },
];

export default function RequestAccessScreen({ route, navigation }: any) {
  const { locker } = route.params;
  const [requestType, setRequestType] = useState('ACCESS');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const req = await unwrap<LockerRequestModel>(
        await api.post('/api/v1/requests', { locker_id: locker.id, request_type: requestType })
      );
      navigation.replace('RequestTracking', { requestId: req.id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.lockerTitle}>Locker {locker.locker_number}</Text>
          <Text style={styles.muted}>{locker.locker_size}</Text>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Select Operation</Text>
      {TYPES.map((t) => (
        <TouchableOpacity key={t.value} onPress={() => setRequestType(t.value)} activeOpacity={0.7}>
          <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={t.icon} size={20} color={requestType === t.value ? colors.info : '#94A3B8'} />
            <Text style={styles.optionLabel}>{t.label}</Text>
            {requestType === t.value && (
              <Ionicons name="checkmark-circle" size={20} color={colors.info} style={{ marginLeft: 'auto' }} />
            )}
          </Card>
        </TouchableOpacity>
      ))}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <PrimaryButton
        title="Confirm & Submit Request"
        onPress={submit}
        loading={submitting}
        style={{ marginTop: 'auto', marginBottom: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lockerTitle: { fontWeight: '700', fontSize: 16, color: colors.primary },
  muted: { color: '#64748B' },
  sectionTitle: { fontWeight: '700', color: colors.primary, marginTop: 20, marginBottom: 4 },
  optionLabel: { marginLeft: 12, fontWeight: '600', color: colors.primary },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 16 },
  errorText: { color: '#B91C1C', fontSize: 13 },
});

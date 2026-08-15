import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const initials = (user?.full_name || '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.role}>{user?.role?.replace(/_/g, ' ')}</Text>
      </View>

      <Card style={{ marginTop: 20 }}>
        <Row label="Email" value={user?.email || '—'} />
        <Divider />
        <Row label="Phone" value={user?.phone || '—'} />
        <Divider />
        <Row label="Account Status" value={user?.status || '—'} />
      </Card>

      <PrimaryButton title="Sign Out" onPress={logout} variant="danger" style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  avatarWrap: { alignItems: 'center', marginTop: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: 10 },
  role: { color: '#64748B' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  muted: { color: '#64748B' },
  value: { fontWeight: '600', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border },
});

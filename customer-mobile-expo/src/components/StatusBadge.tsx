import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColor } from '../theme';

export function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: color + '1A', borderColor: color + '4D' }]}>
      <Text style={[styles.text, { color }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

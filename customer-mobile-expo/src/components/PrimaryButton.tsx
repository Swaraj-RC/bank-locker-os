import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors } from '../theme';

export function PrimaryButton({
  title, onPress, loading, disabled, variant = 'primary', style,
}: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger'; style?: ViewStyle;
}) {
  const isOutline = variant === 'outline';
  const bg = variant === 'danger' ? colors.danger : variant === 'outline' ? 'transparent' : colors.primary;
  const textColor = isOutline ? colors.primary : '#fff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: colors.primary, borderWidth: isOutline ? 1 : 0 },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '600', fontSize: 15 },
});

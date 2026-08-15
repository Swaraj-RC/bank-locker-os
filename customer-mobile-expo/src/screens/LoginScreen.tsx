import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { errorMessage, API_BASE_URL } from '../api/client';
import { colors } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('customer@demo.bank');
  const [password, setPassword] = useState('Demo@1234');
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to manage your locker</Text>
        </View>

        <Text style={styles.label}>Email or Mobile</Text>
        <TextInput
          style={styles.input} value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <PrimaryButton title="Login" onPress={handleLogin} loading={loading} style={{ marginTop: 20 }} />

        <Text style={styles.footer}>Demo password for all accounts: Demo@1234</Text>
        <Text style={styles.footerSmall}>Connecting to: {API_BASE_URL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: 12 },
  subtitle: { color: '#64748B', marginTop: 2 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surface, fontSize: 15,
  },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 14 },
  errorText: { color: '#B91C1C', fontSize: 13 },
  footer: { textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 24 },
  footerSmall: { textAlign: 'center', color: '#CBD5E1', fontSize: 10, marginTop: 4 },
});

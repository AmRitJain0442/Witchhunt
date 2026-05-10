import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth } from '../../store/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { signUpWithEmail } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (err: unknown) {
      Alert.alert('Registration failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🌿</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start your family health journey</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Rajesh Kumar"
            placeholderTextColor={COLORS.text.disabled}
            autoCapitalize="words"
            autoComplete="name"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.text.disabled}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.text.disabled}
              secureTextEntry={!passwordVisible}
              autoComplete="new-password"
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setPasswordVisible((visible) => !visible)}>
              <Text style={styles.passwordToggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>
              Already have an account?{' '}
              <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl * 4,
  },
  header: { alignItems: 'center', marginBottom: SPACING.md },
  logo: { fontSize: 56 },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  form: { gap: SPACING.sm },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  passwordInput: {
    flex: 1,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  passwordToggle: {
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingRight: SPACING.sm,
  },
  passwordToggleText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: COLORS.text.inverse,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  link: {
    textAlign: 'center',
    color: COLORS.text.secondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.lg,
  },
  linkBold: { color: COLORS.primary, fontWeight: FONTS.weights.semibold },
});

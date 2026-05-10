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
import { auth, sendPasswordResetEmail } from '../../lib/firebase';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: unknown) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your email first, then request a reset link.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Reset link sent', 'Check your email for password reset instructions.');
    } catch (err: unknown) {
      Alert.alert('Could not send reset link', err instanceof Error ? err.message : 'Please try again.');
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
          <Text style={styles.title}>Kutumb</Text>
          <Text style={styles.subtitle}>Family health, together</Text>
        </View>

        <View style={styles.form}>
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
              placeholder="Your password"
              placeholderTextColor={COLORS.text.disabled}
              secureTextEntry={!passwordVisible}
              autoComplete="password"
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setPasswordVisible((visible) => !visible)}>
              <Text style={styles.passwordToggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handlePasswordReset}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>
              New here?{' '}
              <Text style={styles.linkBold}>Create an account</Text>
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
    paddingBottom: SPACING.xxl * 3,
  },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  logo: { fontSize: 56 },
  title: {
    fontSize: FONTS.sizes.xxxl,
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
    marginBottom: SPACING.xs,
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
  forgotLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    textAlign: 'right',
    marginBottom: SPACING.sm,
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

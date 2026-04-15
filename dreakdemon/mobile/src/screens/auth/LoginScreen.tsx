import SkillUpXLogo from '@components/SkillUpXLogo';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@store/authStore';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STATUSBAR_HEIGHT = Constants.statusBarHeight || 24;

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    clearError();
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      // Error shown via store
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Top Branding */}
        <View style={styles.brandSection}>
          <View style={styles.logoRow}>
            <SkillUpXLogo size={56} />
            <View>
              <Text style={styles.brandName}>
                Skill<Text style={styles.brandAccent}>UpX</Text>
              </Text>
              <Text style={styles.brandSub}>Code · Connect · Create</Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
            <Text style={styles.heading}>Sign In</Text>
            <Text style={styles.subheading}>Welcome back! Please enter your details.</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <Pressable
                style={[styles.fieldRow, emailFocused && styles.fieldRowFocused]}
                onPress={() => emailInputRef.current?.focus()}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? COLORS.primary : COLORS.textMuted}
                  style={styles.fieldIcon}
                />
                <TextInput
                  ref={emailInputRef}
                  style={styles.fieldInput}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textDisabled}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={true}
                />
              </Pressable>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <Pressable
                style={[styles.fieldRow, passwordFocused && styles.fieldRowFocused]}
                onPress={() => passwordInputRef.current?.focus()}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? COLORS.primary : COLORS.textMuted}
                  style={styles.fieldIcon}
                />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.fieldInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textDisabled}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={true}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(p => !p)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </Pressable>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{ marginTop: 4 }}
            >
              <LinearGradient
                colors={['#00ADB5', '#0891b2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.signInBtn, isLoading && { opacity: 0.65 }]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.signInText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>

        {/* Feature Pills */}
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
            <Text style={styles.pillText}>Secure & Fast</Text>
          </View>
          <View style={styles.pillDot} />
          <View style={styles.pill}>
            <Ionicons name="globe-outline" size={14} color={COLORS.primary} />
            <Text style={styles.pillText}>Access Anywhere</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─────────────── Styles ─────────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: STATUSBAR_HEIGHT,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },

  /* Brand */
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandName: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 1 },
  brandAccent: { color: COLORS.primary },
  brandSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, letterSpacing: 1.5 },

  /* Card */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subheading: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, marginBottom: 24 },

  /* Error */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${COLORS.danger}15`,
    padding: 12, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: `${COLORS.danger}30`,
    marginBottom: 16,
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },

  /* Fields */
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 50,
  },
  fieldRowFocused: {
    borderColor: COLORS.primary,
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15, paddingVertical: 0, height: 48 },

  /* Sign In */
  signInBtn: {
    height: 50,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* Pills */
  pills: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 28, gap: 6,
  },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontSize: 12, color: COLORS.textMuted },
  pillDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted, opacity: 0.4 },
});

import SkillUpXLogo from '@components/SkillUpXLogo';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated,
    KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(30)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(headerTranslate, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(formTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(footerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Top Branding ─── */}
          <Animated.View style={[styles.brandSection, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
            <View style={styles.logoRow}>
              <SkillUpXLogo size={56} />
              <View style={styles.logoTextGroup}>
                <Text style={styles.brandName}>
                  Skill<Text style={styles.brandAccent}>UpX</Text>
                </Text>
                <Text style={styles.brandSub}>Code · Connect · Create</Text>
              </View>
            </View>
          </Animated.View>

          {/* ─── Form Card ─── */}
          <Animated.View style={[styles.card, { opacity: formOpacity, transform: [{ translateY: formTranslate }] }]}>
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
              <View style={[styles.fieldRow, emailFocused && styles.fieldRowFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? COLORS.primary : COLORS.textMuted}
                  style={styles.fieldIcon}
                />
                <TextInput
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
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.fieldRow, passwordFocused && styles.fieldRowFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? COLORS.primary : COLORS.textMuted}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textDisabled}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
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
              </View>
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

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={16} color={COLORS.primary} />
              <Text style={styles.registerText}>Create New Account</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ─── Feature Pills ─── */}
          <Animated.View style={[styles.pills, { opacity: footerOpacity }]}>
            <View style={styles.pill}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
              <Text style={styles.pillText}>Secure & Fast</Text>
            </View>
            <View style={styles.pillDot} />
            <View style={styles.pill}>
              <Ionicons name="globe-outline" size={14} color={COLORS.primary} />
              <Text style={styles.pillText}>Access Anywhere</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─────────────── Styles ─────────────── */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },

  /* Brand */
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoTextGroup: {},
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15 },

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

  /* Divider */
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  dividerLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    paddingHorizontal: 14,
  },

  /* Register */
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: RADIUS.md, height: 50,
  },
  registerText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },

  /* Pills */
  pills: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 28, gap: 6,
  },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontSize: 12, color: COLORS.textMuted },
  pillDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted, opacity: 0.4 },
});

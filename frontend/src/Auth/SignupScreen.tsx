import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { checkUsername, loginWithGoogle, sendSignupOTP, verifySignupOTP } from "../service/auth";

// Google OAuth Client ID - should be in env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "44260358109-l0qenhtfphvg3nsek757bsm9eunb9rlc.apps.googleusercontent.com";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleJWTPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

// Icons
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export default function Signup() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Debounced username check
  const handleUsernameChange = (value: string) => {
    // Only allow valid characters
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setUsername(cleaned);
    setUsernameStatus('idle');

    if (cleaned.length < 3) {
      if (cleaned.length > 0) setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    // Debounce the check
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername(cleaned);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  };

  const validateDetails = () => {
    if (!name.trim()) return "Full name is required.";
    if (!username.trim()) return "Username is required.";
    if (username.length < 3) return "Username must be at least 3 characters.";
    if (!/^[a-z0-9_]{3,30}$/.test(username)) return "Username: only lowercase letters, numbers, underscores.";
    if (usernameStatus === 'taken') return "Username is already taken.";
    if (usernameStatus === 'checking') return "Please wait — checking username availability.";
    if (!email.trim()) return "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email.";
    return null;
  };

  const validatePassword = () => {
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters long.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSendOTP = async () => {
    setErr(null);
    setSuccess(null);
    const errorMsg = validateDetails();
    if (errorMsg) {
      setErr(errorMsg);
      return;
    }

    setLoading(true);
    try {
      await sendSignupOTP(email, name, username);
      setStep('otp');
      setSuccess("OTP sent to your email! Please check your inbox.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setErr(null);
    setSuccess(null);

    if (!otp || otp.length !== 6) {
      setErr("Please enter the 6-digit OTP.");
      return;
    }

    const passwordErr = validatePassword();
    if (passwordErr) {
      setErr(passwordErr);
      return;
    }

    setLoading(true);
    try {
      await verifySignupOTP(email, otp, password);
      await refreshUser();
      navigate("/dashboard/db");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      setErr("Google sign-up failed. Please try again.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const decoded = jwtDecode<GoogleJWTPayload>(response.credential);

      await loginWithGoogle({
        googleId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        avatar:''
      });

      await refreshUser();
      navigate("/dashboard/db");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErr("Google sign-up failed. Please try again.");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gradient-to-br from-[#00ADB5]/10 via-[#f0f4f8] to-[#0891b2]/10 dark:from-black dark:via-black dark:to-black flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <div className="w-full max-w-sm lg:max-w-3xl flex flex-col lg:flex-row rounded-xl lg:rounded-2xl overflow-hidden shadow-lg lg:shadow-xl bg-white dark:bg-gray-900">

          {/* Left Side - Branding Panel */}
          <div className="hidden lg:flex lg:w-[240px] bg-gradient-to-b from-[#00ADB5] to-[#0891b2] p-5 flex-col relative">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full"></div>
              <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-white/5 rounded-full"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full">
              {/* Logo */}
              <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-md mb-6">
                <img
                  src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg"
                  className="w-7 h-7"
                  alt="Logo"
                />
              </div>

              {/* Welcome Text */}
              <h1 className="text-2xl font-bold text-white mb-2">Welcome!</h1>
              <p className="text-white/80 text-xs leading-relaxed mb-6">
                Create your account and<br />start your journey with us.
              </p>

              {/* Steps Indicator */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    step === 'details'
                      ? 'bg-white text-[#00ADB5]'
                      : 'bg-white/20 text-white'
                  }`}>
                    {step === 'otp' ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : '1'}
                  </div>
                  <span className={`text-xs font-medium ${step === 'details' ? 'text-white' : 'text-white/60'}`}>Details</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    step === 'otp'
                      ? 'bg-white text-[#00ADB5]'
                      : 'bg-white/20 text-white/60'
                  }`}>
                    2
                  </div>
                  <span className={`text-xs font-medium ${step === 'otp' ? 'text-white' : 'text-white/60'}`}>Verify</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {/* Mobile Header with Logo and Progress */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00ADB5] to-[#0891b2] rounded-lg flex items-center justify-center shadow-md">
                  <img
                    src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg"
                    className="w-6 h-6 filter brightness-0 invert"
                    alt="Logo"
                  />
                </div>
                {/* Mobile Progress */}
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step === 'details' ? 'bg-[#00ADB5] text-white' : 'bg-[#00ADB5] text-white'}`}>
                    {step === 'otp' ? '✓' : '1'}
                  </div>
                  <div className={`w-8 h-1 rounded-full ${step === 'otp' ? 'bg-[#00ADB5]' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step === 'otp' ? 'bg-[#00ADB5] text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'}`}>
                    2
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {step === 'details' ? 'Create Account' : 'Verify Email'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {step === 'details' ? 'Start your journey with us today.' : `Enter the OTP sent to ${email}`}
              </p>
            </div>

            {/* Error Alert */}
            {err && (
              <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3 animate-shake">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            {step === 'details' && (
              <>
                {/* Google Sign Up */}
                <div className="mb-5">
                  <div className="flex items-start gap-3 lg:gap-4">
                    <div className="hidden lg:flex w-7 h-7 rounded-full bg-[#00ADB5] text-white items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                      1
                    </div>
                    <div className="flex-1 flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="medium"
                        text="signup_with"
                        shape="rectangular"
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-xs text-gray-400 bg-white dark:bg-gray-900 uppercase tracking-wider">or continue with email</span>
                  </div>
                </div>

                {/* Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendOTP();
                  }}
                >
                  <div className="flex items-start gap-3 lg:gap-4">
                    <div className="hidden lg:flex w-7 h-7 rounded-full bg-[#00ADB5] text-white items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                      2
                    </div>
                    <div className="flex-1 space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Full Name
                        </label>
                        <input
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>

                      {/* Username */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Username
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400 text-sm font-medium">@</span>
                          </div>
                          <input
                            className={`w-full pl-8 pr-10 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm sm:text-base ${
                              usernameStatus === 'available' ? 'border-green-400 focus:ring-green-400/20 focus:border-green-400' :
                              usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400' :
                              'border-gray-200 dark:border-gray-700 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5]'
                            }`}
                            placeholder="johndoe"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            {usernameStatus === 'checking' && (
                              <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                            {usernameStatus === 'available' && (
                              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                              <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                        {usernameStatus === 'taken' && (
                          <p className="mt-1 text-xs text-red-500">Username is taken. Try another.</p>
                        )}
                        {usernameStatus === 'available' && (
                          <p className="mt-1 text-xs text-green-500">Username is available!</p>
                        )}
                        {usernameStatus === 'invalid' && username.length > 0 && (
                          <p className="mt-1 text-xs text-red-500">Min 3 characters: letters, numbers, underscores.</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MailIcon />
                          </div>
                          <input
                            type="email"
                            className="w-full pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-[#00ADB5] to-[#0891b2] text-white font-medium rounded-lg shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Sending OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Continue</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}

            {step === 'otp' && (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyOTP();
                }}
              >
                {/* OTP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 sm:py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Create Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockIcon />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#00ADB5] transition-colors"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockIcon />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#00ADB5] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('details');
                      setOtp('');
                      setPassword('');
                      setConfirmPassword('');
                      setErr(null);
                      setSuccess(null);
                    }}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-[#00ADB5] to-[#0891b2] text-white font-medium rounded-lg shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </div>

                {/* Resend OTP */}
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full text-sm text-[#00ADB5] hover:text-[#0891b2] font-medium hover:underline disabled:opacity-50 transition-colors pt-1"
                >
                  Didn't receive the code? Resend
                </button>
              </form>
            )}

            {/* Footer */}
            <p className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-[#00ADB5] hover:text-[#0891b2] hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </GoogleOAuthProvider>
  );
}

import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { loginWithEmail, loginWithGoogle, resetPassword, sendPasswordResetOTP, verifyPasswordResetOTP } from "../service/auth";

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

export default function Login() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password reset states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const onLogin = async () => {
    setLoading(true);
    setErr(null);
    try {
      await loginWithEmail(email, password);
      await refreshUser();
      navigate("/dashboard/db");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      setErr("Google sign-in failed. Please try again.");
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
        avatar: ''
      });

      await refreshUser();
      navigate("/dashboard/db");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErr("Google sign-in failed. Please try again.");
  };

  // Password Reset Functions
  const handleSendResetOTP = async () => {
    if (!resetEmail) {
      setResetError("Please enter your email");
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      await sendPasswordResetOTP(resetEmail);
      setResetStep('otp');
      setResetSuccess("OTP sent to your email!");
    } catch (e: any) {
      setResetError(e.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetOTP = async () => {
    if (!resetOtp) {
      setResetError("Please enter the OTP");
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const result = await verifyPasswordResetOTP(resetEmail, resetOtp);
      if (result.verified) {
        setResetStep('newPassword');
        setResetSuccess("OTP verified! Enter your new password.");
      }
    } catch (e: any) {
      setResetError(e.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setResetError("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      await resetPassword(resetEmail, resetOtp, newPassword);
      setResetSuccess("Password reset successfully! You can now login.");
      setTimeout(() => {
        setShowResetModal(false);
        setResetStep('email');
        setResetEmail("");
        setResetOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setResetSuccess(null);
      }, 2000);
    } catch (e: any) {
      setResetError(e.message);
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetStep('email');
    setResetEmail("");
    setResetOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setResetError(null);
    setResetSuccess(null);
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
              <h1 className="text-2xl font-bold text-white mb-2">Welcome Back!</h1>
              <p className="text-white/80 text-xs leading-relaxed mb-8">
                Sign in to continue your<br />journey with us.
              </p>

              {/* Features */}
              <div className="space-y-3 mt-auto">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs text-white/80">Secure & Fast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs text-white/80">Access Anywhere</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {/* Mobile Header with Logo */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00ADB5] to-[#0891b2] rounded-lg flex items-center justify-center shadow-md">
                  <img
                    src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg"
                    className="w-6 h-6 filter brightness-0 invert"
                    alt="Logo"
                  />
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Sign In
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Welcome back! Please enter your details.
              </p>
            </div>

            {/* Error Alert */}
            {err && (
              <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
              </div>
            )}

            {/* Google Sign In */}
            <div className="mb-5 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="medium"
                text="signin_with"
                shape="rectangular"
              />
            </div>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs text-gray-400 bg-white dark:bg-gray-900 uppercase tracking-wider">or continue with email</span>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onLogin();
              }}
            >
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      className="w-full pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      className="w-full pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-sm text-[#00ADB5] hover:text-[#0891b2] font-medium hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-[#00ADB5] to-[#0891b2] text-white font-medium rounded-lg shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              Don't have an account?{" "}
              <Link to="/signup" className="font-semibold text-[#00ADB5] hover:text-[#0891b2] hover:underline transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Password Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {resetStep === 'email' && 'Reset Password'}
                  {resetStep === 'otp' && 'Enter OTP'}
                  {resetStep === 'newPassword' && 'Set New Password'}
                </h2>
                <button
                  onClick={closeResetModal}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {resetError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-600 dark:text-red-400">{resetError}</p>
                </div>
              )}

              {resetSuccess && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-green-600 dark:text-green-400">{resetSuccess}</p>
                </div>
              )}

              {resetStep === 'email' && (
                <div className="space-y-4">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Enter your email address and we'll send you an OTP to reset your password.
                  </p>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                  />
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={closeResetModal}
                      className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.98] transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendResetOTP}
                      disabled={resetLoading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#00ADB5] to-[#0891b2] text-white font-medium rounded-lg shadow-md shadow-cyan-500/20 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all text-sm"
                    >
                      {resetLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                </div>
              )}

              {resetStep === 'otp' && (
                <div className="space-y-4">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Enter the 6-digit OTP sent to <strong className="text-gray-700 dark:text-gray-300">{resetEmail}</strong>
                  </p>
                  <input
                    type="text"
                    placeholder="000000"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-3 sm:py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all"
                    maxLength={6}
                  />
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => setResetStep('email')}
                      className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back
                    </button>
                    <button
                      onClick={handleVerifyResetOTP}
                      disabled={resetLoading || resetOtp.length !== 6}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#00ADB5] to-[#0891b2] text-white font-medium rounded-lg shadow-md shadow-cyan-500/20 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all text-sm"
                    >
                      {resetLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              )}

              {resetStep === 'newPassword' && (
                <div className="space-y-4">
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]/20 focus:border-[#00ADB5] transition-all text-sm sm:text-base"
                  />
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={closeResetModal}
                      className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#00ADB5] to-[#0891b2] text-white font-medium rounded-lg shadow-md shadow-cyan-500/20 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all text-sm"
                    >
                      {resetLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

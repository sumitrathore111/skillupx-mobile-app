import { apiRequest, clearAuthToken, saveAuthToken } from "./api";

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: string;
  avatar?: string;
}

// Direct signup is deprecated - use OTP-based signup instead
// export async function signupWithEmail(email: string, password: string, name: string): Promise<User> {
//   const response = await apiRequest('/auth/signup', {
//     method: 'POST',
//     body: JSON.stringify({ email, password, name })
//   });
//   saveAuthToken(response.token);
//   return response.user;
// }

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  saveAuthToken(response.token);
  return response.user;
}

// Google OAuth
export async function loginWithGoogle(googleData: {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}): Promise<{ user: User; isNewUser: boolean }> {
  const response = await apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify(googleData)
  });

  saveAuthToken(response.token);
  return { user: response.user, isNewUser: response.isNewUser };
}

// OTP-based Signup
export async function sendSignupOTP(email: string, name: string, username?: string): Promise<{ message: string }> {
  return apiRequest('/auth/signup/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email, name, username })
  });
}

export async function verifySignupOTP(email: string, otp: string, password: string): Promise<User> {
  const response = await apiRequest('/auth/signup/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, password })
  });

  saveAuthToken(response.token);
  return response.user;
}

// Password Reset with OTP
export async function sendPasswordResetOTP(email: string): Promise<{ message: string }> {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function verifyPasswordResetOTP(email: string, otp: string): Promise<{ verified: boolean }> {
  return apiRequest('/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  });
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword })
  });
}

export async function logout(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' });
  clearAuthToken();
}

// Username utilities
export async function checkUsername(username: string): Promise<{ available: boolean; error?: string }> {
  return apiRequest(`/users/check-username/${encodeURIComponent(username)}`);
}

export async function updateUsername(username: string): Promise<{ user: { id: string; username: string; name: string } }> {
  return apiRequest('/users/update-username', {
    method: 'PUT',
    body: JSON.stringify({ username })
  });
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest('/auth/me');
    return response.user;
  } catch (error) {
    clearAuthToken();
    return null;
  }
}

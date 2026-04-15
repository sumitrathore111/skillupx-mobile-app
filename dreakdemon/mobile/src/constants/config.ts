// ⚠️ IMPORTANT: Change this to your deployed backend URL before publishing to Play Store
// For local development: use your PC's local IP (not localhost — phone can't reach localhost)
// Find your IP: run `ipconfig` in terminal → look for IPv4 Address e.g. 192.168.1.5
// For production: replace with your actual server URL e.g. https://api.dreakdemon.com

// Auto-detect: web uses localhost, Android emulator uses 10.0.2.2, physical device uses LAN IP
// To switch: set USE_EMULATOR=true for emulator, or update PHYSICAL_DEVICE_IP for real device

// Use Render cloud backend for production
export const API_BASE_URL = 'https://nextstepbackend-qhxw.onrender.com/api';
export const SOCKET_URL = 'wss://nextstepbackend-qhxw.onrender.com';

// App info
export const APP_NAME = 'DreakDemon';
export const APP_VERSION = '1.0.0';

// Pagination
export const PAGE_SIZE = 20;
export const CHALLENGE_PAGE_SIZE = 50;

// Cache TTL (milliseconds)
export const CACHE_TTL = 60_000; // 60 seconds

// Battle settings
export const BATTLE_COUNTDOWN = 5;

// Coin rewards
export const COINS = {
  EASY_WIN: 50,
  MEDIUM_WIN: 100,
  HARD_WIN: 200,
  DAILY_BONUS: 10,
  PROBLEM_SOLVED: 15,
} as const;

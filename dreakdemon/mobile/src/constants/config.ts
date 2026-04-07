// ⚠️ IMPORTANT: Change this to your deployed backend URL before publishing to Play Store
// For local development: use your PC's local IP (not localhost — phone can't reach localhost)
// Find your IP: run `ipconfig` in terminal → look for IPv4 Address e.g. 192.168.1.5
// For production: replace with your actual server URL e.g. https://api.dreakdemon.com
import { Platform } from 'react-native';

// Auto-detect: web uses localhost, Android emulator uses 10.0.2.2, physical device uses LAN IP
// To switch: set USE_EMULATOR=true for emulator, or update PHYSICAL_DEVICE_IP for real device
const USE_EMULATOR = false; // set true when running on Android emulator
const PHYSICAL_DEVICE_IP = '192.168.29.224'; // run `ipconfig` → IPv4 Address

const BASE_HOST =
  Platform.OS === 'web'
    ? 'localhost'
    : USE_EMULATOR
    ? '10.0.2.2'
    : PHYSICAL_DEVICE_IP;

export const API_BASE_URL = `http://${BASE_HOST}:5000/api`;
export const SOCKET_URL = `http://${BASE_HOST}:5000`;

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

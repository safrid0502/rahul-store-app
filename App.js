import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NativeModules } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import MainStore from './screens/MainStore';
import * as Sentry from '@sentry/react-native';

const API_SECRET_KEY = 'c0jEoY0TLL_mFc_jyD_LhtlgPMK3_FBkL53RvRoypEw';
const API_BASE = 'https://rahul-auto-spares-backend.onrender.com';

const originalFetch = global.fetch;
global.fetch = (url, options = {}) => {
  if (typeof url === 'string' && url.startsWith(API_BASE)) {
    options.headers = { ...(options.headers || {}), 'x-api-key': API_SECRET_KEY };
  }
  return originalFetch(url, options);
};

Sentry.init({
  dsn: 'https://a9a9e70d4682f86314b3606d58b0c74d@o4511731723534336.ingest.us.sentry.io/4511731770261509',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function startOrderAlertListener() {
  Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request?.content?.data;
    const body = notification.request?.content?.body || '';
    if (data?.type === 'new_order' && NativeModules.OrderAlertModule) {
      const amountMatch = body.match(/Rs\\.?\\s*([0-9,.]+)/);
      const amount = amountMatch ? amountMatch[1] : '';
      NativeModules.OrderAlertModule.showOrderAlert(
        data.custom_id || 'New Order',
        amount
      );
    }
  });
}
async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('new-orders', {
      name: 'New Orders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22C55E',
    });
  }
}

async function registerForPushNotifications(staffId) {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    await setupNotificationChannel();

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenResponse.data;

    await fetch(
      `https://rahul-auto-spares-backend.onrender.com/staff/${staffId}/register-push-token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ push_token: pushToken }),
      }
    );
  } catch (e) {
    console.log('Push notification registration failed:', e);
  }
}

export default Sentry.wrap(function App() {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkLogin(); startOrderAlertListener(); }, []);

  const checkLogin = async () => {
    try {
      const saved = await AsyncStorage.getItem('staff_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify staff still valid - don't block if backend down
        try {
          const r = await fetch(
            'https://rahul-auto-spares-backend.onrender.com/staff/' + parsed.id,
            { signal: AbortSignal.timeout(3000) }
          );
          if (r.ok) {
            const d = await r.json();
            if (d.staff) {
              // Update with latest data from backend
              const updated = { ...parsed, ...d.staff };
              await AsyncStorage.setItem('staff_profile', JSON.stringify(updated));
              setStaff(updated);
              registerForPushNotifications(updated.id);
            } else {
              // Staff no longer exists
              await AsyncStorage.removeItem('staff_profile');
            }
          } else {
            // Backend error - use cached
            setStaff(parsed);
          }
        } catch {
          // Network error - use cached profile
          setStaff(parsed);
        }
      }
    } catch {}
    setLoading(false);
  };

  const handleLogin = async (staffMember) => {
    await AsyncStorage.setItem(
      'staff_profile', JSON.stringify(staffMember)
    );
    setStaff(staffMember);
    registerForPushNotifications(staffMember.id);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['staff_profile', 'staff_list_cache']);
    } catch {}
    setStaff(null);
  };

  if (loading) return null;

  return (
    <>
      <StatusBar barStyle="light-content"
        backgroundColor="#060E06" />
      {!staff ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <MainStore staff={staff} onLogout={handleLogout} />
      )}
    </>
  );
});
const ls = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoBox: {
    width: 90, height: 90, borderRadius: 22,
    backgroundColor: '#0D1A0D', borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.4)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 10,
  },
  logoInner: { alignItems: 'center' },
  logoText: { fontSize: 24, fontWeight: '900', color: '#22C55E', letterSpacing: 3 },
  logoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginTop: 4 },
  brand: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 10, color: 'rgba(34,197,94,0.6)', letterSpacing: 4, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
});

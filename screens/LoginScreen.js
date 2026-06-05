import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';

const STAFF = [
  { id: 1, name: 'Abdul Azeez Basheer', role: 'owner', pin: '1111' },
  { id: 2, name: 'Chand Basha', role: 'senior', pin: '2222' },
  { id: 3, name: 'Mabasha', role: 'junior', pin: '3333' },
  { id: 4, name: 'Hussain Basha', role: 'junior', pin: '4444' },
  { id: 5, name: 'Khaja', role: 'junior', pin: '5555' },
];

const ROLE_ICONS = { owner: '👑', senior: '⭐', junior: '👷' };

export default function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKey = async (digit) => {
    if (pin.length >= 4) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) {
      setTimeout(() => checkPin(newPin), 200);
    }
  };

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const checkPin = async (entered) => {
    const match = STAFF.find(s => s.pin === entered);
    if (match) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      onLogin(match);
      return;
    }
    try {
      const r = await fetch(`${API_URL}/staff/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: entered })
      });
      const d = await r.json();
      if (d.staff) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        onLogin(d.staff);
        return;
      }
    } catch {}
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error
    );
    setError('Wrong PIN! Try again');
    setTimeout(() => setPin(''), 500);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />
      <View style={s.body}>
        <View style={s.logoRing}>
          <Text style={{ fontSize: 48 }}>🏪</Text>
        </View>
        <Text style={s.appLabel}>STAFF ONLY</Text>
        <Text style={s.appName}>Rahul Auto · Store Panel</Text>
        <Text style={s.appSub}>Enter your 4-digit PIN</Text>

        <View style={s.dotsRow}>
          {[0,1,2,3].map(i => (
            <View key={i} style={[s.dot,
              i < pin.length && s.dotFilled]} />
          ))}
        </View>

        {error
          ? <Text style={s.errorText}>{error}</Text>
          : <Text style={s.hintText}>మీ PIN నమోదు చేయండి</Text>
        }

        <View style={s.keypad}>
          {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map(
            (row, ri) => (
              <View key={ri} style={s.keyRow}>
                {row.map((key, ki) => (
                  <TouchableOpacity
                    key={ki}
                    style={[s.key, key === '' && s.keyEmpty]}
                    onPress={() => {
                      if (key === '⌫') handleDelete();
                      else if (key) handleKey(key);
                    }}
                    disabled={key === ''}
                  >
                    <Text style={[s.keyText,
                      key === '⌫' && { color: '#EF4444' }]}>
                      {key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </View>

        <View style={s.staffList}>
          {STAFF.map(sf => (
            <View key={sf.id} style={s.staffChip}>
              <Text style={s.staffIcon}>{ROLE_ICONS[sf.role]}</Text>
              <Text style={s.staffName}>
                {sf.name.split(' ')[0]}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  body: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 24,
  },
  logoRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 14,
  },
  appLabel: {
    fontSize: 10, color: 'rgba(34,197,94,0.5)',
    letterSpacing: 4, marginBottom: 4,
  },
  appName: {
    fontSize: 18, fontWeight: 'bold', color: '#fff',
    letterSpacing: 1, marginBottom: 6,
  },
  appSub: { fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 28 },
  dotsRow: { flexDirection: 'row', gap: 18, marginBottom: 12 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)',
  },
  dotFilled: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  errorText: {
    fontSize: 14, color: '#EF4444', fontWeight: 'bold', marginBottom: 20,
  },
  hintText: {
    fontSize: 12, color: 'rgba(255,255,255,0.2)', marginBottom: 20,
  },
  keypad: { width: '100%', gap: 12, marginBottom: 28 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  key: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#0D1A0D', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  staffList: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
  },
  staffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  staffIcon: { fontSize: 14 },
  staffName: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
});
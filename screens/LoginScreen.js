// ════════════════════════════════════════════════════════════════
// LoginScreen.js — New Rahul Auto Spares Store App
// Modern staff selection + PIN login
// ════════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';

const STAFF = [
  { id: 1, name: 'Abdul Azeez Basheer', role: 'owner',  pin: '1111', emoji: '👑', color: '#FFD700' },
  { id: 2, name: 'Chand Basha',         role: 'senior', pin: '2222', emoji: '⭐', color: '#4F6EF7' },
  { id: 3, name: 'Mabasha',             role: 'junior', pin: '3333', emoji: '👷', color: '#22C55E' },
  { id: 4, name: 'Hussain Basha',       role: 'junior', pin: '4444', emoji: '👷', color: '#22C55E' },
  { id: 5, name: 'Khaja',               role: 'junior', pin: '5555', emoji: '👷', color: '#22C55E' },
];

const ROLE_LABELS = { owner: 'Owner', senior: 'Senior Staff', junior: 'Staff' };

export default function LoginScreen({ onLogin }) {
  const [step, setStep]               = useState('select'); // 'select' | 'pin'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pin, setPin]                 = useState('');
  const [error, setError]             = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSelectStaff = async (member) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedStaff(member);
    setPin('');
    setError('');
    setStep('pin');
  };

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
    // Check local PIN first
    if (selectedStaff.pin === entered) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onLogin(selectedStaff);
      return;
    }

    // Check backend PIN
    try {
      const r = await fetch(`${API_URL}/staff/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: entered, staff_id: selectedStaff.id })
      });
      const d = await r.json();
      if (d.staff) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onLogin(d.staff);
        return;
      }
    } catch {}

    // Wrong PIN
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError('Wrong PIN! Try again');
    shake();
    setTimeout(() => setPin(''), 500);
  };

  // ── STEP 1: SELECT STAFF ──
  if (step === 'select') {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#060E06" />
        <ScrollView contentContainerStyle={s.selectBody}>

          {/* HEADER */}
          <View style={s.logoBox}>
            <LinearGradient colors={['#1A2E1A', '#0D1A0D']} style={s.logoRing}>
              <Text style={s.logoEmoji}>🏪</Text>
            </LinearGradient>
            <Text style={s.appLabel}>STAFF LOGIN</Text>
            <Text style={s.appName}>Rahul Auto Spares</Text>
            <Text style={s.appSub}>Who are you?</Text>
          </View>

          {/* STAFF CARDS */}
          <View style={s.staffGrid}>
            {STAFF.map(member => (
              <TouchableOpacity key={member.id}
                style={s.staffCard}
                onPress={() => handleSelectStaff(member)}
                activeOpacity={0.7}>
                <LinearGradient
                  colors={['#0D1A0D', '#060E06']}
                  style={s.staffCardInner}>
                  <View style={[s.staffAvatar, { borderColor: member.color + '60' }]}>
                    <Text style={s.staffAvatarEmoji}>{member.emoji}</Text>
                  </View>
                  <Text style={s.staffCardName}>
                    {member.name.split(' ')[0]}
                  </Text>
                  <Text style={s.staffCardRole}>
                    {ROLE_LABELS[member.role]}
                  </Text>
                  <View style={[s.staffCardBadge, { backgroundColor: member.color + '20', borderColor: member.color + '40' }]}>
                    <Text style={[s.staffCardBadgeText, { color: member.color }]}>
                      {member.emoji} {member.role.toUpperCase()}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.footerText}>
            New Rahul Auto Spares · Nandyal
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STEP 2: ENTER PIN ──
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />
      <View style={s.pinBody}>

        {/* BACK BUTTON */}
        <TouchableOpacity style={s.backBtn}
          onPress={() => { setStep('select'); setPin(''); setError(''); }}>
          <Text style={s.backBtnText}>← Change</Text>
        </TouchableOpacity>

        {/* SELECTED STAFF */}
        <View style={s.selectedCard}>
          <LinearGradient
            colors={['#0D1A0D', '#060E06']}
            style={s.selectedCardInner}>
            <View style={[s.selectedAvatar, { borderColor: selectedStaff.color + '60' }]}>
              <Text style={s.selectedAvatarEmoji}>{selectedStaff.emoji}</Text>
            </View>
            <Text style={s.selectedName}>{selectedStaff.name}</Text>
            <Text style={s.selectedRole}>{ROLE_LABELS[selectedStaff.role]}</Text>
          </LinearGradient>
        </View>

        <Text style={s.pinPrompt}>Enter your 4-digit PIN</Text>

        {/* PIN DOTS */}
        <Animated.View style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {[0,1,2,3].map(i => (
            <View key={i} style={[s.dot, i < pin.length && {
              backgroundColor: selectedStaff.color,
              borderColor: selectedStaff.color
            }]} />
          ))}
        </Animated.View>

        {error
          ? <Text style={s.errorText}>{error}</Text>
          : <Text style={s.hintText}>మీ PIN నమోదు చేయండి</Text>
        }

        {/* KEYPAD */}
        <View style={s.keypad}>
          {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
            <View key={ri} style={s.keyRow}>
              {row.map((key, ki) => (
                <TouchableOpacity key={ki}
                  style={[s.key, key === '' && s.keyEmpty,
                    key !== '' && key !== '⌫' && s.keyNum]}
                  onPress={() => {
                    if (key === '⌫') handleDelete();
                    else if (key) handleKey(key);
                  }}
                  disabled={key === ''}>
                  <Text style={[s.keyText, key === '⌫' && { color: '#EF4444', fontSize: 22 }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <Text style={s.footerText}>New Rahul Auto Spares · Staff Only</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },

  // Select screen
  selectBody: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  logoBox: { alignItems: 'center', marginBottom: 28, marginTop: 10 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  logoEmoji: { fontSize: 36 },
  appLabel: {
    fontSize: 10, color: 'rgba(34,197,94,0.5)',
    letterSpacing: 4, marginBottom: 4,
  },
  appName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  appSub: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },

  // Staff grid
  staffGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, justifyContent: 'center', width: '100%',
  },
  staffCard: { width: '46%', borderRadius: 18, overflow: 'hidden' },
  staffCardInner: {
    padding: 18, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
    borderRadius: 18,
  },
  staffAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(34,197,94,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  staffAvatarEmoji: { fontSize: 28 },
  staffCardName: {
    fontSize: 16, fontWeight: 'bold', color: '#fff',
  },
  staffCardRole: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
  },
  staffCardBadge: {
    borderRadius: 20, paddingHorizontal: 10,
    paddingVertical: 4, borderWidth: 1,
  },
  staffCardBadgeText: { fontSize: 10, fontWeight: 'bold' },

  // PIN screen
  pinBody: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 24,
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  backBtnText: { color: '#22C55E', fontSize: 14, fontWeight: 'bold' },

  // Selected staff card
  selectedCard: { marginBottom: 24, borderRadius: 16, overflow: 'hidden', width: '60%' },
  selectedCardInner: {
    padding: 16, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 16,
  },
  selectedAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(34,197,94,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: 2,
  },
  selectedAvatarEmoji: { fontSize: 26 },
  selectedName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  selectedRole: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  // PIN
  pinPrompt: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)',
    marginBottom: 20,
  },
  dotsRow: { flexDirection: 'row', gap: 18, marginBottom: 10 },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)',
  },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: 'bold', marginBottom: 16 },
  hintText: { fontSize: 12, color: 'rgba(255,255,255,0.2)', marginBottom: 16 },

  // Keypad
  keypad: { width: '100%', gap: 12, marginBottom: 24 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  key: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#0D1A0D', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  keyNum: {
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: 26, fontWeight: 'bold', color: '#fff' },

  // Footer
  footerText: {
    fontSize: 11, color: 'rgba(255,255,255,0.15)',
    textAlign: 'center', marginTop: 8,
  },
});

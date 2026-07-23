// ════════════════════════════════════════════════════════════════
// LoginScreen.js — New Rahul Auto Spares Store App
// Ultra Modern Staff Login — v2
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Dimensions
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://rahul-auto-spares-backend.onrender.com';

const DEFAULT_STAFF = [
  { id: 1, name: 'Abdul Azeez', role: 'owner',  pin: '1111', color: '#C9A84C', initials: 'AA' },
  { id: 2, name: 'Chand Basha', role: 'senior', pin: '2222', color: '#4F6EF7', initials: 'CB' },
  { id: 3, name: 'Mabasha',     role: 'staff',  pin: '3333', color: '#22C55E', initials: 'MB' },
  { id: 4, name: 'Hussain',     role: 'staff',  pin: '4444', color: '#22C55E', initials: 'HB' },
  { id: 5, name: 'Khaja',       role: 'staff',  pin: '5555', color: '#22C55E', initials: 'KJ' },
];

const ROLE_COLORS = { owner: '#C9A84C', senior: '#4F6EF7', staff: '#22C55E' };

const getInitials = (name) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const ROLE_CONFIG = {
  owner:  { label: 'Owner',        icon: 'shield-checkmark', color: '#C9A84C' },
  senior: { label: 'Senior Staff', icon: 'star',             color: '#4F6EF7' },
  staff:  { label: 'Staff',        icon: 'person',           color: '#22C55E' },
};

const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

export default function LoginScreen({ onLogin }) {
  const [step, setStep]                   = useState('select');
  const [staffList, setStaffList]         = useState(DEFAULT_STAFF);
  const [loadingStaff, setLoadingStaff]   = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pin, setPin]                     = useState('');
  const [error, setError]                 = useState('');

  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;
  const scaleAnim  = useRef(new Animated.Value(0.95)).current;
  const dotAnims   = [0,1,2,3].map(() => useRef(new Animated.Value(1)).current);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const cached = await AsyncStorage.getItem('staff_list_cache');
      if (cached) setStaffList(JSON.parse(cached));
      const r = await fetch(`${API_URL}/staff`);
      const d = await r.json();
      if (d.staff && d.staff.length > 0) {
        const mapped = d.staff.map(s => ({
          id: s.id,
          name: s.name,
          role: s.role || 'staff',
          pin: s.pin || '0000',
          color: ROLE_COLORS[s.role] || '#22C55E',
          initials: getInitials(s.name),
          phone: s.phone,
        }));
        setStaffList(mapped);
        await AsyncStorage.setItem('staff_list_cache', JSON.stringify(mapped));
      }
    } catch {
      setStaffList(DEFAULT_STAFF);
    }
    setLoadingStaff(false);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animateDot = (index) => {
    Animated.sequence([
      Animated.spring(dotAnims[index], { toValue: 1.4, tension: 200, friction: 5, useNativeDriver: true }),
      Animated.spring(dotAnims[index], { toValue: 1,   tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const handleSelectStaff = async (member) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    scaleAnim.setValue(0.95);
    setSelectedStaff(member);
    setPin('');
    setError('');
    setStep('pin');
  };

  const handleKey = async (digit) => {
    if (pin.length >= 4) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + digit;
    animateDot(newPin.length - 1);
    setPin(newPin);
    setError('');
    if (newPin.length === 4) setTimeout(() => checkPin(newPin), 300);
  };

  const handleDelete = async () => {
    if (!pin.length) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const checkPin = async (entered) => {
    if (selectedStaff.pin === entered) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onLogin(selectedStaff);
      return;
    }
    try {
      const r = await fetch(`${API_URL}/staff/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: entered, staff_id: selectedStaff.id })
      });
      const d = await r.json();
      if (d.staff) { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onLogin(d.staff); return; }
    } catch {}
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError('Incorrect PIN. Try again.');
    shake();
    setTimeout(() => setPin(''), 500);
  };

  const roleConfig = selectedStaff ? (ROLE_CONFIG[selectedStaff.role] || ROLE_CONFIG.staff) : null;

  if (step === 'select') {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#060E06" />
        <LinearGradient
          colors={['#0A1A0A', '#060E06', '#060E06']}
          style={StyleSheet.absoluteFill} />
        <Animated.View style={[s.selectContainer, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
        }]}>
          <View style={s.brandHeader}>
            <View style={s.brandLogoBox}>
              <LinearGradient
                colors={['#0D1A0D', '#1A2E1A']}
                style={s.brandLogo}>
                <Text style={s.brandLogoText}>RAS</Text>
                <View style={s.brandLogoDot} />
              </LinearGradient>
            </View>
            <Text style={s.brandName}>New Rahul Auto Spares</Text>
            <Text style={s.brandTagline}>STAFF PORTAL</Text>
          </View>

          <View style={s.selectSection}>
            <Text style={s.selectTitle}>SELECT YOUR PROFILE</Text>
            {loadingStaff ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading staff...</Text>
            </View>
          ) : null}
          <View style={s.staffGrid}>
              {staffList.map(member => {
                const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.staff;
                return (
                  <TouchableOpacity key={member.id}
                    style={s.staffCard}
                    onPress={() => handleSelectStaff(member)}
                    activeOpacity={0.75}>
                    <LinearGradient
                      colors={['#0D1A0D', '#060E06']}
                      style={s.staffCardGrad}>
                      <View style={[s.staffCardBar, { backgroundColor: member.color }]} />
                      <View style={[s.staffCardAvatar, { borderColor: member.color + '50' }]}>
                        <Text style={[s.staffCardInitials, { color: member.color }]}>
                          {member.initials}
                        </Text>
                      </View>
                      <Text style={s.staffCardName}>{member.name}</Text>
                      <View style={[s.staffRoleBadge, { backgroundColor: member.color + '15' }]}>
                        <Ionicons name={rc.icon} size={10} color={member.color} />
                        <Text style={[s.staffRoleText, { color: member.color }]}>
                          {rc.label}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={s.footerText}>
            New Rahul Auto Spares · Nandyal · Staff Only
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />
      <LinearGradient colors={['#0A1A0A', '#060E06']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[s.pinContainer, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <TouchableOpacity style={s.backBtn}
          onPress={() => {
            fadeAnim.setValue(0);
            slideAnim.setValue(40);
            scaleAnim.setValue(0.95);
            setStep('select');
            setPin('');
            setError('');
          }}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.5)" />
          <Text style={s.backBtnText}>Change</Text>
        </TouchableOpacity>

        <View style={s.selectedStaffCard}>
          <LinearGradient
            colors={[selectedStaff.color + '20', selectedStaff.color + '08']}
            style={s.selectedStaffGrad}>
            <View style={[s.selectedAvatar, { borderColor: selectedStaff.color + '60' }]}>
              <Text style={[s.selectedInitials, { color: selectedStaff.color }]}>
                {selectedStaff.initials}
              </Text>
            </View>
            <View>
              <Text style={s.selectedName}>{selectedStaff.name}</Text>
              <View style={s.selectedRoleRow}>
                <Ionicons name={roleConfig.icon} size={12} color={roleConfig.color} />
                <Text style={[s.selectedRole, { color: roleConfig.color }]}>
                  {roleConfig.label}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <Text style={s.pinTitle}>Enter PIN</Text>
        <Text style={s.pinSubtitle}>Your 4-digit security PIN</Text>

        <Animated.View style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {[0,1,2,3].map(i => (
            <Animated.View key={i}
              style={[
                s.dot,
                i < pin.length && { backgroundColor: selectedStaff.color, borderColor: selectedStaff.color },
                { transform: [{ scale: dotAnims[i] }] }
              ]} />
          ))}
        </Animated.View>

        {error
          ? <Text style={s.errorText}>{error}</Text>
          : <Text style={s.hintText}>Enter your secure PIN to continue</Text>
        }

        <View style={s.keypad}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={s.keyRow}>
              {row.map((key, ki) => (
                <TouchableOpacity key={ki}
                  style={[
                    s.keyBtn,
                    key === '' && s.keyBtnEmpty,
                    key === '⌫' && s.keyBtnDelete,
                  ]}
                  onPress={() => {
                    if (key === '⌫') handleDelete();
                    else if (key) handleKey(key);
                  }}
                  disabled={key === ''}
                  activeOpacity={0.7}>
                  {key === '⌫' ? (
                    <Ionicons name="backspace-outline" size={22} color="#EF4444" />
                  ) : key ? (
                    <Text style={s.keyBtnText}>{key}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <Text style={s.footerText}>New Rahul Auto Spares · Staff Only</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  selectContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  brandHeader: { alignItems: 'center', paddingVertical: 24 },
  brandLogoBox: { marginBottom: 14 },
  brandLogo: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.3)',
    position: 'relative',
  },
  brandLogoText: { fontSize: 22, fontWeight: '900', color: '#22C55E', letterSpacing: 2 },
  brandLogoDot: {
    position: 'absolute', bottom: 10, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E',
  },
  brandName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  brandTagline: {
    fontSize: 10, color: 'rgba(34,197,94,0.6)',
    letterSpacing: 4, fontWeight: '700',
  },
  selectSection: { flex: 1 },
  selectTitle: {
    fontSize: 10, color: 'rgba(255,255,255,0.3)',
    letterSpacing: 3, fontWeight: '700', marginBottom: 16,
  },
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  staffCard: { width: '48%', borderRadius: 16, overflow: 'hidden' },
  staffCardGrad: {
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
    paddingBottom: 16, paddingHorizontal: 14, paddingTop: 0,
    alignItems: 'center',
  },
  staffCardBar: { height: 3, width: '100%', marginBottom: 16 },
  staffCardAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: 10,
  },
  staffCardInitials: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  staffCardName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' },
  staffRoleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  staffRoleText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  pinContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  backBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  selectedStaffCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 32, width: '75%' },
  selectedStaffGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectedAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  selectedInitials: { fontSize: 18, fontWeight: '900' },
  selectedName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  selectedRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectedRole: { fontSize: 12, fontWeight: '600' },
  pinTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  pinSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 28 },
  dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '700', marginBottom: 24 },
  hintText: { fontSize: 12, color: 'rgba(255,255,255,0.2)', marginBottom: 24 },
  keypad: { width: '100%', gap: 12, marginBottom: 28 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  keyBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#0D1A0D', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.12)',
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  keyBtnDelete: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderColor: 'rgba(239,68,68,0.15)',
  },
  keyBtnEmpty: {
    backgroundColor: 'transparent', borderColor: 'transparent',
    shadowOpacity: 0,
  },
  keyBtnText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  footerText: {
    fontSize: 11, color: 'rgba(255,255,255,0.12)',
    textAlign: 'center', letterSpacing: 0.5,
  },
});

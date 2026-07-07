import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView,
  Alert, RefreshControl, Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const G = '#22C55E';

const STAFF_LIST = [
  { id: 1, name: 'Abdul Azeez Basheer', role: 'owner',  phone: '9642536653', salary: 0 },
  { id: 2, name: 'Chand Basha',         role: 'senior', phone: '9704098753', salary: 15000 },
  { id: 3, name: 'Mabasha',             role: 'staff',  phone: '8919480500', salary: 12000 },
  { id: 4, name: 'Hussain Basha',       role: 'staff',  phone: '7680861966', salary: 12000 },
  { id: 5, name: 'Khaja',               role: 'staff',  phone: '6301919019', salary: 12000 },
];

// ✅ BUG FIX: Match by phone → name → id (in priority order)
function findMyEntry(loggedIn) {
  if (!loggedIn) return null;
  if (loggedIn.phone) {
    const m = STAFF_LIST.find(s => s.phone === loggedIn.phone);
    if (m) return m;
  }
  if (loggedIn.name) {
    const m = STAFF_LIST.find(s =>
      s.name.toLowerCase() === loggedIn.name.toLowerCase()
    );
    if (m) return m;
  }
  if (loggedIn.id) {
    const m = STAFF_LIST.find(s => s.id === loggedIn.id);
    if (m) return m;
  }
  return null;
}

// ── CLOCK CARD COMPONENT ──
function ClockCard({ member, record, isMe, canClock, onClock }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isClockedIn = record?.clockIn && !record?.clockOut;

  useEffect(() => {
    if (isClockedIn && canClock) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else { pulseAnim.setValue(1); }
  }, [isClockedIn, canClock]);

  const getHoursWorked = () => {
    if (!record?.clockIn) return '0h 0m';
    const start = new Date(record.clockIn);
    const end   = record.clockOut ? new Date(record.clockOut) : new Date();
    const diff  = Math.floor((end - start) / 60000);
    return `${Math.floor(diff/60)}h ${diff % 60}m`;
  };

  return (
    <Animated.View style={[
      cc.card,
      isClockedIn && cc.cardActive,
      isMe && cc.cardMe,
      { transform: [{ scale: canClock && isClockedIn ? pulseAnim : 1 }] }
    ]}>
      <View style={cc.left}>
        <View style={[cc.avatar, isClockedIn && { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
          <Text style={cc.avatarText}>
            {member.role === 'owner' ? '👑' : member.role === 'senior' ? '⭐' : '👷'}
          </Text>
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={cc.name}>{member.name.split(' ')[0]}</Text>
            {isMe && (
              <View style={cc.youBadge}>
                <Text style={cc.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={cc.role}>{member.role.toUpperCase()}</Text>

          {/* Only show clock details if canClock (owner view or self) */}
          {canClock && record?.clockIn && (
            <Text style={cc.time}>
              In: {new Date(record.clockIn).toLocaleTimeString('en', {
                hour: '2-digit', minute: '2-digit'
              })}
              {record.clockOut
                ? ` · Out: ${new Date(record.clockOut).toLocaleTimeString('en', {
                    hour: '2-digit', minute: '2-digit'
                  })}`
                : ''}
            </Text>
          )}
          {canClock && isClockedIn && (
            <Text style={cc.worked}>⏱️ {getHoursWorked()}</Text>
          )}
        </View>
      </View>

      {canClock ? (
        // ✅ Owner/Senior OR own card → show clock button
        <TouchableOpacity
          style={[cc.clockBtn, isClockedIn ? cc.clockBtnOut : cc.clockBtnIn]}
          onPress={() => onClock(member.id, isClockedIn)}>
          <Text style={cc.clockBtnIcon}>{isClockedIn ? '⏹' : '▶'}</Text>
          <Text style={[cc.clockBtnText, { color: isClockedIn ? '#EF4444' : G }]}>
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </Text>
        </TouchableOpacity>
      ) : (
        // ✅ Other staff → show status only (no details, no button)
        <View style={[cc.statusOnly,
          { backgroundColor: isClockedIn
            ? 'rgba(34,197,94,0.1)'
            : 'rgba(255,255,255,0.04)' }]}>
          <View style={[cc.statusDot,
            { backgroundColor: isClockedIn ? G : 'rgba(255,255,255,0.2)' }]} />
          <Text style={[cc.statusText,
            { color: isClockedIn ? G : 'rgba(255,255,255,0.35)' }]}>
            {isClockedIn ? 'On Shift' : 'Off'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const cc = StyleSheet.create({
  card: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  cardActive: {
    borderColor: 'rgba(34,197,94,0.5)',
    shadowColor: G, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  cardMe: { borderColor: 'rgba(79,110,247,0.4)' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#0D1A0D',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  avatarText: { fontSize: 22 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  youBadge: {
    backgroundColor: 'rgba(79,110,247,0.15)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1,
    borderColor: 'rgba(79,110,247,0.3)',
  },
  youBadgeText: { color: '#4F6EF7', fontSize: 9, fontWeight: 'bold' },
  role: { fontSize: 9, color: G, letterSpacing: 1, marginBottom: 2 },
  time: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  worked: { fontSize: 11, color: G, fontWeight: 'bold' },
  clockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
  },
  clockBtnIn:  { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  clockBtnOut: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  clockBtnIcon: { fontSize: 16 },
  clockBtnText: { fontWeight: 'bold', fontSize: 13 },
  statusOnly: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
});

// ── MAIN SCREEN ──
// ✅ Prop name: `staff` (matches MainStore.js call)
export default function AttendanceScreen({ onBack, staff }) {
  const [tab, setTab]             = useState('today');
  const [todayRecords, setTodayRecords] = useState({});
  const [monthlyData, setMonthlyData]   = useState({});
  const [refreshing, setRefreshing]     = useState(false);
  const [currentTime, setCurrentTime]   = useState(new Date());

  const today    = new Date().toISOString().split('T')[0];
  const monthKey = today.slice(0, 7);

  // ✅ Find the STAFF_LIST entry for the logged-in staff
  const myEntry    = findMyEntry(staff);
  const myId       = myEntry?.id;
  const isOwner    = staff?.role === 'owner';
  const isSenior   = staff?.role === 'senior';
  const isPrivileged = isOwner; // only owner can see all
  const canClockOthers = isOwner; // only owner can clock others in/out

  useEffect(() => {
    loadAttendance();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = async () => {
    try {
      const saved = await AsyncStorage.getItem(`attendance_${today}`);
      if (saved) setTodayRecords(JSON.parse(saved));
      const monthly = await AsyncStorage.getItem(`attendance_month_${monthKey}`);
      if (monthly) setMonthlyData(JSON.parse(monthly));
    } catch {}
  };

  const saveToday = async (records) => {
    setTodayRecords(records);
    await AsyncStorage.setItem(`attendance_${today}`, JSON.stringify(records));
  };

  const handleClock = async (staffId, isClockedIn) => {
    // ✅ PRIVACY: Non-owner staff can only clock themselves
    if (!isPrivileged && staffId !== myId) {
      Alert.alert('🔒 Not Allowed', 'You can only clock yourself in/out.');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date().toISOString();
    const updated = { ...todayRecords };
    const memberName = STAFF_LIST.find(s => s.id === staffId)?.name.split(' ')[0] || 'Staff';

    if (isClockedIn) {
      updated[staffId] = { ...updated[staffId], clockOut: now };

      const start = new Date(updated[staffId].clockIn);
      const end   = new Date(now);
      const hours = (end - start) / 3600000;

      const monthly = { ...monthlyData };
      if (!monthly[staffId]) monthly[staffId] = {};
      monthly[staffId][today] = {
        clockIn: updated[staffId].clockIn,
        clockOut: now,
        hours: parseFloat(hours.toFixed(2)),
      };
      setMonthlyData(monthly);
      await AsyncStorage.setItem(`attendance_month_${monthKey}`, JSON.stringify(monthly));

      Alert.alert('✅ Clocked Out!',
        `${memberName} — ${hours.toFixed(1)} hours worked today`
      );
    } else {
      updated[staffId] = { clockIn: now, clockOut: null };
      Alert.alert('✅ Clocked In!', `${memberName} is now on shift`);
    }

    await saveToday(updated);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  };

  const getMonthlyStats = (staffId) => {
    const data        = monthlyData[staffId] || {};
    const days        = Object.keys(data).length;
    const totalHours  = Object.values(data).reduce((s, d) => s + (d.hours || 0), 0);
    const workingDays = 26;
    const attendance  = days > 0 ? ((days / workingDays) * 100).toFixed(0) : 0;
    const member      = STAFF_LIST.find(s => s.id === staffId);
    const salary      = member?.salary || 0;
    const earned      = salary > 0 ? ((days / workingDays) * salary).toFixed(0) : 0;
    return { days, totalHours: totalHours.toFixed(1), attendance, earned };
  };

  const presentToday = Object.keys(todayRecords).filter(k => todayRecords[k]?.clockIn).length;
  const clockedIn    = Object.values(todayRecords).filter(r => r?.clockIn && !r?.clockOut).length;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>📱 Staff Attendance</Text>
          <Text style={s.headerSub}>
            {currentTime.toLocaleTimeString('en', {
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })} · {new Date().toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </Text>
        </View>
      </View>

      {/* STATS */}
      <View style={s.statsRow}>
        <View style={[s.statBox, { borderColor: 'rgba(34,197,94,0.3)' }]}>
          <Text style={[s.statVal, { color: G }]}>{presentToday}</Text>
          <Text style={s.statLabel}>Present</Text>
        </View>
        <View style={[s.statBox, { borderColor: 'rgba(239,68,68,0.3)' }]}>
          <Text style={[s.statVal, { color: '#EF4444' }]}>{STAFF_LIST.length - presentToday}</Text>
          <Text style={s.statLabel}>Absent</Text>
        </View>
        <View style={[s.statBox, { borderColor: 'rgba(255,193,7,0.3)' }]}>
          <Text style={[s.statVal, { color: '#FFC107' }]}>{clockedIn}</Text>
          <Text style={s.statLabel}>On Shift</Text>
        </View>
        <View style={[s.statBox, { borderColor: 'rgba(79,110,247,0.3)' }]}>
          <Text style={[s.statVal, { color: '#4F6EF7' }]}>{STAFF_LIST.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
      </View>

      {/* TABS */}
      <View style={s.tabRow}>
        {[
          { id: 'today',   label: 'Today' },
          { id: 'monthly', label: 'Monthly' },
          { id: 'salary',  label: '💰 Salary' },
        ].map(t => (
          <TouchableOpacity key={t.id}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
            onPress={() => setTab(t.id)}>
            <Text style={[s.tabBtnText, tab === t.id && s.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />
        }>

        {/* ── TODAY TAB ── */}
        {tab === 'today' && (
          <>
            {/* Privacy banner for non-privileged staff */}
            {!isPrivileged && (
              <View style={s.privacyBanner}>
                <Text style={s.privacyText}>
                  🔒 You can only clock yourself in/out. Colleagues show On/Off status only.
                </Text>
              </View>
            )}

            <Text style={s.sectionLabel}>
              {isPrivileged ? 'All Staff — Clock In / Out' : 'Your Clock + Team Status'}
            </Text>

            {STAFF_LIST.map(member => {
              const isMe = member.id === myId;
              // canClock = owner/senior can clock anyone; staff can only clock self
              const canClock = isPrivileged || isMe;
              return (
                <ClockCard
                  key={member.id}
                  member={member}
                  record={todayRecords[member.id]}
                  isMe={isMe}
                  canClock={canClock}
                  onClock={handleClock}
                />
              );
            })}
          </>
        )}

        {/* ── MONTHLY TAB ── */}
        {tab === 'monthly' && (
          <>
            <Text style={s.sectionLabel}>
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Report
            </Text>

            {STAFF_LIST.map(member => {
              const isMe  = member.id === myId;
              // ✅ PRIVACY: Non-privileged staff only see their own report
              if (!isPrivileged && !isMe) return null;

              const stats = getMonthlyStats(member.id);
              return (
                <View key={member.id} style={s.monthlyCard}>
                  <View style={s.monthlyTop}>
                    <View style={s.monthlyAvatar}>
                      <Text style={{ fontSize: 20 }}>
                        {member.role === 'owner' ? '👑' : member.role === 'senior' ? '⭐' : '👷'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.monthlyName}>{member.name}</Text>
                        {isMe && <Text style={s.youLabel}>You</Text>}
                      </View>
                      <Text style={s.monthlyRole}>{member.role.toUpperCase()}</Text>
                    </View>
                    <View style={[s.attBadge, {
                      backgroundColor: parseInt(stats.attendance) >= 90
                        ? 'rgba(34,197,94,0.15)' : parseInt(stats.attendance) >= 75
                        ? 'rgba(255,193,7,0.15)' : 'rgba(239,68,68,0.15)',
                    }]}>
                      <Text style={[s.attPct, {
                        color: parseInt(stats.attendance) >= 90 ? G
                          : parseInt(stats.attendance) >= 75 ? '#FFC107' : '#EF4444'
                      }]}>
                        {stats.attendance}%
                      </Text>
                    </View>
                  </View>

                  <View style={s.monthlyStatsRow}>
                    <View style={s.monthlyStatItem}>
                      <Text style={s.monthlyStatVal}>{stats.days}</Text>
                      <Text style={s.monthlyStatLabel}>Days</Text>
                    </View>
                    <View style={s.monthlyStatItem}>
                      <Text style={s.monthlyStatVal}>{stats.totalHours}h</Text>
                      <Text style={s.monthlyStatLabel}>Hours</Text>
                    </View>
                    <View style={s.monthlyStatItem}>
                      <Text style={[s.monthlyStatVal, { color: '#FFC107' }]}>
                        {stats.attendance}%
                      </Text>
                      <Text style={s.monthlyStatLabel}>Attendance</Text>
                    </View>
                    {/* ✅ PRIVACY: Salary shown to owner or self only */}
                    {(isPrivileged || isMe) && member.salary > 0 && (
                      <View style={s.monthlyStatItem}>
                        <Text style={[s.monthlyStatVal, { color: G }]}>
                          ₹{(parseInt(stats.earned)/1000).toFixed(1)}k
                        </Text>
                        <Text style={s.monthlyStatLabel}>Earned</Text>
                      </View>
                    )}
                  </View>

                  <View style={s.attBarBg}>
                    <View style={[s.attBarFill, {
                      width: `${Math.min(100, parseInt(stats.attendance))}%`,
                      backgroundColor: parseInt(stats.attendance) >= 90 ? G
                        : parseInt(stats.attendance) >= 75 ? '#FFC107' : '#EF4444'
                    }]} />
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── SALARY TAB ── */}
        {tab === 'salary' && (
          <>
            <Text style={s.sectionLabel}>
              💰 Salary — {new Date().toLocaleDateString('en-IN', { month: 'long' })}
            </Text>

            {/* ✅ PRIVACY: Non-privileged staff only see their own salary */}
            {!isPrivileged && (
              <View style={s.privacyBanner}>
                <Text style={s.privacyText}>
                  🔒 Your salary information is private. Only you can see this.
                </Text>
              </View>
            )}

            {STAFF_LIST.filter(m => m.salary > 0).map(member => {
              const isMe = member.id === myId;
              if (!isPrivileged && !isMe) return null;

              const stats       = getMonthlyStats(member.id);
              const workingDays = 26;
              const perDay      = (member.salary / workingDays).toFixed(0);
              const earned      = parseInt(stats.earned);
              const deduction   = member.salary - earned;

              return (
                <View key={member.id} style={s.salaryCard}>
                  <View style={s.salaryTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.salaryName}>{member.name}</Text>
                        {isMe && <Text style={s.youLabel}>You</Text>}
                      </View>
                      <Text style={s.salaryRole}>{member.role}</Text>
                    </View>
                    <View style={s.salaryBadge}>
                      <Text style={s.salaryBadgeText}>{stats.days}/{workingDays} days</Text>
                    </View>
                  </View>

                  <View style={s.salaryGrid}>
                    {[
                      { label: 'Monthly',    value: `₹${(member.salary/1000).toFixed(0)}k`, color: '#fff' },
                      { label: 'Per Day',    value: `₹${perDay}`,                           color: '#4F6EF7' },
                      { label: 'Days Worked',value: `${stats.days}`,                        color: G },
                      { label: 'Earned',     value: `₹${(earned/1000).toFixed(1)}k`,        color: '#FFC107' },
                      { label: 'Deduction',  value: deduction > 0 ? `-₹${(deduction/1000).toFixed(1)}k` : '₹0', color: deduction > 0 ? '#EF4444' : G },
                      { label: 'To Pay',     value: `₹${(earned/1000).toFixed(1)}k`,        color: G },
                    ].map((item, i) => (
                      <View key={i} style={s.salaryItem}>
                        <Text style={s.salaryItemLabel}>{item.label}</Text>
                        <Text style={[s.salaryItemVal, { color: item.color }]}>{item.value}</Text>
                      </View>
                    ))}
                  </View>

                  {/* ✅ PRIVACY: Pay button ONLY for owner/senior */}
                  {isPrivileged && (
                    <TouchableOpacity style={s.payBtn}
                      onPress={() => {
                        Alert.alert(
                          '💰 Pay Salary',
                          `Pay ₹${earned.toFixed(0)} to ${member.name}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: '✅ Mark Paid', onPress: async () => {
                              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              Alert.alert('✅ Salary Marked as Paid!');
                            }}
                          ]
                        );
                      }}>
                      <Text style={s.payBtnText}>💰 Pay ₹{earned.toFixed(0)}</Text>
                    </TouchableOpacity>
                  )}

                  {/* For non-privileged staff: show their own salary but no pay button */}
                  {!isPrivileged && isMe && (
                    <View style={s.noPayNote}>
                      <Text style={s.noPayNoteText}>
                        Contact owner/senior to process payment
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  header: {
    backgroundColor: '#0D1A0D', paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.15)',
  },
  backBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  backBtnText: { color: G, fontSize: 14, fontWeight: 'bold' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statBox: {
    flex: 1, backgroundColor: '#0D1A0D', borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1,
  },
  statVal: { fontSize: 22, fontWeight: 'bold', color: G, marginBottom: 2 },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.15)' },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: G },
  tabBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  tabBtnTextActive: { color: G },
  privacyBanner: {
    backgroundColor: 'rgba(79,110,247,0.08)', borderRadius: 10, padding: 10,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(79,110,247,0.15)',
  },
  privacyText: { color: 'rgba(79,110,247,0.7)', fontSize: 12, textAlign: 'center' },
  sectionLabel: {
    fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.4)',
    marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase',
  },
  youLabel: {
    fontSize: 9, color: '#4F6EF7', fontWeight: 'bold',
    backgroundColor: 'rgba(79,110,247,0.1)', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4,
  },
  monthlyCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', gap: 10,
  },
  monthlyTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthlyAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  monthlyName: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  monthlyRole: { fontSize: 9, color: G, letterSpacing: 1 },
  attBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  attPct: { fontSize: 16, fontWeight: 'bold' },
  monthlyStatsRow: { flexDirection: 'row' },
  monthlyStatItem: { flex: 1, alignItems: 'center' },
  monthlyStatVal: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  monthlyStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
  attBarBg: { height: 4, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 2, overflow: 'hidden' },
  attBarFill: { height: '100%', borderRadius: 2 },
  salaryCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)', gap: 12,
  },
  salaryTop: { flexDirection: 'row', alignItems: 'center' },
  salaryName: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  salaryRole: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  salaryBadge: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  salaryBadgeText: { color: G, fontSize: 12, fontWeight: 'bold' },
  salaryGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: 'rgba(34,197,94,0.04)', borderRadius: 10, padding: 10, gap: 2,
  },
  salaryItem: { width: '33.33%', padding: 8, alignItems: 'center' },
  salaryItemLabel: {
    fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
    marginBottom: 4, textAlign: 'center',
  },
  salaryItemVal: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  payBtn: { backgroundColor: '#FFC107', borderRadius: 12, padding: 12, alignItems: 'center' },
  payBtnText: { color: '#06060E', fontWeight: 'bold', fontSize: 14 },
  noPayNote: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 10, alignItems: 'center',
  },
  noPayNoteText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});
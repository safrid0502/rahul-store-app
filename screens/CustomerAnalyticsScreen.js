import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView,
  Animated, RefreshControl, Linking
} from 'react-native';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const G = '#22C55E';

function AnimatedNumber({ value, color = '#fff', size = 24 }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value, duration: 1500, useNativeDriver: false
    }).start();
    anim.addListener(({ value: v }) => setDisplay(Math.floor(v)));
    return () => anim.removeAllListeners();
  }, [value]);

  return (
    <Text style={{ fontSize: size, fontWeight: 'bold', color }}>
      {display.toLocaleString('en-IN')}
    </Text>
  );
}

function CustomerCard({ customer, rank, type }) {
  const medals = ['🥇', '🥈', '🥉'];
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.spring(anim, {
        toValue: 1, tension: 50, friction: 7, useNativeDriver: true
      }).start();
    }, rank * 100);
  }, []);

  return (
    <Animated.View style={[styles.customerCard,
      { transform: [{ scale: anim }], opacity: anim }]}>
      <Text style={styles.medal}>
        {rank < 3 ? medals[rank] : `#${rank + 1}`}
      </Text>
      <View style={styles.customerAvatar}>
        <Text style={styles.avatarText}>
          {customer.name?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.customerName} numberOfLines={1}>
          {customer.name}
        </Text>
        <Text style={styles.customerPhone}>{customer.phone}</Text>
      </View>
      <View style={styles.customerStats}>
        {type === 'spender' ? (
          <>
            <Text style={[styles.statBig, { color: '#FFC107' }]}>
              ₹{customer.total_spent >= 1000
                ? (customer.total_spent / 1000).toFixed(1) + 'k'
                : customer.total_spent.toFixed(0)}
            </Text>
            <Text style={styles.statSmall}>
              {customer.order_count} orders
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.statBig, { color: G }]}>
              {customer.order_count}
            </Text>
            <Text style={styles.statSmall}>
              ₹{customer.total_spent >= 1000
                ? (customer.total_spent / 1000).toFixed(1) + 'k'
                : customer.total_spent.toFixed(0)}
            </Text>
          </>
        )}
      </View>
      <TouchableOpacity
        style={styles.waBtn}
        onPress={() => Linking.openURL(
          `https://wa.me/91${customer.phone}`
        )}
      >
        <Text>💬</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CustomerAnalyticsScreen({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeList, setActiveList] = useState('spender');

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const r = await fetch(`${API_URL}/customers/analytics`);
      const d = await r.json();
      setData(d);
    } catch {}
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const monthly = data?.monthly || {};
  const topList = activeList === 'spender'
    ? (data?.top_spenders || [])
    : (data?.top_orderers || []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Customer Analytics</Text>
        <View style={{ width: 70 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing} onRefresh={onRefresh} tintColor={G}
            />
          }
        >
          <Text style={styles.sectionTitle}>📅 This Month</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: 'rgba(255,193,7,0.3)' }]}>
              <Text style={styles.statIcon}>💰</Text>
              <AnimatedNumber value={monthly.total_revenue||0} color="#FFC107" size={20} />
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={[styles.statCard, { borderColor: 'rgba(34,197,94,0.3)' }]}>
              <Text style={styles.statIcon}>📦</Text>
              <AnimatedNumber value={monthly.total_orders||0} color={G} size={20} />
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={[styles.statCard, { borderColor: 'rgba(79,110,247,0.3)' }]}>
              <Text style={styles.statIcon}>👥</Text>
              <AnimatedNumber value={monthly.unique_customers||0} color="#4F6EF7" size={20} />
              <Text style={styles.statLabel}>Customers</Text>
            </View>
            <View style={[styles.statCard, { borderColor: 'rgba(167,139,250,0.3)' }]}>
              <Text style={styles.statIcon}>🆕</Text>
              <AnimatedNumber value={data?.new_customers||0} color="#A78BFA" size={20} />
              <Text style={styles.statLabel}>New</Text>
            </View>
          </View>

          <View style={styles.avgCard}>
            <Text style={styles.avgLabel}>Avg Order Value This Month</Text>
            <Text style={styles.avgValue}>
              ₹{monthly.total_orders > 0
                ? Math.round(monthly.total_revenue/monthly.total_orders)
                    .toLocaleString('en-IN')
                : '0'}
            </Text>
            <Text style={styles.avgSub}>Per order average</Text>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>🏆 Top Customers</Text>
            <View style={styles.listToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn,
                  activeList==='spender' && styles.toggleBtnActive]}
                onPress={() => setActiveList('spender')}
              >
                <Text style={[styles.toggleBtnText,
                  activeList==='spender' && { color: '#FFC107' }]}>
                  💰 Spenders
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn,
                  activeList==='orderer' && styles.toggleBtnActive]}
                onPress={() => setActiveList('orderer')}
              >
                <Text style={[styles.toggleBtnText,
                  activeList==='orderer' && { color: G }]}>
                  📦 Orders
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {topList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>👥</Text>
              <Text style={styles.emptyText}>No customer data yet!</Text>
            </View>
          ) : (
            topList.map((customer, i) => (
              <CustomerCard
                key={i} customer={customer}
                rank={i} type={activeList}
              />
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  header: {
    backgroundColor: '#0D1A0D', paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.15)',
  },
  backBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  backBtnText: { color: G, fontSize: 14, fontWeight: 'bold' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#fff' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.4)' },
  sectionTitle: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 2,
    marginBottom: 12, textTransform: 'uppercase',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: {
    width: '47%', backgroundColor: '#0D1A0D', borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 1,
  },
  statIcon: { fontSize: 24 },
  statLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  avgCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 20, alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  avgLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  avgValue: { fontSize: 36, fontWeight: 'bold', color: G, marginBottom: 4 },
  avgSub: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  listToggle: { flexDirection: 'row', gap: 6 },
  toggleBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  toggleBtnActive: { backgroundColor: 'rgba(34,197,94,0.1)' },
  toggleBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
  customerCard: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.12)',
  },
  medal: { fontSize: 22, width: 30 },
  customerAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  avatarText: { color: G, fontSize: 16, fontWeight: 'bold' },
  customerName: { fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  customerPhone: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  customerStats: { alignItems: 'flex-end' },
  statBig: { fontSize: 16, fontWeight: 'bold' },
  statSmall: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  waBtn: {
    backgroundColor: 'rgba(37,211,102,0.1)', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: 'rgba(37,211,102,0.2)',
  },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 15 },
});
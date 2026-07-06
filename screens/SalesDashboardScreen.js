import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView,
  Animated, RefreshControl, Dimensions
} from 'react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const G = '#22C55E';
const HOURS = ['6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21'];

function AnimatedBar({ value, maxValue, color, delay = 0, horizontal = false }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: maxValue > 0 ? value / maxValue : 0,
      duration: 700, delay, useNativeDriver: false,
    }).start();
  }, [value, maxValue]);
  if (horizontal) {
    const w = anim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] });
    return <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: color }, { width: w }]} />;
  }
  const h = anim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] });
  return <Animated.View style={[{ width: '100%', borderRadius: 4, minHeight: 2, backgroundColor: color }, { height: h }]} />;
}

function RevenueCard({ label, value, sublabel, icon, color }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[rc.card, { borderColor: color + '30', transform: [{ scale: scaleAnim }] }]}>
      <View style={[rc.iconBox, { backgroundColor: color + '15' }]}>
        <Text style={rc.icon}>{icon}</Text>
      </View>
      <Text style={[rc.value, { color }]}>{value}</Text>
      <Text style={rc.label}>{label}</Text>
      {sublabel && <Text style={rc.sublabel}>{sublabel}</Text>}
    </Animated.View>
  );
}
const rc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#0D1A0D', borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 4, borderWidth: 1,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  icon: { fontSize: 22 },
  value: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  sublabel: { fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },
});

export default function SalesDashboardScreen({ onBack }) {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [apiStatus, setApiStatus] = useState({ summary: false, orders: false, bestsellers: false });

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setLiveTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [period]);

  // ✅ BUG FIX: Each API call is independent — one failure won't block others
  const fetchData = async () => {
    const status = { summary: false, orders: false, bestsellers: false };

    // Fetch summary (may not exist)
    try {
      const r = await fetch(`${API_URL}/reports/summary?period=${period}`);
      if (r.ok) {
        const d = await r.json();
        if (d && typeof d === 'object') {
          setSummary(d);
          status.summary = true;
        }
      }
    } catch {}

    // Fetch all orders (this definitely exists)
    try {
      const r = await fetch(`${API_URL}/orders`);
      if (r.ok) {
        const d = await r.json();
        setOrders(d.orders || []);
        status.orders = true;
      }
    } catch {}

    // Fetch bestsellers (may not exist)
    try {
      const r = await fetch(`${API_URL}/reports/bestsellers`);
      if (r.ok) {
        const d = await r.json();
        setBestsellers(d.bestsellers || []);
        status.bestsellers = true;
      }
    } catch {}

    setApiStatus(status);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ── DERIVE METRICS FROM ORDERS WHEN SUMMARY API IS DOWN ──
  const now = new Date();

  const todayOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    return d.toDateString() === now.toDateString();
  });

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekOrders = orders.filter(o => new Date(o.created_at) >= weekStart);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthOrders = orders.filter(o => new Date(o.created_at) >= monthStart);

  const getPeriodOrders = () => {
    if (period === 'daily')   return todayOrders;
    if (period === 'weekly')  return weekOrders;
    if (period === 'monthly') return monthOrders;
    return todayOrders;
  };

  const periodOrders = getPeriodOrders();
  const collectedPeriod = periodOrders.filter(o => o.status === 'collected');

  // Use summary if available, otherwise derive from orders
  const todayRevenue = summary?.total_revenue
    ?? collectedPeriod.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const todayOrderCount = summary?.total_orders ?? collectedPeriod.length;
  const cashRevenue    = summary?.payment_breakdown?.cash
    ?? collectedPeriod.filter(o => o.payment_type === 'cash').reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const upiRevenue     = summary?.payment_breakdown?.upi
    ?? collectedPeriod.filter(o => o.payment_type === 'upi').reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const pendingRevenue = summary?.payment_breakdown?.pending
    ?? periodOrders.filter(o => o.payment_type === 'pending').reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  // Orders by hour (today)
  const ordersByHour = HOURS.reduce((acc, h) => { acc[h] = 0; return acc; }, {});
  todayOrders.forEach(o => {
    const h = new Date(o.created_at).getHours().toString();
    if (ordersByHour.hasOwnProperty(h)) ordersByHour[h]++;
  });
  const maxHourOrders = Math.max(...Object.values(ordersByHour), 1);
  const peakHour = Object.entries(ordersByHour).reduce(
    (max, [h, c]) => c > max.count ? { hour: h, count: c } : max,
    { hour: '-', count: 0 }
  );

  // 7-day revenue trend
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      date: d.toDateString(), revenue: 0, orderCount: 0,
    };
  });
  orders.filter(o => o.status === 'collected').forEach(o => {
    const day = last7Days.find(d => new Date(o.created_at).toDateString() === d.date);
    if (day) {
      day.revenue += parseFloat(o.total_amount || 0);
      day.orderCount++;
    }
  });
  const maxRevenue = Math.max(...last7Days.map(d => d.revenue), 1);

  // Status counts
  const statusCounts = {
    new:       orders.filter(o => o.status === 'new').length,
    packing:   orders.filter(o => o.status === 'packing').length,
    ready:     orders.filter(o => o.status === 'ready').length,
    collected: orders.filter(o => o.status === 'collected').length,
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>📊 Sales Dashboard</Text>
          <Text style={s.headerSub}>
            {liveTime.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} · Live
          </Text>
        </View>
        <View style={s.liveDot} />
      </View>

      {/* PERIOD */}
      <View style={s.periodRow}>
        {[
          { id: 'daily', label: 'Today' },
          { id: 'weekly', label: 'Week' },
          { id: 'monthly', label: 'Month' },
        ].map(p => (
          <TouchableOpacity key={p.id}
            style={[s.periodBtn, period === p.id && s.periodBtnActive]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPeriod(p.id);
            }}>
            <Text style={[s.periodBtnText, period === p.id && { color: '#fff' }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centerBox}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>📊</Text>
          <Text style={s.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />
          }>

          {/* API STATUS NOTICE */}
          {!apiStatus.summary && (
            <View style={s.noticeBanner}>
              <Text style={s.noticeText}>
                ℹ️ Using order data directly · Summary API not connected yet
              </Text>
            </View>
          )}

          {/* REVENUE HERO */}
          <View style={s.heroCard}>
            <Text style={s.heroLabel}>
              {period === 'daily' ? "TODAY'S REVENUE"
                : period === 'weekly' ? 'THIS WEEK'
                : 'THIS MONTH'}
            </Text>
            <Text style={s.heroValue}>
              ₹{todayRevenue >= 1000
                ? (todayRevenue/1000).toFixed(1)+'k'
                : todayRevenue.toFixed(0)}
            </Text>
            <View style={s.heroSubRow}>
              <Text style={s.heroSub}>{todayOrderCount} orders</Text>
              <Text style={s.heroDot}>·</Text>
              <Text style={s.heroSub}>
                Avg ₹{todayOrderCount > 0 ? (todayRevenue/todayOrderCount).toFixed(0) : 0}
              </Text>
            </View>
            {/* GOAL PROGRESS */}
            <View style={s.goalRow}>
              <Text style={s.goalLabel}>Daily Goal: ₹10,000</Text>
              <Text style={[s.goalPct, { color: todayRevenue >= 10000 ? G : '#FFC107' }]}>
                {Math.min(100, (todayRevenue/10000*100)).toFixed(0)}%
              </Text>
            </View>
            <View style={s.goalBarBg}>
              <AnimatedBar
                value={todayRevenue} maxValue={10000}
                color={todayRevenue >= 10000 ? G : '#FFC107'}
                delay={200} horizontal />
            </View>
            {todayRevenue >= 10000 && (
              <Text style={s.goalMet}>🎉 Daily Goal Achieved!</Text>
            )}
          </View>

          {/* STAT CARDS */}
          <View style={s.cardsRow}>
            <RevenueCard icon="💵" label="Cash" color={G}
              value={`₹${(cashRevenue/1000).toFixed(1)}k`} />
            <RevenueCard icon="📱" label="UPI" color="#4F6EF7"
              value={`₹${(upiRevenue/1000).toFixed(1)}k`} />
          </View>
          <View style={s.cardsRow}>
            <RevenueCard icon="⏳" label="Pending" color="#F59E0B"
              value={`₹${(pendingRevenue/1000).toFixed(1)}k`} />
            <RevenueCard icon="⏰" label="Peak Hour" color="#A78BFA"
              value={peakHour.count > 0 ? `${peakHour.hour}:00` : 'N/A'}
              sublabel={`${peakHour.count} orders`} />
          </View>

          {/* ORDER STATUS */}
          <View style={s.statusCard}>
            <Text style={s.cardTitle}>📋 Order Status Live</Text>
            {[
              { key: 'new',       label: '🆕 New',       color: '#4F6EF7' },
              { key: 'packing',   label: '📦 Packing',   color: '#F59E0B' },
              { key: 'ready',     label: '✅ Ready',      color: G },
              { key: 'collected', label: '🏁 Collected', color: '#6B7280' },
            ].map((st, i) => {
              const count = statusCounts[st.key];
              const total = Math.max(Object.values(statusCounts).reduce((s, v) => s + v, 0), 1);
              return (
                <View key={st.key} style={s.statusRow}>
                  <Text style={s.statusLabel}>{st.label}</Text>
                  <View style={s.statusBarBg}>
                    <AnimatedBar value={count} maxValue={total}
                      color={st.color} delay={i * 100} horizontal />
                  </View>
                  <Text style={[s.statusCount, { color: st.color }]}>{count}</Text>
                </View>
              );
            })}
          </View>

          {/* ORDERS BY HOUR */}
          <View style={s.chartCard}>
            <Text style={s.cardTitle}>⏰ Orders by Hour (Today)</Text>
            {peakHour.count > 0 && (
              <Text style={s.chartSubtitle}>
                🔥 Peak: {peakHour.hour}:00 with {peakHour.count} orders
              </Text>
            )}
            {todayOrders.length === 0 ? (
              <View style={s.chartEmpty}>
                <Text style={s.chartEmptyText}>No orders today yet</Text>
              </View>
            ) : (
              <View style={s.hourChart}>
                {HOURS.map((h, i) => {
                  const count = ordersByHour[h] || 0;
                  const isNow  = new Date().getHours().toString() === h;
                  const isPeak = h === peakHour.hour && peakHour.count > 0;
                  return (
                    <View key={h} style={s.hourBarCol}>
                      <Text style={[s.hourBarValue, count > 0 && { color: isPeak ? '#FFC107' : G }]}>
                        {count > 0 ? count : ''}
                      </Text>
                      <View style={s.hourBarWrapper}>
                        <AnimatedBar value={count} maxValue={maxHourOrders}
                          color={isPeak ? '#FFC107' : G} delay={i * 40} />
                      </View>
                      <Text style={[s.hourLabel, isNow && { color: G, fontWeight: 'bold' }]}>
                        {h}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 7-DAY TREND */}
          <View style={s.chartCard}>
            <Text style={s.cardTitle}>📈 Revenue — Last 7 Days</Text>
            {last7Days.every(d => d.revenue === 0) ? (
              <View style={s.chartEmpty}>
                <Text style={s.chartEmptyText}>No completed orders in the last 7 days</Text>
              </View>
            ) : (
              <View style={s.weekChart}>
                {last7Days.map((day, i) => {
                  const isToday = i === 6;
                  return (
                    <View key={i} style={s.weekBarCol}>
                      <Text style={[s.weekBarValue, day.revenue > 0 && { color: isToday ? '#FFC107' : G }]}>
                        {day.revenue > 0 ? `${(day.revenue/1000).toFixed(1)}k` : ''}
                      </Text>
                      <View style={s.weekBarWrapper}>
                        <AnimatedBar value={day.revenue} maxValue={maxRevenue}
                          color={isToday ? '#FFC107' : G} delay={i * 80} />
                      </View>
                      <Text style={[s.weekLabel, isToday && { color: '#FFC107', fontWeight: 'bold' }]}>
                        {isToday ? 'Today' : day.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* TOP SELLING */}
          {bestsellers.length > 0 && (
            <View style={s.topCard}>
              <Text style={s.cardTitle}>🏆 Top Selling Parts</Text>
              {bestsellers.slice(0, 5).map((item, i) => {
                const maxQty  = bestsellers[0]?.total_qty || 1;
                const colors  = ['#FFC107','#4F6EF7',G,'#A78BFA','#FF4757'];
                return (
                  <View key={i} style={s.topRow}>
                    <Text style={[s.topRank, { color: colors[i] }]}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <View style={s.topNameRow}>
                        <Text style={s.topName} numberOfLines={1}>
                          {item.name_en || item.product_name}
                        </Text>
                        <Text style={[s.topQty, { color: colors[i] }]}>
                          {item.total_qty} sold
                        </Text>
                      </View>
                      <View style={s.topBarBg}>
                        <AnimatedBar value={item.total_qty} maxValue={maxQty}
                          color={colors[i]} delay={i * 100} horizontal />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* PAYMENT BREAKDOWN */}
          <View style={s.payCard}>
            <Text style={s.cardTitle}>💳 Payment Breakdown</Text>
            <View style={s.payRow}>
              {[
                { label: '💵 Cash',    value: cashRevenue,    color: G },
                { label: '📱 UPI',     value: upiRevenue,     color: '#4F6EF7' },
                { label: '⏳ Pending', value: pendingRevenue, color: '#F59E0B' },
              ].map((p, i) => {
                const total = Math.max(cashRevenue + upiRevenue + pendingRevenue, 1);
                const pct   = ((p.value / total) * 100).toFixed(0);
                return (
                  <View key={i} style={s.payItem}>
                    <Text style={s.payLabel}>{p.label}</Text>
                    <Text style={[s.payValue, { color: p.color }]}>
                      ₹{(p.value/1000).toFixed(1)}k
                    </Text>
                    <View style={s.payBarBg}>
                      <AnimatedBar value={p.value} maxValue={total}
                        color={p.color} delay={i*100} horizontal />
                    </View>
                    <Text style={s.payPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
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
  liveDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: G,
    shadowColor: G, shadowOpacity: 0.8, shadowRadius: 4,
  },
  periodRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.1)',
  },
  periodBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', backgroundColor: 'rgba(34,197,94,0.04)',
  },
  periodBtnActive: { backgroundColor: G, borderColor: G },
  periodBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  noticeBanner: {
    backgroundColor: 'rgba(79,110,247,0.08)', margin: 12, borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: 'rgba(79,110,247,0.2)',
  },
  noticeText: { color: 'rgba(79,110,247,0.7)', fontSize: 11, textAlign: 'center' },
  heroCard: {
    margin: 12, backgroundColor: '#0D1A0D', borderRadius: 20, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', gap: 6,
  },
  heroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 },
  heroValue: { fontSize: 44, fontWeight: 'bold', color: G },
  heroSubRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  heroDot: { color: 'rgba(255,255,255,0.2)' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  goalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  goalPct: { fontSize: 11, fontWeight: 'bold' },
  goalBarBg: {
    width: '100%', height: 8, backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 4, overflow: 'hidden',
  },
  goalMet: { color: G, fontWeight: 'bold', fontSize: 13, marginTop: 4 },
  cardsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  statusCard: {
    marginHorizontal: 12, backgroundColor: '#0D1A0D', borderRadius: 18,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 14 },
  chartSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, marginTop: -8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 80 },
  statusBarBg: {
    flex: 1, height: 8, backgroundColor: 'rgba(34,197,94,0.06)',
    borderRadius: 4, overflow: 'hidden',
  },
  statusCount: { fontSize: 14, fontWeight: 'bold', width: 28, textAlign: 'right' },
  chartCard: {
    marginHorizontal: 12, backgroundColor: '#0D1A0D', borderRadius: 18,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  chartEmpty: { alignItems: 'center', padding: 20 },
  chartEmptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  hourChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 3 },
  hourBarCol: { flex: 1, alignItems: 'center', gap: 2 },
  hourBarValue: { fontSize: 7, color: 'rgba(255,255,255,0.3)', height: 12 },
  hourBarWrapper: {
    width: '100%', flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 3, overflow: 'hidden',
  },
  hourLabel: { fontSize: 8, color: 'rgba(255,255,255,0.3)' },
  weekChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  weekBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekBarValue: { fontSize: 9, color: 'rgba(255,255,255,0.3)' },
  weekBarWrapper: {
    width: '100%', flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 4, overflow: 'hidden',
  },
  weekLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)' },
  topCard: {
    marginHorizontal: 12, backgroundColor: '#0D1A0D', borderRadius: 18,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  topRank: { fontSize: 20, width: 30 },
  topNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  topName: { fontSize: 13, fontWeight: 'bold', color: '#fff', flex: 1 },
  topQty: { fontSize: 12, fontWeight: 'bold' },
  topBarBg: { height: 4, backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 2, overflow: 'hidden' },
  payCard: {
    marginHorizontal: 12, backgroundColor: '#0D1A0D', borderRadius: 18,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  payRow: { flexDirection: 'row', gap: 8 },
  payItem: { flex: 1, alignItems: 'center', gap: 4 },
  payLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  payValue: { fontSize: 14, fontWeight: 'bold' },
  payBarBg: {
    width: '100%', height: 4, backgroundColor: 'rgba(34,197,94,0.06)',
    borderRadius: 2, overflow: 'hidden',
  },
  payPct: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
});
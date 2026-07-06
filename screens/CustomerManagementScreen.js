import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, FlatList, TextInput,
  Linking, Modal, ScrollView, RefreshControl, Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const G = '#22C55E';

function getLevel(spent) {
  if (spent >= 10000) return { label: '💎 Diamond', color: '#60A5FA' };
  if (spent >= 5000)  return { label: '🥇 Gold',    color: '#FFC107' };
  if (spent >= 2000)  return { label: '🥈 Silver',  color: '#9CA3AF' };
  if (spent >= 500)   return { label: '🥉 Bronze',  color: '#CD7C3E' };
  return { label: '🌱 New', color: '#4ADE80' };
}

function StatBox({ icon, label, value, color }) {
  return (
    <View style={[sb.box, { borderColor: color + '30' }]}>
      <Text style={sb.icon}>{icon}</Text>
      <Text style={[sb.value, { color }]}>{value}</Text>
      <Text style={sb.label}>{label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  box: {
    flex: 1, backgroundColor: '#0D1A0D', borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 4, borderWidth: 1,
  },
  icon: { fontSize: 22 },
  value: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
});

export default function CustomerManagementScreen({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('spent');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [dataSource, setDataSource] = useState('');

  useEffect(() => { fetchCustomers(); }, []);

  // ✅ BUG FIX: Try dedicated endpoint first, fall back to deriving from /orders
  const fetchCustomers = async () => {
    setLoading(true);
    const success = await tryDedicatedEndpoint();
    if (!success) {
      await deriveCustomersFromOrders();
    }
    setLoading(false);
  };

  const tryDedicatedEndpoint = async () => {
    try {
      const r = await fetch(`${API_URL}/customers/all`);
      if (!r.ok) return false;
      const d = await r.json();
      if (d.customers && d.customers.length >= 0) {
        setCustomers(d.customers);
        setDataSource('api');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deriveCustomersFromOrders = async () => {
    try {
      const r = await fetch(`${API_URL}/orders`);
      if (!r.ok) return;
      const d = await r.json();
      const orders = d.orders || [];

      // Group by phone
      const map = {};
      orders.forEach(order => {
        const phone = order.customer_phone;
        if (!phone) return;
        if (!map[phone]) {
          map[phone] = {
            phone,
            name: order.customer_name || 'Unknown',
            total_spent: 0,
            order_count: 0,
            last_order: null,
          };
        }
        map[phone].total_spent += parseFloat(order.total_amount || 0);
        map[phone].order_count++;
        if (!map[phone].last_order ||
            new Date(order.created_at) > new Date(map[phone].last_order)) {
          map[phone].last_order = order.created_at;
          // Use latest name in case it changed
          if (order.customer_name) map[phone].name = order.customer_name;
        }
      });

      setCustomers(Object.values(map));
      setDataSource('orders');
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const openCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setLoadingOrders(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const r = await fetch(`${API_URL}/orders/customer/${customer.phone}`);
      if (r.ok) {
        const d = await r.json();
        setCustomerOrders(d.orders || []);
      } else {
        setCustomerOrders([]);
      }
    } catch { setCustomerOrders([]); }
    setLoadingOrders(false);
  };

  const totalRevenue = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
  const totalOrders  = customers.reduce((s, c) => s + (c.order_count || 0), 0);

  const filtered = customers
    .filter(c =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    .sort((a, b) => {
      if (sortBy === 'spent')  return (b.total_spent || 0) - (a.total_spent || 0);
      if (sortBy === 'orders') return (b.order_count || 0) - (a.order_count || 0);
      if (sortBy === 'name')   return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>👥 Customers</Text>
          <Text style={s.headerSub}>
            {customers.length} total
            {dataSource === 'orders' ? ' · derived from orders' : ''}
          </Text>
        </View>
      </View>

      {/* STATS */}
      <View style={s.statsRow}>
        <StatBox icon="👥" label="Customers" value={customers.length} color={G} />
        <StatBox icon="💰" label="Revenue"
          value={`₹${(totalRevenue/1000).toFixed(1)}k`} color="#FFC107" />
        <StatBox icon="📦" label="Orders" value={totalOrders} color="#4F6EF7" />
        <StatBox icon="💎" label="Avg Spend"
          value={`₹${customers.length > 0 ? (totalRevenue/customers.length).toFixed(0) : 0}`}
          color="#A78BFA" />
      </View>

      {/* SEARCH */}
      <View style={s.searchBox}>
        <Text>🔍</Text>
        <TextInput style={s.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={search} onChangeText={setSearch} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: 'rgba(255,255,255,0.3)' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SORT */}
      <View style={s.sortRow}>
        <Text style={s.sortLabel}>Sort:</Text>
        {[
          { id: 'spent',  label: '₹ Spent' },
          { id: 'orders', label: '📦 Orders' },
          { id: 'name',   label: 'A-Z' },
        ].map(opt => (
          <TouchableOpacity key={opt.id}
            style={[s.sortBtn, sortBy === opt.id && s.sortBtnActive]}
            onPress={() => setSortBy(opt.id)}>
            <Text style={[s.sortBtnText, sortBy === opt.id && { color: G }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={s.countText}>{filtered.length}</Text>
      </View>

      {loading ? (
        <View style={s.centerBox}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>👥</Text>
          <Text style={s.loadingText}>Loading customers...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.phone || i.toString()}
          contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />
          }
          ListEmptyComponent={() => (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 48 }}>👥</Text>
              <Text style={s.emptyText}>No customers yet!</Text>
              <Text style={s.emptySub}>
                {search ? `No results for "${search}"` : 'Customers appear after they place orders'}
              </Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const level = getLevel(item.total_spent || 0);
            return (
              <TouchableOpacity style={s.customerCard}
                onPress={() => openCustomer(item)} activeOpacity={0.8}>
                <View style={s.customerRank}>
                  <Text style={s.rankNum}>#{index + 1}</Text>
                </View>
                <View style={s.customerAvatar}>
                  <Text style={s.customerAvatarText}>
                    {item.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.customerNameRow}>
                    <Text style={s.customerName} numberOfLines={1}>
                      {item.name || 'Unknown'}
                    </Text>
                    <View style={[s.levelBadge, { borderColor: level.color + '50' }]}>
                      <Text style={[s.levelText, { color: level.color }]}>
                        {level.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.customerPhone}>📱 {item.phone}</Text>
                  <View style={s.customerStats}>
                    <Text style={s.customerStat}>
                      💰 ₹{(item.total_spent || 0).toFixed(0)}
                    </Text>
                    <Text style={s.customerStatDot}>·</Text>
                    <Text style={s.customerStat}>📦 {item.order_count || 0} orders</Text>
                  </View>
                </View>
                <View style={s.customerActions}>
                  <TouchableOpacity style={s.actionCallBtn}
                    onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                    <Text>📞</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionWaBtn}
                    onPress={() => Linking.openURL(
                      `https://wa.me/91${item.phone}?text=` +
                      encodeURIComponent(
                        `Hi ${item.name}! This is New Rahul Auto Spares, Nandyal. How can we help you today?`
                      )
                    )}>
                    <Text>💬</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* CUSTOMER DETAIL MODAL */}
      <Modal visible={selectedCustomer !== null} animationType="slide"
        onRequestClose={() => setSelectedCustomer(null)}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" backgroundColor="#060E06" />
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn}
              onPress={() => { setSelectedCustomer(null); setCustomerOrders([]); }}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Customer Profile</Text>
          </View>

          {selectedCustomer && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* PROFILE */}
              <View style={s.profileCard}>
                <View style={s.profileAvatar}>
                  <Text style={s.profileAvatarText}>
                    {selectedCustomer.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={s.profileName}>{selectedCustomer.name || 'Unknown'}</Text>
                <Text style={s.profilePhone}>📱 {selectedCustomer.phone}</Text>
                {(() => {
                  const level = getLevel(selectedCustomer.total_spent || 0);
                  return (
                    <View style={[s.profileLevelBadge, { borderColor: level.color }]}>
                      <Text style={[s.profileLevelText, { color: level.color }]}>
                        {level.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* STATS */}
              <View style={s.statsRow}>
                <StatBox icon="💰" label="Total Spent"
                  value={`₹${((selectedCustomer.total_spent||0)/1000).toFixed(1)}k`}
                  color="#FFC107" />
                <StatBox icon="📦" label="Orders"
                  value={selectedCustomer.order_count || 0} color={G} />
                <StatBox icon="💎" label="Points"
                  value={Math.floor((selectedCustomer.total_spent||0)/50)}
                  color="#A78BFA" />
              </View>

              {/* CONTACT */}
              <View style={s.contactBtns}>
                <TouchableOpacity style={s.callBigBtn}
                  onPress={() => Linking.openURL(`tel:${selectedCustomer.phone}`)}>
                  <Text style={s.callBigBtnText}>📞 Call Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.waBigBtn}
                  onPress={() => Linking.openURL(
                    `https://wa.me/91${selectedCustomer.phone}?text=` +
                    encodeURIComponent(
                      `Hi ${selectedCustomer.name}! New Rahul Auto Spares, Nandyal.`
                    )
                  )}>
                  <Text style={s.waBigBtnText}>💬 WhatsApp</Text>
                </TouchableOpacity>
              </View>

              {/* ORDER HISTORY */}
              <Text style={s.sectionTitle}>📋 Order History</Text>
              {loadingOrders ? (
                <Text style={s.loadingText}>Loading orders...</Text>
              ) : customerOrders.length === 0 ? (
                <View style={s.noDataBox}>
                  <Text style={s.emptyText}>No orders found</Text>
                </View>
              ) : (
                customerOrders.map((order, i) => (
                  <View key={i} style={s.orderHistoryRow}>
                    <View>
                      <Text style={s.orderHistoryId}>
                        {order.custom_id || `RAS-${order.id}`}
                      </Text>
                      <Text style={s.orderHistoryDate}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.orderHistoryAmt}>₹{order.total_amount}</Text>
                      <View style={[s.statusPill, {
                        backgroundColor: order.status === 'collected'
                          ? 'rgba(34,197,94,0.15)' : 'rgba(79,110,247,0.15)',
                      }]}>
                        <Text style={[s.statusPillText, {
                          color: order.status === 'collected' ? G : '#4F6EF7'
                        }]}>
                          {order.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 60 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1A0D',
    marginHorizontal: 12, marginBottom: 8, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', gap: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  sortRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 6, marginBottom: 6,
  },
  sortLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  sortBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  sortBtnActive: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: G },
  sortBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
  countText: { marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.25)' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
  emptySub: { fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },
  noDataBox: { alignItems: 'center', padding: 20 },
  customerCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  customerRank: { width: 24 },
  rankNum: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' },
  customerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  customerAvatarText: { fontSize: 20, fontWeight: 'bold', color: G },
  customerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  customerName: { fontSize: 14, fontWeight: 'bold', color: '#fff', flex: 1 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  levelText: { fontSize: 9, fontWeight: 'bold' },
  customerPhone: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  customerStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customerStat: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  customerStatDot: { color: 'rgba(255,255,255,0.2)' },
  customerActions: { gap: 6 },
  actionCallBtn: {
    width: 34, height: 34, backgroundColor: 'rgba(255,193,7,0.1)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)',
  },
  actionWaBtn: {
    width: 34, height: 34, backgroundColor: 'rgba(37,211,102,0.1)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(37,211,102,0.2)',
  },
  profileCard: {
    backgroundColor: '#0D1A0D', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 14, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
    borderColor: G, marginBottom: 12,
  },
  profileAvatarText: { fontSize: 36, fontWeight: 'bold', color: G },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  profilePhone: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 10 },
  profileLevelBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1.5 },
  profileLevelText: { fontSize: 13, fontWeight: 'bold' },
  contactBtns: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  callBigBtn: {
    flex: 1, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)',
  },
  callBigBtnText: { color: '#FFC107', fontWeight: 'bold', fontSize: 14 },
  waBigBtn: { flex: 1, backgroundColor: '#25D366', borderRadius: 14, padding: 14, alignItems: 'center' },
  waBigBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  orderHistoryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.1)',
  },
  orderHistoryId: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  orderHistoryDate: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  orderHistoryAmt: { fontSize: 16, fontWeight: 'bold', color: '#FFC107', marginBottom: 4 },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 10, fontWeight: 'bold' },
});
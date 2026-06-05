import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList,
  TouchableOpacity, SafeAreaView, StatusBar,
  ScrollView, Modal, Alert, RefreshControl,
  Linking, TextInput, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import QRScannerScreen from './QRScannerScreen';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const ORDERS_CACHE = 'store_orders_cache';
const G = '#22C55E';

const STATUS_COLORS = {
  new: '#4F6EF7', packing: '#F59E0B',
  ready: '#22C55E', collected: 'rgba(255,255,255,0.3)'
};
const STATUS_LABELS = {
  new: '🆕 New', packing: '📦 Packing',
  ready: '✅ Ready', collected: '🏁 Done'
};

// ── BOTTOM NAV ──
function BottomNav({ active, onChange, newCount, isOwner }) {
  const tabs = [
    { id: 'orders', icon: '📋', label: 'Orders', badge: newCount },
    { id: 'scanner', icon: '📷', label: 'Scan QR' },
    { id: 'stock', icon: '📦', label: 'Stock' },
    { id: 'reports', icon: '📊', label: 'Reports' },
    { id: 'profile', icon: '👤', label: 'Me' },
  ];
  return (
    <View style={nb.bar}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={nb.tab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(tab.id);
          }}
        >
          <View style={nb.iconWrap}>
            <Text style={nb.icon}>{tab.icon}</Text>
            {tab.badge > 0 && (
              <View style={nb.badge}>
                <Text style={nb.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </View>
          <Text style={[nb.label,
            active === tab.id && nb.labelActive]}>
            {tab.label}
          </Text>
          {active === tab.id && <View style={nb.dot} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const nb = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: '#0D1A0D',
    borderTopWidth: 1, borderTopColor: 'rgba(34,197,94,0.15)',
    paddingBottom: 6, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  iconWrap: { position: 'relative', marginBottom: 3 },
  icon: { fontSize: 22 },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#EF4444', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  labelActive: { color: '#22C55E' },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#22C55E', marginTop: 2,
  },
});

// ── STAT CARD ──
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[sc.card, { borderColor: color + '25' }]}>
      <View style={[sc.iconBox, { backgroundColor: color + '15' }]}>
        <Text style={sc.icon}>{icon}</Text>
      </View>
      <Text style={sc.label}>{label}</Text>
      <Text style={[sc.value, { color }]}>{value}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#0D1A0D', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 6, borderWidth: 1,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  label: {
    fontSize: 10, color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1, textTransform: 'uppercase',
    textAlign: 'center',
  },
  value: { fontSize: 24, fontWeight: 'bold' },
});

export default function MainStore({ staff, onLogout }) {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedOrder, setScannedOrder] = useState(null);

  // Stock
  const [products, setProducts] = useState([]);
  const [stockSearch, setStockSearch] = useState('');

  // Reports
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [bestsellers, setBestsellers] = useState([]);

  // Mechanics (owner)
  const [mechanics, setMechanics] = useState([]);

  // Offers (owner)
  const [offers, setOffers] = useState([]);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('');
  const [offerEmoji, setOfferEmoji] = useState('🎉');
  const [showOfferForm, setShowOfferForm] = useState(false);

  // Profile / PIN Change
  const [pinStep, setPinStep] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // Attendance
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState(null);

  const isOwner = staff?.role === 'owner';
  const newCount = orders.filter(o => o.status === 'new').length;

  useEffect(() => {
    fetchOrders();
    checkClock();
    if (isOwner) {
      fetchMechanics();
      fetchOffers();
    }
  }, []);

  useEffect(() => {
    if (tab === 'reports') fetchReports();
    if (tab === 'stock') fetchProducts();
  }, [tab, period]);

  // ── ORDERS ──
  const fetchOrders = async () => {
    try {
      const r = await fetch(`${API_URL}/orders`);
      const d = await r.json();
      const sorted = (d.orders || []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(sorted);
      setOffline(false);
      await AsyncStorage.setItem(
        ORDERS_CACHE, JSON.stringify(sorted)
      );
    } catch {
      try {
        const c = await AsyncStorage.getItem(ORDERS_CACHE);
        if (c) { setOrders(JSON.parse(c)); setOffline(true); }
      } catch {}
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchOrders();
    if (tab === 'reports') await fetchReports();
    if (isOwner) { await fetchMechanics(); await fetchOffers(); }
    setRefreshing(false);
  };

  const openOrder = async (order) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOrder(order);
    try {
      const r = await fetch(`${API_URL}/orders/${order.id}/items`);
      const d = await r.json();
      setOrderItems(d.items || []);
    } catch { setOrderItems([]); }
  };

  const updateStatus = async (orderId, status) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status, collected_by: staff?.name || ''
        })
      });
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status } : o
      ));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status }));
      }
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      if (status === 'ready') {
        fetch(`${API_URL}/notify/order-ready/${orderId}`, {
          method: 'POST'
        }).catch(() => {});
      }
    } catch {
      Alert.alert('❌ Error', 'Could not update. Check internet.');
    }
  };

  const updatePayment = async (orderId, type) => {
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_type: type })
      });
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, payment_type: type } : o
      ));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, payment_type: type }));
      }
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch {}
  };

  // ── QR SCANNER ──
  const handleQRScanned = async (orderId) => {
    setShowScanner(false);
    const order = orders.find(o =>
      (o.custom_id || `RAS-${o.id}`) === orderId
    );
    if (!order) {
      Alert.alert('❌ Not Found', `Order ${orderId} not found`);
      return;
    }
    if (order.status === 'collected') {
      Alert.alert('✅ Already Done',
        `${orderId} was already collected!`);
      return;
    }
    Alert.alert(
      '📱 QR Scanned!',
      `Order: ${orderId}\nCustomer: ${order.customer_name}\nTotal: ₹${order.total_amount}\n\nMark as Collected?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✅ Mark Collected',
          onPress: () => updateStatus(order.id, 'collected')
        }
      ]
    );
  };

  // ── STOCK ──
  const fetchProducts = async () => {
    try {
      const r = await fetch(`${API_URL}/products`);
      const d = await r.json();
      setProducts(d.products || []);
    } catch {}
  };

  const updateStock = async (productId, newQty) => {
    try {
      await fetch(`${API_URL}/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_qty: newQty })
      });
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, stock_qty: newQty } : p
      ));
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch {
      Alert.alert('❌ Error', 'Could not update stock');
    }
  };

  // ── REPORTS ──
  const fetchReports = async () => {
    try {
      const [sRes, bsRes] = await Promise.all([
        fetch(`${API_URL}/reports/summary?period=${period}`),
        fetch(`${API_URL}/reports/bestsellers`)
      ]);
      const s = await sRes.json();
      const bs = await bsRes.json();
      setSummary(s);
      setBestsellers(bs.bestsellers || []);
    } catch {}
  };

  // ── MECHANICS ──
  const fetchMechanics = async () => {
    try {
      const r = await fetch(`${API_URL}/mechanics`);
      const d = await r.json();
      setMechanics(d.mechanics || []);
    } catch {}
  };

  const approveMechanic = async (id, approve) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await fetch(`${API_URL}/mechanics/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approve ? 'approved' : 'rejected',
          approved_by: staff?.name
        })
      });
      await fetchMechanics();
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      Alert.alert(
        approve ? '✅ Approved!' : '❌ Rejected',
        approve
          ? 'Mechanic can now get 5% discount!'
          : 'Mechanic registration rejected.'
      );
    } catch {
      Alert.alert('❌ Error', 'Could not update mechanic');
    }
  };

  // ── OFFERS ──
  const fetchOffers = async () => {
    try {
      const r = await fetch(`${API_URL}/offers/all`);
      const d = await r.json();
      setOffers(d.offers || []);
    } catch {}
  };

  const createOffer = async () => {
    if (!offerTitle.trim()) {
      Alert.alert('❌', 'Enter offer title'); return;
    }
    try {
      await fetch(`${API_URL}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: offerTitle.trim(),
          description: offerDesc.trim(),
          discount_percent: parseInt(offerDiscount) || 0,
          emoji: offerEmoji
        })
      });
      await fetchOffers();
      setOfferTitle(''); setOfferDesc('');
      setOfferDiscount(''); setOfferEmoji('🎉');
      setShowOfferForm(false);
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      Alert.alert('✅ Offer Created!',
        'Customers will see it on home screen!');
    } catch { Alert.alert('❌ Error', 'Could not create offer'); }
  };

  const toggleOffer = async (id) => {
    try {
      await fetch(`${API_URL}/offers/${id}/toggle`, {
        method: 'PUT'
      });
      await fetchOffers();
    } catch {}
  };

  const deleteOffer = (id) => {
    Alert.alert('Delete?', 'Remove this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await fetch(`${API_URL}/offers/${id}`,
            { method: 'DELETE' });
          await fetchOffers();
        }
      }
    ]);
  };

  // ── CLOCK ──
  const checkClock = async () => {
    try {
      const r = await fetch(
        `${API_URL}/staff/${staff?.id}/attendance`
      );
      const d = await r.json();
      const today = d.attendance?.[0];
      if (today?.clock_in && !today?.clock_out) {
        setIsClockedIn(true);
        setClockTime(today.clock_in);
      }
    } catch {}
  };

  const handleClock = async () => {
    if (isClockedIn) {
      Alert.alert('Clock Out?', 'End your shift?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          onPress: async () => {
            await fetch(
              `${API_URL}/staff/${staff?.id}/clockout`,
              { method: 'POST' }
            );
            setIsClockedIn(false); setClockTime(null);
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
          }
        }
      ]);
    } else {
      await fetch(`${API_URL}/staff/${staff?.id}/clockin`,
        { method: 'POST' });
      setIsClockedIn(true);
      setClockTime(new Date().toISOString());
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    }
  };

  // ── PIN CHANGE ──
  const handlePinKey = async (digit) => {
    if (pinInput.length >= 4) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const np = pinInput + digit;
    setPinInput(np);
    setPinError('');
    if (np.length === 4) {
      setTimeout(() => processPinStep(np), 200);
    }
  };

  const processPinStep = async (entered) => {
    if (pinStep === 'current') {
      const myPin = staff?.pin || '';
      if (entered === myPin) {
        setCurrentPin(entered);
        setPinInput('');
        setPinStep('new');
      } else {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
        setPinError('Wrong current PIN!');
        setTimeout(() => setPinInput(''), 500);
      }
    } else if (pinStep === 'new') {
      setNewPin(entered);
      setPinInput('');
      setPinStep('confirm');
    } else if (pinStep === 'confirm') {
      if (entered === newPin) {
        try {
          await fetch(`${API_URL}/staff/${staff?.id}/pin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: newPin })
          });
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
          Alert.alert('✅ PIN Changed!',
            `New PIN: ${newPin}\nRemember it!`);
          staff.pin = newPin;
        } catch {
          Alert.alert('⚠️ Saved Locally',
            `New PIN: ${newPin}`);
        }
        setPinStep(null); setPinInput('');
        setCurrentPin(''); setNewPin('');
      } else {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
        setPinError('PINs do not match!');
        setPinInput('');
        setPinStep('new');
        setNewPin('');
      }
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const filteredStock = products.filter(p =>
    !stockSearch ||
    p.name_en?.toLowerCase().includes(stockSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(stockSearch.toLowerCase())
  );

  // ── RENDER QR SCANNER ──
  if (showScanner) {
    return (
      <QRScannerScreen
        onScanned={handleQRScanned}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />

      {/* HEADER */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerRole}>
            {staff?.role === 'owner' ? '👑 OWNER'
             : staff?.role === 'senior' ? '⭐ SENIOR STAFF'
             : '👷 STAFF'}
          </Text>
          <Text style={s.headerName}>{staff?.name}</Text>
        </View>
        {offline && (
          <View style={s.offlineBadge}>
            <Text style={s.offlineBadgeText}>📴 Offline</Text>
          </View>
        )}
        {newCount > 0 && (
          <View style={s.newOrderBadge}>
            <Text style={s.newOrderBadgeText}>
              🔔 {newCount} NEW
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={onRefresh}
        >
          <Text>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1 }}>

        {/* ══ ORDERS TAB ══ */}
        {tab === 'orders' && (
          <View style={{ flex: 1 }}>
            {/* STATS */}
            <View style={s.statsRow}>
              <StatCard
                icon="🆕" label="New"
                value={orders.filter(o => o.status === 'new').length}
                color="#4F6EF7"
              />
              <StatCard
                icon="📦" label="Packing"
                value={orders.filter(o => o.status === 'packing').length}
                color="#F59E0B"
              />
              <StatCard
                icon="✅" label="Ready"
                value={orders.filter(o => o.status === 'ready').length}
                color="#22C55E"
              />
              <StatCard
                icon="🏁" label="Done"
                value={orders.filter(o => o.status === 'collected').length}
                color="rgba(255,255,255,0.4)"
              />
            </View>

            {/* FILTER TABS */}
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={s.filterScroll}
              contentContainerStyle={s.filterRow}
            >
              {[
                { id: 'all', label: `All (${orders.length})` },
                { id: 'new', label: `🆕 New (${orders.filter(o=>o.status==='new').length})` },
                { id: 'packing', label: `📦 Packing` },
                { id: 'ready', label: `✅ Ready` },
                { id: 'collected', label: `🏁 Done` },
              ].map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[s.filterChip,
                    statusFilter === f.id && s.filterChipActive]}
                  onPress={() => setStatusFilter(f.id)}
                >
                  <Text style={[s.filterChipText,
                    statusFilter === f.id && s.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <View style={s.centerBox}>
                <Text style={s.loadingText}>
                  Loading orders...
                </Text>
              </View>
            ) : filteredOrders.length === 0 ? (
              <View style={s.centerBox}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>
                  📋
                </Text>
                <Text style={s.emptyText}>
                  {statusFilter === 'all'
                    ? 'No orders yet!'
                    : `No ${statusFilter} orders`}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredOrders}
                keyExtractor={i => i.id.toString()}
                contentContainerStyle={{ padding: 12 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={G}
                  />
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.orderCard,
                      item.status === 'new' && s.orderCardNew]}
                    onPress={() => openOrder(item)}
                  >
                    <View style={s.orderTop}>
                      <View style={s.orderIdRow}>
                        <Text style={s.orderId}>
                          {item.custom_id || `RAS-${item.id}`}
                        </Text>
                        {item.status === 'new' && (
                          <View style={s.newPill}>
                            <Text style={s.newPillText}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.orderAmt}>
                        ₹{item.total_amount}
                      </Text>
                    </View>
                    <Text style={s.orderCustomer}>
                      👤 {item.customer_name || 'Customer'}
                    </Text>
                    {item.customer_phone && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(
                          `tel:${item.customer_phone}`
                        )}
                      >
                        <Text style={s.orderPhone}>
                          📞 {item.customer_phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {item.pickup_time && (
                      <Text style={s.orderPickup}>
                        📅 {item.pickup_time}
                      </Text>
                    )}
                    <View style={s.orderBottom}>
                      <View style={[s.statusPill,
                        {
                          backgroundColor:
                            (STATUS_COLORS[item.status] || G) + '15',
                          borderColor:
                            (STATUS_COLORS[item.status] || G) + '40'
                        }]}>
                        <Text style={[s.statusPillText,
                          { color: STATUS_COLORS[item.status] || G }]}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Text>
                      </View>
                      {item.payment_type && (
                        <Text style={s.payBadge}>
                          {item.payment_type === 'cash' ? '💵'
                           : item.payment_type === 'upi' ? '📱'
                           : '⏳'}
                        </Text>
                      )}
                      <Text style={s.tapHint}>Tap →</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* ══ SCANNER TAB ══ */}
        {tab === 'scanner' && (
          <View style={s.centerBox}>
            <View style={[s.scannerIllustration]}>
              <Text style={{ fontSize: 80 }}>📷</Text>
            </View>
            <Text style={s.scannerTitle}>
              QR Order Pickup
            </Text>
            <Text style={s.scannerSub}>
              Scan customer's QR code to mark order as collected
            </Text>
            <Text style={s.scannerSubTe}>
              ఆర్డర్ పికప్ కోసం QR స్కాన్ చేయండి
            </Text>
            <TouchableOpacity
              style={s.scanBtn}
              onPress={() => setShowScanner(true)}
            >
              <Text style={s.scanBtnText}>
                📷 Open QR Scanner
              </Text>
            </TouchableOpacity>
            <Text style={s.scanHint}>
              Or enter order ID manually:
            </Text>
            <View style={s.manualRow}>
              <TextInput
                style={s.manualInput}
                placeholder="e.g. RAS-001"
                placeholderTextColor="rgba(255,255,255,0.2)"
                onChangeText={() => {}}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={s.manualBtn}
                onPress={() => {
                  Alert.alert('🔍', 'Search order by ID');
                }}
              >
                <Text style={s.manualBtnText}>Go</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══ STOCK TAB ══ */}
        {tab === 'stock' && (
          <View style={{ flex: 1 }}>
            <View style={s.stockSearchBox}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                style={s.stockSearchInput}
                placeholder="Search products..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={stockSearch}
                onChangeText={setStockSearch}
              />
            </View>
            <FlatList
              data={filteredStock}
              keyExtractor={i => i.id.toString()}
              contentContainerStyle={{ padding: 12 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={async () => {
                    setRefreshing(true);
                    await fetchProducts();
                    setRefreshing(false);
                  }}
                  tintColor={G}
                />
              }
              ListEmptyComponent={() => (
                <View style={s.centerBox}>
                  <Text style={s.emptyText}>No products found</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={[s.stockCard,
                  item.stock_qty <= 5 && item.stock_qty > 0 &&
                  s.stockCardLow,
                  item.stock_qty === 0 && s.stockCardOut
                ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stockName}>{item.name_en}</Text>
                    <Text style={s.stockSku}>{item.sku}</Text>
                    <Text style={[s.stockQty,
                      item.stock_qty === 0
                        ? { color: '#EF4444' }
                        : item.stock_qty <= 5
                        ? { color: '#F59E0B' }
                        : { color: G }]}>
                      {item.stock_qty === 0
                        ? '❌ Out of stock'
                        : item.stock_qty <= 5
                        ? `⚠️ Low: ${item.stock_qty} left`
                        : `✅ ${item.stock_qty} in stock`}
                    </Text>
                  </View>
                  <View style={s.stockActions}>
                    <TouchableOpacity
                      style={s.stockBtn}
                      onPress={() => Alert.alert(
                        'Update Stock',
                        `${item.name_en}\nCurrent: ${item.stock_qty}`,
                        [
                          { text: '+1',
                            onPress: () => updateStock(
                              item.id, item.stock_qty + 1
                            )},
                          { text: '+5',
                            onPress: () => updateStock(
                              item.id, item.stock_qty + 5
                            )},
                          { text: '+10',
                            onPress: () => updateStock(
                              item.id, item.stock_qty + 10
                            )},
                          { text: 'Cancel', style: 'cancel' }
                        ]
                      )}
                    >
                      <Text style={s.stockBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        )}

        {/* ══ REPORTS TAB ══ */}
        {tab === 'reports' && (
          <ScrollView
            contentContainerStyle={{ padding: 14 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={G}
              />
            }
          >
            {/* PERIOD */}
            <View style={s.periodRow}>
              {[
                { id: 'daily', label: 'Today' },
                { id: 'weekly', label: 'This Week' },
                { id: 'monthly', label: 'This Month' },
              ].map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.periodBtn,
                    period === p.id && s.periodBtnActive]}
                  onPress={() => {
                    setPeriod(p.id);
                    fetchReports();
                  }}
                >
                  <Text style={[s.periodText,
                    period === p.id && s.periodTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* HERO */}
            <View style={s.heroCard}>
              <Text style={s.heroLabel}>TOTAL REVENUE</Text>
              <Text style={s.heroValue}>
                ₹{(summary?.total_revenue || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={s.heroPeriod}>
                {period === 'daily' ? 'Today'
                 : period === 'weekly' ? 'This Week'
                 : 'This Month'}
              </Text>
            </View>

            {/* STATS */}
            <View style={s.statsRow}>
              <StatCard
                icon="📦" label="Orders"
                value={summary?.total_orders || 0}
                color="#4F6EF7"
              />
              <StatCard
                icon="💵" label="Cash"
                value={`₹${(summary?.payment_breakdown?.cash || 0).toFixed(0)}`}
                color={G}
              />
              <StatCard
                icon="⏳" label="Pending"
                value={`₹${(summary?.payment_breakdown?.pending || 0).toFixed(0)}`}
                color="#F59E0B"
              />
            </View>

            {/* ORDER STATUS */}
            <View style={s.reportCard}>
              <Text style={s.reportCardTitle}>📋 Order Status</Text>
              {[
                { label: '🆕 New', key: 'new', color: '#4F6EF7' },
                { label: '📦 Packing', key: 'packing', color: '#F59E0B' },
                { label: '✅ Ready', key: 'ready', color: G },
                { label: '🏁 Collected', key: 'collected',
                  color: 'rgba(255,255,255,0.4)' },
              ].map((s2, i) => (
                <View key={i} style={s.reportRow}>
                  <Text style={s.reportLabel}>{s2.label}</Text>
                  <View style={[s.reportPill,
                    { backgroundColor: s2.color + '15' }]}>
                    <Text style={[s.reportPillText,
                      { color: s2.color }]}>
                      {summary?.order_status_breakdown?.[s2.key] || 0}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* BESTSELLERS */}
            {bestsellers.length > 0 && (
              <View style={s.reportCard}>
                <Text style={s.reportCardTitle}>🏆 Top Selling</Text>
                {bestsellers.slice(0, 5).map((b, i) => (
                  <View key={i} style={s.bestRow}>
                    <Text style={s.bestRank}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈'
                       : i === 2 ? '🥉' : `#${i+1}`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bestName} numberOfLines={1}>
                        {b.name_en || b.product_name}
                      </Text>
                      <View style={[s.bestBar,
                        { width: `${(b.total_qty /
                          (bestsellers[0]?.total_qty || 1)) * 100}%`,
                          backgroundColor: i === 0 ? '#FFC107' : G }
                        ]} />
                    </View>
                    <Text style={[s.bestQty,
                      i === 0 && { color: '#FFC107' }]}>
                      {b.total_qty} sold
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* OWNER EXTRAS */}
            {isOwner && (
              <>
                {/* MECHANICS */}
                <View style={s.reportCard}>
                  <Text style={s.reportCardTitle}>
                    🔧 Mechanics
                  </Text>
                  {mechanics.length === 0 ? (
                    <Text style={s.emptyText}>
                      No mechanics registered
                    </Text>
                  ) : (
                    mechanics.slice(0, 5).map((m, i) => (
                      <View key={i} style={s.mechCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.mechName}>{m.name}</Text>
                          <Text style={s.mechShop}>
                            {m.shop_name || m.area || '—'}
                          </Text>
                        </View>
                        <View style={[s.mechStatus,
                          {
                            backgroundColor:
                              m.status === 'approved'
                                ? 'rgba(34,197,94,0.15)'
                                : m.status === 'pending'
                                ? 'rgba(245,158,11,0.15)'
                                : 'rgba(239,68,68,0.15)'
                          }]}>
                          <Text style={[s.mechStatusText,
                            {
                              color: m.status === 'approved'
                                ? G : m.status === 'pending'
                                ? '#F59E0B' : '#EF4444'
                            }]}>
                            {m.status}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* OFFERS */}
                <View style={s.reportCard}>
                  <View style={s.offerHeader}>
                    <Text style={s.reportCardTitle}>
                      🎁 Active Offers
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowOfferForm(true)}
                    >
                      <Text style={s.addOfferText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                  {offers.length === 0 ? (
                    <Text style={s.emptyText}>No offers yet</Text>
                  ) : (
                    offers.map((o, i) => (
                      <View key={i} style={s.offerRow}>
                        <Text style={s.offerEmoji}>{o.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.offerTitle,
                            !o.is_active && { opacity: 0.4 }]}>
                            {o.title}
                          </Text>
                          {o.discount_percent > 0 && (
                            <Text style={s.offerPct}>
                              {o.discount_percent}% OFF
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[s.toggleBtn,
                            o.is_active && s.toggleBtnOn]}
                          onPress={() => toggleOffer(o.id)}
                        >
                          <Text style={[s.toggleBtnText,
                            o.is_active && { color: G }]}>
                            {o.is_active ? '● ON' : '○ OFF'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deleteOffer(o.id)}
                          style={{ padding: 4 }}
                        >
                          <Text>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {/* ══ PROFILE TAB ══ */}
        {tab === 'profile' && (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* PROFILE CARD */}
            <View style={s.profileCard}>
              <View style={s.avatarRing}>
                <Text style={{ fontSize: 44 }}>
                  {staff?.role === 'owner' ? '👑'
                   : staff?.role === 'senior' ? '⭐' : '👷'}
                </Text>
              </View>
              <Text style={s.profileName}>{staff?.name}</Text>
              <Text style={s.profileRole}>
                {staff?.role?.toUpperCase()}
              </Text>
              <Text style={s.profileId}>
                Staff ID #{staff?.id}
              </Text>
            </View>

            {/* CLOCK */}
            <TouchableOpacity
              style={[s.clockCard,
                isClockedIn && s.clockCardIn]}
              onPress={handleClock}
            >
              <Text style={s.clockIcon}>
                {isClockedIn ? '⏹' : '▶'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.clockTitle,
                  { color: isClockedIn ? '#EF4444' : G }]}>
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </Text>
                {isClockedIn && clockTime && (
                  <Text style={s.clockSub}>
                    Since {new Date(clockTime)
                      .toLocaleTimeString('en', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                  </Text>
                )}
              </View>
              <View style={[s.clockDot,
                { backgroundColor: isClockedIn ? '#EF4444' : G }
              ]} />
            </TouchableOpacity>

            {/* CHANGE PIN */}
            <TouchableOpacity
              style={s.pinCard}
              onPress={() => {
                setPinStep('current');
                setPinInput('');
                setPinError('');
              }}
            >
              <Text style={s.pinCardIcon}>🔐</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.pinCardTitle}>Change My PIN</Text>
                <Text style={s.pinCardSub}>
                  Update your 4-digit login PIN
                </Text>
              </View>
              <Text style={{ color: G, fontSize: 20 }}>→</Text>
            </TouchableOpacity>

            {/* LOGOUT */}
            <TouchableOpacity
              style={s.logoutBtn}
              onPress={() => Alert.alert(
                'Logout?', 'Exit the store panel?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: onLogout
                  }
                ]
              )}
            >
              <Text style={s.logoutText}>← Logout</Text>
            </TouchableOpacity>

            <View style={{ height: 60 }} />
          </ScrollView>
        )}
      </View>

      {/* BOTTOM NAV */}
      <BottomNav
        active={tab}
        onChange={setTab}
        newCount={newCount}
        isOwner={isOwner}
      />

      {/* ══ ORDER DETAIL MODAL ══ */}
      <Modal
        visible={selectedOrder !== null}
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <SafeAreaView style={s.container}>
            <StatusBar barStyle="light-content"
              backgroundColor="#060E06" />
            <View style={s.modalHeader}>
              <TouchableOpacity
                style={s.modalBack}
                onPress={() => {
                  setSelectedOrder(null);
                  setOrderItems([]);
                }}
              >
                <Text style={s.modalBackText}>← Back</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>
                {selectedOrder.custom_id ||
                  `RAS-${selectedOrder.id}`}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* CUSTOMER */}
              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>👤 Customer</Text>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Name</Text>
                  <Text style={s.detailValue}>
                    {selectedOrder.customer_name || '—'}
                  </Text>
                </View>
                {selectedOrder.customer_phone && (
                  <TouchableOpacity
                    style={s.detailRow}
                    onPress={() => Linking.openURL(
                      `tel:${selectedOrder.customer_phone}`
                    )}
                  >
                    <Text style={s.detailLabel}>Phone</Text>
                    <Text style={[s.detailValue, { color: G }]}>
                      📞 {selectedOrder.customer_phone}
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Pickup</Text>
                  <Text style={s.detailValue}>
                    {selectedOrder.pickup_time || '—'}
                  </Text>
                </View>
                <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.detailLabel}>Total</Text>
                  <Text style={[s.detailValue,
                    { color: '#FFC107', fontSize: 18 }]}>
                    ₹{selectedOrder.total_amount}
                  </Text>
                </View>
              </View>

              {/* ITEMS */}
              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>📦 Items</Text>
                {orderItems.length === 0 ? (
                  <Text style={s.loadingText}>Loading...</Text>
                ) : (
                  orderItems.map((item, i) => (
                    <View key={i} style={[s.itemRow,
                      i === orderItems.length - 1 &&
                      { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemName}>
                          {item.name_en || item.product_name}
                        </Text>
                        <Text style={s.itemSku}>{item.sku}</Text>
                      </View>
                      <Text style={s.itemQty}>
                        x{item.quantity || item.qty}
                      </Text>
                      <Text style={s.itemPrice}>
                        ₹{item.unit_price || item.price}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* UPDATE STATUS */}
              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>
                  🔄 Update Status
                </Text>
                <View style={s.statusGrid}>
                  {[
                    { k: 'new', l: '🆕 New', c: '#4F6EF7' },
                    { k: 'packing', l: '📦 Packing', c: '#F59E0B' },
                    { k: 'ready', l: '✅ Ready!', c: G },
                    { k: 'collected', l: '🏁 Collected',
                      c: 'rgba(255,255,255,0.4)' },
                  ].map(st => (
                    <TouchableOpacity
                      key={st.k}
                      style={[s.statusBtn,
                        selectedOrder.status === st.k && {
                          backgroundColor: st.c + '20',
                          borderColor: st.c
                        }]}
                      onPress={() =>
                        updateStatus(selectedOrder.id, st.k)}
                    >
                      <Text style={[s.statusBtnText,
                        selectedOrder.status === st.k &&
                        { color: st.c }]}>
                        {st.l}
                      </Text>
                      {selectedOrder.status === st.k && (
                        <Text style={[s.currentTag,
                          { color: st.c }]}>
                          CURRENT
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* PAYMENT */}
              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>
                  💳 Payment
                </Text>
                <View style={s.paymentRow}>
                  {[
                    { k: 'cash', l: '💵 Cash' },
                    { k: 'upi', l: '📱 UPI' },
                    { k: 'pending', l: '⏳ Pending' },
                  ].map(p => (
                    <TouchableOpacity
                      key={p.k}
                      style={[s.payBtn,
                        selectedOrder.payment_type === p.k && {
                          backgroundColor: 'rgba(34,197,94,0.15)',
                          borderColor: G
                        }]}
                      onPress={() =>
                        updatePayment(selectedOrder.id, p.k)}
                    >
                      <Text style={[s.payBtnText,
                        selectedOrder.payment_type === p.k &&
                        { color: G }]}>
                        {p.l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* WHATSAPP CUSTOMER */}
              {selectedOrder.customer_phone && (
                <TouchableOpacity
                  style={s.waBtn}
                  onPress={() => {
                    const msg =
                      `Hi ${selectedOrder.customer_name}! 🙏\n` +
                      `Order ${selectedOrder.custom_id ||
                        `RAS-${selectedOrder.id}`} ` +
                      `is ${selectedOrder.status === 'ready'
                        ? '✅ READY for pickup!'
                        : 'being processed.'}\n` +
                      `📍 New Rahul Auto Spares, Nandyal`;
                    Linking.openURL(
                      `https://wa.me/91${selectedOrder.customer_phone}` +
                      `?text=${encodeURIComponent(msg)}`
                    );
                  }}
                >
                  <Text style={s.waBtnText}>
                    💬 WhatsApp Customer
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ══ PIN CHANGE MODAL ══ */}
      <Modal
        visible={pinStep !== null}
        animationType="slide"
        onRequestClose={() => {
          setPinStep(null); setPinInput('');
          setCurrentPin(''); setNewPin(''); setPinError('');
        }}
      >
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content"
            backgroundColor="#060E06" />
          <View style={s.modalHeader}>
            <TouchableOpacity
              style={s.modalBack}
              onPress={() => {
                setPinStep(null); setPinInput('');
                setCurrentPin(''); setNewPin('');
                setPinError('');
              }}
            >
              <Text style={s.modalBackText}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>🔐 Change PIN</Text>
          </View>

          {/* STEP INDICATOR */}
          <View style={s.stepRow}>
            {['Current', 'New', 'Confirm'].map((st, i) => {
              const stepIdx = pinStep === 'current' ? 0
                : pinStep === 'new' ? 1 : 2;
              return (
                <View key={i} style={s.stepItem}>
                  <View style={[s.stepCircle,
                    i <= stepIdx && s.stepCircleActive]}>
                    <Text style={[s.stepNum,
                      i <= stepIdx && { color: '#fff' }]}>
                      {i < stepIdx ? '✓' : i + 1}
                    </Text>
                  </View>
                  <Text style={[s.stepLabel,
                    i === stepIdx && { color: G }]}>
                    {st}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={s.pinBody}>
            <Text style={s.pinTitle}>
              {pinStep === 'current' ? 'Enter Current PIN'
               : pinStep === 'new' ? 'Enter New PIN'
               : 'Confirm New PIN'}
            </Text>
            <Text style={s.pinTitleTe}>
              {pinStep === 'current'
                ? 'ప్రస్తుత PIN నమోదు చేయండి'
                : pinStep === 'new'
                ? 'కొత్త PIN నమోదు చేయండి'
                : 'కొత్త PIN మళ్ళీ నమోదు చేయండి'}
            </Text>

            <View style={s.dotsRow2}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[s.dot2,
                  i < pinInput.length && s.dot2Filled]} />
              ))}
            </View>

            {pinError
              ? <Text style={s.pinError}>{pinError}</Text>
              : <Text style={s.pinHint}>Enter 4 digits</Text>
            }

            <View style={s.keypad2}>
              {[['1','2','3'],['4','5','6'],['7','8','9'],
                ['','0','⌫']].map((row, ri) => (
                <View key={ri} style={s.keyRow2}>
                  {row.map((key, ki) => (
                    <TouchableOpacity
                      key={ki}
                      style={[s.key2, key === '' && s.keyEmpty2]}
                      onPress={() => {
                        if (key === '⌫') {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          setPinInput(p => p.slice(0, -1));
                          setPinError('');
                        } else if (key) handlePinKey(key);
                      }}
                      disabled={key === ''}
                    >
                      <Text style={[s.keyText2,
                        key === '⌫' && { color: '#EF4444' }]}>
                        {key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ══ ADD OFFER MODAL ══ */}
      <Modal
        visible={showOfferForm}
        animationType="slide"
        onRequestClose={() => setShowOfferForm(false)}
      >
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content"
            backgroundColor="#060E06" />
          <View style={s.modalHeader}>
            <TouchableOpacity
              style={s.modalBack}
              onPress={() => setShowOfferForm(false)}
            >
              <Text style={s.modalBackText}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>🎁 Create Offer</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={s.formLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.emojiRow}>
              {['🎉','🎁','🔥','⭐','💥','🏷️','🎊','✨'].map(e => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiBtn,
                    offerEmoji === e && s.emojiBtnActive]}
                  onPress={() => setOfferEmoji(e)}
                >
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.formLabel}>Offer Title *</Text>
            <TextInput
              style={s.formInput}
              placeholder="e.g. Diwali Special!"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={offerTitle}
              onChangeText={setOfferTitle}
            />

            <Text style={s.formLabel}>Description</Text>
            <TextInput
              style={s.formInput}
              placeholder="e.g. All oils at special price"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={offerDesc}
              onChangeText={setOfferDesc}
            />

            <Text style={s.formLabel}>Discount %</Text>
            <TextInput
              style={s.formInput}
              placeholder="e.g. 10"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={offerDiscount}
              onChangeText={setOfferDiscount}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[s.createBtn,
                !offerTitle.trim() && { opacity: 0.4 }]}
              onPress={createOffer}
              disabled={!offerTitle.trim()}
            >
              <Text style={s.createBtnText}>✅ Create Offer</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── ALL STYLES ───
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  header: {
    backgroundColor: '#0D1A0D', paddingHorizontal: 16,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.15)',
    gap: 8,
  },
  headerRole: {
    fontSize: 10, color: 'rgba(34,197,94,0.6)',
    letterSpacing: 2, marginBottom: 2,
  },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  offlineBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  offlineBadgeText: { color: '#F59E0B', fontSize: 10 },
  newOrderBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  newOrderBadgeText: {
    color: '#EF4444', fontSize: 11, fontWeight: 'bold',
  },
  refreshBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    padding: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  statsRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.08)',
  },
  filterScroll: {
    maxHeight: 48, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.08)',
  },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  filterChipActive: {
    backgroundColor: G, borderColor: G,
  },
  filterChipText: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700',
  },
  filterChipTextActive: { color: '#fff' },
  centerBox: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 40, gap: 12,
  },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  orderCard: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  orderCardNew: { borderColor: 'rgba(79,110,247,0.4)' },
  orderTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  newPill: {
    backgroundColor: 'rgba(79,110,247,0.2)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1,
    borderColor: 'rgba(79,110,247,0.4)',
  },
  newPillText: { color: '#4F6EF7', fontSize: 9, fontWeight: 'bold' },
  orderAmt: { fontSize: 20, fontWeight: 'bold', color: '#FFC107' },
  orderCustomer: {
    fontSize: 13, color: '#fff', fontWeight: '600', marginBottom: 2,
  },
  orderPhone: {
    fontSize: 12, color: G, marginBottom: 2,
  },
  orderPickup: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  orderBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  payBadge: { fontSize: 16 },
  tapHint: { fontSize: 10, color: 'rgba(34,197,94,0.4)', marginLeft: 'auto' },
  scannerIllustration: {
    width: 140, height: 140, borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.06)', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.2)', marginBottom: 20,
  },
  scannerTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8,
  },
  scannerSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', marginBottom: 4,
  },
  scannerSubTe: {
    fontSize: 12, color: 'rgba(34,197,94,0.4)',
    textAlign: 'center', marginBottom: 24,
  },
  scanBtn: {
    backgroundColor: G, borderRadius: 20,
    paddingHorizontal: 32, paddingVertical: 16, marginBottom: 20,
  },
  scanBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  scanHint: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 10,
  },
  manualRow: { flexDirection: 'row', gap: 8, width: '80%' },
  manualInput: {
    flex: 1, backgroundColor: '#0D1A0D', borderRadius: 12,
    padding: 12, color: '#fff', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', fontSize: 14,
  },
  manualBtn: {
    backgroundColor: G, borderRadius: 12,
    paddingHorizontal: 16, alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnText: { color: '#fff', fontWeight: 'bold' },
  stockSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D1A0D', margin: 10, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', gap: 10,
  },
  stockSearchInput: { flex: 1, color: '#fff', fontSize: 14 },
  stockCard: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', gap: 10,
  },
  stockCardLow: { borderColor: 'rgba(245,158,11,0.4)' },
  stockCardOut: { borderColor: 'rgba(239,68,68,0.3)' },
  stockName: { fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  stockSku: { fontSize: 10, color: 'rgba(34,197,94,0.5)', letterSpacing: 1, marginBottom: 4 },
  stockQty: { fontSize: 12, fontWeight: 'bold' },
  stockActions: { alignItems: 'flex-end' },
  stockBtn: {
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  stockBtnText: { color: G, fontWeight: 'bold', fontSize: 13 },
  periodRow: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  periodBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  periodBtnActive: { backgroundColor: G, borderColor: G },
  periodText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  periodTextActive: { color: '#fff' },
  heroCard: {
    backgroundColor: '#0D1A0D', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 12, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  heroLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.3)',
    letterSpacing: 3, marginBottom: 10,
  },
  heroValue: {
    fontSize: 40, fontWeight: 'bold', color: G,
    letterSpacing: 1, marginBottom: 6,
  },
  heroPeriod: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  reportCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  reportCardTitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  reportRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.08)',
  },
  reportLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  reportPill: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
  },
  reportPillText: { fontSize: 14, fontWeight: 'bold' },
  bestRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 14,
  },
  bestRank: { fontSize: 20 },
  bestName: { fontSize: 12, color: '#fff', marginBottom: 6 },
  bestBar: { height: 4, borderRadius: 2 },
  bestQty: { fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 50, textAlign: 'right' },
  mechCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.08)', gap: 10,
  },
  mechName: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  mechShop: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  mechStatus: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  mechStatusText: { fontSize: 11, fontWeight: 'bold' },
  offerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  addOfferText: { color: G, fontWeight: 'bold', fontSize: 14 },
  offerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.08)', gap: 10,
  },
  offerEmoji: { fontSize: 24 },
  offerTitle: { fontSize: 13, fontWeight: 'bold', color: '#FFC107' },
  offerPct: { fontSize: 11, color: 'rgba(255,184,0,0.5)' },
  toggleBtn: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  toggleBtnOn: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  toggleBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
  profileCard: {
    backgroundColor: '#0D1A0D', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 14, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 2,
    borderColor: G, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  profileRole: { fontSize: 12, color: G, letterSpacing: 2, marginBottom: 4 },
  profileId: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  clockCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  clockCardIn: { borderColor: 'rgba(239,68,68,0.3)' },
  clockIcon: { fontSize: 28 },
  clockTitle: { fontSize: 16, fontWeight: 'bold' },
  clockSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  clockDot: { width: 10, height: 10, borderRadius: 5 },
  pinCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  pinCardIcon: { fontSize: 28 },
  pinCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  pinCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 16,
    padding: 14, alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 15 },
  modalHeader: {
    backgroundColor: '#0D1A0D', padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.15)',
  },
  modalBack: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  modalBackText: { color: G, fontSize: 14, fontWeight: 'bold' },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#fff' },
  detailCard: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  detailCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.08)',
  },
  detailLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  detailValue: { fontSize: 13, color: '#fff', fontWeight: '600' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.08)', gap: 8,
  },
  itemName: { fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  itemSku: { fontSize: 10, color: 'rgba(34,197,94,0.4)', letterSpacing: 1 },
  itemQty: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: '#FFC107' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    width: '47%', backgroundColor: 'rgba(34,197,94,0.05)',
    borderRadius: 12, padding: 12, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)', alignItems: 'center', gap: 4,
  },
  statusBtnText: { fontSize: 13, fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' },
  currentTag: { fontSize: 8, letterSpacing: 1 },
  paymentRow: { flexDirection: 'row', gap: 8 },
  payBtn: {
    flex: 1, backgroundColor: 'rgba(34,197,94,0.05)', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
  },
  payBtnText: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' },
  waBtn: {
    backgroundColor: 'rgba(37,211,102,0.1)', borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.3)',
  },
  waBtnText: { color: '#25D366', fontSize: 15, fontWeight: 'bold' },
  stepRow: {
    flexDirection: 'row', justifyContent: 'center',
    padding: 16, gap: 20, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.15)',
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: G, borderColor: G },
  stepNum: { fontSize: 14, color: 'rgba(255,255,255,0.3)' },
  stepLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
  pinBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pinTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  pinTitleTe: { fontSize: 12, color: 'rgba(34,197,94,0.4)', marginBottom: 24 },
  dotsRow2: { flexDirection: 'row', gap: 18, marginBottom: 12 },
  dot2: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  dot2Filled: { backgroundColor: G, borderColor: G },
  pinError: { fontSize: 14, color: '#EF4444', fontWeight: 'bold', marginBottom: 20 },
  pinHint: { fontSize: 12, color: 'rgba(255,255,255,0.2)', marginBottom: 20 },
  keypad2: { width: '100%', gap: 12 },
  keyRow2: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  key2: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#0D1A0D', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  keyEmpty2: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText2: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  dotsRow: { flexDirection: 'row', gap: 18, marginBottom: 12 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  dotFilled: { backgroundColor: G, borderColor: G },
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
  formLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', marginBottom: 14,
  },
  emojiRow: { gap: 8, paddingBottom: 14 },
  emojiBtn: {
    width: 50, height: 50, borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.06)', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  emojiBtnActive: {
    backgroundColor: 'rgba(34,197,94,0.2)', borderColor: G,
  },
  createBtn: {
    backgroundColor: G, borderRadius: 16, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
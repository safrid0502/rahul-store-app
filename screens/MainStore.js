import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, FlatList,
  TouchableOpacity, SafeAreaView, StatusBar,
  ScrollView, Modal, Alert, RefreshControl,
  Linking, TextInput, Animated, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import QRScannerScreen from './QRScannerScreen';
import BroadcastScreen from './BroadcastScreen';
import CustomerAnalyticsScreen from './CustomerAnalyticsScreen';
import AddProductScreen from './AddProductScreen';
import CustomerManagementScreen from './CustomerManagementScreen';
import PurchaseOrdersScreen from './PurchaseOrdersScreen';
import AttendanceScreen from './AttendanceScreen';
import SalesDashboardScreen from './SalesDashboardScreen';
import { generateInvoice, shareInvoice } from '../utils/invoice';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const ORDERS_CACHE = 'store_orders_cache';
const G = '#22C55E';

const STATUS_COLORS = {
  new: '#4F6EF7', packing: '#F59E0B',
  ready: '#22C55E', collected: 'rgba(255,255,255,0.3)'
};
const STATUS_LABELS = {
  new: 'New Order', packing: 'Packing',
  ready: 'Ready', collected: 'Collected'
};

const AVATAR_OPTIONS = [
  { id: 'owner',    emoji: '👑', label: 'Owner' },
  { id: 'star',     emoji: '⭐', label: 'Senior' },
  { id: 'worker',   emoji: '👷', label: 'Staff' },
  { id: 'mechanic', emoji: '🔧', label: 'Mechanic' },
  { id: 'bike',     emoji: '🏍️', label: 'Biker' },
  { id: 'gear',     emoji: '⚙️', label: 'Technical' },
  { id: 'shield',   emoji: '🛡️', label: 'Manager' },
  { id: 'rocket',   emoji: '🚀', label: 'Fast' },
  { id: 'fire',     emoji: '🔥', label: 'Hot' },
  { id: 'diamond',  emoji: '💎', label: 'Premium' },
  { id: 'trophy',   emoji: '🏆', label: 'Champion' },
  { id: 'lion',     emoji: '🦁', label: 'Leader' },
];

const getDefaultAvatar = (role) => {
  if (role === 'owner') return '👑';
  if (role === 'senior') return '⭐';
  return '👷';
};

// ── BOTTOM NAV ──
function BottomNav({ active, onChange, newCount }) {
  const tabs = [
    { id: 'orders',  icon: 'receipt-outline',     label: 'Orders', badge: newCount },
    { id: 'stock',   icon: 'cube-outline',          label: 'Stock' },
    { id: 'vendors', icon: 'business-outline',      label: 'Vendors' },
    { id: 'reports', icon: 'bar-chart-outline',     label: 'Reports' },
    { id: 'profile', icon: 'person-circle-outline', label: 'Me' },
  ];
  return (
    <View style={nb.bar}>
      {tabs.map(tab => (
        <TouchableOpacity key={tab.id} style={nb.tab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(tab.id);
          }}>
          <View style={nb.iconWrap}>
            <Ionicons
              name={active === tab.id ? tab.icon.replace('-outline','') : tab.icon}
              size={22}
              color={active === tab.id ? '#22C55E' : 'rgba(255,255,255,0.35)'}
            />
            {tab.badge > 0 && (
              <View style={nb.badge}>
                <Text style={nb.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </View>
          <Text style={[nb.label, active === tab.id && nb.labelActive]}>
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
    flexDirection: 'row', backgroundColor: '#060E06',
    borderTopWidth: 1, borderTopColor: 'rgba(34,197,94,0.2)',
    paddingBottom: 8, paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  iconWrap: { position: 'relative', marginBottom: 3 },
  icon: { fontSize: 22 },
  badge: {
    position: 'absolute', top: -4, right: -8, backgroundColor: '#EF4444',
    borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  labelActive: { color: G },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: G, marginTop: 2 },
});

// ── STAT CARD ──
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[sc.card, { borderColor: color + '30' }]}>
      <View style={[sc.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
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
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  value: { fontSize: 24, fontWeight: 'bold' },
});

// ── GOAL RING ──
function GoalRing({ current, target }) {
  const pct = Math.round(Math.min(current / target, 1) * 100);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
  }, [current]);
  return (
    <Animated.View style={[gr.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={gr.left}>
        <Text style={gr.title}>🎯 Daily Goal</Text>
        <View style={gr.ring}>
          <View style={gr.ringBg} />
          <View style={[gr.ringFill, {
            borderTopColor: pct > 25 ? G : 'transparent',
            borderRightColor: pct > 50 ? G : 'transparent',
            borderBottomColor: pct > 75 ? G : 'transparent',
            borderLeftColor: pct > 0 ? G : 'transparent',
          }]} />
          <View style={gr.ringCenter}>
            <Text style={gr.ringPct}>{pct}%</Text>
            <Text style={gr.ringLabel}>done</Text>
          </View>
        </View>
      </View>
      <View style={gr.right}>
        {[
          { label: 'Earned', value: `₹${current >= 1000 ? (current/1000).toFixed(1)+'k' : current.toFixed(0)}`, color: G },
          { label: 'Target', value: `₹${(target/1000).toFixed(0)}k`, color: '#fff' },
          { label: 'Left', value: `₹${Math.max(0,target-current) >= 1000 ? ((Math.max(0,target-current))/1000).toFixed(1)+'k' : Math.max(0,target-current).toFixed(0)}`, color: '#F59E0B' },
        ].map((r, i) => (
          <View key={i} style={gr.statRow}>
            <Text style={gr.statLabel}>{r.label}</Text>
            <Text style={[gr.statVal, { color: r.color }]}>{r.value}</Text>
          </View>
        ))}
        {pct >= 100 && (
          <View style={gr.metBadge}><Text style={gr.metText}>🎉 Goal Met!</Text></View>
        )}
      </View>
    </Animated.View>
  );
}
const gr = StyleSheet.create({
  container: {
    backgroundColor: '#0D1A0D', borderRadius: 20, padding: 16,
    flexDirection: 'row', gap: 16, alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
  },
  left: { alignItems: 'center' },
  title: { fontSize: 12, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  ring: { width: 90, height: 90, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ringBg: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 8, borderColor: 'rgba(34,197,94,0.15)' },
  ringFill: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 8, borderTopColor: G, borderRightColor: G, borderBottomColor: G, borderLeftColor: G },
  ringCenter: { alignItems: 'center' },
  ringPct: { fontSize: 20, fontWeight: 'bold', color: G },
  ringLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  right: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.08)' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  statVal: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  metBadge: { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  metText: { color: G, fontWeight: 'bold', fontSize: 13 },
});

// ── STAFF LEADERBOARD ──
function StaffLeaderboard({ orders }) {
  const staffScores = {};
  orders.forEach(order => {
    if (order.collected_by && typeof order.collected_by === 'string') {
      const name = order.collected_by.split(' ')[0];
      if (!staffScores[name]) staffScores[name] = { orders: 0, revenue: 0 };
      staffScores[name].orders++;
      staffScores[name].revenue += parseFloat(order.total_amount || 0);
    }
    if (order.packed_by && typeof order.packed_by === 'string' && order.packed_by !== order.collected_by) {
      const name = order.packed_by.split(' ')[0];
      if (!staffScores[name]) staffScores[name] = { orders: 0, revenue: 0 };
      staffScores[name].orders += 0.5;
    }
  });
  const ranked = Object.entries(staffScores)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.orders - a.orders).slice(0, 5);
  if (ranked.length === 0) return null;
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  const medalColors = ['#FFC107','#9CA3AF','#CD7C3E','#fff','#fff'];
  const maxOrders = ranked[0]?.orders || 1;
  return (
    <View style={lb.container}>
      <View style={lb.headerRow}>
        <Text style={lb.title}>🏅 Staff Leaderboard</Text>
        <Text style={lb.sub}>This Month</Text>
      </View>
      {ranked.map((staff, i) => (
        <View key={staff.name} style={lb.row}>
          <Text style={[lb.medal, { color: medalColors[i] }]}>{medals[i]}</Text>
          <View style={{ flex: 1 }}>
            <View style={lb.rowTop}>
              <Text style={[lb.name, i===0&&{color:'#FFC107'}]}>{staff.name}</Text>
              <Text style={lb.orders}>{Math.floor(staff.orders)} orders</Text>
            </View>
            <View style={lb.barBg}>
              <View style={[lb.barFill, { width: `${(staff.orders/maxOrders)*100}%`, backgroundColor: i===0?'#FFC107':G }]} />
            </View>
            <Text style={lb.revenue}>₹{staff.revenue.toFixed(0)} revenue</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
const lb = StyleSheet.create({
  container: { backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  medal: { fontSize: 22, width: 30 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  orders: { fontSize: 12, color: G, fontWeight: 'bold' },
  barBg: { height: 6, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 3 },
  revenue: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
});

// ── AVATAR RING ── (reusable)
function AvatarRing({ avatar, profileImage, size = 90, onPress }) {
  const imgSize = size - 4;
  return (
    <TouchableOpacity
      style={[avr.ring, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      {profileImage ? (
        <Image
          source={{ uri: profileImage }}
          style={{ width: imgSize, height: imgSize, borderRadius: imgSize / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: size * 0.48 }}>{avatar}</Text>
      )}
      {onPress && (
        <View style={avr.badge}>
          <Text style={{ fontSize: 11 }}>📸</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
const avr = StyleSheet.create({
  ring: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 2, borderColor: G,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    position: 'relative', overflow: 'visible',
  },
  badge: {
    position: 'absolute', bottom: -4, right: -4, width: 26, height: 26,
    borderRadius: 13, backgroundColor: '#0D1A0D', alignItems: 'center',
    justifyContent: 'center', borderWidth: 1.5, borderColor: G,
  },
});

// ── AVATAR PICKER MODAL ──
function AvatarPickerModal({ visible, currentAvatar, currentImage, onSelectEmoji, onSelectImage, onClose }) {

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow access to your photos to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      onSelectImage(result.assets[0].uri);
      onClose();
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow camera access to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      onSelectImage(result.assets[0].uri);
      onClose();
    }
  };

  const removePhoto = () => {
    onSelectImage(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent
      onRequestClose={onClose}>
      <View style={ap.overlay}>
        <View style={ap.sheet}>
          <View style={ap.handle} />
          <Text style={ap.title}>📸 Change Profile Picture</Text>
          <Text style={ap.sub}>Pick from gallery, take a photo, or choose an emoji</Text>

          {/* PHOTO ACTION BUTTONS */}
          <View style={ap.photoRow}>
            <TouchableOpacity style={ap.photoBtn} onPress={pickFromGallery}
              activeOpacity={0.8}>
              <View style={[ap.photoBtnIcon, { backgroundColor: 'rgba(79,110,247,0.15)' }]}>
                <Text style={{ fontSize: 30 }}>🖼️</Text>
              </View>
              <Text style={ap.photoBtnLabel}>Gallery</Text>
              <Text style={ap.photoBtnSub}>Pick from{'\n'}photos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ap.photoBtn} onPress={takePhoto}
              activeOpacity={0.8}>
              <View style={[ap.photoBtnIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <Text style={{ fontSize: 30 }}>📷</Text>
              </View>
              <Text style={ap.photoBtnLabel}>Camera</Text>
              <Text style={ap.photoBtnSub}>Take a{'\n'}selfie</Text>
            </TouchableOpacity>

            {currentImage && (
              <TouchableOpacity style={ap.photoBtn} onPress={removePhoto}
                activeOpacity={0.8}>
                <View style={[ap.photoBtnIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                  <Text style={{ fontSize: 30 }}>🗑️</Text>
                </View>
                <Text style={[ap.photoBtnLabel, { color: '#EF4444' }]}>Remove</Text>
                <Text style={ap.photoBtnSub}>Use emoji{'\n'}instead</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* DIVIDER */}
          <View style={ap.divider}>
            <View style={ap.dividerLine} />
            <Text style={ap.dividerText}>or choose an emoji avatar</Text>
            <View style={ap.dividerLine} />
          </View>

          {/* EMOJI GRID */}
          <ScrollView showsVerticalScrollIndicator={false}
            style={{ maxHeight: 220 }}>
            <View style={ap.grid}>
              {AVATAR_OPTIONS.map(opt => {
                const selected = !currentImage && currentAvatar === opt.emoji;
                return (
                  <TouchableOpacity key={opt.id}
                    style={[ap.option, selected && ap.optionSelected]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onSelectEmoji(opt.emoji);
                      onClose();
                    }}>
                    <Text style={ap.optionEmoji}>{opt.emoji}</Text>
                    <Text style={[ap.optionLabel, selected && { color: G }]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <View style={ap.checkBadge}>
                        <Text style={ap.checkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity style={ap.cancelBtn} onPress={onClose}>
            <Text style={ap.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const ap = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0D1A0D', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 34, borderTopWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 18 },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  photoBtn: {
    flex: 1, backgroundColor: '#060E06', borderRadius: 16, padding: 12,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  photoBtnIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  photoBtnLabel: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  photoBtnSub: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 13 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(34,197,94,0.15)' },
  dividerText: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingBottom: 8 },
  option: {
    width: 70, backgroundColor: '#060E06', borderRadius: 14, padding: 8,
    alignItems: 'center', gap: 3, borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.15)', position: 'relative',
  },
  optionSelected: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: G },
  optionEmoji: { fontSize: 26 },
  optionLabel: { fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', textTransform: 'uppercase' },
  checkBadge: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cancelBtn: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', fontSize: 14 },
});

// ══════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════
export default function MainStore({ staff, onLogout }) {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  // STOCK
  const [products, setProducts] = useState([]);
  const [stockSearch, setStockSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);

  // REPORTS
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [bestsellers, setBestsellers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('');
  const [offerEmoji, setOfferEmoji] = useState('🎉');
  const [showOfferForm, setShowOfferForm] = useState(false);

  // PROFILE
  const [avatar, setAvatar] = useState(getDefaultAvatar(staff?.role));
  const [profileImage, setProfileImage] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editName, setEditName] = useState(staff?.name || '');
  const [editPhone, setEditPhone] = useState(staff?.phone || '');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [staffStats, setStaffStats] = useState(null);
  const [showPriceManager, setShowPriceManager] = useState(false);
  const [priceSearch, setPriceSearch] = useState('');
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [newMrp, setNewMrp] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState(null);
  const [pinStep, setPinStep] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [newPin, setNewPin] = useState('');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // NEW SCREENS
  const [showScanner, setShowScanner] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showSalesDashboard, setShowSalesDashboard] = useState(false);

  const [orderSearch, setOrderSearch] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showLowStock, setShowLowStock] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [showRewardManager, setShowRewardManager] = useState(false);
  const [showStaffManager, setShowStaffManager] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('staff');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [allStaff, setAllStaff] = useState([]);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardDesc, setNewRewardDesc] = useState('');
  const [newRewardPoints, setNewRewardPoints] = useState('');
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [vendors, setVendors] = useState([
    { id: 1, name: 'Hero MotoCorp Dealer', phone: '9000000001', area: 'Nandyal', parts: 'Hero parts', whatsapp: '919000000001' },
    { id: 2, name: 'Honda Parts Supplier', phone: '9000000002', area: 'Kurnool', parts: 'Honda parts', whatsapp: '919000000002' },
    { id: 3, name: 'TVS Distributor', phone: '9000000003', area: 'Nandyal', parts: 'TVS parts', whatsapp: '919000000003' },
    { id: 4, name: 'Bajaj Parts Dealer', phone: '9000000004', area: 'Kurnool', parts: 'Bajaj parts', whatsapp: '919000000004' },
    { id: 5, name: 'Engine Oil Supplier', phone: '9000000005', area: 'Nandyal', parts: 'Oils & Lubricants', whatsapp: '919000000005' },
  ]);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorArea, setVendorArea] = useState('');
  const [vendorParts, setVendorParts] = useState('');
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [vendorOrderNote, setVendorOrderNote] = useState('');
  const isOwner  = staff?.role === 'owner';
  const isSenior = staff?.role === 'senior';
  const newCount = orders.filter(o => o.status === 'new').length;

  const searchedOrders = orders.filter(o => {
    if (!orderSearch) return true;
    const q = orderSearch.toLowerCase();
    return (
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q) ||
      (o.custom_id || '').toLowerCase().includes(q)
    );
  });
  const filteredStock = products.filter(p =>
    !stockSearch ||
    p.name_en?.toLowerCase().includes(stockSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(stockSearch.toLowerCase())
  );
  const filteredPriceProducts = products.filter(p =>
    !priceSearch ||
    p.name_en?.toLowerCase().includes(priceSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(priceSearch.toLowerCase())
  );

  useEffect(() => {
    fetchOrders();
    checkClock();
    fetchStaffStats();
    loadAvatarData();
    if (isOwner || isSenior) fetchOffers();
  }, []);

  useEffect(() => {
    if (tab === 'reports') fetchReports();
    fetchLowStock();
    fetchStoreRewards();
    if (isOwner) fetchAllStaff();
    fetchAllCustomers();
    if (tab === 'stock') fetchProducts();
  }, [tab, period]);

  // ── AVATAR PERSISTENCE ──
  const loadAvatarData = async () => {
    try {
      const savedEmoji = await AsyncStorage.getItem(`avatar_emoji_${staff?.id}`);
      if (savedEmoji) setAvatar(savedEmoji);
      const savedImage = await AsyncStorage.getItem(`avatar_image_${staff?.id}`);
      if (savedImage) setProfileImage(savedImage);
    } catch {}
  };

  const saveAvatar = async (emoji) => {
    setAvatar(emoji);
    setProfileImage(null);
    try {
      await AsyncStorage.setItem(`avatar_emoji_${staff?.id}`, emoji);
      await AsyncStorage.removeItem(`avatar_image_${staff?.id}`);
    } catch {}
  };

  const saveProfileImage = async (uri) => {
    setProfileImage(uri);
    try {
      if (uri) {
        await AsyncStorage.setItem(`avatar_image_${staff?.id}`, uri);
      } else {
        await AsyncStorage.removeItem(`avatar_image_${staff?.id}`);
      }
    } catch {}
  };

  // ── ORDERS ──
  const fetchAllCustomers = async () => {
    try {
      const r = await fetch(`${API_URL}/customers/all`);
      const d = await r.json();
      setAllCustomers(d.customers || []);
    } catch {}
  };

  const fetchCustomerHistory = async (phone) => {
    try {
      const r = await fetch(`${API_URL}/orders/customer/${phone}`);
      const d = await r.json();
      setCustomerOrders(d.orders || []);
    } catch {}
  };

  const fetchActivityLog = async () => {
    try {
      const r = await fetch(`${API_URL}/activity-log?limit=100`);
      const d = await r.json();
      setActivityLog(d.logs || []);
    } catch {}
  };

  const logActivity = async (action, details, orderId = null) => {
    try {
      await fetch(`${API_URL}/activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_name: staff?.name || 'Unknown',
          action,
          details,
          order_id: orderId
        })
      });
    } catch {}
  };

  const fetchActivityLog = async () => {
    try {
      const r = await fetch(`${API_URL}/activity-log?limit=100`);
      const d = await r.json();
      setActivityLog(d.logs || []);
    } catch {}
  };

  const logActivity = async (action, details, orderId = null) => {
    try {
      await fetch(`${API_URL}/activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_name: staff?.name || 'Unknown',
          action,
          details,
          order_id: orderId
        })
      });
    } catch {}
  };

  const fetchAllStaff = async () => {
    try {
      const r = await fetch(`${API_URL}/staff`);
      const d = await r.json();
      setAllStaff(d.staff || []);
    } catch {}
  };

  const addNewStaff = async () => {
    if (!newStaffName.trim() || !newStaffPin.trim()) {
      Alert.alert('Required', 'Name and PIN are required');
      return;
    }
    if (newStaffPin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }
    try {
      const r = await fetch(`${API_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName.trim(),
          phone: newStaffPhone.trim(),
          role: newStaffRole,
          pin: newStaffPin,
          salary: 12000,
        })
      });
      const d = await r.json();
      if (d.id || d.success) {
        setNewStaffName(''); setNewStaffPhone('');
        setNewStaffPin(''); setNewStaffRole('staff');
        fetchAllStaff();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Staff Added!', `${newStaffName} has been added.\nThey can login with PIN: ${newStaffPin}`);
      }
    } catch { Alert.alert('Error', 'Could not add staff'); }
  };

  const fetchStoreRewards = async () => {
    try {
      const r = await fetch(`${API_URL}/rewards`);
      const d = await r.json();
      setRewards(d.rewards || []);
    } catch {}
  };

  const addReward = async () => {
    if (!newRewardName || !newRewardPoints) {
      Alert.alert('Required', 'Name and points are required');
      return;
    }
    try {
      const r = await fetch(`${API_URL}/rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRewardName,
          description: newRewardDesc,
          points_required: parseInt(newRewardPoints)
        })
      });
      const d = await r.json();
      if (d.id || d.success) {
        setNewRewardName(''); setNewRewardDesc(''); setNewRewardPoints('');
        fetchStoreRewards();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch { Alert.alert('Error', 'Could not add reward'); }
  };

  const deleteReward = async (id) => {
    try {
      await fetch(`${API_URL}/rewards/${id}`, { method: 'DELETE' });
      fetchStoreRewards();
    } catch {}
  };

  const fetchLowStock = async () => {
    try {
      const r = await fetch(`${API_URL}/products/low-stock`);
      const d = await r.json();
      setLowStockProducts(d.products || []);
    } catch {}
  };

  const updateStatus = async (orderId, newStatus, orderData) => {
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      // Log activity
      const statusLabels = { packing: 'Started Packing', ready: 'Marked Ready', collected: 'Marked Collected' };
      logActivity(
        statusLabels[newStatus] || `Updated to ${newStatus}`,
        `Order ${orderData?.custom_id || `RAS-${orderId}`} · Customer: ${orderData?.customer_name || 'Unknown'} · ₹${orderData?.total_amount || 0}`,
        orderId
      );
      // Log activity
      const statusLabels = { packing: 'Started Packing', ready: 'Marked Ready', collected: 'Marked Collected' };
      logActivity(
        statusLabels[newStatus] || `Updated to ${newStatus}`,
        `Order ${orderData?.custom_id || `RAS-${orderId}`} · Customer: ${orderData?.customer_name || 'Unknown'} · ₹${orderData?.total_amount || 0}`,
        orderId
      );
      if (newStatus === 'ready') {
        fetch(`${API_URL}/notify/order-ready/${orderId}`, { method: 'POST' }).catch(() => {});
      }
      if (newStatus === 'collected' && orderData) {
        Alert.alert(
          'Order Collected!',
          `Send invoice to ${orderData.customer_name}?`,
          [
            {
              text: 'Send WhatsApp Invoice',
              onPress: () => {
                const invoiceMsg =
                  `*PAYMENT RECEIPT*
` +
                  `━━━━━━━━━━━━━━━━━━━━
` +
                  `New Rahul Auto Spares
` +
                  `Telugu Peta, Nandyal
` +
                  `━━━━━━━━━━━━━━━━━━━━

` +
                  `Order: ${orderData.custom_id || `RAS-${orderId}`}
` +
                  `Customer: ${orderData.customer_name}
` +
                  `Date: ${new Date().toLocaleDateString('en-IN')}

` +
                  `Amount Paid: ₹${orderData.total_amount}

` +
                  `Thank you for shopping with us!
` +
                  `📞 08514-244944`;
                Linking.openURL(`https://wa.me/91${orderData.customer_phone}?text=${encodeURIComponent(invoiceMsg)}`);
              }
            },
            { text: 'Skip', style: 'cancel' }
          ]
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchOrders();
    } catch {
      Alert.alert('Error', 'Could not update status');
    }
  };

  const fetchOrders = async () => {
    try {
      const r = await fetch(`${API_URL}/orders`);
      const d = await r.json();
      const sorted = (d.orders || []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(sorted);
      setOffline(false);
      await AsyncStorage.setItem(ORDERS_CACHE, JSON.stringify(sorted));
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
    await fetchStaffStats();
    if (tab === 'reports') await fetchReports();
    if (tab === 'stock') await fetchProducts();
    if (isOwner || isSenior) await fetchOffers();
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


  const updatePayment = async (orderId, type) => {
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_type: type })
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_type: type } : o));
      if (selectedOrder?.id === orderId)
        setSelectedOrder(prev => ({ ...prev, payment_type: type }));
    } catch {}
  };

  const handleQRScanned = async (orderId) => {
    setShowScanner(false);
    const order = orders.find(o => (o.custom_id || `RAS-${o.id}`) === orderId);
    if (!order) { Alert.alert('❌ Not Found', `Order ${orderId} not found`); return; }
    if (order.status === 'collected') { Alert.alert('✅ Already Done', `${orderId} already collected!`); return; }
    Alert.alert('📱 QR Scanned!',
      `Order: ${orderId}\nCustomer: ${order.customer_name}\nTotal: ₹${order.total_amount}\n\nMark as Collected?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '✅ Collected', onPress: () => updateStatus(order.id, 'collected') }
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
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert('❌ Error', 'Could not update stock'); }
  };

  // ── REPORTS ──
  const fetchReports = async () => {
    try {
      const [sRes, bsRes] = await Promise.all([
        fetch(`${API_URL}/reports/summary?period=${period}`),
        fetch(`${API_URL}/reports/bestsellers`)
      ]);
      setSummary(await sRes.json());
      const bs = await bsRes.json();
      setBestsellers(bs.bestsellers || []);
    } catch {}
  };

  const fetchOffers = async () => {
    try {
      const r = await fetch(`${API_URL}/offers/all`);
      const d = await r.json();
      setOffers(d.offers || []);
    } catch {}
  };

  const createOffer = async () => {
    if (!offerTitle.trim()) { Alert.alert('❌', 'Enter offer title'); return; }
    try {
      await fetch(`${API_URL}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: offerTitle.trim(), description: offerDesc.trim(),
          discount_percent: parseInt(offerDiscount) || 0, emoji: offerEmoji
        })
      });
      await fetchOffers();
      setOfferTitle(''); setOfferDesc(''); setOfferDiscount('');
      setOfferEmoji('🎉'); setShowOfferForm(false);
      Alert.alert('✅ Offer Created!', 'Customers can see it now!');
    } catch { Alert.alert('❌ Error', 'Could not create offer'); }
  };

  const toggleOffer = async (id) => {
    try {
      await fetch(`${API_URL}/offers/${id}/toggle`, { method: 'PUT' });
      await fetchOffers();
    } catch {}
  };

  const deleteOffer = (id) => {
    Alert.alert('Delete?', 'Remove this offer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await fetch(`${API_URL}/offers/${id}`, { method: 'DELETE' });
        await fetchOffers();
      }}
    ]);
  };

  // ── CLOCK ──
  const checkClock = async () => {
    try {
      const r = await fetch(`${API_URL}/staff/${staff?.id}/attendance`);
      const d = await r.json();
      const today = d.attendance?.[0];
      if (today?.clock_in && !today?.clock_out) {
        setIsClockedIn(true); setClockTime(today.clock_in);
      }
    } catch {}
  };

  const handleClock = async () => {
    if (isClockedIn) {
      Alert.alert('Clock Out?', 'End your shift?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clock Out', onPress: async () => {
          await fetch(`${API_URL}/staff/${staff?.id}/clockout`, { method: 'POST' });
          setIsClockedIn(false); setClockTime(null);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      ]);
    } else {
      await fetch(`${API_URL}/staff/${staff?.id}/clockin`, { method: 'POST' });
      setIsClockedIn(true); setClockTime(new Date().toISOString());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // ── PROFILE ──
  const fetchStaffStats = async () => {
    try {
      const r = await fetch(`${API_URL}/staff/${staff?.id}/stats`);
      const d = await r.json();
      setStaffStats(d);
    } catch {}
  };

  const saveProfile = async () => {
    if (!editName.trim()) { Alert.alert('❌', 'Name cannot be empty!'); return; }
    setSavingProfile(true);
    try {
      await fetch(`${API_URL}/staff/${staff?.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() })
      });
      staff.name = editName.trim();
      staff.phone = editPhone.trim();
      await AsyncStorage.setItem('staff_profile',
        JSON.stringify({ ...staff, name: editName.trim(), phone: editPhone.trim() }));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditProfile(false);
      Alert.alert('✅ Profile Updated!');
    } catch { Alert.alert('❌ Error', 'Could not save.'); }
    setSavingProfile(false);
  };

  const savePrice = async (productId) => {
    const mrp = parseFloat(newMrp);
    const selling = parseFloat(newSellingPrice);
    if (isNaN(mrp) || isNaN(selling)) { Alert.alert('❌', 'Enter valid prices'); return; }
    if (selling > mrp) { Alert.alert('❌', 'Selling price cannot exceed MRP!'); return; }
    try {
      await fetch(`${API_URL}/products/${productId}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mrp, selling_price: selling })
      });
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, mrp, selling_price: selling } : p
      ));
      setEditingPriceId(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Price Updated!');
    } catch { Alert.alert('❌ Error', 'Could not update price'); }
  };

  const handleGenerateInvoice = async (order, gst = false) => {
    setGeneratingInvoice(true);
    try {
      const uri = await generateInvoice({
        order, items: orderItems,
        customer: { name: order.customer_name, phone: order.customer_phone },
        includeGST: gst,
      });
      await shareInvoice(uri, order.custom_id || `RAS-${order.id}`);
    } catch { Alert.alert('❌ Error', 'Could not generate invoice'); }
    setGeneratingInvoice(false);
  };

  const sendDailySummary = async () => {
    try {
      const r = await fetch(`${API_URL}/reports/daily-summary`);
      const d = await r.json();
      const topParts = d.bestsellers?.slice(0, 3)
        .map((b, i) => `${i+1}. ${b.name} (${b.qty} sold)`).join('\n') || 'No data';
      const msg =
        `📊 *Daily Sales Summary*\n📅 ${new Date().toLocaleDateString('en-IN')}\n\n` +
        `💰 Revenue: ₹${d.total_revenue?.toFixed(0)}\n` +
        `📦 Orders: ${d.total_orders}\n⏳ Pending: ${d.pending_orders}\n` +
        `💵 Cash: ₹${d.cash?.toFixed(0)}\n📱 UPI: ₹${d.upi?.toFixed(0)}\n\n` +
        `🏆 *Top Selling:*\n${topParts}\n\n🏪 New Rahul Auto Spares · Nandyal`;
      Linking.openURL(`https://wa.me/916300281504?text=${encodeURIComponent(msg)}`);
    } catch { Alert.alert('❌ Error', 'Could not fetch daily summary'); }
  };

  const handlePinKey = async (digit) => {
    if (pinInput.length >= 4) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const np = pinInput + digit;
    setPinInput(np); setPinError('');
    if (np.length === 4) setTimeout(() => processPinStep(np), 200);
  };

  const processPinStep = async (entered) => {
    if (pinStep === 'current') {
      if (entered === (staff?.pin || '')) {
        setPinInput(''); setPinStep('new');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPinError('Wrong PIN!'); setTimeout(() => setPinInput(''), 500);
      }
    } else if (pinStep === 'new') {
      setNewPin(entered); setPinInput(''); setPinStep('confirm');
    } else if (pinStep === 'confirm') {
      if (entered === newPin) {
        try {
          await fetch(`${API_URL}/staff/${staff?.id}/pin`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: newPin })
          });
          staff.pin = newPin;
          Alert.alert('✅ PIN Changed!', `New PIN: ${newPin}`);
        } catch { Alert.alert('⚠️ Saved Locally', `New PIN: ${newPin}`); }
        setPinStep(null); setPinInput(''); setNewPin(''); setPinError('');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPinError('PINs do not match!');
        setPinInput(''); setPinStep('new'); setNewPin('');
      }
    }
  };

  // ── SPECIAL SCREENS ──
  if (showScanner) return (
    <QRScannerScreen onScanned={handleQRScanned} onClose={() => setShowScanner(false)} />
  );
  if (showBroadcast) return (
    <BroadcastScreen onBack={() => setShowBroadcast(false)} staff={staff} />
  );
  if (showAnalytics) return (
    <CustomerAnalyticsScreen onBack={() => setShowAnalytics(false)} />
  );
  if (showAddProduct) return (
    <AddProductScreen
      onBack={() => setShowAddProduct(false)}
      onProductAdded={() => { fetchProducts(); setShowAddProduct(false); }}
    />
  );
  if (showCustomers) return (
    <CustomerManagementScreen onBack={() => setShowCustomers(false)} />
  );
  if (showPurchaseOrders) return (
    <PurchaseOrdersScreen onBack={() => setShowPurchaseOrders(false)} />
  );
  if (showAttendance) return (
    <AttendanceScreen onBack={() => setShowAttendance(false)} staff={staff} />
  );
  if (showSalesDashboard) return (
    <SalesDashboardScreen onBack={() => setShowSalesDashboard(false)} />
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />

      {/* HEADER */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerRole}>
            {staff?.role === 'owner' ? 'OWNER'
              : staff?.role === 'senior' ? 'SENIOR STAFF' : 'STAFF'}
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
            <Text style={s.newOrderBadgeText}>{newCount} NEW ORDERS</Text>
          </View>
        )}
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>

        {/* ══ ORDERS TAB ══ */}
        {tab === 'orders' && (
          <View style={{ flex: 1 }}>
            {/* ORDER SEARCH */}
            <View style={s.orderSearchBox}>
              <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" />
              <TextInput
                style={s.orderSearchInput}
                placeholder="Search by customer name or phone..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={orderSearch}
                onChangeText={setOrderSearch}
              />
              {orderSearch.length > 0 && (
                <TouchableOpacity onPress={() => setOrderSearch('')}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}
            </View>
            <View style={s.statsRow}>
              <StatCard icon="receipt-outline" label="New" value={orders.filter(o=>o.status==='new').length} color="#4F6EF7" />
              <StatCard icon="cube-outline" label="Packing" value={orders.filter(o=>o.status==='packing').length} color="#F59E0B" />
              <StatCard icon="checkmark-circle-outline" label="Ready" value={orders.filter(o=>o.status==='ready').length} color={G} />
              <StatCard icon="flag-outline" label="Done" value={orders.filter(o=>o.status==='collected').length} color="rgba(255,255,255,0.4)" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={s.filterScroll} contentContainerStyle={s.filterRow}>
              {[
                { id: 'all', label: `All (${orders.length})` },
                { id: 'new', label: `New (${orders.filter(o=>o.status==='new').length})` },
                { id: 'packing', label: 'Packing' },
                { id: 'ready', label: 'Ready' },
                { id: 'collected', label: 'Done' },
              ].map(f => (
                <TouchableOpacity key={f.id}
                  style={[s.filterChip, statusFilter===f.id && s.filterChipActive]}
                  onPress={() => setStatusFilter(f.id)}>
                  <Text style={[s.filterChipText, statusFilter===f.id && s.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <View style={s.centerBox}>
                <Text style={s.loadingText}>Loading orders...</Text>
              </View>
            ) : orders.filter(o => statusFilter==='all' || o.status===statusFilter).length === 0 ? (
              <View style={s.centerBox}>
                <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
                <Text style={s.emptyText}>
                  {statusFilter === 'all' ? 'No orders yet!' : `No ${statusFilter} orders`}
                </Text>
              </View>
            ) : (
              <FlatList
                data={orders.filter(o => statusFilter==='all' || o.status===statusFilter)}
                keyExtractor={i => i.id.toString()}
                contentContainerStyle={{ padding: 12 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.orderCard, item.status==='new' && s.orderCardNew]}
                    onPress={() => openOrder(item)}>
                    <View style={s.orderTop}>
                      <View style={s.orderIdRow}>
                        <Text style={s.orderId}>{item.custom_id || `RAS-${item.id}`}</Text>
                        {item.status === 'new' && (
                          <View style={s.newPill}>
                            <Text style={s.newPillText}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.orderAmt}>₹{item.total_amount}</Text>
                    </View>
                    <View style={s.orderCustomerRow}>
                      <Text style={s.orderCustomer}>{item.customer_name || 'Customer'}</Text>
                      {item.customer_phone && (
                        <TouchableOpacity style={s.orderCallBtn}
                          onPress={() => Linking.openURL(`tel:${item.customer_phone}`)}>
                          <Ionicons name="call" size={12} color={G} />
                          <Text style={s.orderPhone}>{item.customer_phone}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {item.pickup_time && (
                      <Text style={s.orderPickup}>Pickup: {item.pickup_time}</Text>
                    )}
                    <View style={s.orderBottom}>
                      <View style={[s.statusPill, {
                        backgroundColor: (STATUS_COLORS[item.status]||G)+'15',
                        borderColor: (STATUS_COLORS[item.status]||G)+'40'
                      }]}>
                        <Text style={[s.statusPillText, { color: STATUS_COLORS[item.status]||G }]}>
                          {STATUS_LABELS[item.status]||item.status}
                        </Text>
                      </View>
                    </View>
                    {/* QUICK ACTION BUTTONS */}
                    {item.status === 'new' && (
                      <TouchableOpacity style={s.quickStatusBtn}
                        onPress={(e) => { e.stopPropagation(); updateStatus(item.id, 'packing'); }}>
                        <Text style={s.quickStatusBtnText}>Mark as Packing</Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'packing' && (
                      <TouchableOpacity style={[s.quickStatusBtn, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)' }]}
                        onPress={(e) => { e.stopPropagation(); updateStatus(item.id, 'ready'); }}>
                        <Text style={[s.quickStatusBtnText, { color: '#22C55E' }]}>Mark as Ready</Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'ready' && (
                      <TouchableOpacity style={[s.quickStatusBtn, { backgroundColor: 'rgba(107,114,128,0.15)', borderColor: 'rgba(107,114,128,0.4)' }]}
                        onPress={(e) => { e.stopPropagation(); updateStatus(item.id, 'collected', item); }}>
                        <Text style={[s.quickStatusBtnText, { color: '#9CA3AF' }]}>Mark as Collected</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* ══ STAFF MANAGER MODAL ══ */}
      <Modal visible={showStaffManager} animationType="slide"
        onRequestClose={() => setShowStaffManager(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#060E06' }}>
          <StatusBar barStyle="light-content" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBackBtn}
              onPress={() => setShowStaffManager(false)}>
              <Ionicons name="arrow-back" size={20} color={G} />
            </TouchableOpacity>
            <Text style={s.modalHeaderTitle}>Staff Manager</Text>
            <TouchableOpacity onPress={fetchAllStaff}>
              <Ionicons name="refresh" size={20} color={G} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14 }}>
            {/* ADD NEW STAFF */}
            <View style={s.addRewardForm}>
              <Text style={s.addRewardFormTitle}>Add New Staff Member</Text>

              <Text style={s.staffInputLabel}>Full Name *</Text>
              <TextInput style={s.vendorInput}
                placeholder="e.g. Rahul Kumar"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newStaffName} onChangeText={setNewStaffName}
                autoCapitalize="words" />

              <Text style={s.staffInputLabel}>Phone Number</Text>
              <TextInput style={s.vendorInput}
                placeholder="10-digit mobile number"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newStaffPhone} onChangeText={setNewStaffPhone}
                keyboardType="phone-pad" maxLength={10} />

              <Text style={s.staffInputLabel}>Role</Text>
              <View style={s.roleSelector}>
                {['staff', 'senior', 'owner'].map(role => (
                  <TouchableOpacity key={role}
                    style={[s.roleBtn, newStaffRole === role && s.roleBtnActive]}
                    onPress={() => setNewStaffRole(role)}>
                    <Text style={[s.roleBtnText, newStaffRole === role && s.roleBtnTextActive]}>
                      {role === 'owner' ? 'Owner' : role === 'senior' ? 'Senior' : 'Staff'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.staffInputLabel}>Login PIN (4 digits) *</Text>
              <TextInput style={s.vendorInput}
                placeholder="e.g. 6789"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newStaffPin} onChangeText={setNewStaffPin}
                keyboardType="numeric" maxLength={4}
                secureTextEntry />

              <TouchableOpacity style={s.saveVendorBtn} onPress={addNewStaff}>
                <Text style={s.saveVendorBtnText}>Add Staff Member</Text>
              </TouchableOpacity>
            </View>

            {/* CURRENT STAFF */}
            <Text style={s.historyTitle}>CURRENT STAFF ({allStaff.length})</Text>
            {allStaff.map(member => (
              <View key={member.id} style={s.staffCard}>
                <View style={s.staffCardAvatar}>
                  <Text style={s.staffCardInitials}>
                    {(member.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.staffCardName}>{member.name}</Text>
                  <View style={s.staffCardRow}>
                    <View style={[s.staffRolePill, {
                      backgroundColor: member.role === 'owner' ? 'rgba(201,168,76,0.15)'
                        : member.role === 'senior' ? 'rgba(79,110,247,0.15)'
                        : 'rgba(34,197,94,0.15)'
                    }]}>
                      <Text style={[s.staffRolePillText, {
                        color: member.role === 'owner' ? '#C9A84C'
                          : member.role === 'senior' ? '#4F6EF7' : '#22C55E'
                      }]}>
                        {member.role?.toUpperCase()}
                      </Text>
                    </View>
                    {member.phone && (
                      <Text style={s.staffCardPhone}>+91 {member.phone}</Text>
                    )}
                  </View>
                  <Text style={s.staffCardId}>Staff ID #{member.id}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${member.phone}`)}>
                  <Ionicons name="call-outline" size={20} color={G} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══ ACTIVITY LOG MODAL ══ */}
      <Modal visible={showActivityLog} animationType="slide"
        onRequestClose={() => setShowActivityLog(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#060E06' }}>
          <StatusBar barStyle="light-content" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBackBtn}
              onPress={() => setShowActivityLog(false)}>
              <Ionicons name="arrow-back" size={20} color={G} />
            </TouchableOpacity>
            <Text style={s.modalHeaderTitle}>Activity Log</Text>
            <TouchableOpacity onPress={fetchActivityLog}>
              <Ionicons name="refresh" size={20} color={G} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14 }}>
            {activityLog.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Ionicons name="list-circle-outline" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12, fontSize: 14 }}>
                  No activity yet
                </Text>
              </View>
            ) : (
              activityLog.map((log, i) => {
                const date = new Date(log.created_at);
                const timeStr = date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const isOrder = log.action.includes('Pack') || log.action.includes('Ready') || log.action.includes('Collect');
                const isClock = log.action.includes('Clock');
                const iconName = isOrder ? 'receipt-outline' : isClock ? 'time-outline' : 'ellipse-outline';
                const iconColor = isOrder ? '#22C55E' : isClock ? '#4F6EF7' : 'rgba(255,255,255,0.3)';

                return (
                  <View key={log.id} style={s.activityRow}>
                    <View style={[s.activityIconBox, { backgroundColor: iconColor + '15' }]}>
                      <Ionicons name={iconName} size={16} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.activityTopRow}>
                        <Text style={s.activityStaff}>{log.staff_name}</Text>
                        <Text style={s.activityTime}>{timeStr} · {dateStr}</Text>
                      </View>
                      <Text style={[s.activityAction, { color: iconColor }]}>{log.action}</Text>
                      {log.details ? (
                        <Text style={s.activityDetails}>{log.details}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══ ACTIVITY LOG MODAL ══ */}
      <Modal visible={showActivityLog} animationType="slide"
        onRequestClose={() => setShowActivityLog(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#060E06' }}>
          <StatusBar barStyle="light-content" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBackBtn}
              onPress={() => setShowActivityLog(false)}>
              <Ionicons name="arrow-back" size={20} color={G} />
            </TouchableOpacity>
            <Text style={s.modalHeaderTitle}>Activity Log</Text>
            <TouchableOpacity onPress={fetchActivityLog}>
              <Ionicons name="refresh" size={20} color={G} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14 }}>
            {activityLog.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Ionicons name="list-circle-outline" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12, fontSize: 14 }}>
                  No activity yet
                </Text>
              </View>
            ) : (
              activityLog.map((log, i) => {
                const date = new Date(log.created_at);
                const timeStr = date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const isOrder = log.action.includes('Pack') || log.action.includes('Ready') || log.action.includes('Collect');
                const isClock = log.action.includes('Clock');
                const iconName = isOrder ? 'receipt-outline' : isClock ? 'time-outline' : 'ellipse-outline';
                const iconColor = isOrder ? '#22C55E' : isClock ? '#4F6EF7' : 'rgba(255,255,255,0.3)';

                return (
                  <View key={log.id} style={s.activityRow}>
                    <View style={[s.activityIconBox, { backgroundColor: iconColor + '15' }]}>
                      <Ionicons name={iconName} size={16} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.activityTopRow}>
                        <Text style={s.activityStaff}>{log.staff_name}</Text>
                        <Text style={s.activityTime}>{timeStr} · {dateStr}</Text>
                      </View>
                      <Text style={[s.activityAction, { color: iconColor }]}>{log.action}</Text>
                      {log.details ? (
                        <Text style={s.activityDetails}>{log.details}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══ REWARDS MANAGER MODAL ══ */}
      <Modal visible={showRewardManager} animationType="slide"
        onRequestClose={() => setShowRewardManager(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#060E06' }}>
          <StatusBar barStyle="light-content" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBackBtn}
              onPress={() => setShowRewardManager(false)}>
              <Ionicons name="arrow-back" size={20} color={G} />
            </TouchableOpacity>
            <Text style={s.modalHeaderTitle}>Rewards Manager</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14 }}>
            {/* ADD REWARD FORM */}
            <View style={s.addRewardForm}>
              <Text style={s.addRewardFormTitle}>Add New Reward</Text>
              <TextInput style={s.vendorInput}
                placeholder="Product name (e.g. Engine Oil 900ml)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newRewardName} onChangeText={setNewRewardName} />
              <TextInput style={s.vendorInput}
                placeholder="Description (optional)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newRewardDesc} onChangeText={setNewRewardDesc} />
              <TextInput style={s.vendorInput}
                placeholder="Points required (e.g. 100)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newRewardPoints} onChangeText={setNewRewardPoints}
                keyboardType="numeric" />
              <TouchableOpacity style={s.saveVendorBtn} onPress={addReward}>
                <Text style={s.saveVendorBtnText}>Add Reward</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.historyTitle}>CURRENT REWARDS</Text>

            {rewards.length === 0 ? (
              <Text style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 20 }}>
                No rewards added yet
              </Text>
            ) : (
              rewards.map(reward => (
                <View key={reward.id} style={s.rewardManagerCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rewardManagerName}>{reward.name}</Text>
                    {reward.description ? (
                      <Text style={s.rewardManagerDesc}>{reward.description}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Ionicons name="star" size={12} color="#C9A84C" />
                      <Text style={s.rewardManagerPoints}>{reward.points_required} points required</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.rewardDeleteBtn}
                    onPress={() => Alert.alert('Delete?', `Remove "${reward.name}" reward?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteReward(reward.id) }
                    ])}>
                    <Ionicons name="trash-outline" size={18} color="rgba(239,68,68,0.7)" />
                  </TouchableOpacity>
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══ CUSTOMER HISTORY MODAL ══ */}
      <Modal visible={showCustomerHistory} animationType="slide"
        onRequestClose={() => setShowCustomerHistory(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#060E06' }}>
          <StatusBar barStyle="light-content" backgroundColor="#060E06" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBackBtn}
              onPress={() => { setShowCustomerHistory(false); setSelectedCustomer(null); setCustomerOrders([]); }}>
              <Ionicons name="arrow-back" size={20} color={G} />
            </TouchableOpacity>
            <Text style={s.modalHeaderTitle}>
              {selectedCustomer ? selectedCustomer.name : 'Customer History'}
            </Text>
          </View>

          {!selectedCustomer ? (
            /* CUSTOMER LIST */
            <View style={{ flex: 1 }}>
              <View style={s.customerSearchBox}>
                <Ionicons name="search" size={16} color="rgba(255,255,255,0.3)" />
                <TextInput style={s.customerSearchInput}
                  placeholder="Search customers..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={customerSearch}
                  onChangeText={setCustomerSearch} />
              </View>
              <ScrollView contentContainerStyle={{ padding: 14 }}>
                {allCustomers
                  .filter(c => !customerSearch ||
                    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.phone?.includes(customerSearch))
                  .map((c, i) => (
                    <TouchableOpacity key={i} style={s.customerRow}
                      onPress={() => {
                        setSelectedCustomer(c);
                        fetchCustomerHistory(c.phone);
                      }}>
                      <View style={s.customerAvatar}>
                        <Text style={s.customerAvatarText}>
                          {(c.name || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.customerRowName}>{c.name}</Text>
                        <Text style={s.customerRowPhone}>+91 {c.phone}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  ))}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          ) : (
            /* CUSTOMER ORDER HISTORY */
            <ScrollView contentContainerStyle={{ padding: 14 }}>
              {/* Customer Summary */}
              <View style={s.customerSummaryCard}>
                <View style={s.customerSummaryAvatar}>
                  <Text style={s.customerSummaryAvatarText}>
                    {(selectedCustomer.name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={s.customerSummaryName}>{selectedCustomer.name}</Text>
                <Text style={s.customerSummaryPhone}>+91 {selectedCustomer.phone}</Text>
                <View style={s.customerSummaryStats}>
                  <View style={s.customerSummaryStat}>
                    <Text style={s.customerSummaryStatValue}>{customerOrders.length}</Text>
                    <Text style={s.customerSummaryStatLabel}>Orders</Text>
                  </View>
                  <View style={s.customerSummaryStat}>
                    <Text style={s.customerSummaryStatValue}>
                      ₹{customerOrders.reduce((s,o) => s + (o.total_amount||0), 0).toFixed(0)}
                    </Text>
                    <Text style={s.customerSummaryStatLabel}>Total Spent</Text>
                  </View>
                  <View style={s.customerSummaryStat}>
                    <Text style={s.customerSummaryStatValue}>
                      {customerOrders.filter(o => o.status === 'collected').length}
                    </Text>
                    <Text style={s.customerSummaryStatLabel}>Completed</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.customerCallBtn}
                  onPress={() => Linking.openURL(`https://wa.me/91${selectedCustomer.phone}`)}>
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={s.customerCallBtnText}>WhatsApp Customer</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.historyTitle}>ORDER HISTORY</Text>
              {customerOrders.length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 }}>
                  No orders found
                </Text>
              ) : (
                customerOrders.map(order => (
                  <View key={order.id} style={s.historyOrderCard}>
                    <View style={s.historyOrderTop}>
                      <Text style={s.historyOrderId}>{order.custom_id || `RAS-${order.id}`}</Text>
                      <Text style={s.historyOrderAmount}>₹{order.total_amount}</Text>
                    </View>
                    <View style={s.historyOrderBottom}>
                      <View style={[s.historyStatusBadge,
                        { backgroundColor: (STATUS_COLORS[order.status]||G)+'15' }]}>
                        <Text style={[s.historyStatusText,
                          { color: STATUS_COLORS[order.status]||G }]}>
                          {STATUS_LABELS[order.status]||order.status}
                        </Text>
                      </View>
                      <Text style={s.historyOrderDate}>
                        {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                    {order.pickup_time && (
                      <Text style={s.historyPickup}>Pickup: {order.pickup_time}</Text>
                    )}
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ══ SCANNER TAB ══ */}
        {tab === 'scanner' && (
          <View style={s.centerBox}>
            <View style={s.scannerBox}>
              <Text style={{ fontSize: 80 }}>📷</Text>
            </View>
            <Text style={s.scannerTitle}>QR Order Pickup</Text>
            <Text style={s.scannerSub}>Scan customer's QR code to mark order as collected</Text>
            <Text style={[s.scannerSub, { color: 'rgba(34,197,94,0.4)', fontSize: 12 }]}>
              ఆర్డర్ పికప్ కోసం QR స్కాన్ చేయండి
            </Text>
            <TouchableOpacity style={s.scanBtn} onPress={() => setShowScanner(true)}>
              <Text style={s.scanBtnText}>📷 Open QR Scanner</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══ STOCK TAB ══ */}
        {tab === 'stock' && (
          <View style={{ flex: 1 }}>

            {/* LOW STOCK ALERT BANNER */}
            {lowStockProducts.length > 0 && (
              <TouchableOpacity
                style={s.lowStockBanner}
                onPress={() => setShowLowStock(!showLowStock)}>
                <View style={s.lowStockBannerLeft}>
                  <Ionicons name="warning" size={18} color="#EF4444" />
                  <Text style={s.lowStockBannerText}>
                    {lowStockProducts.length} items running low on stock
                  </Text>
                </View>
                <Ionicons
                  name={showLowStock ? 'chevron-up' : 'chevron-down'}
                  size={16} color="#EF4444" />
              </TouchableOpacity>
            )}

            {/* LOW STOCK LIST */}
            {showLowStock && lowStockProducts.length > 0 && (
              <View style={s.lowStockList}>
                {lowStockProducts.map(p => (
                  <View key={p.id} style={s.lowStockItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lowStockItemName}>{p.name_en}</Text>
                      <Text style={s.lowStockItemSku}>{p.sku}</Text>
                    </View>
                    <View style={s.lowStockQtyBox}>
                      <Text style={s.lowStockQty}>{p.stock_qty}</Text>
                      <Text style={s.lowStockQtyLabel}>left</Text>
                    </View>
                    <TouchableOpacity style={s.lowStockOrderBtn}
                      onPress={() => {
                        const msg =
                          `*Low Stock Alert*
` +
                          `New Rahul Auto Spares, Nandyal

` +
                          `Need to reorder:
` +
                          `• ${p.name_en}
` +
                          `  SKU: ${p.sku}
` +
                          `  Current stock: ${p.stock_qty} only

` +
                          `Please send availability & price.`;
                        Linking.openURL(`https://wa.me/916300281504?text=${encodeURIComponent(msg)}`);
                      }}>
                      <Ionicons name="cart-outline" size={14} color="#F59E0B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={s.addProductBanner}
              onPress={() => setShowAddProduct(true)} activeOpacity={0.8}>
              <View style={s.addProductBannerLeft}>
                <View style={s.addProductBannerIcon}>
                  <Ionicons name="add-circle" size={24} color="#22C55E" />
                </View>
                <View>
                  <Text style={s.addProductBannerTitle}>Add New Product</Text>
                  <Text style={s.addProductBannerSub}>Tap to add parts to catalog</Text>
                </View>
              </View>
              <View style={s.addProductBannerArrow}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>→</Text>
              </View>
            </TouchableOpacity>

            <View style={s.stockStatsRow}>
              <View style={s.stockStatCard}>
                <Text style={s.stockStatValue}>{products.length}</Text>
                <Text style={s.stockStatLabel}>Total Parts</Text>
              </View>
              <View style={[s.stockStatCard, { borderColor: 'rgba(239,68,68,0.3)' }]}>
                <Text style={[s.stockStatValue, { color: '#EF4444' }]}>
                  {products.filter(p => p.stock_qty === 0).length}
                </Text>
                <Text style={s.stockStatLabel}>Out of Stock</Text>
              </View>
              <View style={[s.stockStatCard, { borderColor: 'rgba(245,158,11,0.3)' }]}>
                <Text style={[s.stockStatValue, { color: '#F59E0B' }]}>
                  {products.filter(p => p.stock_qty > 0 && p.stock_qty <= 5).length}
                </Text>
                <Text style={s.stockStatLabel}>Low Stock</Text>
              </View>
            </View>

            <View style={s.stockSearchBox}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput style={s.stockSearchInput}
                placeholder="Search products..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={stockSearch} onChangeText={setStockSearch} />
              {stockSearch.length > 0 && (
                <TouchableOpacity onPress={() => setStockSearch('')}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredStock}
              keyExtractor={i => i.id.toString()}
              contentContainerStyle={{ padding: 12, paddingTop: 0 }}
              refreshControl={
                <RefreshControl refreshing={refreshing}
                  onRefresh={async () => { setRefreshing(true); await fetchProducts(); setRefreshing(false); }}
                  tintColor={G} />
              }
              ListEmptyComponent={() => (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 16 }}>
                    {stockSearch ? `No products matching "${stockSearch}"` : 'No products yet!'}
                  </Text>
                  <TouchableOpacity style={s.emptyAddBtn} onPress={() => setShowAddProduct(true)}>
                    <Text style={s.emptyAddBtnText}>➕ Add First Product</Text>
                  </TouchableOpacity>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={[s.stockCard,
                  item.stock_qty <= 5 && item.stock_qty > 0 && s.stockCardLow,
                  item.stock_qty === 0 && s.stockCardOut
                ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stockName}>{item.name_en}</Text>
                    {item.name_te ? (
                      <Text style={{ fontSize: 10, color: 'rgba(34,197,94,0.4)', marginBottom: 2 }}>
                        {item.name_te}
                      </Text>
                    ) : null}
                    <Text style={s.stockSku}>{item.sku}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.stockQty,
                        item.stock_qty === 0 ? { color: '#EF4444' }
                          : item.stock_qty <= 5 ? { color: '#F59E0B' } : { color: G }]}>
                        {item.stock_qty === 0 ? '❌ Out of stock'
                          : item.stock_qty <= 5 ? `⚠️ Low: ${item.stock_qty}`
                          : `✅ ${item.stock_qty} in stock`}
                      </Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                        · ₹{item.selling_price}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.stockBtn}
                    onPress={() => Alert.alert(
                      '📦 Update Stock', `${item.name_en}\nCurrent: ${item.stock_qty} units`,
                      [
                        { text: '+1', onPress: () => updateStock(item.id, item.stock_qty + 1) },
                        { text: '+5', onPress: () => updateStock(item.id, item.stock_qty + 5) },
                        { text: '+10', onPress: () => updateStock(item.id, item.stock_qty + 10) },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    )}>
                    <Text style={s.stockBtnText}>+ Add Stock</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}

        {/* ══ REPORTS TAB ══ */}
        {/* ══ VENDORS TAB ══ */}
        {tab === 'vendors' && (
          <View style={{ flex: 1 }}>
            <View style={s.vendorHeader}>
              <Text style={s.vendorHeaderTitle}>Suppliers & Vendors</Text>
              <TouchableOpacity style={s.addVendorBtn}
                onPress={() => setShowAddVendor(!showAddVendor)}>
                <Ionicons name="add" size={20} color="#22C55E" />
                <Text style={s.addVendorBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* ADD VENDOR FORM */}
            {showAddVendor && (
              <View style={s.addVendorForm}>
                <Text style={s.addVendorFormTitle}>Add New Vendor</Text>
                {[
                  { placeholder: 'Vendor Name *', value: vendorName, setter: setVendorName },
                  { placeholder: 'Phone Number *', value: vendorPhone, setter: setVendorPhone, keyboard: 'phone-pad' },
                  { placeholder: 'Area / Location', value: vendorArea, setter: setVendorArea },
                  { placeholder: 'Parts they supply', value: vendorParts, setter: setVendorParts },
                ].map((field, i) => (
                  <TextInput key={i} style={s.vendorInput}
                    placeholder={field.placeholder}
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={field.value}
                    onChangeText={field.setter}
                    keyboardType={field.keyboard || 'default'} />
                ))}
                <TouchableOpacity style={s.saveVendorBtn}
                  onPress={() => {
                    if (!vendorName || !vendorPhone) {
                      Alert.alert('Required', 'Name and phone are required');
                      return;
                    }
                    const newVendor = {
                      id: Date.now(), name: vendorName, phone: vendorPhone,
                      area: vendorArea, parts: vendorParts,
                      whatsapp: `91${vendorPhone}`
                    };
                    setVendors(v => [...v, newVendor]);
                    setVendorName(''); setVendorPhone('');
                    setVendorArea(''); setVendorParts('');
                    setShowAddVendor(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}>
                  <Text style={s.saveVendorBtnText}>Save Vendor</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {vendors.map(vendor => {
                const isExpanded = expandedVendor === vendor.id;
                return (
                  <View key={vendor.id} style={s.vendorCard}>
                    {/* VENDOR HEADER */}
                    <TouchableOpacity style={s.vendorCardTop}
                      onPress={() => setExpandedVendor(isExpanded ? null : vendor.id)}>
                      <View style={s.vendorAvatar}>
                        <Ionicons name="business" size={20} color="#22C55E" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.vendorName}>{vendor.name}</Text>
                        <Text style={s.vendorParts}>{vendor.parts}</Text>
                        <Text style={s.vendorArea}>{vendor.area} · {vendor.phone}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    {/* QUICK ACTION BUTTONS - always visible */}
                    <View style={s.vendorQuickBtns}>
                      <TouchableOpacity style={s.vendorQuickBtn}
                        onPress={() => Linking.openURL(`tel:${vendor.phone}`)}>
                        <Ionicons name="call" size={14} color="#22C55E" />
                        <Text style={s.vendorQuickBtnText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.vendorQuickBtn, { borderColor: 'rgba(37,211,102,0.3)' }]}
                        onPress={() => Linking.openURL(`https://wa.me/${vendor.whatsapp}?text=Hi, need spare parts`)}>
                        <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                        <Text style={[s.vendorQuickBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.vendorQuickBtn, { borderColor: 'rgba(79,110,247,0.3)', flex: 1.5 }]}
                        onPress={() => setExpandedVendor(isExpanded ? null : vendor.id)}>
                        <Ionicons name="cart" size={14} color="#4F6EF7" />
                        <Text style={[s.vendorQuickBtnText, { color: '#4F6EF7' }]}>Place Order</Text>
                      </TouchableOpacity>
                    </View>

                    {/* EXPANDED ORDER SECTION */}
                    {isExpanded && (
                      <View style={s.vendorOrderSection}>
                        <Text style={s.vendorOrderTitle}>Place Inventory Order</Text>

                        <Text style={s.vendorOrderLabel}>Items needed (one per line)</Text>
                        <TextInput
                          style={s.vendorOrderInput}
                          placeholder={`e.g.\nHero Splendor Brake Shoes x10\nHonda CB Shine Air Filter x5\nEngine Oil 1L x20`}
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          value={vendorOrderNote}
                          onChangeText={setVendorOrderNote}
                          multiline numberOfLines={4}
                          textAlignVertical="top"
                        />

                        <View style={s.vendorOrderBtns}>
                          <TouchableOpacity style={s.vendorSendWaBtn}
                            onPress={() => {
                              const msg =
                                `━━━━━━━━━━━━━━━━━━━━\n` +
                                `*INVENTORY ORDER REQUEST*\n` +
                                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                                `*From:* New Rahul Auto Spares\n` +
                                `*Location:* Telugu Peta, Nandyal\n` +
                                `*Date:* ${new Date().toLocaleDateString('en-IN')}\n\n` +
                                `*Items Required:*\n` +
                                `${vendorOrderNote || 'Please share latest price list'}\n\n` +
                                `*Contact:* Abdul Azeez Basheer\n` +
                                `*Phone:* +91 9642536653\n` +
                                `━━━━━━━━━━━━━━━━━━━━`;
                              Linking.openURL(`https://wa.me/${vendor.whatsapp}?text=${encodeURIComponent(msg)}`);
                            }}>
                            <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                            <Text style={s.vendorSendWaBtnText}>Send via WhatsApp</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={s.vendorCallOrderBtn}
                            onPress={() => Linking.openURL(`tel:${vendor.phone}`)}>
                            <Ionicons name="call" size={16} color="#22C55E" />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={s.vendorDeleteFullBtn}
                          onPress={() => {
                            Alert.alert('Remove Vendor?', `Delete ${vendor.name}?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive',
                                onPress: () => {
                                  setVendors(v => v.filter(vv => vv.id !== vendor.id));
                                  setExpandedVendor(null);
                                }
                              }
                            ]);
                          }}>
                          <Ionicons name="trash-outline" size={14} color="rgba(239,68,68,0.6)" />
                          <Text style={s.vendorDeleteFullBtnText}>Remove Vendor</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ height: 80 }} />
            </ScrollView>
          </View>
        )}

        {/* ══ CUSTOMER HISTORY in Reports ══ */}
        {tab === 'reports' && showCustomerHistory && null}

        {tab === 'reports' && (
          <ScrollView contentContainerStyle={{ padding: 14 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />}>

            {/* STAFF MANAGER */}
            {isOwner && (
              <TouchableOpacity style={s.customerHistoryBtn}
                onPress={() => { fetchAllStaff(); setShowStaffManager(true); }}>
                <View style={s.customerHistoryBtnLeft}>
                  <Ionicons name="people-circle" size={22} color="#22C55E" />
                  <View>
                    <Text style={s.customerHistoryBtnTitle}>Staff Manager</Text>
                    <Text style={s.customerHistoryBtnSub}>Add, view and manage staff profiles</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            )}

            {/* ACTIVITY LOG */}
            {isOwner && (
              <TouchableOpacity style={s.customerHistoryBtn}
                onPress={() => { fetchActivityLog(); setShowActivityLog(true); }}>
                <View style={s.customerHistoryBtnLeft}>
                  <Ionicons name="list-circle" size={22} color="#4F6EF7" />
                  <View>
                    <Text style={s.customerHistoryBtnTitle}>Activity Log</Text>
                    <Text style={s.customerHistoryBtnSub}>See all staff actions in real-time</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            )}

            {/* ACTIVITY LOG */}
            {isOwner && (
              <TouchableOpacity style={s.customerHistoryBtn}
                onPress={() => { fetchActivityLog(); setShowActivityLog(true); }}>
                <View style={s.customerHistoryBtnLeft}>
                  <Ionicons name="list-circle" size={22} color="#4F6EF7" />
                  <View>
                    <Text style={s.customerHistoryBtnTitle}>Activity Log</Text>
                    <Text style={s.customerHistoryBtnSub}>See all staff actions in real-time</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            )}

            {/* REWARDS MANAGER */}
            {isOwner && (
              <TouchableOpacity style={s.customerHistoryBtn}
                onPress={() => setShowRewardManager(true)}>
                <View style={s.customerHistoryBtnLeft}>
                  <Ionicons name="gift" size={22} color="#C9A84C" />
                  <View>
                    <Text style={[s.customerHistoryBtnTitle, { color: '#C9A84C' }]}>Rewards Manager</Text>
                    <Text style={s.customerHistoryBtnSub}>Set free products for point redemption</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            )}

            {/* CUSTOMER HISTORY BUTTON */}
            <TouchableOpacity style={s.customerHistoryBtn}
              onPress={() => { fetchAllCustomers(); setShowCustomerHistory(true); }}>
              <View style={s.customerHistoryBtnLeft}>
                <Ionicons name="people" size={22} color="#4F6EF7" />
                <View>
                  <Text style={s.customerHistoryBtnTitle}>Customer History</Text>
                  <Text style={s.customerHistoryBtnSub}>View all customer orders</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>

            <View style={s.periodRow}>
              {[
                { id: 'daily', label: 'Today' },
                { id: 'weekly', label: 'This Week' },
                { id: 'monthly', label: 'This Month' },
              ].map(p => (
                <TouchableOpacity key={p.id}
                  style={[s.periodBtn, period===p.id && s.periodBtnActive]}
                  onPress={() => { setPeriod(p.id); fetchReports(); }}>
                  <Text style={[s.periodText, period===p.id && s.periodTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.heroCard}>
              <Text style={s.heroLabel}>TOTAL REVENUE</Text>
              <Text style={s.heroValue}>
                ₹{(summary?.total_revenue||0).toLocaleString('en-IN')}
              </Text>
              <Text style={s.heroPeriod}>
                {period==='daily'?'Today':period==='weekly'?'This Week':'This Month'}
              </Text>
            </View>

            <View style={s.statsRow}>
              <StatCard icon="receipt-outline" label="Orders" value={summary?.total_orders||0} color="#4F6EF7" />
              <StatCard icon="cash-outline" label="Cash" value={`₹${(summary?.payment_breakdown?.cash||0).toFixed(0)}`} color={G} />
              <StatCard icon="analytics-outline" label="Pending" value={`₹${(summary?.payment_breakdown?.pending||0).toFixed(0)}`} color="#F59E0B" />
            </View>

            <GoalRing current={summary?.total_revenue||0} target={10000} />
            <StaffLeaderboard orders={orders} />

            {/* ACTION CARDS */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <TouchableOpacity style={[s.actionCard, { borderColor: 'rgba(79,110,247,0.3)' }]}
                onPress={() => setShowSalesDashboard(true)}>
                <Text style={{ fontSize: 26 }}>📊</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.actionCardTitle, { color: '#4F6EF7' }]}>Dashboard</Text>
                  <Text style={s.actionCardSub}>Charts & Analytics</Text>
                </View>
                <Text style={{ color: '#4F6EF7', fontSize: 16 }}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionCard, { borderColor: 'rgba(34,197,94,0.3)' }]}
                onPress={() => setShowCustomers(true)}>
                <Text style={{ fontSize: 26 }}>👥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.actionCardTitle, { color: G }]}>Customers</Text>
                  <Text style={s.actionCardSub}>View all</Text>
                </View>
                <Text style={{ color: G, fontSize: 16 }}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <TouchableOpacity style={[s.actionCard, { borderColor: 'rgba(245,158,11,0.3)' }]}
                onPress={() => setShowPurchaseOrders(true)}>
                <Text style={{ fontSize: 26 }}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.actionCardTitle, { color: '#F59E0B' }]}>Purchase Orders</Text>
                  <Text style={s.actionCardSub}>Reorder stock</Text>
                </View>
                <Text style={{ color: '#F59E0B', fontSize: 16 }}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionCard, { borderColor: 'rgba(37,211,102,0.3)' }]}
                onPress={() => setShowBroadcast(true)}>
                <Text style={{ fontSize: 26 }}>📢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.actionCardTitle, { color: '#25D366' }]}>Broadcast</Text>
                  <Text style={s.actionCardSub}>Message all</Text>
                </View>
                <Text style={{ color: '#25D366', fontSize: 16 }}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity style={[s.actionCard, { borderColor: 'rgba(34,197,94,0.5)' }]}
                onPress={() => setShowAddProduct(true)}>
                <Text style={{ fontSize: 26 }}>➕</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.actionCardTitle, { color: G }]}>Add Product</Text>
                  <Text style={s.actionCardSub}>New parts</Text>
                </View>
                <Text style={{ color: G, fontSize: 16 }}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionCard, { borderColor: 'rgba(34,197,94,0.3)' }]}
                onPress={() => setShowAnalytics(true)}>
                <Text style={{ fontSize: 26 }}>📈</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.actionCardTitle, { color: G }]}>Analytics</Text>
                  <Text style={s.actionCardSub}>Top customers</Text>
                </View>
                <Text style={{ color: G, fontSize: 16 }}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity style={[s.actionCard, { borderColor: 'rgba(255,193,7,0.3)' }]}
                onPress={sendDailySummary}>
                <Text style={{ fontSize: 26 }}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.actionCardTitle, { color: '#FFC107' }]}>Daily Report</Text>
                  <Text style={s.actionCardSub}>Send WhatsApp</Text>
                </View>
                <Text style={{ color: '#FFC107', fontSize: 16 }}>→</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>

            {/* ORDER STATUS */}
            <View style={s.reportCard}>
              <Text style={s.reportCardTitle}>📋 Order Status</Text>
              {[
                { label: '🆕 New', key: 'new', color: '#4F6EF7' },
                { label: '📦 Packing', key: 'packing', color: '#F59E0B' },
                { label: '✅ Ready', key: 'ready', color: G },
                { label: '🏁 Collected', key: 'collected', color: 'rgba(255,255,255,0.4)' },
              ].map((st, i) => (
                <View key={i} style={s.reportRow}>
                  <Text style={s.reportLabel}>{st.label}</Text>
                  <View style={[s.reportPill, { backgroundColor: st.color+'15' }]}>
                    <Text style={[s.reportPillText, { color: st.color }]}>
                      {summary?.order_status_breakdown?.[st.key]||0}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* BESTSELLERS */}
            {bestsellers.length > 0 && (
              <View style={s.reportCard}>
                <Text style={s.reportCardTitle}>🏆 Top Selling</Text>
                {bestsellers.slice(0,5).map((b, i) => (
                  <View key={i} style={s.bestRow}>
                    <Text style={s.bestRank}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bestName} numberOfLines={1}>{b.name_en||b.product_name}</Text>
                      <View style={[s.bestBar, { width: `${(b.total_qty/(bestsellers[0]?.total_qty||1))*100}%`, backgroundColor: i===0?'#FFC107':G }]} />
                    </View>
                    <Text style={[s.bestQty, i===0&&{color:'#FFC107'}]}>{b.total_qty} sold</Text>
                  </View>
                ))}
              </View>
            )}

            {/* OFFERS */}
            {(isOwner || isSenior) && (
              <View style={s.reportCard}>
                <View style={s.offerHeader}>
                  <Text style={s.reportCardTitle}>🎁 Active Offers</Text>
                  <TouchableOpacity onPress={() => setShowOfferForm(true)}>
                    <Text style={s.addOfferText}>+ Add Offer</Text>
                  </TouchableOpacity>
                </View>
                {offers.length === 0 ? (
                  <Text style={s.emptyText}>No offers yet</Text>
                ) : offers.map((o, i) => (
                  <View key={i} style={s.offerRow}>
                    <Text style={{ fontSize: 24 }}>{o.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.offerTitle, !o.is_active && { opacity: 0.4 }]}>{o.title}</Text>
                      {o.discount_percent > 0 && <Text style={s.offerPct}>{o.discount_percent}% OFF</Text>}
                    </View>
                    <TouchableOpacity style={[s.toggleBtn, o.is_active && s.toggleBtnOn]}
                      onPress={() => toggleOffer(o.id)}>
                      <Text style={[s.toggleBtnText, o.is_active && { color: G }]}>
                        {o.is_active ? '● ON' : '○ OFF'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteOffer(o.id)} style={{ padding: 4 }}>
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {/* ══ PROFILE TAB ══ */}
        {tab === 'profile' && (
          <ScrollView contentContainerStyle={{ padding: 16 }}>

            {/* PROFILE CARD */}
            <View style={s.profileCard}>
              <AvatarRing
                avatar={avatar}
                profileImage={profileImage}
                size={90}
                onPress={() => setShowAvatarPicker(true)}
              />
              <Text style={s.changeHint}>Tap photo to change</Text>
              <Text style={s.profileName}>{staff?.name}</Text>
              <Text style={s.profileRole}>{staff?.role?.toUpperCase()}</Text>
              <Text style={s.profileId}>Staff ID #{staff?.id}</Text>
              {staff?.phone && (
                <Text style={s.profilePhone}>+91 {staff.phone}</Text>
              )}
            </View>

            {/* EDIT PROFILE */}
            <TouchableOpacity style={s.settingCard}
              onPress={() => {
                setEditName(staff?.name||'');
                setEditPhone(staff?.phone||'');
                setShowEditProfile(true);
              }}>
              <Ionicons name="create-outline" size={22} color={G} style={s.settingIconIon} />
              <View style={{ flex: 1 }}>
                <Text style={s.settingTitle}>Edit My Profile</Text>
                <Text style={s.settingSub}>Update name and phone number</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>

            {/* MY STATS */}
            <View style={s.statsCardProfile}>
              <Text style={s.statsCardTitle}>My Stats This Month</Text>
              <View style={s.statsGridProfile}>
                {[
                  { icon:'cube-outline', label:'Packed', value:staffStats?.packed||0, color:'#F59E0B' },
                  { icon:'checkmark-circle-outline', label:'Completed', value:staffStats?.collected||0, color:G },
                  { icon:'cash-outline', label:'Revenue', value:`₹${((staffStats?.revenue||0)/1000).toFixed(1)}k`, color:'#FFC107' },
                ].map((item, i) => (
                  <View key={i} style={[s.statItemProfile, { borderColor: item.color+'30' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                    <Text style={[s.statItemValue, { color: item.color }]}>{item.value}</Text>
                    <Text style={s.statItemLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={s.refreshStatsBtn} onPress={fetchStaffStats}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="refresh" size={14} color={G} /><Text style={s.refreshStatsBtnText}>Refresh Stats</Text></View>
              </TouchableOpacity>
            </View>

            {/* ATTENDANCE */}
            <TouchableOpacity style={s.settingCard} onPress={() => setShowAttendance(true)}>
              <Ionicons name="calendar-outline" size={22} color={G} style={{ width: 28 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.settingTitle}>Attendance & Salary</Text>
                <Text style={s.settingSub}>Clock in/out · Monthly report · Salary</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>

            {/* PRICE MANAGER */}
            {(isOwner || isSenior) && (
              <TouchableOpacity
                style={[s.settingCard, { borderColor: 'rgba(255,193,7,0.3)' }]}
                onPress={() => { setShowPriceManager(true); if (products.length === 0) fetchProducts(); }}>
                <Ionicons name="pricetag-outline" size={22} color="#FFC107" style={s.settingIconIon} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.settingTitle, { color: '#FFC107' }]}>Price Manager</Text>
                  <Text style={s.settingSub}>Edit MRP and selling prices</Text>
                </View>
                <Text style={[s.settingArrow, { color: '#FFC107' }]}>→</Text>
              </TouchableOpacity>
            )}

            {/* CLOCK */}
            <TouchableOpacity style={[s.clockCard, isClockedIn && s.clockCardIn]} onPress={handleClock}>
              <Ionicons name={isClockedIn ? 'stop-circle' : 'play-circle'} size={32} color={isClockedIn ? '#EF4444' : G} />
              <View style={{ flex: 1 }}>
                <Text style={[s.clockTitle, { color: isClockedIn ? '#EF4444' : G }]}>
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </Text>
                {isClockedIn && clockTime && (
                  <Text style={s.clockSub}>
                    Since {new Date(clockTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
              <View style={[s.clockDot, { backgroundColor: isClockedIn ? '#EF4444' : G }]} />
            </TouchableOpacity>

            {/* CHANGE PIN */}
            <TouchableOpacity style={s.pinCard}
              onPress={() => { setPinStep('current'); setPinInput(''); setPinError(''); }}>
              <Text style={{ fontSize: 28 }}>🔐</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.pinCardTitle}>Change My PIN</Text>
                <Text style={s.pinCardSub}>Update your 4-digit login PIN</Text>
              </View>
              <Text style={{ color: G, fontSize: 20 }}>→</Text>
            </TouchableOpacity>

            {/* LOGOUT */}
            <TouchableOpacity style={s.logoutBtn}
              onPress={() => Alert.alert('Logout?', 'Exit the store panel?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: onLogout }
              ])}>
              <Text style={s.logoutText}>← Logout</Text>
            </TouchableOpacity>

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>

      <BottomNav active={tab} onChange={setTab} newCount={newCount} />

      {/* ══ AVATAR PICKER ══ */}
      <AvatarPickerModal
        visible={showAvatarPicker}
        currentAvatar={avatar}
        currentImage={profileImage}
        onSelectEmoji={saveAvatar}
        onSelectImage={saveProfileImage}
        onClose={() => setShowAvatarPicker(false)}
      />

      {/* ══ ORDER DETAIL MODAL ══ */}
      <Modal visible={selectedOrder !== null} animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}>
        {selectedOrder && (
          <SafeAreaView style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor="#060E06" />
            <View style={s.modalHeader}>
              <TouchableOpacity style={s.modalBack}
                onPress={() => { setSelectedOrder(null); setOrderItems([]); }}>
                <Text style={s.modalBackText}>← Back</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>{selectedOrder.custom_id||`RAS-${selectedOrder.id}`}</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>👤 Customer</Text>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Name</Text>
                  <Text style={s.detailValue}>{selectedOrder.customer_name||'—'}</Text>
                </View>
                {selectedOrder.customer_phone && (
                  <TouchableOpacity style={s.detailRow}
                    onPress={() => Linking.openURL(`tel:${selectedOrder.customer_phone}`)}>
                    <Text style={s.detailLabel}>Phone</Text>
                    <Text style={[s.detailValue, { color: G }]}>📞 {selectedOrder.customer_phone}</Text>
                  </TouchableOpacity>
                )}
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Pickup</Text>
                  <Text style={s.detailValue}>{selectedOrder.pickup_time||'—'}</Text>
                </View>
                <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.detailLabel}>Total</Text>
                  <Text style={[s.detailValue, { color: '#FFC107', fontSize: 18 }]}>₹{selectedOrder.total_amount}</Text>
                </View>
              </View>

              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>📦 Items</Text>
                {orderItems.length === 0 ? (
                  <Text style={s.loadingText}>Loading items...</Text>
                ) : orderItems.map((item, i) => (
                  <View key={i} style={[s.itemRow, i===orderItems.length-1&&{borderBottomWidth:0}]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{item.name_en||item.product_name}</Text>
                      <Text style={s.itemSku}>{item.sku}</Text>
                    </View>
                    <Text style={s.itemQty}>x{item.quantity||item.qty}</Text>
                    <Text style={s.itemPrice}>₹{item.unit_price||item.price}</Text>
                  </View>
                ))}
              </View>

              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>🔄 Update Status</Text>
                <View style={s.statusGrid}>
                  {[
                    { k:'new', l:'🆕 New', c:'#4F6EF7' },
                    { k:'packing', l:'📦 Packing', c:'#F59E0B' },
                    { k:'ready', l:'✅ Ready!', c:G },
                    { k:'collected', l:'🏁 Collected', c:'rgba(255,255,255,0.4)' },
                  ].map(st => (
                    <TouchableOpacity key={st.k}
                      style={[s.statusBtn, selectedOrder.status===st.k && { backgroundColor: st.c+'20', borderColor: st.c }]}
                      onPress={() => updateStatus(selectedOrder.id, st.k)}>
                      <Text style={[s.statusBtnText, selectedOrder.status===st.k && { color: st.c }]}>{st.l}</Text>
                      {selectedOrder.status===st.k && <Text style={[s.currentTag, { color: st.c }]}>CURRENT</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>💳 Payment</Text>
                <View style={s.paymentRow}>
                  {[
                    { k:'cash', l:'💵 Cash' },
                    { k:'upi', l:'📱 UPI' },
                    { k:'pending', l:'⏳ Pending' },
                  ].map(p => (
                    <TouchableOpacity key={p.k}
                      style={[s.payBtn, selectedOrder.payment_type===p.k && { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: G }]}
                      onPress={() => updatePayment(selectedOrder.id, p.k)}>
                      <Text style={[s.payBtnText, selectedOrder.payment_type===p.k && { color: G }]}>{p.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TouchableOpacity
                  style={[s.waBtn, { flex: 1, backgroundColor: 'rgba(79,110,247,0.1)', borderColor: 'rgba(79,110,247,0.3)' }]}
                  onPress={() => handleGenerateInvoice(selectedOrder, false)} disabled={generatingInvoice}>
                  <Text style={[s.waBtnText, { color: '#4F6EF7' }]}>
                    {generatingInvoice ? '⏳...' : '🧾 Invoice'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.waBtn, { flex: 1, backgroundColor: 'rgba(255,193,7,0.1)', borderColor: 'rgba(255,193,7,0.3)' }]}
                  onPress={() => handleGenerateInvoice(selectedOrder, true)} disabled={generatingInvoice}>
                  <Text style={[s.waBtnText, { color: '#FFC107' }]}>
                    {generatingInvoice ? '⏳...' : '🧾 GST Bill'}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedOrder.customer_phone && (
                <TouchableOpacity style={s.waBtn}
                  onPress={() => {
                    const msg =
                      `Hi ${selectedOrder.customer_name}! 🙏\n` +
                      `Order ${selectedOrder.custom_id||`RAS-${selectedOrder.id}`} ` +
                      `is ${selectedOrder.status==='ready' ? '✅ READY for pickup!' : 'being processed.'}\n` +
                      `📍 New Rahul Auto Spares, Nandyal`;
                    Linking.openURL(`https://wa.me/91${selectedOrder.customer_phone}?text=${encodeURIComponent(msg)}`);
                  }}>
                  <Text style={s.waBtnText}>💬 WhatsApp Customer</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ══ EDIT PROFILE MODAL ══ */}
      <Modal visible={showEditProfile} animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" backgroundColor="#060E06" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBack} onPress={() => setShowEditProfile(false)}>
              <Text style={s.modalBackText}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>✏️ Edit My Profile</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>

            {/* AVATAR IN EDIT MODAL — also tappable */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <AvatarRing
                avatar={avatar}
                profileImage={profileImage}
                size={100}
                onPress={() => {
                  setShowEditProfile(false);
                  setTimeout(() => setShowAvatarPicker(true), 400);
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  setShowEditProfile(false);
                  setTimeout(() => setShowAvatarPicker(true), 400);
                }}
                style={s.changePicBtn}>
                <Text style={s.changePicBtnText}>📸 Change Profile Picture</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: G, letterSpacing: 2, marginTop: 4, fontWeight: 'bold' }}>
                {staff?.role?.toUpperCase()}
              </Text>
            </View>

            <Text style={s.editLabel}>Your Name</Text>
            <TextInput style={s.editInput} value={editName} onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.2)" autoCapitalize="words" />

            <Text style={s.editLabel}>Phone Number</Text>
            <View style={s.editPhoneBox}>
              <Text style={s.editPhonePrefix}>+91</Text>
              <TextInput style={s.editPhoneInput} value={editPhone} onChangeText={setEditPhone}
                placeholder="10 digit number"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="phone-pad" maxLength={10} />
            </View>

            <TouchableOpacity
              style={[s.saveProfileBtn, savingProfile && { opacity: 0.5 }]}
              onPress={saveProfile} disabled={savingProfile}>
              <Text style={s.saveProfileBtnText}>
                {savingProfile ? '⏳ Saving...' : '✅ Save Changes'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══ PRICE MANAGER MODAL ══ */}
      <Modal visible={showPriceManager} animationType="slide"
        onRequestClose={() => { setShowPriceManager(false); setEditingPriceId(null); }}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" backgroundColor="#060E06" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBack}
              onPress={() => { setShowPriceManager(false); setEditingPriceId(null); }}>
              <Text style={s.modalBackText}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>💰 Price Manager</Text>
          </View>
          <View style={s.stockSearchBox}>
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <TextInput style={s.stockSearchInput} placeholder="Search products..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={priceSearch} onChangeText={setPriceSearch} />
          </View>
          <FlatList
            data={filteredPriceProducts}
            keyExtractor={i => i.id.toString()}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <View style={s.priceCard}>
                <View style={s.priceCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.priceProductName}>{item.name_en}</Text>
                    <Text style={s.priceProductSku}>{item.sku}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.editPriceBtn, editingPriceId===item.id && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' }]}
                    onPress={() => {
                      if (editingPriceId===item.id) setEditingPriceId(null);
                      else { setEditingPriceId(item.id); setNewMrp(item.mrp?.toString()||''); setNewSellingPrice(item.selling_price?.toString()||''); }
                    }}>
                    <Text style={s.editPriceBtnText}>{editingPriceId===item.id ? '✕ Cancel' : '✏️ Edit'}</Text>
                  </TouchableOpacity>
                </View>
                {editingPriceId !== item.id ? (
                  <View style={s.priceDisplay}>
                    {[
                      { label: 'MRP', value: `₹${item.mrp}`, color: '#fff' },
                      { label: 'Selling', value: `₹${item.selling_price}`, color: '#FFC107' },
                      { label: 'Margin', value: `₹${(item.mrp-item.selling_price).toFixed(0)}`, color: G },
                    ].map((p, i) => (
                      <View key={i} style={s.priceItem}>
                        <Text style={s.priceItemLabel}>{p.label}</Text>
                        <Text style={[s.priceItemValue, { color: p.color }]}>{p.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={s.priceEditForm}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.priceEditLabel}>MRP (₹)</Text>
                        <TextInput style={s.priceEditInput} value={newMrp} onChangeText={setNewMrp}
                          keyboardType="numeric" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.priceEditLabel}>Selling (₹)</Text>
                        <TextInput style={[s.priceEditInput, { borderColor: 'rgba(255,193,7,0.4)' }]}
                          value={newSellingPrice} onChangeText={setNewSellingPrice}
                          keyboardType="numeric" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" />
                      </View>
                    </View>
                    <TouchableOpacity style={s.savePriceBtn} onPress={() => savePrice(item.id)}>
                      <Text style={s.savePriceBtnText}>✅ Save Price</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* ══ PIN CHANGE MODAL ══ */}
      <Modal visible={pinStep !== null} animationType="slide"
        onRequestClose={() => { setPinStep(null); setPinInput(''); setNewPin(''); setPinError(''); }}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" backgroundColor="#060E06" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBack}
              onPress={() => { setPinStep(null); setPinInput(''); setNewPin(''); setPinError(''); }}>
              <Text style={s.modalBackText}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>🔐 Change PIN</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 }}>
              {pinStep==='current'?'Enter Current PIN':pinStep==='new'?'Enter New PIN':'Confirm New PIN'}
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(34,197,94,0.4)', marginBottom: 24 }}>
              {pinStep==='current'?'ప్రస్తుత PIN నమోదు చేయండి':'కొత్త PIN నమోదు చేయండి'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 18, marginBottom: 12 }}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[{
                  width: 18, height: 18, borderRadius: 9,
                  backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)',
                }, i<pinInput.length && { backgroundColor: G, borderColor: G }]} />
              ))}
            </View>
            {pinError ? (
              <Text style={{ fontSize: 14, color: '#EF4444', fontWeight: 'bold', marginBottom: 20 }}>{pinError}</Text>
            ) : (
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginBottom: 20 }}>Enter 4 digits</Text>
            )}
            <View style={{ width: '100%', gap: 12 }}>
              {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
                  {row.map((key, ki) => (
                    <TouchableOpacity key={ki}
                      style={[{
                        width: 76, height: 76, borderRadius: 38, backgroundColor: '#0D1A0D',
                        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
                        borderColor: 'rgba(34,197,94,0.2)',
                      }, key==='' && { backgroundColor: 'transparent', borderColor: 'transparent' }]}
                      onPress={() => {
                        if (key==='⌫') { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPinInput(p => p.slice(0,-1)); setPinError(''); }
                        else if (key) handlePinKey(key);
                      }}
                      disabled={key===''}>
                      <Text style={[{ fontSize: 28, fontWeight: 'bold', color: '#fff' }, key==='⌫' && { color: '#EF4444' }]}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ══ ADD OFFER MODAL ══ */}
      <Modal visible={showOfferForm} animationType="slide"
        onRequestClose={() => setShowOfferForm(false)}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" backgroundColor="#060E06" />
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalBack} onPress={() => setShowOfferForm(false)}>
              <Text style={s.modalBackText}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>🎁 Create Offer</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={s.editLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
              {['🎉','🎁','🔥','⭐','💥','🏷️','🎊','✨'].map(e => (
                <TouchableOpacity key={e}
                  style={[{
                    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 12,
                    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
                    borderColor: 'rgba(34,197,94,0.15)', width: 50, height: 50,
                  }, offerEmoji===e && { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: G }]}
                  onPress={() => setOfferEmoji(e)}>
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.editLabel}>Offer Title *</Text>
            <TextInput style={s.editInput} placeholder="e.g. Diwali Special!"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={offerTitle} onChangeText={setOfferTitle} />
            <Text style={s.editLabel}>Description</Text>
            <TextInput style={s.editInput} placeholder="e.g. All oils at special price"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={offerDesc} onChangeText={setOfferDesc} />
            <Text style={s.editLabel}>Discount %</Text>
            <TextInput style={s.editInput} placeholder="e.g. 10"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={offerDiscount} onChangeText={setOfferDiscount} keyboardType="numeric" />
            <TouchableOpacity
              style={[s.saveProfileBtn, !offerTitle.trim() && { opacity: 0.4 }]}
              onPress={createOffer} disabled={!offerTitle.trim()}>
              <Text style={s.saveProfileBtnText}>✅ Create Offer</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  header: {
    backgroundColor: '#0D1A0D', paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.15)', gap: 8,
  },
  headerRole: { fontSize: 10, color: 'rgba(34,197,94,0.6)', letterSpacing: 2, marginBottom: 2 },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  offlineBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  offlineBadgeText: { color: '#F59E0B', fontSize: 10 },
  newOrderBadge: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  newOrderBadgeText: { color: '#EF4444', fontSize: 11, fontWeight: 'bold' },
  refreshBtn: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  orderSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0D1A0D', marginHorizontal: 12, marginTop: 10,
    marginBottom: 4, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  orderSearchInput: { flex: 1, color: '#fff', fontSize: 13 },
  // Quick status button on order card
  quickStatusBtn: {
    backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center', marginTop: 8,
  },
  quickStatusBtnText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },

  // Vendor styles
  vendorHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.1)',
  },
  vendorHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  addVendorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  addVendorBtnText: { color: '#22C55E', fontWeight: '700', fontSize: 13 },
  addVendorForm: {
    backgroundColor: '#0D1A0D', margin: 12, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', gap: 10,
  },
  addVendorFormTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  vendorInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  saveVendorBtn: {
    backgroundColor: '#22C55E', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  saveVendorBtnText: { color: '#060E06', fontWeight: '800', fontSize: 14 },
  vendorCard: {
    backgroundColor: '#0D1A0D', borderRadius: 14,
    marginBottom: 10, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)', overflow: 'hidden',
  },
  vendorCardTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 14,
  },
  vendorCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  vendorQuickBtns: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 14,
    paddingBottom: 12, paddingTop: 0,
  },
  vendorQuickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 8,
    paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  vendorQuickBtnText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },
  vendorOrderSection: {
    borderTopWidth: 1, borderTopColor: 'rgba(34,197,94,0.1)',
    padding: 14, backgroundColor: 'rgba(0,0,0,0.2)',
  },
  vendorOrderTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 12 },
  vendorOrderLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 0.5 },
  vendorOrderInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, color: '#fff', fontSize: 13,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    minHeight: 90, marginBottom: 12,
  },
  vendorOrderBtns: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  vendorSendWaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#25D366', borderRadius: 10, padding: 12,
  },
  vendorSendWaBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  vendorCallOrderBtn: {
    width: 44, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  vendorDeleteFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  vendorDeleteFullBtnText: { fontSize: 12, color: 'rgba(239,68,68,0.6)' },
  vendorAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  vendorName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  vendorParts: { fontSize: 12, color: '#22C55E', marginBottom: 2 },
  vendorArea: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  vendorActions: { flexDirection: 'row', gap: 8 },
  vendorCallBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  vendorWaBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(37,211,102,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(37,211,102,0.3)',
  },
  orderInventoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
    alignSelf: 'flex-start',
  },
  orderInventoryBtnText: { color: '#22C55E', fontSize: 12, fontWeight: '700' },
  vendorDeleteBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },

  // Low Stock Alert
  lowStockBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(239,68,68,0.08)', marginHorizontal: 12,
    marginTop: 10, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  lowStockBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lowStockBannerText: { fontSize: 13, color: '#EF4444', fontWeight: '700' },
  lowStockList: {
    backgroundColor: '#0D1A0D', marginHorizontal: 12,
    borderRadius: 10, marginBottom: 8, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)', overflow: 'hidden',
  },
  lowStockItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 10,
  },
  lowStockItemName: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 2 },
  lowStockItemSku: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  lowStockQtyBox: { alignItems: 'center', minWidth: 36 },
  lowStockQty: { fontSize: 18, fontWeight: '800', color: '#EF4444' },
  lowStockQtyLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)' },
  lowStockOrderBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },

  // Customer History
  // Activity Log
  // Staff Manager
  staffInputLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    marginBottom: 6, marginTop: 8, letterSpacing: 0.5,
  },
  roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  roleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.05)',
  },
  roleBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  roleBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  roleBtnTextActive: { color: '#060E06' },
  staffCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.12)',
  },
  staffCardAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  staffCardInitials: { fontSize: 16, fontWeight: '900', color: '#22C55E' },
  staffCardName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  staffCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  staffRolePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  staffRolePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  staffCardPhone: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  staffCardId: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  activityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  activityIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  activityTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  activityStaff: { fontSize: 13, fontWeight: '700', color: '#fff' },
  activityTime: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  activityAction: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  activityDetails: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 16 },

  // Activity Log
  activityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  activityIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  activityTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  activityStaff: { fontSize: 13, fontWeight: '700', color: '#fff' },
  activityTime: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  activityAction: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  activityDetails: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 16 },

  addRewardForm: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', gap: 10,
  },
  addRewardFormTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  rewardManagerCard: {
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
  },
  rewardManagerName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  rewardManagerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  rewardManagerPoints: { fontSize: 12, color: '#C9A84C', fontWeight: '700' },
  rewardDeleteBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  customerHistoryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(79,110,247,0.2)',
  },
  customerHistoryBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  customerHistoryBtnTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  customerHistoryBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  customerSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0D1A0D', margin: 14, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  customerSearchInput: { flex: 1, color: '#fff', fontSize: 14 },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  customerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  customerAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#22C55E' },
  customerRowName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  customerRowPhone: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  customerSummaryCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 16, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  customerSummaryAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(34,197,94,0.4)',
    marginBottom: 10,
  },
  customerSummaryAvatarText: { fontSize: 28, fontWeight: 'bold', color: '#22C55E' },
  customerSummaryName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  customerSummaryPhone: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  customerSummaryStats: { flexDirection: 'row', gap: 0, width: '100%', marginBottom: 16 },
  customerSummaryStat: { flex: 1, alignItems: 'center' },
  customerSummaryStatValue: { fontSize: 20, fontWeight: '800', color: '#22C55E', marginBottom: 2 },
  customerSummaryStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  customerCallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#25D366', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  customerCallBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  historyTitle: {
    fontSize: 11, color: 'rgba(34,197,94,0.7)',
    letterSpacing: 2, fontWeight: '700', marginBottom: 10,
  },
  historyOrderCard: {
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  historyOrderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  historyOrderId: { fontSize: 15, fontWeight: '700', color: '#fff' },
  historyOrderAmount: { fontSize: 15, fontWeight: '800', color: '#FFC107' },
  historyOrderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  historyStatusText: { fontSize: 11, fontWeight: '700' },
  historyOrderDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  historyPickup: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 },

  statsRow: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.08)' },
  filterScroll: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.08)' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', backgroundColor: 'rgba(34,197,94,0.05)' },
  filterChipActive: { backgroundColor: G, borderColor: G },
  filterChipText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, textAlign: 'center' },
  orderCard: { backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  orderCardNew: { borderColor: 'rgba(79,110,247,0.4)' },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  newPill: { backgroundColor: 'rgba(79,110,247,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(79,110,247,0.4)' },
  newPillText: { color: '#4F6EF7', fontSize: 9, fontWeight: 'bold' },
  orderAmt: { fontSize: 20, fontWeight: 'bold', color: '#FFC107' },
  orderCustomerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  orderCallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  orderCustomer: { fontSize: 13, color: '#fff', fontWeight: '600', marginBottom: 2 },
  orderPhone: { fontSize: 12, color: G, marginBottom: 2 },
  orderPickup: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  orderBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  tapHint: { fontSize: 10, color: 'rgba(34,197,94,0.4)', marginLeft: 'auto' },
  scannerBox: { width: 140, height: 140, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(34,197,94,0.2)', marginBottom: 20 },
  scannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  scannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 4 },
  scanBtn: { backgroundColor: G, borderRadius: 20, paddingHorizontal: 32, paddingVertical: 16, marginBottom: 20 },
  scanBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  addProductBanner: { backgroundColor: G, margin: 12, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: G, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  addProductBannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  addProductBannerIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  addProductBannerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  addProductBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addProductBannerArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  stockStatsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  stockStatCard: { flex: 1, backgroundColor: '#0D1A0D', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  stockStatValue: { fontSize: 22, fontWeight: 'bold', color: G, marginBottom: 2 },
  stockStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' },
  stockSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1A0D', marginHorizontal: 12, marginBottom: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', gap: 10 },
  stockSearchInput: { flex: 1, color: '#fff', fontSize: 14 },
  stockCard: { backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', gap: 10 },
  stockCardLow: { borderColor: 'rgba(245,158,11,0.4)' },
  stockCardOut: { borderColor: 'rgba(239,68,68,0.3)' },
  stockName: { fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  stockSku: { fontSize: 10, color: 'rgba(34,197,94,0.5)', letterSpacing: 1, marginBottom: 4 },
  stockQty: { fontSize: 12, fontWeight: 'bold' },
  stockBtn: { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  stockBtnText: { color: G, fontWeight: 'bold', fontSize: 13 },
  emptyAddBtn: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  emptyAddBtnText: { color: G, fontWeight: 'bold', fontSize: 14 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', backgroundColor: 'rgba(34,197,94,0.05)' },
  periodBtnActive: { backgroundColor: G, borderColor: G },
  periodText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  periodTextActive: { color: '#fff' },
  heroCard: { backgroundColor: '#0D1A0D', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 10 },
  heroValue: { fontSize: 40, fontWeight: 'bold', color: G, letterSpacing: 1, marginBottom: 6 },
  heroPeriod: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  actionCard: { flex: 1, backgroundColor: '#0D1A0D', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1 },
  actionCardTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  actionCardSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  reportCard: { backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  reportCardTitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase', fontWeight: 'bold' },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.08)' },
  reportLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  reportPill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  reportPillText: { fontSize: 14, fontWeight: 'bold' },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  bestRank: { fontSize: 20 },
  bestName: { fontSize: 12, color: '#fff', marginBottom: 6 },
  bestBar: { height: 4, borderRadius: 2 },
  bestQty: { fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 50, textAlign: 'right' },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  addOfferText: { color: G, fontWeight: 'bold', fontSize: 14 },
  offerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.08)', gap: 10 },
  offerTitle: { fontSize: 13, fontWeight: 'bold', color: '#FFC107' },
  offerPct: { fontSize: 11, color: 'rgba(255,184,0,0.5)' },
  toggleBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  toggleBtnOn: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  toggleBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
  profileCard: { backgroundColor: '#0D1A0D', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  changeHint: { fontSize: 10, color: 'rgba(34,197,94,0.5)', marginBottom: 10, fontWeight: 'bold' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  profileRole: { fontSize: 12, color: G, letterSpacing: 2, marginBottom: 4 },
  profileId: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  profilePhone: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  changePicBtn: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  changePicBtnText: { color: G, fontWeight: 'bold', fontSize: 13 },
  settingCard: { backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  settingIcon: { fontSize: 28 },
  settingTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  settingSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  settingArrow: { fontSize: 20, color: G, fontWeight: 'bold' },
  statsCardProfile: { backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  statsCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 14 },
  statsGridProfile: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statItemProfile: { flex: 1, backgroundColor: '#0D1A0D', borderRadius: 10, padding: 10, alignItems: 'center', gap: 3, borderWidth: 1 },
  statItemValue: { fontSize: 16, fontWeight: '800', color: G },
  statItemLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' },
  refreshStatsBtn: { backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  refreshStatsBtnText: { color: G, fontSize: 13, fontWeight: 'bold' },
  clockCard: { backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  clockCardIn: { borderColor: 'rgba(239,68,68,0.3)' },
  clockTitle: { fontSize: 16, fontWeight: 'bold' },
  clockSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  clockDot: { width: 10, height: 10, borderRadius: 5 },
  pinCard: { backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  pinCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  pinCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 15 },
  modalHeader: { backgroundColor: '#0D1A0D', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.15)' },
  modalBack: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  modalBackText: { color: G, fontSize: 14, fontWeight: 'bold' },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#fff' },
  detailCard: { backgroundColor: '#0D1A0D', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  detailCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.08)' },
  detailLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  detailValue: { fontSize: 13, color: '#fff', fontWeight: '600' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.08)', gap: 8 },
  itemName: { fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  itemSku: { fontSize: 10, color: 'rgba(34,197,94,0.4)', letterSpacing: 1 },
  itemQty: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: '#FFC107' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { width: '47%', backgroundColor: 'rgba(34,197,94,0.05)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', alignItems: 'center', gap: 4 },
  statusBtnText: { fontSize: 13, fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' },
  currentTag: { fontSize: 8, letterSpacing: 1 },
  paymentRow: { flexDirection: 'row', gap: 8 },
  payBtn: { flex: 1, backgroundColor: 'rgba(34,197,94,0.05)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', alignItems: 'center' },
  payBtnText: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' },
  waBtn: { backgroundColor: 'rgba(37,211,102,0.1)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(37,211,102,0.3)', marginBottom: 10 },
  waBtnText: { color: '#25D366', fontSize: 15, fontWeight: 'bold' },
  editLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  editInput: { backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', marginBottom: 14 },
  editPhoneBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', marginBottom: 14, gap: 8 },
  editPhonePrefix: { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
  editPhoneInput: { flex: 1, color: '#fff', fontSize: 16 },
  saveProfileBtn: { backgroundColor: G, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
  saveProfileBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  priceCard: { backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  priceCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  priceProductName: { fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  priceProductSku: { fontSize: 10, color: 'rgba(34,197,94,0.5)', letterSpacing: 1 },
  editPriceBtn: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  editPriceBtnText: { color: G, fontSize: 12, fontWeight: 'bold' },
  priceDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.04)', borderRadius: 10, padding: 12 },
  priceItem: { flex: 1, alignItems: 'center' },
  priceItemLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textTransform: 'uppercase' },
  priceItemValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  priceEditForm: { gap: 10 },
  priceEditLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  priceEditInput: { backgroundColor: 'rgba(34,197,94,0.05)', borderRadius: 10, padding: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  savePriceBtn: { backgroundColor: G, borderRadius: 12, padding: 12, alignItems: 'center' },
  savePriceBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});

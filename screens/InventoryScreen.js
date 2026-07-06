import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, FlatList,
  TextInput, Alert, Modal, Animated,
  KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const G = '#22C55E';

const BRANDS = [
  { id: 'ALL', label: 'All',    icon: '🔩', color: '#6B7280' },
  { id: 'HRO', label: 'Hero',   icon: '🏍️', color: '#E31837' },
  { id: 'HND', label: 'Honda',  icon: '🏍️', color: '#CC0000' },
  { id: 'TVS', label: 'TVS',    icon: '🛵', color: '#0050A0' },
  { id: 'BAJ', label: 'Bajaj',  icon: '🏍️', color: '#003DA5' },
  { id: 'YAM', label: 'Yamaha', icon: '🏍️', color: '#0047AB' },
  { id: 'SUZ', label: 'Suzuki', icon: '🏍️', color: '#E8000D' },
  { id: 'OIL', label: 'Oils',   icon: '🛢️', color: '#FF6B35' },
];

const PART_TYPES = [
  'Engine Oil', 'Brake Shoe', 'Air Filter', 'Spark Plug',
  'Chain Kit', 'Clutch Plate', 'Piston Kit', 'Bearing',
  'Carburetor', 'Silencer', 'Headlight Bulb', 'Battery',
  'Tyre Tube', 'Handle Grip', 'Speedometer Cable',
  'Brake Cable', 'Throttle Cable', 'Side Mirror',
  'Indicator Bulb', 'Seat Cover', 'Gear Box', 'Rim',
  'Shock Absorber', 'Front Fork', 'Fuel Tank Cap',
];

// ── ADD / EDIT PRODUCT MODAL ──
function ProductFormModal({ visible, onClose, onSave, editProduct }) {
  const [nameEn, setNameEn] = useState('');
  const [nameTe, setNameTe] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [partType, setPartType] = useState('');
  const [mrp, setMrp] = useState('');
  const [selling, setSelling] = useState('');
  const [stock, setStock] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPartTypes, setShowPartTypes] = useState(false);

  useEffect(() => {
    if (editProduct) {
      setNameEn(editProduct.name_en || '');
      setNameTe(editProduct.name_te || '');
      setMrp(editProduct.mrp?.toString() || '');
      setSelling(editProduct.selling_price?.toString() || '');
      setStock(editProduct.stock_qty?.toString() || '');
      const brandId = editProduct.sku?.split('-')[0];
      setSelectedBrand(BRANDS.find(b => b.id === brandId) || null);
    } else {
      setNameEn(''); setNameTe(''); setMrp('');
      setSelling(''); setStock('');
      setSelectedBrand(null); setPartType('');
    }
  }, [editProduct, visible]);

  const getSku = () => {
    if (!selectedBrand || selectedBrand.id === 'ALL' || !nameEn) return '';
    const suffix = nameEn.replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 5).toUpperCase();
    return `${selectedBrand.id}-${suffix}`;
  };

  const margin = mrp && selling
    ? (parseFloat(mrp) - parseFloat(selling)).toFixed(0) : '0';
  const marginPct = mrp && selling
    ? (((parseFloat(mrp) - parseFloat(selling)) / parseFloat(mrp)) * 100).toFixed(0)
    : '0';

  const handleSave = async () => {
    if (!nameEn.trim()) { Alert.alert('❌', 'Product name required'); return; }
    if (!mrp || parseFloat(mrp) <= 0) { Alert.alert('❌', 'Enter valid MRP'); return; }
    if (!selling || parseFloat(selling) <= 0) { Alert.alert('❌', 'Enter selling price'); return; }
    if (parseFloat(selling) > parseFloat(mrp)) {
      Alert.alert('❌', 'Selling price cannot exceed MRP'); return;
    }
    setSaving(true);
    try {
      const sku = editProduct ? editProduct.sku : getSku();
      const payload = {
        name_en: nameEn.trim(),
        name_te: nameTe.trim(),
        sku,
        mrp: parseFloat(mrp),
        selling_price: parseFloat(selling),
        stock_qty: parseInt(stock) || 0,
      };
      if (editProduct) {
        await fetch(`${API_URL}/products/${editProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        Alert.alert('✅ Updated!', `${nameEn} updated.`);
      } else {
        const r = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (d.error) { Alert.alert('❌ Error', d.error); setSaving(false); return; }
        Alert.alert('✅ Product Added!', `${nameEn}\nSKU: ${sku}`);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave(); onClose();
    } catch { Alert.alert('❌ Error', 'Could not save. Check internet.'); }
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={ms.container}>
        <StatusBar barStyle="light-content" backgroundColor="#060E06" />
        <View style={ms.header}>
          <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
            <Text style={ms.cancelBtnText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={ms.headerTitle}>
            {editProduct ? '✏️ Edit Product' : '➕ Add New Product'}
          </Text>
          <TouchableOpacity
            style={[ms.saveBtn, saving && { opacity: 0.5 }]}
            onPress={handleSave} disabled={saving}>
            <Text style={ms.saveBtnText}>
              {saving ? '⏳' : '✅ Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled">

            {/* BRAND SELECT */}
            {!editProduct && (
              <>
                <Text style={ms.label}>Brand *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={ms.brandRow}>
                  {BRANDS.filter(b => b.id !== 'ALL').map(brand => (
                    <TouchableOpacity key={brand.id}
                      style={[ms.brandBtn,
                        selectedBrand?.id === brand.id && {
                          borderColor: brand.color,
                          backgroundColor: brand.color + '20'
                        }]}
                      onPress={() => {
                        setSelectedBrand(brand);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (partType) setNameEn(`${brand.label} ${partType}`);
                      }}>
                      <Text style={ms.brandBtnIcon}>{brand.icon}</Text>
                      <Text style={[ms.brandBtnLabel,
                        selectedBrand?.id === brand.id && { color: brand.color }]}>
                        {brand.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* PART TYPE */}
            {!editProduct && (
              <>
                <Text style={ms.label}>Part Type</Text>
                <TouchableOpacity style={ms.partTypeBtn}
                  onPress={() => setShowPartTypes(!showPartTypes)}>
                  <Text style={[ms.partTypeBtnText, partType && { color: '#fff' }]}>
                    {partType || 'Select part type...'}
                  </Text>
                  <Text style={{ color: G }}>{showPartTypes ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showPartTypes && (
                  <View style={ms.partTypeGrid}>
                    {PART_TYPES.map(type => (
                      <TouchableOpacity key={type}
                        style={[ms.partTypeChip, partType === type && ms.partTypeChipActive]}
                        onPress={() => {
                          setPartType(type);
                          setShowPartTypes(false);
                          if (selectedBrand) setNameEn(`${selectedBrand.label} ${type}`);
                          else setNameEn(type);
                        }}>
                        <Text style={[ms.partTypeChipText, partType === type && { color: G }]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* NAME */}
            <Text style={ms.label}>Product Name (English) *</Text>
            <TextInput style={ms.input} value={nameEn}
              onChangeText={setNameEn}
              placeholder="e.g. Hero Splendor Brake Shoe"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="words" />

            <Text style={ms.label}>Product Name (Telugu)</Text>
            <TextInput style={ms.input} value={nameTe}
              onChangeText={setNameTe}
              placeholder="e.g. హీరో బ్రేక్ షూ"
              placeholderTextColor="rgba(255,255,255,0.2)" />

            {/* SKU PREVIEW */}
            {!editProduct && selectedBrand && nameEn && (
              <View style={ms.skuPreview}>
                <Text style={ms.skuLabel}>Auto SKU:</Text>
                <Text style={ms.skuValue}>{getSku()}</Text>
              </View>
            )}

            {/* PRICING */}
            <Text style={ms.label}>Pricing *</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={ms.sublabel}>MRP (₹)</Text>
                <TextInput style={ms.input} value={mrp}
                  onChangeText={(v) => {
                    setMrp(v);
                    if (v && !selling)
                      setSelling(Math.round(parseFloat(v) * 0.85).toString());
                  }}
                  placeholder="0" keyboardType="numeric"
                  placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ms.sublabel}>Selling Price (₹)</Text>
                <TextInput
                  style={[ms.input, { borderColor: 'rgba(255,193,7,0.4)' }]}
                  value={selling} onChangeText={setSelling}
                  placeholder="0" keyboardType="numeric"
                  placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </View>

            {/* MARGIN */}
            {mrp && selling && (
              <View style={ms.marginRow}>
                <View style={ms.marginCard}>
                  <Text style={ms.marginLabel}>Margin</Text>
                  <Text style={[ms.marginValue, { color: '#4ADE80' }]}>₹{margin}</Text>
                </View>
                <View style={ms.marginCard}>
                  <Text style={ms.marginLabel}>Discount %</Text>
                  <Text style={[ms.marginValue, { color: '#4F6EF7' }]}>{marginPct}%</Text>
                </View>
                <View style={ms.marginCard}>
                  <Text style={ms.marginLabel}>Mech Price</Text>
                  <Text style={[ms.marginValue, { color: '#FFC107' }]}>
                    ₹{Math.round(parseFloat(selling || 0) * 0.95)}
                  </Text>
                </View>
              </View>
            )}

            {/* STOCK */}
            <Text style={ms.label}>Opening Stock Quantity</Text>
            <TextInput style={ms.input} value={stock}
              onChangeText={setStock}
              placeholder="e.g. 10"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric" />

            <View style={ms.quickStockRow}>
              {[5, 10, 20, 50].map(n => (
                <TouchableOpacity key={n} style={ms.quickStockBtn}
                  onPress={() => setStock(n.toString())}>
                  <Text style={ms.quickStockText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SAVE BUTTON */}
            <TouchableOpacity
              style={[ms.bigSaveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave} disabled={saving}>
              <Text style={ms.bigSaveBtnText}>
                {saving ? '⏳ Saving...'
                  : editProduct ? '✅ Update Product'
                  : '✅ Add to Catalog'}
              </Text>
            </TouchableOpacity>

            <View style={ms.tipBox}>
              <Text style={ms.tipText}>
                💡 Product visible in Customer App instantly!
              </Text>
              <Text style={ms.tipText}>
                🔧 Mechanic gets 5% off selling price automatically
              </Text>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  header: {
    backgroundColor: '#0D1A0D', paddingHorizontal: 12,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
    gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.15)',
  },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  cancelBtnText: { color: '#EF4444', fontSize: 13, fontWeight: 'bold' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  saveBtn: {
    backgroundColor: G, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  label: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1,
    marginBottom: 8, marginTop: 6, textTransform: 'uppercase',
  },
  sublabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  brandRow: { gap: 8, paddingBottom: 14 },
  brandBtn: {
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 10,
    alignItems: 'center', gap: 4, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)', minWidth: 64,
  },
  brandBtnIcon: { fontSize: 22 },
  brandBtnLabel: { fontSize: 11, fontWeight: 'bold', color: 'rgba(255,255,255,0.5)' },
  partTypeBtn: {
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', marginBottom: 10,
  },
  partTypeBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.35)' },
  partTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  partTypeChip: {
    backgroundColor: '#0D1A0D', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  partTypeChipActive: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: G },
  partTypeChipText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  input: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', marginBottom: 10,
  },
  skuPreview: {
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 10,
    padding: 10, flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  skuLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  skuValue: { fontSize: 14, fontWeight: 'bold', color: G, letterSpacing: 1 },
  marginRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  marginCard: {
    flex: 1, backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 10,
    padding: 10, alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  marginLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  marginValue: { fontSize: 16, fontWeight: 'bold' },
  quickStockRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickStockBtn: {
    flex: 1, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 10,
    padding: 10, alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  quickStockText: { color: G, fontWeight: 'bold', fontSize: 14 },
  bigSaveBtn: {
    backgroundColor: G, borderRadius: 18, padding: 16,
    alignItems: 'center', marginBottom: 12,
  },
  bigSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  tipBox: {
    backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 12,
    padding: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  tipText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});

// ── STOCK UPDATE MODAL ──
function StockUpdateModal({ visible, product, onClose, onUpdate }) {
  const [qty, setQty] = useState('');
  const [mode, setMode] = useState('add');

  useEffect(() => {
    if (visible) { setQty(''); setMode('add'); }
  }, [visible]);

  const getNewQty = () => {
    const amount = parseInt(qty || 0);
    if (mode === 'add') return (product?.stock_qty || 0) + amount;
    if (mode === 'remove') return Math.max(0, (product?.stock_qty || 0) - amount);
    return amount;
  };

  const handleUpdate = async () => {
    const amount = parseInt(qty);
    if (isNaN(amount) || amount <= 0) { Alert.alert('❌', 'Enter valid quantity'); return; }
    await onUpdate(product?.id, getNewQty());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={su.overlay}>
        <View style={su.card}>
          <Text style={su.title}>📦 Update Stock</Text>
          <Text style={su.productName} numberOfLines={1}>
            {product?.name_en}
          </Text>
          <Text style={su.currentStock}>
            Current Stock: <Text style={{ color: G }}>{product?.stock_qty || 0} units</Text>
          </Text>

          <View style={su.modeRow}>
            {[
              { id: 'add',    label: '+ Add',   color: G },
              { id: 'remove', label: '- Remove', color: '#EF4444' },
              { id: 'set',    label: '= Set to', color: '#4F6EF7' },
            ].map(m => (
              <TouchableOpacity key={m.id}
                style={[su.modeBtn, mode === m.id && {
                  backgroundColor: m.color + '20', borderColor: m.color
                }]}
                onPress={() => { setMode(m.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <Text style={[su.modeBtnText, mode === m.id && { color: m.color }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={su.input} value={qty}
            onChangeText={setQty}
            placeholder="Enter quantity"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="numeric" autoFocus />

          <View style={su.quickRow}>
            {[1, 5, 10, 25, 50].map(n => (
              <TouchableOpacity key={n} style={su.quickBtn}
                onPress={() => setQty(n.toString())}>
                <Text style={su.quickBtnText}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {qty ? (
            <View style={su.preview}>
              <Text style={su.previewLabel}>New Stock Will Be:</Text>
              <Text style={su.previewValue}>{getNewQty()} units</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={su.cancelBtn} onPress={onClose}>
              <Text style={su.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[su.updateBtn, !qty && { opacity: 0.4 }]}
              onPress={handleUpdate} disabled={!qty}>
              <Text style={su.updateBtnText}>✅ Update Stock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const su = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0D1A0D', borderTopLeftRadius: 28,
    borderTopRightRadius: 28, padding: 24, gap: 12,
    borderTopWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  productName: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  currentStock: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  modeBtnText: { fontSize: 13, fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' },
  input: {
    backgroundColor: '#060E06', borderRadius: 14, padding: 16,
    color: '#fff', fontSize: 22, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)', textAlign: 'center', fontWeight: 'bold',
  },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  quickBtnText: { color: G, fontWeight: 'bold', fontSize: 15 },
  preview: {
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12,
    padding: 12, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  previewLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  previewValue: { fontSize: 22, fontWeight: 'bold', color: G },
  cancelBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  cancelBtnText: { color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', fontSize: 15 },
  updateBtn: { flex: 2, backgroundColor: G, borderRadius: 14, padding: 16, alignItems: 'center' },
  updateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

// ══════════════════════════════════
// MAIN INVENTORY SCREEN
// ══════════════════════════════════
export default function InventoryScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProducts();
    Animated.spring(fabAnim, {
      toValue: 1, tension: 50, friction: 7, useNativeDriver: true
    }).start();
  }, []);

  const fetchProducts = async () => {
    try {
      const r = await fetch(`${API_URL}/products`);
      const d = await r.json();
      setProducts(d.products || []);
    } catch {}
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
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

  const deleteProduct = (product) => {
    Alert.alert(
      '🗑️ Delete Product?',
      `Delete "${product.name_en}"?\n\nThis cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🗑️ Delete', style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/products/${product.id}`, { method: 'DELETE' });
              setProducts(prev => prev.filter(p => p.id !== product.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch { Alert.alert('❌ Error', 'Could not delete'); }
          }
        }
      ]
    );
  };

  const filtered = products
    .filter(p => selectedBrand === 'ALL' || p.sku?.startsWith(selectedBrand))
    .filter(p =>
      !search ||
      p.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name_en?.localeCompare(b.name_en);
      if (sortBy === 'stock') return a.stock_qty - b.stock_qty;
      if (sortBy === 'price') return a.selling_price - b.selling_price;
      return 0;
    });

  const outOfStock = products.filter(p => p.stock_qty === 0).length;
  const lowStock = products.filter(p => p.stock_qty > 0 && p.stock_qty <= 5).length;
  const totalValue = products.reduce(
    (s, p) => s + (p.selling_price * p.stock_qty), 0
  );

  const getBrandColor = (sku) => {
    const brand = BRANDS.find(b => b.id !== 'ALL' && sku?.startsWith(b.id));
    return brand?.color || '#6B7280';
  };

  return (
    <View style={inv.container}>

      {/* ✅ BIG GREEN ADD BUTTON */}
      <TouchableOpacity
        style={inv.addBanner}
        onPress={() => { setEditProduct(null); setShowAddModal(true); }}
        activeOpacity={0.85}
      >
        <View style={inv.addBannerLeft}>
          <View style={inv.addBannerIconBox}>
            <Text style={{ fontSize: 30 }}>➕</Text>
          </View>
          <View>
            <Text style={inv.addBannerTitle}>Add New Product</Text>
            <Text style={inv.addBannerSub}>
              కొత్త పార్ట్ జోడించండి
            </Text>
          </View>
        </View>
        <Text style={inv.addBannerArrow}>→</Text>
      </TouchableOpacity>

      {/* STATS ROW */}
      <View style={inv.statsRow}>
        <View style={inv.statBox}>
          <Text style={inv.statVal}>{products.length}</Text>
          <Text style={inv.statLabel}>Total</Text>
        </View>
        <View style={[inv.statBox, { borderColor: 'rgba(239,68,68,0.3)' }]}>
          <Text style={[inv.statVal, { color: '#EF4444' }]}>{outOfStock}</Text>
          <Text style={inv.statLabel}>Out of Stock</Text>
        </View>
        <View style={[inv.statBox, { borderColor: 'rgba(245,158,11,0.3)' }]}>
          <Text style={[inv.statVal, { color: '#F59E0B' }]}>{lowStock}</Text>
          <Text style={inv.statLabel}>Low Stock</Text>
        </View>
        <View style={[inv.statBox, { borderColor: 'rgba(79,110,247,0.3)' }]}>
          <Text style={[inv.statVal, { color: '#4F6EF7', fontSize: 14 }]}>
            ₹{(totalValue / 1000).toFixed(0)}k
          </Text>
          <Text style={inv.statLabel}>Value</Text>
        </View>
      </View>

      {/* ALERTS */}
      {outOfStock > 0 && (
        <View style={inv.alertBanner}>
          <Text style={inv.alertText}>
            ⚠️ {outOfStock} out of stock · {lowStock} running low · Reorder soon!
          </Text>
        </View>
      )}

      {/* SEARCH */}
      <View style={inv.searchBox}>
        <Text>🔍</Text>
        <TextInput style={inv.searchInput}
          placeholder="Search products, SKU..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={search} onChangeText={setSearch} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: 'rgba(255,255,255,0.3)' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SORT */}
      <View style={inv.sortRow}>
        <Text style={inv.sortLabel}>Sort:</Text>
        {[
          { id: 'name', label: 'A-Z' },
          { id: 'stock', label: 'Stock' },
          { id: 'price', label: 'Price' },
        ].map(s => (
          <TouchableOpacity key={s.id}
            style={[inv.sortBtn, sortBy === s.id && inv.sortBtnActive]}
            onPress={() => setSortBy(s.id)}>
            <Text style={[inv.sortBtnText, sortBy === s.id && { color: G }]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={inv.countLabel}>{filtered.length} products</Text>
      </View>

      {/* BRAND FILTER */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={inv.brandScroll}
        contentContainerStyle={inv.brandScrollContent}>
        {BRANDS.map(brand => (
          <TouchableOpacity key={brand.id}
            style={[inv.brandChip,
              selectedBrand === brand.id && {
                backgroundColor: brand.color,
                borderColor: brand.color
              }]}
            onPress={() => {
              setSelectedBrand(brand.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}>
            <Text style={inv.brandChipIcon}>{brand.icon}</Text>
            <Text style={[inv.brandChipText,
              selectedBrand === brand.id && { color: '#fff' }]}>
              {brand.label}
            </Text>
            <Text style={[inv.brandChipCount,
              { color: selectedBrand === brand.id ? '#fff' : brand.color }]}>
              {brand.id === 'ALL'
                ? products.length
                : products.filter(p => p.sku?.startsWith(brand.id)).length}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* PRODUCT LIST */}
      {loading ? (
        <View style={inv.centerBox}>
          <Text style={inv.loadingText}>Loading inventory...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={onRefresh} tintColor={G} />
          }
          ListEmptyComponent={() => (
            <View style={inv.emptyBox}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>📦</Text>
              <Text style={inv.emptyTitle}>No products found</Text>
              <Text style={inv.emptySub}>
                {search
                  ? `Nothing matching "${search}"`
                  : 'Tap the green button above to add products!'}
              </Text>
              <TouchableOpacity style={inv.emptyAddBtn}
                onPress={() => { setEditProduct(null); setShowAddModal(true); }}>
                <Text style={inv.emptyAddBtnText}>➕ Add First Product</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => {
            const isOut = item.stock_qty === 0;
            const isLow = item.stock_qty > 0 && item.stock_qty <= 5;
            const brandColor = getBrandColor(item.sku);
            return (
              <View style={[inv.productCard,
                isOut && inv.productCardOut,
                isLow && inv.productCardLow,
                { borderLeftColor: brandColor, borderLeftWidth: 3 }
              ]}>
                {/* TOP ROW */}
                <View style={inv.productTop}>
                  <View style={[inv.productIconBox,
                    { backgroundColor: brandColor + '15' }]}>
                    <Text style={{ fontSize: 22 }}>
                      {item.sku?.startsWith('OIL') ? '🛢️'
                        : item.sku?.startsWith('HRO') ? '🏍️'
                        : item.sku?.startsWith('HND') ? '🏍️'
                        : item.sku?.startsWith('TVS') ? '🛵'
                        : '🔩'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={inv.productName}>{item.name_en}</Text>
                    {item.name_te ? (
                      <Text style={inv.productNameTe}>{item.name_te}</Text>
                    ) : null}
                    <Text style={[inv.productSku,
                      { color: brandColor }]}>
                      {item.sku}
                    </Text>
                  </View>
                  {/* EDIT / DELETE */}
                  <View style={{ gap: 4 }}>
                    <TouchableOpacity style={inv.editBtn}
                      onPress={() => { setEditProduct(item); setShowAddModal(true); }}>
                      <Text style={inv.editBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={inv.deleteBtn}
                      onPress={() => deleteProduct(item)}>
                      <Text style={inv.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* PRICE ROW */}
                <View style={inv.priceRow}>
                  <View style={inv.priceItem}>
                    <Text style={inv.priceLabel}>MRP</Text>
                    <Text style={inv.priceMrp}>₹{item.mrp}</Text>
                  </View>
                  <View style={inv.priceDivider} />
                  <View style={inv.priceItem}>
                    <Text style={inv.priceLabel}>Selling</Text>
                    <Text style={[inv.priceValue, { color: '#FFC107' }]}>
                      ₹{item.selling_price}
                    </Text>
                  </View>
                  <View style={inv.priceDivider} />
                  <View style={inv.priceItem}>
                    <Text style={inv.priceLabel}>Margin</Text>
                    <Text style={[inv.priceValue, { color: '#4ADE80' }]}>
                      ₹{(item.mrp - item.selling_price).toFixed(0)}
                    </Text>
                  </View>
                  <View style={inv.priceDivider} />
                  <View style={inv.priceItem}>
                    <Text style={inv.priceLabel}>Stock Val</Text>
                    <Text style={[inv.priceValue, { color: '#4F6EF7' }]}>
                      ₹{(item.selling_price * item.stock_qty).toFixed(0)}
                    </Text>
                  </View>
                </View>

                {/* STOCK ROW */}
                <View style={inv.stockRow}>
                  <View style={[inv.stockBadge,
                    isOut && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)' },
                    isLow && { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' },
                    !isOut && !isLow && { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }
                  ]}>
                    <Text style={[inv.stockText,
                      isOut && { color: '#EF4444' },
                      isLow && { color: '#F59E0B' },
                      !isOut && !isLow && { color: G }
                    ]}>
                      {isOut ? '❌ Out of Stock'
                        : isLow ? `⚠️ Low: ${item.stock_qty} left`
                        : `✅ ${item.stock_qty} in stock`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={inv.updateStockBtn}
                    onPress={() => {
                      setStockProduct(item);
                      setShowStockModal(true);
                    }}>
                    <Text style={inv.updateStockBtnText}>📦 Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODALS */}
      <ProductFormModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); setEditProduct(null); }}
        onSave={fetchProducts}
        editProduct={editProduct}
      />

      <StockUpdateModal
        visible={showStockModal}
        product={stockProduct}
        onClose={() => { setShowStockModal(false); setStockProduct(null); }}
        onUpdate={updateStock}
      />
    </View>
  );
}

const inv = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  addBanner: {
    backgroundColor: G, margin: 12, marginBottom: 8,
    borderRadius: 18, padding: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    shadowColor: G, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 10,
  },
  addBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  addBannerIconBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBannerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  addBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  addBannerArrow: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  statBox: {
    flex: 1, backgroundColor: '#0D1A0D', borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  statVal: { fontSize: 18, fontWeight: 'bold', color: G, marginBottom: 2 },
  statLabel: {
    fontSize: 8, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center',
  },
  alertBanner: {
    backgroundColor: 'rgba(245,158,11,0.1)', marginHorizontal: 12,
    marginBottom: 8, borderRadius: 10, padding: 10, borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  alertText: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1A0D',
    marginHorizontal: 12, marginBottom: 6, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', gap: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    gap: 6, marginBottom: 6,
  },
  sortLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  sortBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  sortBtnActive: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: G },
  sortBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
  countLabel: {
    marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.25)',
  },
  brandScroll: { maxHeight: 52 },
  brandScrollContent: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  brandChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  brandChipIcon: { fontSize: 14 },
  brandChipText: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.5)' },
  brandChipCount: { fontSize: 10, fontWeight: 'bold' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  emptyAddBtn: {
    marginTop: 8, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  emptyAddBtnText: { color: G, fontWeight: 'bold', fontSize: 14 },
  productCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', gap: 10,
  },
  productCardOut: { borderColor: 'rgba(239,68,68,0.3)' },
  productCardLow: { borderColor: 'rgba(245,158,11,0.3)' },
  productTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productIconBox: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  productNameTe: { fontSize: 10, color: 'rgba(34,197,94,0.4)', marginBottom: 2 },
  productSku: { fontSize: 10, letterSpacing: 1 },
  editBtn: {
    backgroundColor: 'rgba(79,110,247,0.1)', borderRadius: 8,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(79,110,247,0.2)',
  },
  editBtnText: { fontSize: 14 },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  deleteBtnText: { fontSize: 14 },
  priceRow: {
    flexDirection: 'row', backgroundColor: 'rgba(34,197,94,0.04)',
    borderRadius: 10, padding: 10,
  },
  priceItem: { flex: 1, alignItems: 'center' },
  priceLabel: {
    fontSize: 8, color: 'rgba(255,255,255,0.35)',
    marginBottom: 3, textTransform: 'uppercase',
  },
  priceMrp: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecorationLine: 'line-through' },
  priceValue: { fontSize: 14, fontWeight: 'bold' },
  priceDivider: { width: 1, backgroundColor: 'rgba(34,197,94,0.15)', marginHorizontal: 4 },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  stockText: { fontSize: 12, fontWeight: 'bold' },
  updateStockBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  updateStockBtnText: { color: G, fontWeight: 'bold', fontSize: 12 },
});
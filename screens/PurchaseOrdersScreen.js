import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, FlatList,
  TextInput, Alert, Modal, RefreshControl, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const G = '#22C55E';

const SUPPLIERS = [
  { id: 'hero_parts',  name: 'Hero Parts Dealer',  phone: '9876543210', brand: 'Hero' },
  { id: 'honda_parts', name: 'Honda Parts Dealer',  phone: '9876543211', brand: 'Honda' },
  { id: 'tvs_parts',   name: 'TVS Dealer',          phone: '9876543212', brand: 'TVS' },
  { id: 'bajaj_parts', name: 'Bajaj Dealer',         phone: '9876543213', brand: 'Bajaj' },
  { id: 'oil_supplier',name: 'Oil Supplier',         phone: '9876543214', brand: 'Oils' },
  { id: 'general',     name: 'General Supplier',     phone: '9876543215', brand: 'All' },
];

export default function PurchaseOrdersScreen({ onBack }) {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState('alerts');

  useEffect(() => {
    fetchData();
    loadPurchaseOrders();
  }, []);

  // ✅ BUG FIX: Graceful error handling — show empty state instead of crashing
  const fetchData = async () => {
    setApiError(false);
    try {
      const r = await fetch(`${API_URL}/products`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const all = d.products || [];
      setOutOfStockProducts(all.filter(p => p.stock_qty === 0));
      setLowStockProducts(all.filter(p => p.stock_qty > 0 && p.stock_qty <= 5));
    } catch {
      setApiError(true);
      setOutOfStockProducts([]);
      setLowStockProducts([]);
    }
    setLoading(false);
  };

  const loadPurchaseOrders = async () => {
    try {
      const saved = await AsyncStorage.getItem('purchase_orders');
      if (saved) setPurchaseOrders(JSON.parse(saved));
    } catch {}
  };

  const savePurchaseOrders = async (orders) => {
    try {
      await AsyncStorage.setItem('purchase_orders', JSON.stringify(orders));
      setPurchaseOrders(orders);
    } catch {
      Alert.alert('❌ Save Error', 'Could not save purchase orders locally.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleItem = (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[product.id]) { delete next[product.id]; }
      else { next[product.id] = { ...product, orderQty: 10 }; }
      return next;
    });
  };

  const updateOrderQty = (productId, qty) => {
    setSelectedItems(prev => ({
      ...prev,
      [productId]: { ...prev[productId], orderQty: parseInt(qty) || 0 }
    }));
  };

  const createPurchaseOrder = async () => {
    const items = Object.values(selectedItems);
    if (items.length === 0) { Alert.alert('❌', 'Select at least one product'); return; }
    if (!selectedSupplier)  { Alert.alert('❌', 'Select a supplier'); return; }

    const newOrder = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-IN'),
      supplier: selectedSupplier,
      items,
      notes,
      status: 'pending',
      totalItems: items.reduce((s, i) => s + (i.orderQty || 0), 0),
    };

    const updated = [newOrder, ...purchaseOrders];
    await savePurchaseOrders(updated);

    const msg =
      `🏪 *Purchase Order — New Rahul Auto Spares*\n` +
      `📅 ${newOrder.date}\n\n` +
      `*Items Required:*\n` +
      items.map(i => `• ${i.name_en} (${i.sku}) — Qty: ${i.orderQty}`).join('\n') +
      `\n\n${notes ? `📝 Notes: ${notes}\n\n` : ''}` +
      `📍 Telugu Peta, Nandyal\n📞 08514-244944`;

    Alert.alert(
      '✅ Order Created!',
      'Send to supplier via WhatsApp?',
      [
        { text: '💬 Send WhatsApp', onPress: () => {
          Linking.openURL(
            `https://wa.me/91${selectedSupplier.phone}?text=` +
            encodeURIComponent(msg)
          );
        }},
        { text: 'Later', style: 'cancel' }
      ]
    );

    setShowCreateModal(false);
    setSelectedItems({});
    setSelectedSupplier(null);
    setNotes('');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateOrderStatus = async (orderId, status) => {
    const updated = purchaseOrders.map(o => o.id === orderId ? { ...o, status } : o);
    await savePurchaseOrders(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteOrder = async (orderId) => {
    Alert.alert('Delete?', 'Remove this purchase order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = purchaseOrders.filter(o => o.id !== orderId);
        await savePurchaseOrders(updated);
      }}
    ]);
  };

  const selectedCount = Object.keys(selectedItems).length;
  const allAlerts = [...outOfStockProducts, ...lowStockProducts];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>📋 Purchase Orders</Text>
          <Text style={s.headerSub}>
            {apiError
              ? '⚠️ Could not load stock data'
              : `${outOfStockProducts.length} out · ${lowStockProducts.length} low`}
          </Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={() => setShowCreateModal(true)}>
          <Text style={s.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* ALERT BANNER */}
      {!apiError && allAlerts.length > 0 && (
        <View style={s.alertBanner}>
          <Text style={s.alertText}>
            ⚠️ {outOfStockProducts.length} out of stock ·
            {lowStockProducts.length} running low · Reorder now!
          </Text>
        </View>
      )}

      {/* API ERROR BANNER */}
      {apiError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>
            📡 Could not load stock levels. Check internet.
          </Text>
          <TouchableOpacity onPress={fetchData}>
            <Text style={s.retryText}>Retry →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TABS */}
      <View style={s.tabRow}>
        {[
          { id: 'alerts', label: `⚠️ Alerts (${allAlerts.length})` },
          { id: 'orders', label: `📋 Orders (${purchaseOrders.length})` },
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

      {tab === 'alerts' ? (
        <ScrollView contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />
          }>

          {loading ? (
            <View style={s.centerBox}>
              <Text style={s.loadingText}>Checking stock levels...</Text>
            </View>
          ) : apiError ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 48 }}>📡</Text>
              <Text style={s.emptyTitle}>Stock data unavailable</Text>
              <Text style={s.emptySub}>
                Connect to internet and pull to refresh.{'\n'}
                You can still create purchase orders manually.
              </Text>
              <TouchableOpacity style={s.createManualBtn}
                onPress={() => setShowCreateModal(true)}>
                <Text style={s.createManualBtnText}>+ Create Order Manually</Text>
              </TouchableOpacity>
            </View>
          ) : allAlerts.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={s.emptyTitle}>All Stock Levels OK!</Text>
              <Text style={s.emptySub}>No products need reordering right now.</Text>
            </View>
          ) : (
            <>
              {outOfStockProducts.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>❌ Out of Stock</Text>
                  {outOfStockProducts.map(item => (
                    <View key={item.id} style={[s.alertCard, s.alertCardOut]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.alertName}>{item.name_en}</Text>
                        <Text style={s.alertSku}>{item.sku}</Text>
                        <Text style={[s.alertStock, { color: '#EF4444' }]}>❌ 0 in stock</Text>
                      </View>
                      <TouchableOpacity style={s.orderNowBtn}
                        onPress={() => {
                          setSelectedItems({ [item.id]: { ...item, orderQty: 10 } });
                          setShowCreateModal(true);
                        }}>
                        <Text style={s.orderNowBtnText}>Order Now</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {lowStockProducts.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>⚠️ Low Stock</Text>
                  {lowStockProducts.map(item => (
                    <View key={item.id} style={[s.alertCard, s.alertCardLow]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.alertName}>{item.name_en}</Text>
                        <Text style={s.alertSku}>{item.sku}</Text>
                        <Text style={[s.alertStock, { color: '#F59E0B' }]}>
                          ⚠️ Only {item.stock_qty} left
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[s.orderNowBtn, {
                          backgroundColor: 'rgba(245,158,11,0.2)',
                          borderColor: 'rgba(245,158,11,0.4)'
                        }]}
                        onPress={() => {
                          setSelectedItems({ [item.id]: { ...item, orderQty: 10 } });
                          setShowCreateModal(true);
                        }}>
                        <Text style={[s.orderNowBtnText, { color: '#F59E0B' }]}>Reorder</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity style={s.orderAllBtn}
                onPress={() => {
                  const items = {};
                  allAlerts.forEach(p => { items[p.id] = { ...p, orderQty: 10 }; });
                  setSelectedItems(items);
                  setShowCreateModal(true);
                }}>
                <Text style={s.orderAllBtnText}>
                  📋 Create Order for All {allAlerts.length} Items
                </Text>
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      ) : (
        <FlatList
          data={purchaseOrders}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
          ListEmptyComponent={() => (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 48 }}>📋</Text>
              <Text style={s.emptyTitle}>No Purchase Orders</Text>
              <Text style={s.emptySub}>Tap + Create to make your first order</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={s.poCard}>
              <View style={s.poHeader}>
                <View>
                  <Text style={s.poId}>PO-{item.id.slice(-6)}</Text>
                  <Text style={s.poDate}>{item.date}</Text>
                </View>
                <View style={[s.poStatus, {
                  backgroundColor: item.status === 'received'
                    ? 'rgba(34,197,94,0.15)' : item.status === 'ordered'
                    ? 'rgba(79,110,247,0.15)' : 'rgba(245,158,11,0.15)',
                }]}>
                  <Text style={[s.poStatusText, {
                    color: item.status === 'received' ? G
                      : item.status === 'ordered' ? '#4F6EF7' : '#F59E0B'
                  }]}>
                    {item.status === 'received' ? '✅ Received'
                      : item.status === 'ordered' ? '📦 Ordered'
                      : '⏳ Pending'}
                  </Text>
                </View>
              </View>
              <Text style={s.poSupplier}>🏪 {item.supplier?.name}</Text>
              <Text style={s.poItems}>
                {item.totalItems} units · {item.items?.length} products
              </Text>
              {item.notes ? <Text style={s.poNotes}>📝 {item.notes}</Text> : null}
              {item.items?.slice(0, 3).map((p, i) => (
                <Text key={i} style={s.poItemText}>• {p.name_en} × {p.orderQty}</Text>
              ))}
              {(item.items?.length || 0) > 3 && (
                <Text style={s.poItemMore}>+{item.items.length - 3} more items</Text>
              )}
              <View style={s.poActions}>
                {item.status === 'pending' && (
                  <TouchableOpacity style={s.poActionBtn}
                    onPress={() => updateOrderStatus(item.id, 'ordered')}>
                    <Text style={s.poActionBtnText}>📦 Mark Ordered</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'ordered' && (
                  <TouchableOpacity
                    style={[s.poActionBtn, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: G }]}
                    onPress={() => updateOrderStatus(item.id, 'received')}>
                    <Text style={[s.poActionBtnText, { color: G }]}>✅ Mark Received</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.waPoBtn}
                  onPress={() => {
                    const msg = `📋 PO-${item.id.slice(-6)}\n` +
                      item.items?.map(p => `• ${p.name_en} × ${p.orderQty}`).join('\n');
                    Linking.openURL(
                      `https://wa.me/91${item.supplier?.phone}?text=` + encodeURIComponent(msg)
                    );
                  }}>
                  <Text style={s.waPoText}>💬</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deletePoBtn} onPress={() => deleteOrder(item.id)}>
                  <Text style={s.deletePoText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* CREATE MODAL */}
      <Modal visible={showCreateModal} animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" backgroundColor="#060E06" />
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => setShowCreateModal(false)}>
              <Text style={s.backBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Create Purchase Order</Text>
            <TouchableOpacity
              style={[s.createBtn, selectedCount === 0 && { opacity: 0.4 }]}
              onPress={createPurchaseOrder} disabled={selectedCount === 0}>
              <Text style={s.createBtnText}>Create ({selectedCount})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* SUPPLIER */}
            <Text style={s.formLabel}>Select Supplier *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.supplierRow}>
              {SUPPLIERS.map(sup => (
                <TouchableOpacity key={sup.id}
                  style={[s.supplierBtn, selectedSupplier?.id === sup.id && s.supplierBtnActive]}
                  onPress={() => setSelectedSupplier(sup)}>
                  <Text style={s.supplierBrand}>{sup.brand}</Text>
                  <Text style={[s.supplierName, selectedSupplier?.id === sup.id && { color: G }]}>
                    {sup.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* PRODUCTS */}
            <Text style={s.formLabel}>Select Products *</Text>
            {allAlerts.length === 0 ? (
              <View style={s.noAlertsBox}>
                <Text style={s.noAlertsText}>
                  {apiError
                    ? '⚠️ Stock data unavailable — type product name in Notes below'
                    : '✅ No low/out of stock items — add items in Notes'}
                </Text>
              </View>
            ) : (
              allAlerts.map(item => {
                const selected = !!selectedItems[item.id];
                return (
                  <View key={item.id} style={[s.selectItem, selected && s.selectItemActive]}>
                    <TouchableOpacity style={s.selectItemLeft} onPress={() => toggleItem(item)}>
                      <View style={[s.checkbox, selected && s.checkboxChecked]}>
                        {selected && <Text style={s.checkboxCheck}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.selectItemName}>{item.name_en}</Text>
                        <Text style={s.selectItemSku}>{item.sku}</Text>
                        <Text style={[s.selectItemStock,
                          item.stock_qty === 0 ? { color: '#EF4444' } : { color: '#F59E0B' }]}>
                          {item.stock_qty === 0 ? '❌ Out of stock' : `⚠️ ${item.stock_qty} left`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {selected && (
                      <View style={s.qtyInput}>
                        <TextInput
                          style={s.qtyInputField}
                          value={selectedItems[item.id]?.orderQty?.toString()}
                          onChangeText={(v) => updateOrderQty(item.id, v)}
                          keyboardType="numeric" placeholder="Qty"
                          placeholderTextColor="rgba(255,255,255,0.3)" />
                        <Text style={s.qtyLabel}>units</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* NOTES */}
            <Text style={s.formLabel}>Notes / Additional Items</Text>
            <TextInput style={s.notesInput} value={notes} onChangeText={setNotes}
              placeholder="Any special instructions or extra items..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline numberOfLines={3} />

            <TouchableOpacity
              style={[s.createOrderBtn,
                (selectedCount === 0 || !selectedSupplier) && { opacity: 0.4 }]}
              onPress={createPurchaseOrder}
              disabled={selectedCount === 0 || !selectedSupplier}>
              <Text style={s.createOrderBtnText}>
                ✅ Create Purchase Order ({selectedCount} items)
              </Text>
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  createBtn: { backgroundColor: G, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  alertBanner: {
    backgroundColor: 'rgba(245,158,11,0.1)', padding: 10, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.2)',
  },
  alertText: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold' },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)', padding: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 16,
  },
  errorText: { color: '#EF4444', fontSize: 12, flex: 1 },
  retryText: { color: '#EF4444', fontWeight: 'bold', fontSize: 12 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.15)' },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: G },
  tabBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  tabBtnTextActive: { color: G },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  sectionLabel: {
    fontSize: 13, fontWeight: 'bold', color: 'rgba(255,255,255,0.5)',
    marginBottom: 8, marginTop: 4, letterSpacing: 1,
  },
  alertCard: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    borderWidth: 1, gap: 10,
  },
  alertCardOut: { borderColor: 'rgba(239,68,68,0.3)' },
  alertCardLow: { borderColor: 'rgba(245,158,11,0.3)' },
  alertName: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  alertSku: { fontSize: 10, color: 'rgba(34,197,94,0.5)', marginBottom: 4 },
  alertStock: { fontSize: 12, fontWeight: 'bold' },
  orderNowBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  orderNowBtnText: { color: '#EF4444', fontWeight: 'bold', fontSize: 12 },
  orderAllBtn: { backgroundColor: G, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  orderAllBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  createManualBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)', marginTop: 8,
  },
  createManualBtnText: { color: G, fontWeight: 'bold', fontSize: 14 },
  poCard: {
    backgroundColor: '#0D1A0D', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', gap: 6,
  },
  poHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  poId: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  poDate: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  poStatus: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  poStatusText: { fontSize: 12, fontWeight: 'bold' },
  poSupplier: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  poItems: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  poNotes: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  poItemText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  poItemMore: { fontSize: 11, color: 'rgba(34,197,94,0.5)' },
  poActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  poActionBtn: {
    flex: 1, backgroundColor: 'rgba(79,110,247,0.1)', borderRadius: 10,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79,110,247,0.2)',
  },
  poActionBtnText: { color: '#4F6EF7', fontWeight: 'bold', fontSize: 12 },
  waPoBtn: {
    width: 38, backgroundColor: 'rgba(37,211,102,0.1)', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.2)',
  },
  waPoText: { fontSize: 18 },
  deletePoBtn: {
    width: 38, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  deletePoText: { fontSize: 18 },
  formLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1,
    marginBottom: 8, marginTop: 6, textTransform: 'uppercase',
  },
  supplierRow: { gap: 8, paddingBottom: 14 },
  supplierBtn: {
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', minWidth: 100,
  },
  supplierBtnActive: { borderColor: G, backgroundColor: 'rgba(34,197,94,0.08)' },
  supplierBrand: { fontSize: 11, color: 'rgba(34,197,94,0.5)', marginBottom: 2 },
  supplierName: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' },
  noAlertsBox: {
    backgroundColor: 'rgba(34,197,94,0.05)', borderRadius: 12, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  noAlertsText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' },
  selectItem: {
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  selectItemActive: { borderColor: G, backgroundColor: 'rgba(34,197,94,0.05)' },
  selectItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: G, borderColor: G },
  checkboxCheck: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  selectItemName: { fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  selectItemSku: { fontSize: 10, color: 'rgba(34,197,94,0.5)', marginBottom: 2 },
  selectItemStock: { fontSize: 11, fontWeight: 'bold' },
  qtyInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(34,197,94,0.1)',
  },
  qtyInputField: {
    backgroundColor: '#060E06', borderRadius: 10, padding: 10,
    color: '#fff', fontSize: 16, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', width: 80, textAlign: 'center', fontWeight: 'bold',
  },
  qtyLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  notesInput: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    color: '#fff', fontSize: 14, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', marginBottom: 14,
    textAlignVertical: 'top', height: 80,
  },
  createOrderBtn: { backgroundColor: G, borderRadius: 16, padding: 16, alignItems: 'center' },
  createOrderBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
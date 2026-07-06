import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, TextInput,
  Alert, Image, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const G = '#22C55E';

// ── SKU BUILDER DATA ──
const BIKE_MODELS = [
  { label: '🔴 Hero Splendor+',    prefix: 'HRO-SPL' },
  { label: '🔴 Hero HF Deluxe',    prefix: 'HRO-HFD' },
  { label: '🔴 Hero Passion Pro',   prefix: 'HRO-PAS' },
  { label: '🔴 Hero Glamour',       prefix: 'HRO-GLA' },
  { label: '🔴 Hero Xtreme 160R',   prefix: 'HRO-XTR' },
  { label: '🔴 Hero Super Splendor',prefix: 'HRO-SSP' },
  { label: '🔴 Hero Maestro Edge',  prefix: 'HRO-MAE' },
  { label: '🔴 Hero Destini 125',   prefix: 'HRO-DES' },
  { label: '🔵 Honda CB Shine',     prefix: 'HND-CBS' },
  { label: '🔵 Honda Activa 6G',    prefix: 'HND-ACT' },
  { label: '🔵 Honda SP 125',       prefix: 'HND-SP1' },
  { label: '🔵 Honda Unicorn',      prefix: 'HND-UNI' },
  { label: '🔵 Honda Livo',         prefix: 'HND-LIV' },
  { label: '🔵 Honda Hornet 2.0',   prefix: 'HND-HRN' },
  { label: '🔵 Honda Dio',          prefix: 'HND-DIO' },
  { label: '🔵 Honda Dream Yuga',   prefix: 'HND-DYG' },
  { label: '🟡 TVS Apache',         prefix: 'TVS-APR' },
  { label: '🟡 TVS Jupiter',        prefix: 'TVS-JPT' },
  { label: '🟡 TVS Star City',      prefix: 'TVS-STC' },
  { label: '🟣 Bajaj Pulsar 150',   prefix: 'BAJ-P15' },
  { label: '🟣 Bajaj Platina',      prefix: 'BAJ-PLT' },
  { label: '🟣 Bajaj CT100',        prefix: 'BAJ-CT1' },
  { label: '🛢️ Engine Oil',         prefix: 'OIL' },
];

const PART_TYPES = [
  { label: '🛑 Brake Shoe',      code: 'BRK' },
  { label: '💨 Air Filter',      code: 'AIR' },
  { label: '⛓️ Chain Kit',       code: 'CHN' },
  { label: '⚡ Spark Plug',      code: 'SPK' },
  { label: '🔧 Clutch Plates',   code: 'CLT' },
  { label: '🔧 Clutch Cable',    code: 'CLB' },
  { label: '🔩 Cam Chain Kit',   code: 'CAM' },
  { label: '🔩 Gear Shaft',      code: 'GRS' },
  { label: '🔩 Gear Rod',        code: 'GRR' },
  { label: '💡 Self Motor',      code: 'SLF' },
  { label: '🔒 Lock Set',        code: 'LCK' },
  { label: '📊 Meter Assembly',  code: 'MTR' },
  { label: '🛵 Center Stand',    code: 'CTS' },
  { label: '🛵 Side Stand',      code: 'SDS' },
  { label: '🔧 Suspension',      code: 'SUS' },
  { label: '🔧 Fork Set',        code: 'FRK' },
  { label: '🔧 Handle Bar',      code: 'HDL' },
  { label: '🔌 Handle Switch',   code: 'HBS' },
  { label: '🔌 Self Switch',     code: 'SWC' },
  { label: '⚙️ Bearing Kit',     code: 'BRG' },
  { label: '🛢️ Engine Oil 900ml',code: '900' },
  { label: '🛢️ Engine Oil 1L',   code: '01L' },
  { label: '🛢️ Other',          code: 'OTH' },
];

export default function AddProductScreen({ onBack, onProductAdded }) {
  // ── FORM STATE ──
  const [nameEn, setNameEn]           = useState('');
  const [nameTe, setNameTe]           = useState('');
  const [nameHi, setNameHi]           = useState('');
  const [sku, setSku]                 = useState('');
  const [mrp, setMrp]                 = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQty, setStockQty]       = useState('');
  const [imageUri, setImageUri]       = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ── SKU BUILDER STATE ──
  const [selectedBike, setSelectedBike]     = useState(null);
  const [selectedPart, setSelectedPart]     = useState(null);
  const [skuMode, setSkuMode]               = useState('builder'); // 'builder' or 'manual'

  // ── BUILD SKU FROM SELECTIONS ──
  const buildSku = (bike, part) => {
    if (!bike) return '';
    if (bike.prefix === 'OIL') {
      return part ? `OIL-${bike.prefix.replace('OIL-','')}-${part.code}` : 'OIL-';
    }
    return part ? `${bike.prefix}-${part.code}` : `${bike.prefix}-`;
  };

  const handleBikeSelect = (bike) => {
    setSelectedBike(bike);
    setSelectedPart(null);
    const newSku = `${bike.prefix}-`;
    setSku(newSku);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePartSelect = (part) => {
    setSelectedPart(part);
    if (selectedBike) {
      const newSku = buildSku(selectedBike, part);
      setSku(newSku);
      // Auto-fill English name if empty
      if (!nameEn && selectedBike) {
        const bikeName = selectedBike.label.replace(/^[^ ]+ /, ''); // remove emoji
        setNameEn(`${bikeName} ${part.label.replace(/^[^ ]+ /, '')}`);
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── IMAGE PICKER ──
  const pickImage = async (fromCamera = false) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', fromCamera ? 'Camera access needed' : 'Gallery access needed');
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.6, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.6, base64: true });
      if (!result.canceled && result.assets?.[0]) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'Could not pick image');
    }
  };

  // ── VALIDATE SKU FORMAT ──
  const validateSku = (skuValue) => {
    const validPrefixes = BIKE_MODELS.map(b => b.prefix);
    const isValid = validPrefixes.some(p => skuValue.startsWith(p));
    return isValid;
  };

  // ── SAVE PRODUCT ──
  const handleSave = async () => {
    if (!nameEn.trim()) { Alert.alert('❌', 'Product name (English) is required'); return; }
    if (!sku.trim())    { Alert.alert('❌', 'SKU is required'); return; }
    if (!mrp || isNaN(parseFloat(mrp))) { Alert.alert('❌', 'Valid MRP required'); return; }
    if (!sellingPrice || isNaN(parseFloat(sellingPrice))) { Alert.alert('❌', 'Valid selling price required'); return; }
    if (parseFloat(sellingPrice) > parseFloat(mrp)) { Alert.alert('❌', 'Selling price cannot exceed MRP'); return; }

    // Validate SKU format
    if (!validateSku(sku.trim().toUpperCase())) {
      Alert.alert(
        '⚠️ Invalid SKU Format',
        `SKU must start with a valid prefix like:\nHRO-SPL-, HND-CBS-, TVS-APR-, OIL-\n\nYour SKU: ${sku}\n\nPlease use the bike model selector above.`,
        [{ text: 'Fix SKU', style: 'cancel' }]
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name_en:       nameEn.trim(),
        name_te:       nameTe.trim() || null,
        name_hi:       nameHi.trim() || null,
        sku:           sku.trim().toUpperCase(),
        mrp:           parseFloat(mrp),
        selling_price: parseFloat(sellingPrice),
        stock_qty:     parseInt(stockQty) || 0,
      };

      const r = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();

      if (d.error) { Alert.alert('❌ Error', d.error); setSaving(false); return; }

      const productId = d.id || d.product_id;

      // Upload image
      if (imageBase64 && productId) {
        setUploadingImage(true);
        try {
          await fetch(`${API_URL}/products/${productId}/upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: imageBase64 }),
          });
        } catch {}
        setUploadingImage(false);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Product Added!',
        `${nameEn.trim()} added!\nSKU: ${sku.trim().toUpperCase()}`,
        [{ text: 'Great! 🎉', onPress: () => onProductAdded?.() }]
      );
    } catch {
      Alert.alert('❌ Error', 'Could not save. Check internet.');
    }
    setSaving(false);
  };

  const margin = mrp && sellingPrice && !isNaN(parseFloat(mrp)) && !isNaN(parseFloat(sellingPrice))
    ? parseFloat(mrp) - parseFloat(sellingPrice) : null;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060E06" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>➕ Add Product</Text>
          <Text style={s.headerSub}>New part to catalog</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>✅ Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* ── PHOTO ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📸 Product Photo</Text>
          {imageUri ? (
            <View style={s.imagePreviewBox}>
              <Image source={{ uri: imageUri }} style={s.imagePreview} />
              <View style={s.imageActions}>
                <TouchableOpacity style={s.changeImageBtn}
                  onPress={() => Alert.alert('Add Photo', 'Choose source', [
                    { text: '📷 Camera', onPress: () => pickImage(true) },
                    { text: '🖼️ Gallery', onPress: () => pickImage(false) },
                    { text: 'Cancel', style: 'cancel' },
                  ])}>
                  <Text style={s.changeImageBtnText}>🔄 Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.removeImageBtn}
                  onPress={() => { setImageUri(null); setImageBase64(null); }}>
                  <Text style={s.removeImageBtnText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.imagePickerRow}>
              <TouchableOpacity style={s.imagePickBtn} onPress={() => pickImage(true)}>
                <Text style={s.imagePickBtnIcon}>📷</Text>
                <Text style={s.imagePickBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.imagePickBtn} onPress={() => pickImage(false)}>
                <Text style={s.imagePickBtnIcon}>🖼️</Text>
                <Text style={s.imagePickBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
          {uploadingImage && (
            <View style={s.uploadingRow}>
              <ActivityIndicator size="small" color={G} />
              <Text style={s.uploadingText}>Uploading photo...</Text>
            </View>
          )}
        </View>

        {/* ── SKU BUILDER ── */}
        <View style={s.card}>
          <View style={s.skuModeRow}>
            <Text style={s.cardTitle}>🔑 SKU Code Builder</Text>
            <TouchableOpacity
              style={s.modeToggle}
              onPress={() => setSkuMode(skuMode === 'builder' ? 'manual' : 'builder')}>
              <Text style={s.modeToggleText}>
                {skuMode === 'builder' ? '✏️ Type manually' : '🔧 Use builder'}
              </Text>
            </TouchableOpacity>
          </View>

          {skuMode === 'builder' ? (
            <>
              {/* STEP 1 - SELECT BIKE */}
              <Text style={s.stepLabel}>Step 1 — Select Bike Model</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                {BIKE_MODELS.map((bike, i) => (
                  <TouchableOpacity key={i}
                    style={[s.bikeChip, selectedBike?.prefix === bike.prefix && s.bikeChipActive]}
                    onPress={() => handleBikeSelect(bike)}>
                    <Text style={[s.bikeChipText, selectedBike?.prefix === bike.prefix && s.bikeChipTextActive]}>
                      {bike.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* STEP 2 - SELECT PART TYPE */}
              {selectedBike && (
                <>
                  <Text style={s.stepLabel}>Step 2 — Select Part Type</Text>
                  <View style={s.partGrid}>
                    {PART_TYPES.map((part, i) => (
                      <TouchableOpacity key={i}
                        style={[s.partChip, selectedPart?.code === part.code && s.partChipActive]}
                        onPress={() => handlePartSelect(part)}>
                        <Text style={[s.partChipText, selectedPart?.code === part.code && s.partChipTextActive]}>
                          {part.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* GENERATED SKU PREVIEW */}
              {sku ? (
                <View style={s.skuPreview}>
                  <Text style={s.skuPreviewLabel}>Generated SKU:</Text>
                  <Text style={s.skuPreviewValue}>{sku}</Text>
                  {selectedBike && selectedPart && (
                    <Text style={s.skuPreviewValid}>✅ Valid format</Text>
                  )}
                </View>
              ) : null}

              {/* MANUAL SKU OVERRIDE */}
              <Text style={s.label}>SKU (auto-generated — edit if needed)</Text>
              <TextInput style={s.input}
                value={sku}
                onChangeText={v => setSku(v.toUpperCase())}
                placeholder="e.g. HRO-SPL-BRK"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="characters" />
            </>
          ) : (
            <>
              {/* MANUAL MODE */}
              <Text style={s.skuGuide}>
                ✅ Valid formats:{'\n'}
                HRO-SPL-BRK (Hero Splendor Brake){'\n'}
                HND-CBS-AIR (Honda CB Shine Air Filter){'\n'}
                TVS-APR-CHN (TVS Apache Chain){'\n'}
                BAJ-P15-BRK (Bajaj Pulsar 150 Brake){'\n'}
                OIL-CST-10W (Castrol 10W Oil)
              </Text>
              <Text style={s.label}>SKU Code *</Text>
              <TextInput style={s.input}
                value={sku}
                onChangeText={v => setSku(v.toUpperCase())}
                placeholder="e.g. HRO-SPL-BRK"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="characters" />
            </>
          )}
        </View>

        {/* ── PRODUCT DETAILS ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📦 Product Details</Text>

          <Text style={s.label}>Name (English) *</Text>
          <TextInput style={s.input}
            value={nameEn} onChangeText={setNameEn}
            placeholder="e.g. Hero Splendor+ Brake Shoe"
            placeholderTextColor="rgba(255,255,255,0.25)" />

          <Text style={s.label}>Name (Telugu)</Text>
          <TextInput style={s.input}
            value={nameTe} onChangeText={setNameTe}
            placeholder="e.g. హీరో స్ప్లెండర్ బ్రేక్ షూ"
            placeholderTextColor="rgba(255,255,255,0.25)" />

          <Text style={s.label}>Name (Hindi)</Text>
          <TextInput style={s.input}
            value={nameHi} onChangeText={setNameHi}
            placeholder="e.g. हीरो स्प्लेंडर ब्रेक शू"
            placeholderTextColor="rgba(255,255,255,0.25)" />

          <Text style={s.label}>Stock Quantity</Text>
          <TextInput style={s.input}
            value={stockQty} onChangeText={setStockQty}
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="numeric" />
        </View>

        {/* ── PRICING ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>💰 Pricing</Text>
          <View style={s.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>MRP (₹) *</Text>
              <TextInput style={s.input}
                value={mrp} onChangeText={setMrp}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Selling Price (₹) *</Text>
              <TextInput style={[s.input, { borderColor: 'rgba(255,193,7,0.4)' }]}
                value={sellingPrice} onChangeText={setSellingPrice}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="numeric" />
            </View>
          </View>

          {margin !== null && (
            <View style={[s.marginBox, {
              backgroundColor: margin > 0
                ? 'rgba(34,197,94,0.08)' : margin === 0
                ? 'rgba(255,193,7,0.08)' : 'rgba(239,68,68,0.08)'
            }]}>
              <Text style={[s.marginText, {
                color: margin > 0 ? G : margin === 0 ? '#FFC107' : '#EF4444'
              }]}>
                {margin > 0
                  ? `✅ Margin: ₹${margin.toFixed(0)} (${((margin / parseFloat(mrp)) * 100).toFixed(0)}%)`
                  : margin === 0
                  ? `⚠️ Selling at MRP — no margin`
                  : `❌ Selling price cannot exceed MRP!`}
              </Text>
            </View>
          )}
        </View>

        {/* ── SKU FORMAT GUIDE ── */}
        <View style={s.guideCard}>
          <Text style={s.guideTitle}>📖 SKU Format Guide</Text>
          <Text style={s.guideText}>
            BRAND - MODEL - PART TYPE{'\n\n'}
            HRO = Hero · HND = Honda{'\n'}
            TVS = TVS · BAJ = Bajaj{'\n'}
            OIL = Engine Oils{'\n\n'}
            BRK = Brake · AIR = Air Filter{'\n'}
            CHN = Chain · SPK = Spark Plug{'\n'}
            CLT = Clutch · CAM = Cam Chain
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.15)',
    backgroundColor: '#0A160A',
  },
  backBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  backBtnText: { color: G, fontSize: 14, fontWeight: 'bold' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  saveBtn: {
    backgroundColor: G, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  card: {
    backgroundColor: '#0E1A0E', borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    padding: 12, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },

  // SKU Builder
  skuModeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modeToggle: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  modeToggleText: { color: G, fontSize: 11, fontWeight: 'bold' },
  stepLabel: {
    fontSize: 13, color: G, fontWeight: 'bold',
    marginBottom: 10, marginTop: 6,
  },
  bikeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  bikeChipActive: { backgroundColor: G, borderColor: G },
  bikeChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  bikeChipTextActive: { color: '#fff' },
  partGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  partChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)',
    backgroundColor: 'rgba(255,193,7,0.05)',
  },
  partChipActive: { backgroundColor: '#FFC107', borderColor: '#FFC107' },
  partChipText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
  partChipTextActive: { color: '#06060E' },
  skuPreview: {
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 10,
    padding: 12, marginBottom: 10, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', alignItems: 'center',
  },
  skuPreviewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  skuPreviewValue: { fontSize: 22, fontWeight: 'bold', color: G, letterSpacing: 2 },
  skuPreviewValid: { fontSize: 11, color: G, marginTop: 4 },
  skuGuide: {
    backgroundColor: 'rgba(255,193,7,0.08)', borderRadius: 10,
    padding: 12, marginBottom: 12, borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.2)',
    color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 20,
  },

  // Pricing
  priceRow: { flexDirection: 'row', gap: 12 },
  marginBox: { borderRadius: 10, padding: 10, marginTop: 8 },
  marginText: { fontSize: 13, fontWeight: 'bold' },

  // Image
  imagePreviewBox: { alignItems: 'center', gap: 10 },
  imagePreview: { width: 120, height: 120, borderRadius: 12 },
  imageActions: { flexDirection: 'row', gap: 10 },
  changeImageBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  changeImageBtnText: { color: G, fontSize: 12, fontWeight: 'bold' },
  removeImageBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  removeImageBtnText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold' },
  imagePickerRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  imagePickBtn: {
    flex: 1, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12,
    padding: 16, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  imagePickBtnIcon: { fontSize: 28 },
  imagePickBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 'bold' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  uploadingText: { color: G, fontSize: 12 },

  // Guide
  guideCard: {
    backgroundColor: 'rgba(79,110,247,0.05)', borderRadius: 14,
    padding: 14, marginBottom: 14, borderWidth: 1,
    borderColor: 'rgba(79,110,247,0.15)',
  },
  guideTitle: { fontSize: 13, fontWeight: 'bold', color: '#4F6EF7', marginBottom: 8 },
  guideText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 20 },
});

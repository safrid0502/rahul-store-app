import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

export default function QRScannerScreen({ onScanned, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarcode = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
    onScanned(data);
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content"
          backgroundColor="#060E06" />
        <View style={s.body}>
          <Text style={{ fontSize: 60, marginBottom: 20 }}>📷</Text>
          <Text style={s.title}>Camera Access Needed</Text>
          <Text style={s.sub}>
            Allow camera to scan QR codes
          </Text>
          <TouchableOpacity
            style={s.permBtn}
            onPress={requestPermission}
          >
            <Text style={s.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content"
        backgroundColor="#060E06" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onClose}>
          <Text style={s.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>📷 Scan Order QR</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcode}
        />
        {/* OVERLAY */}
        <View style={s.overlay}>
          <View style={s.topOverlay} />
          <View style={s.middleRow}>
            <View style={s.sideOverlay} />
            <View style={s.scanBox}>
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />
            </View>
            <View style={s.sideOverlay} />
          </View>
          <View style={s.bottomOverlay}>
            <Text style={s.scanHint}>
              Point camera at customer's QR code
            </Text>
            <Text style={s.scanHintTe}>
              కస్టమర్ QR కోడ్ పై కెమెరా పెట్టండి
            </Text>
            {scanned && (
              <TouchableOpacity
                style={s.rescanBtn}
                onPress={() => setScanned(false)}
              >
                <Text style={s.rescanText}>🔄 Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const G = '#22C55E';
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  header: {
    backgroundColor: '#0D1A0D', padding: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.15)',
  },
  backBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  backText: { color: G, fontSize: 14, fontWeight: 'bold' },
  headerTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#fff',
  },
  overlay: {
    position: 'absolute', top: 0, left: 0,
    right: 0, bottom: 0,
  },
  topOverlay: {
    flex: 1, backgroundColor: 'rgba(6,14,6,0.7)',
  },
  middleRow: { flexDirection: 'row', height: 250 },
  sideOverlay: {
    flex: 1, backgroundColor: 'rgba(6,14,6,0.7)',
  },
  scanBox: {
    width: 250, height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute', width: 30, height: 30,
    borderColor: G, borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  bottomOverlay: {
    flex: 1, backgroundColor: 'rgba(6,14,6,0.7)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  scanHint: {
    fontSize: 14, color: '#fff', textAlign: 'center',
  },
  scanHintTe: {
    fontSize: 12, color: 'rgba(34,197,94,0.5)',
    textAlign: 'center',
  },
  rescanBtn: {
    backgroundColor: G, borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 10,
  },
  rescanText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  body: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 40,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24, textAlign: 'center' },
  permBtn: {
    backgroundColor: G, borderRadius: 20,
    paddingHorizontal: 32, paddingVertical: 14, marginBottom: 14,
  },
  permBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { padding: 12 },
  closeBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput,
  ScrollView, Alert, Linking, FlatList
} from 'react-native';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://rahul-auto-spares-backend.onrender.com';
const G = '#22C55E';

const TEMPLATES = [
  {
    icon: '🎉',
    title: 'New Offer',
    msg: '🎉 Special Offer at New Rahul Auto Spares!\n\nGet EXTRA DISCOUNT on all engine oils this week!\n\n📍 Telugu Peta, Nandyal\n📞 08514-244944'
  },
  {
    icon: '🏍️',
    title: 'Service Reminder',
    msg: '🏍️ Hi! Time for your bike service?\n\nVisit New Rahul Auto Spares for genuine OEM parts at best prices!\n\n📍 Telugu Peta, Nandyal\n📞 08514-244944'
  },
  {
    icon: '⚡',
    title: 'Flash Sale',
    msg: '⚡ FLASH SALE - Today Only!\n\nAll spare parts at special prices!\nFirst come first served!\n\n🕐 10AM - 9PM\n📍 New Rahul Auto Spares, Nandyal'
  },
  {
    icon: '🎊',
    title: 'Festival Offer',
    msg: '🎊 Festival Special Offer!\n\nThis festive season get amazing deals on all two-wheeler parts!\n\nVisit us: New Rahul Auto Spares\n📍 Telugu Peta, Nandyal\n📞 08514-244944'
  },
  {
    icon: '🔔',
    title: 'New Stock',
    msg: '🔔 New Stock Arrived!\n\nFresh stock of genuine parts for Hero, Honda, TVS, Bajaj!\n\nVisit us today!\n📍 New Rahul Auto Spares, Nandyal'
  },
];

export default function BroadcastScreen({ onBack, staff }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [tab, setTab] = useState('compose');

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const r = await fetch(`${API_URL}/customers/all`);
      const d = await r.json();
      setCustomers(d.customers || []);
    } catch {}
    setLoading(false);
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template.title);
    setMessage(template.msg);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const sendWhatsAppBroadcast = async () => {
    if (!message.trim()) {
      Alert.alert('❌', 'Please enter a message!');
      return;
    }
    if (customers.length === 0) {
      Alert.alert('❌', 'No customers found!');
      return;
    }

    Alert.alert(
      '📢 Send Broadcast?',
      `Send to ${customers.length} customers via WhatsApp?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✅ Send All',
          onPress: async () => {
            setSending(true);
            setSentCount(0);

            // Open WhatsApp for first customer
            // (WhatsApp doesn't allow true bulk sending)
            const enc = encodeURIComponent(message);
            let count = 0;

            for (const customer of customers.slice(0, 50)) {
              if (customer.phone) {
                await Linking.openURL(
                  `https://wa.me/91${customer.phone}?text=${enc}`
                ).catch(() => {});
                count++;
                setSentCount(count);
                await new Promise(r => setTimeout(r, 1500));
              }
            }

            setSending(false);
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            Alert.alert(
              '✅ Done!',
              `Broadcast sent to ${count} customers!`
            );
          }
        }
      ]
    );
  };

  const sendPushBroadcast = async () => {
    if (!message.trim()) {
      Alert.alert('❌', 'Please enter a message!');
      return;
    }
    Alert.alert(
      '🔔 Send Push Notification?',
      `Send to all customers who have the app?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✅ Send',
          onPress: async () => {
            try {
              const r = await fetch(`${API_URL}/notify/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: '🏪 New Rahul Auto Spares',
                  body: message.trim()
                })
              });
              const d = await r.json();
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              Alert.alert(
                '✅ Push Sent!',
                `Notification sent to ${d.sent} devices!`
              );
            } catch {
              Alert.alert('❌ Error', 'Could not send push notification');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content"
        backgroundColor="#060E06" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>📢 Broadcast</Text>
        <View style={s.customerCount}>
          <Text style={s.customerCountText}>
            👥 {customers.length}
          </Text>
        </View>
      </View>

      {/* TABS */}
      <View style={s.tabRow}>
        {[
          { id: 'compose', label: '✏️ Compose' },
          { id: 'customers', label: '👥 Customers' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[s.tabBtnText,
              tab === t.id && s.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* COMPOSE TAB */}
      {tab === 'compose' && (
        <ScrollView contentContainerStyle={s.body}>
          {/* STATS */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{customers.length}</Text>
              <Text style={s.statLabel}>Total Customers</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statValue, { color: G }]}>
                {customers.filter(c => c.phone).length}
              </Text>
              <Text style={s.statLabel}>With WhatsApp</Text>
            </View>
          </View>

          {/* TEMPLATES */}
          <Text style={s.sectionTitle}>📋 Quick Templates</Text>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.templatesRow}
          >
            {TEMPLATES.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={[s.templateCard,
                  selectedTemplate === t.title &&
                  s.templateCardActive]}
                onPress={() => selectTemplate(t)}
              >
                <Text style={s.templateIcon}>{t.icon}</Text>
                <Text style={[s.templateTitle,
                  selectedTemplate === t.title &&
                  { color: G }]}>
                  {t.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* MESSAGE */}
          <Text style={s.sectionTitle}>💬 Your Message</Text>
          <TextInput
            style={s.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message here..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>
            {message.length} characters
          </Text>

          {/* SEND BUTTONS */}
          <TouchableOpacity
            style={[s.waBtn,
              !message.trim() && { opacity: 0.4 }]}
            onPress={sendWhatsAppBroadcast}
            disabled={!message.trim() || sending}
          >
            <Text style={s.waBtnText}>
              {sending
                ? `💬 Sending ${sentCount}/${customers.length}...`
                : `💬 WhatsApp Broadcast (${customers.length} customers)`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.pushBtn,
              !message.trim() && { opacity: 0.4 }]}
            onPress={sendPushBroadcast}
            disabled={!message.trim()}
          >
            <Text style={s.pushBtnText}>
              🔔 Send Push Notification
            </Text>
          </TouchableOpacity>

          <View style={s.noteBox}>
            <Text style={s.noteText}>
              💡 WhatsApp opens one by one for each customer.
              For quick sending, use Push Notification instead!
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* CUSTOMERS TAB */}
      {tab === 'customers' && (
        <FlatList
          data={customers}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={() => (
            <Text style={s.listHeader}>
              {customers.length} customers in database
            </Text>
          )}
          renderItem={({ item, index }) => (
            <View style={s.customerRow}>
              <View style={s.customerAvatar}>
                <Text style={s.customerAvatarText}>
                  {item.name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.customerName}>{item.name}</Text>
                <Text style={s.customerPhone}>
                  +91 {item.phone}
                </Text>
              </View>
              <TouchableOpacity
                style={s.waIconBtn}
                onPress={() => {
                  const enc = encodeURIComponent(message ||
                    'Hi! New update from New Rahul Auto Spares!');
                  Linking.openURL(
                    `https://wa.me/91${item.phone}?text=${enc}`
                  );
                }}
              >
                <Text style={s.waIconBtnText}>💬</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060E06' },
  header: {
    backgroundColor: '#0D1A0D', paddingHorizontal: 16,
    paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.15)',
  },
  backBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  backBtnText: { color: G, fontSize: 14, fontWeight: 'bold' },
  headerTitle: {
    flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff',
  },
  customerCount: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  customerCountText: { color: G, fontWeight: 'bold', fontSize: 13 },
  tabRow: {
    flexDirection: 'row', padding: 10, gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.1)',
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  tabBtnActive: { backgroundColor: G, borderColor: G },
  tabBtnText: {
    fontSize: 13, fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
  },
  tabBtnTextActive: { color: '#fff' },
  body: { padding: 16 },
  statsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 20,
  },
  statCard: {
    flex: 1, backgroundColor: '#0D1A0D', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  statValue: {
    fontSize: 28, fontWeight: 'bold', color: '#FFC107',
    marginBottom: 4,
  },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  sectionTitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1, marginBottom: 10,
    textTransform: 'uppercase',
  },
  templatesRow: { gap: 10, paddingBottom: 16 },
  templateCard: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)', minWidth: 90,
  },
  templateCardActive: {
    borderColor: G, backgroundColor: 'rgba(34,197,94,0.1)',
  },
  templateIcon: { fontSize: 28 },
  templateTitle: {
    fontSize: 11, fontWeight: 'bold', color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  messageInput: {
    backgroundColor: '#0D1A0D', borderRadius: 14, padding: 14,
    color: '#fff', fontSize: 14, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    minHeight: 160, marginBottom: 6, lineHeight: 22,
  },
  charCount: {
    fontSize: 11, color: 'rgba(255,255,255,0.3)',
    textAlign: 'right', marginBottom: 16,
  },
  waBtn: {
    backgroundColor: '#25D366', borderRadius: 16,
    padding: 16, alignItems: 'center', marginBottom: 10,
  },
  waBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  pushBtn: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 16,
    padding: 16, alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)', marginBottom: 14,
  },
  pushBtnText: { color: G, fontSize: 15, fontWeight: 'bold' },
  noteBox: {
    backgroundColor: 'rgba(255,193,7,0.06)', borderRadius: 12,
    padding: 12, borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.2)',
  },
  noteText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  listHeader: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)',
    marginBottom: 10, letterSpacing: 1,
  },
  customerRow: {
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 8, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
  },
  customerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  customerAvatarText: {
    color: G, fontSize: 16, fontWeight: 'bold',
  },
  customerName: {
    fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 2,
  },
  customerPhone: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  waIconBtn: {
    backgroundColor: 'rgba(37,211,102,0.1)', borderRadius: 10,
    padding: 8, borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.2)',
  },
  waIconBtnText: { fontSize: 20 },
});

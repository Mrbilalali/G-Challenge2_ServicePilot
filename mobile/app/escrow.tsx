import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createEscrow } from '@/services/api';

const PAYMENT_METHODS = [
  { key: 'wallet', label: 'Wallet Balance', icon: 'wallet', desc: 'Pay from your wallet' },
  { key: 'card', label: 'Credit/Debit Card', icon: 'card', desc: 'Visa, Mastercard' },
  { key: 'cash', label: 'Cash on Service', icon: 'cash', desc: 'Pay after completion' },
];

export default function EscrowScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [method, setMethod] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [escrowCreated, setEscrowCreated] = useState(false);
  const [escrowData, setEscrowData] = useState<any>(null);

  const bookingId = (params.bookingId as string) || 'demo_booking';
  const amount = parseFloat((params.amount as string) || '1500');
  const providerName = (params.providerName as string) || 'Technician';
  const serviceFee = amount * 0.1;
  const total = amount + serviceFee;

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await createEscrow(bookingId, total, method);
      setEscrowData(res.escrow);
      setEscrowCreated(true);
    } catch(e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  if (escrowCreated) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.successIcon}>
            <Ionicons name="shield-checkmark" size={48} color="#fff" />
          </LinearGradient>
          <Text style={styles.successTitle}>Payment Secured! 🔒</Text>
          <Text style={styles.successDesc}>Rs. {total} is held securely in escrow. Payment will be released to {providerName} only after you confirm service completion.</Text>
          
          <View style={styles.escrowStatusCard}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.statusLabel}>Payment Received</Text>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.statusLabel}>Held in Escrow</Text>
              <Ionicons name="lock-closed" size={16} color="#f59e0b" />
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: '#e2e8f0' }]} />
              <Text style={[styles.statusLabel, { color: '#94a3b8' }]}>Service In Progress</Text>
              <Ionicons name="time" size={16} color="#94a3b8" />
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: '#e2e8f0' }]} />
              <Text style={[styles.statusLabel, { color: '#94a3b8' }]}>Release to Technician</Text>
              <Ionicons name="arrow-forward-circle" size={16} color="#94a3b8" />
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.push('/(tabs)/bookings')}>
            <Text style={styles.doneBtnText}>View Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Back to Results</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <Text style={styles.headerSub}>Escrow Protected</Text>
        </View>
        <Ionicons name="shield-checkmark" size={24} color="#10b981" />
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Escrow Explainer */}
        <View style={styles.escrowBanner}>
          <Ionicons name="lock-closed" size={20} color="#4f46e5" />
          <View style={{ flex: 1 }}>
            <Text style={styles.escrowBannerTitle}>Escrow Protection</Text>
            <Text style={styles.escrowBannerDesc}>Your payment is held securely until you confirm the service is complete. You're always in control.</Text>
          </View>
        </View>

        {/* Booking Summary */}
        <Text style={styles.sectionTitle}>Booking Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Provider</Text>
            <Text style={styles.summaryValue}>{providerName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Charge</Text>
            <Text style={styles.summaryValue}>Rs. {amount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform Fee (10%)</Text>
            <Text style={styles.summaryValue}>Rs. {serviceFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {PAYMENT_METHODS.map(pm => (
          <TouchableOpacity key={pm.key} style={[styles.methodCard, method === pm.key && styles.methodActive]} onPress={() => setMethod(pm.key)}>
            <Ionicons name={pm.icon as any} size={22} color={method === pm.key ? '#4f46e5' : '#64748b'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodLabel, method === pm.key && { color: '#4f46e5' }]}>{pm.label}</Text>
              <Text style={styles.methodDesc}>{pm.desc}</Text>
            </View>
            <View style={[styles.radio, method === pm.key && styles.radioActive]}>
              {method === pm.key && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Pay Button */}
        <TouchableOpacity style={[styles.payBtn, loading && { opacity: 0.6 }]} onPress={handlePay} disabled={loading}>
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.payBtnGradient}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <Text style={styles.payBtnText}>{loading ? 'Processing...' : `Pay Rs. ${total.toFixed(2)} (Escrow)`}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>By paying, you agree to our Terms of Service. Your payment is protected by our Escrow Guarantee.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#10b981', fontWeight: '700' },
  
  escrowBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#e0e7ff', padding: 16, borderRadius: 14, marginBottom: 24 },
  escrowBannerTitle: { fontSize: 14, fontWeight: '900', color: '#4338ca' },
  escrowBannerDesc: { fontSize: 12, color: '#4338ca', lineHeight: 18, marginTop: 2 },
  
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  summaryLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  summaryValue: { fontSize: 13, color: '#0f172a', fontWeight: '700' },
  totalRow: { borderTopWidth: 2, borderTopColor: '#e2e8f0', marginTop: 4, paddingTop: 12, borderBottomWidth: 0 },
  totalLabel: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#10b981' },
  
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1.5, borderColor: '#e2e8f0' },
  methodActive: { borderColor: '#4f46e5', backgroundColor: '#f5f3ff' },
  methodLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  methodDesc: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#4f46e5' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4f46e5' },
  
  payBtn: { marginTop: 20 },
  payBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  
  disclaimer: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 16, lineHeight: 16 },
  
  // Success State
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  successDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  
  escrowStatusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  statusLine: { width: 2, height: 16, backgroundColor: '#e2e8f0', marginLeft: 4, marginVertical: 2 },
  
  doneBtn: { backgroundColor: '#4f46e5', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, marginBottom: 12 },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  backLink: { color: '#4f46e5', fontSize: 14, fontWeight: '700', marginTop: 8 },
});

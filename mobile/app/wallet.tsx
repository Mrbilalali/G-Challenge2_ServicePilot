import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getWallet } from '@/services/api';

export default function WalletScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [tab, setTab] = useState<'customer' | 'technician'>('customer');

  useEffect(() => { fetchWallet(); }, [tab]);

  const fetchWallet = async () => {
    try {
      const res = await getWallet(tab);
      setWallet(res.wallet);
    } catch (e) { console.log(e); }
  };

  const getTxnColor = (type: string) => {
    if (type === 'credit' || type === 'refund') return '#10b981';
    if (type === 'escrow_hold') return '#f59e0b';
    return '#ef4444';
  };

  const getTxnIcon = (type: string) => {
    if (type === 'credit') return 'arrow-down-circle';
    if (type === 'refund') return 'refresh-circle';
    if (type === 'escrow_hold') return 'lock-closed';
    return 'arrow-up-circle';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.header}>
        <View style={[styles.headerRow, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tab Switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'customer' && styles.tabActive]} onPress={() => setTab('customer')}>
            <Text style={[styles.tabText, tab === 'customer' && styles.tabTextActive]}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'technician' && styles.tabActive]} onPress={() => setTab('technician')}>
            <Text style={[styles.tabText, tab === 'technician' && styles.tabTextActive]}>Technician</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        {wallet && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>Rs. {wallet.balance?.toLocaleString()}</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceMini}>
                <Ionicons name="lock-closed" size={12} color="#f59e0b" />
                <Text style={styles.balanceMiniText}>Pending: Rs. {wallet.pending || 0}</Text>
              </View>
              {tab === 'technician' && wallet.earnings_total && (
                <View style={styles.balanceMini}>
                  <Ionicons name="trending-up" size={12} color="#10b981" />
                  <Text style={styles.balanceMiniText}>Total: Rs. {wallet.earnings_total?.toLocaleString()}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="add-circle" size={22} color="#10b981" />
            </View>
            <Text style={styles.actionLabel}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIcon, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="arrow-up-circle" size={22} color="#4f46e5" />
            </View>
            <Text style={styles.actionLabel}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="card" size={22} color="#d97706" />
            </View>
            <Text style={styles.actionLabel}>Cards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIcon, { backgroundColor: '#fce7f3' }]}>
              <Ionicons name="gift" size={22} color="#db2777" />
            </View>
            <Text style={styles.actionLabel}>Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {wallet?.transactions?.map((txn: any, i: number) => (
          <View key={i} style={styles.txnCard}>
            <View style={[styles.txnIcon, { backgroundColor: getTxnColor(txn.type) + '15' }]}>
              <Ionicons name={getTxnIcon(txn.type) as any} size={20} color={getTxnColor(txn.type)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txnDesc}>{txn.desc}</Text>
              <Text style={styles.txnDate}>{txn.date}</Text>
            </View>
            <Text style={[styles.txnAmount, { color: getTxnColor(txn.type) }]}>
              {txn.amount > 0 ? '+' : ''}Rs. {Math.abs(txn.amount)}
            </Text>
          </View>
        ))}

        {(!wallet?.transactions || wallet.transactions.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  
  tabRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '800', color: '#94a3b8' },
  tabTextActive: { color: '#0f172a' },
  
  balanceCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  balanceLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 4 },
  balanceRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  balanceMini: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceMiniText: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '800', color: '#334155' },
  
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  
  txnCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  txnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txnDesc: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  txnDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: '900' },
  
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '700' },
});

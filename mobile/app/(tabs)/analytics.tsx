import React from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#fdf4ff", "#f3e8ff"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="pie-chart" size={24} color="#a855f7" />
          <View>
            <Text style={styles.headerTitle}>Enterprise Analytics</Text>
            <Text style={styles.headerSub}>B2B Orchestration Performance</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderColor: '#c7d2fe' }]}>
            <Text style={styles.kpiLabel}>Total Match Rate</Text>
            <Text style={styles.kpiValue}>98.4%</Text>
            <View style={styles.kpiChangeRow}>
              <Ionicons name="trending-up" size={14} color="#10b981" />
              <Text style={[styles.kpiChangeText, { color: '#10b981' }]}>+2.1%</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#fbcfe8' }]}>
            <Text style={styles.kpiLabel}>AI Recovery Rate</Text>
            <Text style={styles.kpiValue}>100%</Text>
            <View style={styles.kpiChangeRow}>
              <Ionicons name="shield-checkmark" size={14} color="#10b981" />
              <Text style={[styles.kpiChangeText, { color: '#10b981' }]}>Autonomous</Text>
            </View>
          </View>
        </View>

        {/* Chart Area Simulation */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Orchestration Volume (7 Days)</Text>
          <View style={styles.barChart}>
            {[40, 60, 30, 80, 100, 50, 70].map((height, i) => (
              <View key={i} style={styles.barCol}>
                <LinearGradient colors={["#818cf8", "#4f46e5"]} style={[styles.barFill, { height: `${height}%` }]} />
                <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Agent Performance Status</Text>
        
        <View style={styles.agentCard}>
          <View style={styles.agentRow}>
            <Ionicons name="flash" size={20} color="#f59e0b" />
            <Text style={styles.agentName}>Intent Resolution Agent</Text>
            <Text style={styles.agentScore}>142ms latency</Text>
          </View>
          <View style={styles.agentRow}>
            <Ionicons name="git-merge" size={20} color="#10b981" />
            <Text style={styles.agentName}>Matching Agent</Text>
            <Text style={styles.agentScore}>99% accuracy</Text>
          </View>
          <View style={styles.agentRow}>
            <Ionicons name="cash" size={20} color="#6366f1" />
            <Text style={styles.agentName}>Pricing Agent</Text>
            <Text style={styles.agentScore}>Optimized 42 reqs</Text>
          </View>
          <View style={[styles.agentRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="warning" size={20} color="#ef4444" />
            <Text style={styles.agentName}>Recovery Agent</Text>
            <Text style={styles.agentScore}>Active Standby</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  headerSub: { fontSize: 13, color: "#9333ea", fontWeight: "700" },
  
  content: { flex: 1 },
  
  kpiGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  kpiCard: { flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  kpiLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  kpiValue: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginTop: 8 },
  kpiChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  kpiChangeText: { fontSize: 12, fontWeight: '800' },

  chartContainer: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  chartTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 24 },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', height: 150, alignItems: 'flex-end', paddingHorizontal: 10 },
  barCol: { alignItems: 'center', width: 30 },
  barFill: { width: 12, backgroundColor: '#6366f1', borderRadius: 6, opacity: 0.8 },
  barLabel: { fontSize: 12, color: '#64748b', marginTop: 12, fontWeight: '700' },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 },
  agentCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  agentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  agentName: { fontSize: 14, fontWeight: '700', color: '#334155', marginLeft: 12, flex: 1 },
  agentScore: { fontSize: 12, fontWeight: '800', color: '#64748b' },
});

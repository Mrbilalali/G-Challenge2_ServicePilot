import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBookings, getTrace } from '@/services/api';

const AGENT_CONFIG: Record<string, { color: string; icon: string }> = {
  "IntentAgent": { color: "#3b82f6", icon: "language" },
  "DiscoveryAgent": { color: "#14b8a6", icon: "globe" },
  "MatchingAgent": { color: "#a855f7", icon: "git-merge" },
  "SchedulingAgent": { color: "#8b5cf6", icon: "time" },
  "PricingAgent": { color: "#f59e0b", icon: "cash" },
  "BookingAgent": { color: "#10b981", icon: "calendar" },
  "PaymentAgent": { color: "#10b981", icon: "card" },
  "NotificationAgent": { color: "#64748b", icon: "notifications" },
  "RecoveryAgent": { color: "#ef4444", icon: "warning" },
  "Dispute & RecoveryAgent": { color: "#ef4444", icon: "warning" },
};

export default function TraceScreen() {
  const [traceData, setTraceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchTrace();
  }, []);

  const fetchTrace = async () => {
    setLoading(true);
    try {
      const bData = await getBookings();
      const bookingList = bData.bookings || bData;
      if (bookingList && bookingList.length > 0) {
        const latestId = bookingList[0].id;
        const tData = await getTrace(latestId);
        setTraceData(tData.trace);
      }
    } catch (e) {
      console.log("Trace fetch error:", e);
    }
    setLoading(false);
  };

  const getTimestamp = (idx: number) => {
    const base = new Date();
    base.setSeconds(base.getSeconds() - (10 - idx) * 2);
    return base.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0f172a", "#1e293b"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerTitleRow}>
          <View style={styles.terminalIcon}>
            <Ionicons name="terminal" size={18} color="#38bdf8" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Trace Log</Text>
            <Text style={styles.headerSub}>Live Reasoning Monitor</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTrace}>
          <Ionicons name="refresh" size={18} color="#38bdf8" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={{marginTop: 12, color: '#64748b'}}>Fetching agent logs...</Text>
        </View>
      ) : !traceData ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="code-slash" size={32} color="#475569" />
          </View>
          <Text style={styles.emptyTitle}>No Trace Data</Text>
          <Text style={styles.emptyDesc}>Make a service request first to generate AI reasoning traces.</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.traceMetaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Booking</Text>
              <Text style={styles.metaValue}>{traceData.booking_id}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Agents</Text>
              <Text style={styles.metaValue}>{traceData.steps?.length || 0} executed</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Pipeline</Text>
              <View style={styles.statusPill}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.statusPillText}>Completed</Text>
              </View>
            </View>
          </View>

          {traceData.steps?.map((step: any, idx: number) => {
            const config = AGENT_CONFIG[step.agent] || { color: "#64748b", icon: "cube" };
            const isExpanded = expandedStep === idx;
            
            return (
              <TouchableOpacity key={idx} style={styles.stepCard} onPress={() => setExpandedStep(isExpanded ? null : idx)} activeOpacity={0.8}>
                <View style={[styles.stepTimeline, { backgroundColor: config.color }]} />
                <View style={styles.stepContent}>
                  <View style={styles.stepHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.agentIcon, { backgroundColor: config.color + '20' }]}>
                        <Ionicons name={config.icon as any} size={14} color={config.color} />
                      </View>
                      <View>
                        <Text style={[styles.agentName, { color: config.color }]}>{step.agent}</Text>
                        <Text style={styles.timestamp}>{getTimestamp(idx)}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {step.status === "fallback" && (
                        <View style={styles.fallbackBadge}><Text style={styles.fallbackText}>FALLBACK</Text></View>
                      )}
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
                    </View>
                  </View>
                  
                  {step.reasoning?.slice(0, isExpanded ? undefined : 2).map((r: string, ridx: number) => (
                    <View key={ridx} style={styles.reasoningRow}>
                      <Text style={styles.reasoningArrow}>→</Text>
                      <Text style={styles.reasoningText}>{r}</Text>
                    </View>
                  ))}

                  {isExpanded && step.input && (
                    <View style={styles.codeBlock}>
                      <Text style={styles.codeLabel}>INPUT</Text>
                      <Text style={styles.codeText}>{JSON.stringify(step.input, null, 2)}</Text>
                    </View>
                  )}
                  
                  {isExpanded && step.output && typeof step.output !== 'object' && (
                    <View style={styles.outputRow}>
                      <Text style={styles.outputLabel}>Output:</Text>
                      <Text style={styles.outputValue}>{step.output}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  terminalIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(56,189,248,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 12, color: "#38bdf8", fontWeight: "700", marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(56,189,248,0.1)', alignItems: 'center', justifyContent: 'center' },
  
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  
  list: { flex: 1 },
  
  traceMetaCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  metaLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', fontFamily: 'monospace' },
  metaValue: { fontSize: 12, color: '#e2e8f0', fontWeight: '800', fontFamily: 'monospace' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#10b981' },
  
  stepCard: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
  stepTimeline: { width: 4 },
  stepContent: { flex: 1, padding: 14 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  agentIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  agentName: { fontSize: 13, fontWeight: '900' },
  timestamp: { fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 1 },
  fallbackBadge: { backgroundColor: '#fff7ed', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fallbackText: { color: '#ea580c', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  
  reasoningRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  reasoningArrow: { color: '#4f46e5', fontSize: 12, fontWeight: '900' },
  reasoningText: { fontSize: 13, color: '#334155', lineHeight: 20, flex: 1 },

  codeBlock: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, marginTop: 10 },
  codeLabel: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 1, marginBottom: 6 },
  codeText: { fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', lineHeight: 18 },
  
  outputRow: { flexDirection: 'row', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  outputLabel: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  outputValue: { fontSize: 12, fontWeight: '700', color: '#0f172a', flex: 1 },
});

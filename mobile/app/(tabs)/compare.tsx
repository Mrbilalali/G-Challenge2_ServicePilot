import React from 'react';
import { StyleSheet, View, ScrollView, Platform, Dimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View>
          <Text style={styles.headerTitle}>Baseline Compare</Text>
          <Text style={styles.headerSub}>"AC kal subah G-13, budget kam"</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        
        {/* Side-by-side Comparison */}
        <View style={styles.splitContainer}>
          
          {/* Simple System Column */}
          <View style={[styles.column, styles.colSimple]}>
            <View style={styles.colHeaderSimple}>
              <Text style={styles.colTitleSimple}>SIMPLE SYSTEM</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Language</Text>
              <Text style={styles.featureFail}>English only (Fails)</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Ranking</Text>
              <Text style={styles.featureFail}>Distance only</Text>
              <Text style={styles.featureSub}>Picks closest (high cancel rate)</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Pricing</Text>
              <Text style={styles.featureFail}>Flat PKR 700</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Automation</Text>
              <Text style={styles.featureFail}>Manual call required</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Edge Case / Fallback</Text>
              <Text style={styles.featureFail}>None (App crashes/hangs)</Text>
            </View>
            <View style={styles.missedBookingBox}>
              <Ionicons name="close-circle" size={16} color="#ef4444" />
              <Text style={styles.missedBookingText}>Missed Booking</Text>
            </View>
          </View>

          {/* Spacer */}
          <View style={{width: 8}} />

          {/* Your Agent Column */}
          <View style={[styles.column, styles.colAgent]}>
            <View style={styles.colHeaderAgent}>
              <Text style={styles.colTitleAgent}>SERVICEPILOT AI</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Language</Text>
              <Text style={styles.featurePass}>Urdu/Roman/Mixed</Text>
              <Text style={styles.featureSub}>Confidence: 87%</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Ranking</Text>
              <Text style={styles.featurePass}>8 Factors Weighted</Text>
              <Text style={styles.featureSub}>Avoids bad providers despite proximity</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Pricing</Text>
              <Text style={styles.featurePass}>Dynamic PKR 580</Text>
              <Text style={styles.featureSub}>Budget alternative found</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Automation</Text>
              <Text style={styles.featurePass}>Instant Confirmation</Text>
              <Text style={styles.featureSub}>T-24h & T-1h reminders</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>Edge Case / Fallback</Text>
              <Text style={styles.featurePass}>Automated Recovery</Text>
              <Text style={styles.featureSub}>Auto-reschedule in 90s</Text>
            </View>
            <View style={styles.successBookingBox}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.successBookingText}>Successful Booking</Text>
            </View>
          </View>

        </View>

        {/* Metrics Table */}
        <View style={styles.metricsTable}>
          <Text style={styles.metricsHeader}>Metrics Comparison</Text>
          
          <View style={styles.tableRow}>
            <Text style={styles.tableCellMetric}>Multilingual Support</Text>
            <Text style={styles.tableCellSimple}>✗</Text>
            <Text style={styles.tableCellAgent}>✓ (87%)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellMetric}>Ranking Factors</Text>
            <Text style={styles.tableCellSimple}>1</Text>
            <Text style={styles.tableCellAgent}>8</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellMetric}>Matching Accuracy</Text>
            <Text style={styles.tableCellSimple}>42%</Text>
            <Text style={styles.tableCellAgent}>91%</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellMetric}>Pricing Transparency</Text>
            <Text style={styles.tableCellSimple}>✗</Text>
            <Text style={styles.tableCellAgent}>✓ (5 items)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellMetric}>Time to Book</Text>
            <Text style={styles.tableCellSimple}>~8 min</Text>
            <Text style={styles.tableCellAgent}>~45 sec</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#cbd5e1" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  headerSub: { fontSize: 13, color: "#6366f1", fontWeight: "600", marginTop: 4, fontStyle: 'italic' },
  content: { flex: 1 },
  
  splitContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  column: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  colSimple: { borderColor: '#cbd5e1' },
  colAgent: { borderColor: '#818cf8', borderWidth: 2 },
  
  colHeaderSimple: { backgroundColor: '#f1f5f9', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  colTitleSimple: { fontSize: 11, fontWeight: '900', color: '#64748b' },
  colHeaderAgent: { backgroundColor: '#eef2ff', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#c7d2fe' },
  colTitleAgent: { fontSize: 11, fontWeight: '900', color: '#4f46e5' },
  
  featureBox: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  featureTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  featureFail: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  featurePass: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  featureSub: { fontSize: 10, color: '#64748b', marginTop: 2 },
  
  missedBookingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 12, backgroundColor: '#fef2f2' },
  missedBookingText: { fontSize: 11, fontWeight: '800', color: '#ef4444' },
  successBookingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 12, backgroundColor: '#ecfdf5' },
  successBookingText: { fontSize: 11, fontWeight: '800', color: '#10b981' },
  
  metricsTable: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', overflow: 'hidden' },
  metricsHeader: { padding: 16, fontSize: 16, fontWeight: '900', color: '#0f172a', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', padding: 12 },
  tableCellMetric: { flex: 2, fontSize: 13, fontWeight: '700', color: '#334155' },
  tableCellSimple: { flex: 1, fontSize: 13, fontWeight: '700', color: '#ef4444', textAlign: 'center' },
  tableCellAgent: { flex: 1, fontSize: 13, fontWeight: '900', color: '#10b981', textAlign: 'center' },
});

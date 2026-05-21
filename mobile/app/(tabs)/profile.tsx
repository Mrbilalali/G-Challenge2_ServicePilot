import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const [isAiEnabled, setIsAiEnabled] = React.useState(true);
  const [isAutoBook, setIsAutoBook] = React.useState(false);
  const [isUrduFirst, setIsUrduFirst] = React.useState(true);
  const [isEnterpriseMode, setIsEnterpriseMode] = React.useState(true);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerContent}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>U</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            </View>
          </View>
          <View>
            <Text style={styles.userName}>Uzair Khan</Text>
            <Text style={styles.userPhone}>+92 300 1234567</Text>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={10} color="#6366f1" />
              <Text style={styles.aiBadgeText}>AI PILOT ACTIVE</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        {/* Stats Row */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Orchestrations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>Rs. 8k</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Disputes Won</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Agentic Preferences</Text>
        
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIconBg, { backgroundColor: '#fdf4ff' }]}>
              <Ionicons name="business-outline" size={20} color="#c026d3" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Enterprise Provider Portal</Text>
              <Text style={styles.settingDesc}>Enable advanced B2B analytics & leads</Text>
            </View>
            <Switch value={isEnterpriseMode} onValueChange={setIsEnterpriseMode} trackColor={{ true: '#c026d3' }} />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <Ionicons name="hardware-chip-outline" size={20} color="#6366f1" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>AI Orchestrator Engine</Text>
              <Text style={styles.settingDesc}>Use multi-agent system to negotiate prices</Text>
            </View>
            <Switch value={isAiEnabled} onValueChange={setIsAiEnabled} trackColor={{ true: '#6366f1' }} />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIconBg, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="flash-outline" size={20} color="#f59e0b" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Auto-Book Top Pick</Text>
              <Text style={styles.settingDesc}>Skip provider list if match > 95%</Text>
            </View>
            <Switch value={isAutoBook} onValueChange={setIsAutoBook} trackColor={{ true: '#6366f1' }} />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIconBg, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="language-outline" size={20} color="#10b981" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Urdu Default Processing</Text>
              <Text style={styles.settingDesc}>Prioritize Roman Urdu intent parsing</Text>
            </View>
            <Switch value={isUrduFirst} onValueChange={setIsUrduFirst} trackColor={{ true: '#6366f1' }} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account Data</Text>

        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRowBtn}>
            <View style={styles.settingIconBgGray}>
              <Ionicons name="location-outline" size={20} color="#64748b" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Saved Locations</Text>
              <Text style={styles.settingDesc}>G-13, DHA Phase 6</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRowBtn}>
            <View style={styles.settingIconBgGray}>
              <Ionicons name="card-outline" size={20} color="#64748b" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Payment Methods</Text>
              <Text style={styles.settingDesc}>JazzCash, Credit Card</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    paddingBottom: 24, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: "#cbd5e1",
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarLarge: { 
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#4f46e5', 
    alignItems: 'center', justifyContent: 'center', position: 'relative' 
  },
  avatarLargeText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 10, padding: 2 },
  userName: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  userPhone: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 },
  aiBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, 
    backgroundColor: '#e0e7ff', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 
  },
  aiBadgeText: { fontSize: 10, fontWeight: '900', color: '#4f46e5', letterSpacing: 1 },

  content: { flex: 1 },
  
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 4, textAlign: 'center' },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  
  settingsCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  settingRowBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  settingIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  settingIconBgGray: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  settingTextCol: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  settingDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 68 },

  logoutBtn: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 },
  logoutBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '900' }
});

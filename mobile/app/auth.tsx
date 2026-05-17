import React from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={styles.background} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
        <View style={styles.logoContainer}>
          <Ionicons name="flash" size={32} color="#6366f1" />
        </View>
        <Text style={styles.title}>ServicePilot AI</Text>
        <Text style={styles.subtitle}>Choose your operational mode</Text>
      </View>

      <View style={styles.cardContainer}>
        {/* Customer Card */}
        <TouchableOpacity 
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)')}
        >
          <LinearGradient colors={["#ffffff", "#f8fafc"]} style={styles.cardGradient}>
            <View style={styles.cardIconBg}>
              <Ionicons name="person" size={28} color="#6366f1" />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.cardTitle}>I'm a Customer</Text>
              <Text style={styles.cardDesc}>Book services instantly using our Voice AI Orchestrator.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Provider Card */}
        <TouchableOpacity 
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push('/provider-register')}
        >
          <LinearGradient colors={["#ffffff", "#f8fafc"]} style={styles.cardGradient}>
            <View style={[styles.cardIconBg, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }]}>
              <Ionicons name="briefcase" size={28} color="#10b981" />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={[styles.cardTitle, { color: '#059669' }]}>I'm a Provider</Text>
              <Text style={styles.cardDesc}>Get automated leads and let AI negotiate for you.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Text style={styles.footerText}>Powered by Google Antigravity</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  background: { ...StyleSheet.absoluteFillObject },
  
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(99,102,241,0.15)",
    borderWidth: 1, borderColor: "rgba(99,102,241,0.3)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8
  },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', fontWeight: '600' },

  cardContainer: { paddingHorizontal: 20, gap: 20 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  cardIconBg: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1, borderColor: "rgba(99,102,241,0.3)",
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16
  },
  cardTextCol: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#4f46e5', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748b', lineHeight: 20 },

  footer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  footerText: { color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }
});

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { getBookings, cancelBooking, submitFeedback } from '@/services/api';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const loadData = async () => {
    try {
      const data = await getBookings();
      setBookings(data.bookings || data);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCancel = (id: string) => {
    router.push({
      pathname: "/dispute",
      params: { bookingId: id }
    });
  };

  const handleFeedback = async (id: string, rating: number) => {
    setLoadingAction(id);
    try {
      await submitFeedback(id, rating, "Great service");
      await loadData();
      Alert.alert("Feedback Agent Updated", "The provider's global reputation has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoadingAction(null);
  };

  if (bookings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="receipt-outline" size={40} color="#666" />
        </View>
        <Text style={styles.emptyTitle}>No Active Orchestrations</Text>
        <Text style={styles.emptySub}>Your booked services will appear here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View>
          <Text style={styles.headerTitle}>Active Orchestrations</Text>
          <Text style={styles.headerSub}>Manage your AI-booked services</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
      >
        {bookings.map((b) => {
          const isConfirmed = b.status === 'confirmed';
          const isRecovered = b.status === 'recovered';
          const isCompleted = b.status === 'completed';
          
          return (
            <View key={b.id} style={[styles.card, isRecovered && styles.cardRecovered]}>
              <View style={styles.cardHeader}>
                <View style={[
                  styles.statusBadge, 
                  isConfirmed && styles.statusConfirmed,
                  isRecovered && styles.statusRecovered,
                  isCompleted && styles.statusCompleted,
                  (!isConfirmed && !isRecovered && !isCompleted) && styles.statusCancelled
                ]}>
                  {isRecovered && <Ionicons name="refresh" size={12} color="#f59e0b" style={{ marginRight: 4 }} />}
                  <Text style={[
                    styles.statusText,
                    isConfirmed && styles.textConfirmed,
                    isRecovered && styles.textRecovered,
                    isCompleted && styles.textCompleted,
                    (!isConfirmed && !isRecovered && !isCompleted) && styles.textCancelled
                  ]}>
                    {b.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.cardId}>ID: {b.id.split('-')[0]}</Text>
              </View>

              <View style={styles.providerRow}>
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerAvatarText}>{b.provider?.name?.charAt(0) || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{b.provider?.name || 'Unknown Provider'}</Text>
                  <Text style={styles.issueText} numberOfLines={1}>"{b.user_message}"</Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <View style={styles.detailCol}>
                  <Ionicons name="calendar-outline" size={14} color="#8b5cf6" />
                  <Text style={styles.detailText}>{b.schedule?.date || 'N/A'}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                  <Text style={styles.detailText}>{b.schedule?.time_start || 'N/A'}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Ionicons name="cash-outline" size={14} color="#10b981" />
                  <Text style={[styles.detailText, { color: '#10b981', fontWeight: '800' }]}>
                    Rs.{b.pricing?.total || 0}
                  </Text>
                </View>
              </View>

              {/* Status Stepper */}
              <View style={styles.stepperContainer}>
                <View style={[styles.stepDot, (isConfirmed || isRecovered || isCompleted) && styles.stepDotActive]} />
                <View style={[styles.stepLine, (isRecovered || isCompleted) && styles.stepLineActive]} />
                <View style={[styles.stepDot, (isRecovered || isCompleted) && styles.stepDotActive]} />
                <View style={[styles.stepLine, isCompleted && styles.stepLineActive]} />
                <View style={[styles.stepDot, isCompleted && styles.stepDotActive]} />
              </View>
              <View style={styles.stepperLabels}>
                <Text style={[styles.stepLabel, (isConfirmed || isRecovered || isCompleted) && styles.stepLabelActive]}>Confirmed</Text>
                <Text style={[styles.stepLabel, (isRecovered || isCompleted) && styles.stepLabelActive]}>En Route</Text>
                <Text style={[styles.stepLabel, isCompleted && styles.stepLabelActive]}>Completed</Text>
              </View>

              {(isConfirmed || isRecovered) && (
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.cancelBtn]} 
                    onPress={() => handleCancel(b.id)}
                    disabled={loadingAction === b.id}
                  >
                    <Ionicons name="warning-outline" size={16} color="#f87171" />
                    <Text style={styles.cancelBtnText}>
                      {loadingAction === b.id ? 'Recovering...' : 'Cancel / Raise Dispute'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.completeBtn]} 
                    onPress={() => handleFeedback(b.id, 5)}
                    disabled={loadingAction === b.id}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={styles.completeBtnText}>Mark Complete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    paddingBottom: 20, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: "#cbd5e1",
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  headerSub: { fontSize: 13, color: "#6366f1", fontWeight: "600", marginTop: 4 },
  
  emptyContainer: { flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 14, color: '#64748b', marginTop: 8 },

  list: { flex: 1 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8,
  },
  cardRecovered: { borderColor: 'rgba(245, 158, 11, 0.3)', borderWidth: 1 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusConfirmed: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  statusRecovered: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' },
  statusCompleted: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' },
  statusCancelled: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  textConfirmed: { color: '#10b981' },
  textRecovered: { color: '#f59e0b' },
  textCompleted: { color: '#3b82f6' },
  textCancelled: { color: '#ef4444' },
  cardId: { color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' },

  providerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  providerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(99,102,241,0.15)",
    borderWidth: 1, borderColor: "rgba(99,102,241,0.3)",
    alignItems: "center", justifyContent: "center"
  },
  providerAvatarText: { color: "#6366f1", fontWeight: "900", fontSize: 18 },
  providerName: { color: "#0f172a", fontWeight: "800", fontSize: 16 },
  issueText: { color: "#64748b", fontSize: 13, fontStyle: 'italic', marginTop: 2 },

  detailsBox: {
    flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12,
    justifyContent: 'space-between', marginBottom: 16,
  },
  detailCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: '#334155', fontSize: 13, fontWeight: '600' },

  actions: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8, borderWidth: 1 },
  cancelBtn: { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  cancelBtnText: { color: '#f87171', fontWeight: '800', fontSize: 13 },
  completeBtn: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  completeBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  
  stepperContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e2e8f0' },
  stepDotActive: { backgroundColor: '#10b981' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0' },
  stepLineActive: { backgroundColor: '#10b981' },
  stepperLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 10 },
  stepLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  stepLabelActive: { color: '#0f172a', fontWeight: '800' },
});

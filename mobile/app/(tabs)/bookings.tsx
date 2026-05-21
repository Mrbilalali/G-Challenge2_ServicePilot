import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { getBookings, cancelBooking, submitFeedback, releaseEscrow, disputeEscrow, refundEscrow } from '@/services/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const loadData = async () => {
    try {
      const data = await getBookings();
      // Ensure bookings have proper escrow status and booking status defaults if not present
      const list = (data.bookings || data || []).map((b: any) => ({
        ...b,
        status: b.status || 'pending',
        escrow_status: b.escrow_status || 'held', // held, released, disputed, refunded
      }));
      setBookings(list);
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
      await submitFeedback(id, rating, "Excellent technician, completed standard operating procedures.");
      await loadData();
      Alert.alert("Feedback Logged", "Technician reputation upgraded by the matching engine.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoadingAction(null);
  };

  const handleCallProvider = (phone: string) => {
    Linking.openURL(`tel:${phone || '+923001234567'}`);
  };

  const handleChatProvider = (b: any) => {
    router.push({
      pathname: "/chat",
      params: {
        bookingId: b.id,
        providerName: b.provider?.name || 'Technician'
      }
    });
  };

  const handleViewProviderProfile = (provider: any) => {
    if (!provider) return;
    router.push({
      pathname: "/technician",
      params: { data: JSON.stringify(provider) }
    });
  };

  const handleReleasePayment = async (bookingId: string) => {
    setLoadingAction(bookingId);
    try {
      const res = await releaseEscrow(bookingId);
      Alert.alert("Success", res.message || "Payment released from escrow to technician's wallet.");
      await loadData();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoadingAction(null);
  };

  const handleDisputePayment = async (bookingId: string) => {
    setLoadingAction(bookingId);
    try {
      const res = await disputeEscrow(bookingId);
      Alert.alert("Dispute Logged", res.message || "Escrow hold applied. Support agent notified.");
      await loadData();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoadingAction(null);
  };

  const handleSimulateStep = (booking: any) => {
    const states = ['pending', 'accepted', 'technician_on_way', 'arrived', 'in_progress', 'completed', 'disputed', 'refunded'];
    const currIndex = states.indexOf(booking.status);
    const nextIndex = (currIndex + 1) % 6; // cycle through pending up to completed
    const nextStatus = states[nextIndex];
    
    // Simulate updating in state
    setBookings(prev => prev.map(b => {
      if (b.id === booking.id) {
        return { ...b, status: nextStatus };
      }
      return b;
    }));
    
    Alert.alert("Workflow Simulation", `Booking status advanced to '${nextStatus}'`);
  };

  const getStatusDetails = (status: string) => {
    switch(status) {
      case 'pending': return { label: 'Pending Match', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' };
      case 'accepted': return { label: 'Accepted', color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle-outline' };
      case 'technician_on_way': return { label: 'En Route', color: '#3b82f6', bg: '#eff6ff', icon: 'bicycle-outline' };
      case 'arrived': return { label: 'Arrived at Site', color: '#8b5cf6', bg: '#f5f3ff', icon: 'location-outline' };
      case 'in_progress': return { label: 'In Progress', color: '#06b6d4', bg: '#ecfeff', icon: 'construct-outline' };
      case 'completed': return { label: 'Completed', color: '#10b981', bg: '#ecfdf5', icon: 'ribbon-outline' };
      case 'disputed': return { label: 'Disputed', color: '#ef4444', bg: '#fef2f2', icon: 'warning-outline' };
      case 'refunded': return { label: 'Refunded', color: '#64748b', bg: '#f1f5f9', icon: 'arrow-undo-outline' };
      default: return { label: status, color: '#64748b', bg: '#f1f5f9', icon: 'help-circle-outline' };
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'accepted', 'technician_on_way', 'arrived', 'in_progress'].includes(b.status);
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'disputed') return b.status === 'disputed';
    return true;
  });

  const FILTERS = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'active', label: 'Active', icon: 'time' },
    { key: 'completed', label: 'Done', icon: 'checkmark-circle' },
    { key: 'disputed', label: 'Disputed', icon: 'warning' },
  ];

  if (bookings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>AI-Orchestrated Marketplace</Text>
        </LinearGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="calendar-outline" size={40} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Bookings Yet</Text>
          <Text style={styles.emptySub}>Connect with elite verified providers in Lahore instantly.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.emptyBtnText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.headerTitle}>Order History</Text>
            <Text style={styles.headerSub}>Escrow Protected Technician Bookings</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{bookings.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {FILTERS.map(f => (
            <TouchableOpacity 
              key={f.key} 
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons name={f.icon as any} size={14} color={filter === f.key ? '#fff' : '#64748b'} />
              <Text style={[styles.filterChipText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {filteredBookings.map((b) => {
          const sd = getStatusDetails(b.status);
          const isPending = b.status === 'pending';
          const isCompleted = b.status === 'completed';
          const isDisputed = b.status === 'disputed';
          const isRefunded = b.status === 'refunded';
          const isActive = !isCompleted && !isDisputed && !isRefunded && !isPending;
          
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: sd.bg, borderColor: sd.color + '30' }]}>
                  <Ionicons name={sd.icon as any} size={12} color={sd.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: sd.color }]}>
                    {sd.label.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.cardId}>ID: {b.id?.split('-')[0] || b.id}</Text>
              </View>

              {/* Escrow Status Banner */}
              <View style={styles.escrowStatusBanner}>
                <Ionicons name="lock-closed" size={12} color="#16a34a" />
                <Text style={styles.escrowStatusText}>
                  Escrow Guarantee: Rs. {Number(b.pricing?.total || 1500).toFixed(2)} Held Safely
                </Text>
                {b.escrow_status && (
                  <View style={[styles.miniEscrowBadge, b.escrow_status === 'released' && { backgroundColor: '#d1fae5' }]}>
                    <Text style={[styles.miniEscrowBadgeText, b.escrow_status === 'released' && { color: '#065f46' }]}>
                      {b.escrow_status.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.providerRow}>
                <TouchableOpacity onPress={() => handleViewProviderProfile(b.provider)} style={styles.providerAvatar}>
                  <Text style={styles.providerAvatarText}>{b.provider?.name?.charAt(0) || '?'}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => handleViewProviderProfile(b.provider)}>
                    <Text style={styles.providerName} numberOfLines={1}>{b.provider?.name || 'Unknown Provider'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.issueText} numberOfLines={1}>"{b.user_message || 'Standard Operating Repair request'}"</Text>
                </View>
                
                <View style={styles.techActionContainer}>
                  {b.provider?.phone && (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleCallProvider(b.provider.phone)}>
                      <Ionicons name="call" size={16} color="#4f46e5" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleChatProvider(b)}>
                    <Ionicons name="chatbubble-ellipses" size={16} color="#4f46e5" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <View style={styles.detailCol}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.detailText}>{b.schedule?.date || 'Today'}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.detailText}>{b.schedule?.time_start || 'Immediate'}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#1d4ed8" />
                  <Text style={[styles.detailText, { color: '#1d4ed8', fontWeight: '800' }]}>
                    {b.provider?.is_verified ? 'Verified' : 'External'}
                  </Text>
                </View>
              </View>

              {/* Status Stepper Tracker for active bookings */}
              {!isDisputed && !isRefunded && (
                <View style={{ marginBottom: 12 }}>
                  <View style={styles.stepperContainer}>
                    <View style={[styles.stepDot, styles.stepDotActive]} />
                    <View style={[styles.stepLine, ['accepted', 'technician_on_way', 'arrived', 'in_progress', 'completed'].includes(b.status) && styles.stepLineActive]} />
                    
                    <View style={[styles.stepDot, ['accepted', 'technician_on_way', 'arrived', 'in_progress', 'completed'].includes(b.status) && styles.stepDotActive]} />
                    <View style={[styles.stepLine, ['technician_on_way', 'arrived', 'in_progress', 'completed'].includes(b.status) && styles.stepLineActive]} />
                    
                    <View style={[styles.stepDot, ['technician_on_way', 'arrived', 'in_progress', 'completed'].includes(b.status) && styles.stepDotActive]} />
                    <View style={[styles.stepLine, ['arrived', 'in_progress', 'completed'].includes(b.status) && styles.stepLineActive]} />
                    
                    <View style={[styles.stepDot, ['completed'].includes(b.status) && styles.stepDotActive]} />
                  </View>
                  <View style={styles.stepperLabels}>
                    <Text style={[styles.stepLabel, styles.stepLabelActive]}>Request</Text>
                    <Text style={[styles.stepLabel, ['accepted', 'technician_on_way'].includes(b.status) && styles.stepLabelActive]}>Accepted</Text>
                    <Text style={[styles.stepLabel, ['arrived', 'in_progress'].includes(b.status) && styles.stepLabelActive]}>Arrived</Text>
                    <Text style={[styles.stepLabel, ['completed'].includes(b.status) && styles.stepLabelActive]}>Completed</Text>
                  </View>
                </View>
              )}

              {/* Simulation Helper */}
              <TouchableOpacity style={styles.simulateBtn} onPress={() => handleSimulateStep(b)}>
                <Ionicons name="cog-outline" size={12} color="#4f46e5" />
                <Text style={styles.simulateBtnText}>Simulate Next Workflow State</Text>
              </TouchableOpacity>

              {/* Interactive Actions */}
              {(b.status === 'pending' || b.status === 'accepted' || isActive) && (
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.disputeBtn]} 
                    onPress={() => handleDisputePayment(b.id)}
                    disabled={loadingAction === b.id}
                  >
                    <Ionicons name="warning-outline" size={16} color="#ef4444" />
                    <Text style={styles.disputeBtnText}>Dispute</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.completeBtn]} 
                    onPress={() => handleSimulateStep(b)}
                    disabled={loadingAction === b.id}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={styles.completeBtnText}>Advance Job</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isCompleted && (
                <View style={styles.escrowCompletedContainer}>
                  <View style={styles.escrowCompletedHeader}>
                    <Ionicons name="lock-open" size={20} color="#16a34a" />
                    <Text style={styles.escrowCompletedTitle}>Release funds from Escrow?</Text>
                  </View>
                  <Text style={styles.escrowCompletedDesc}>Review technician's finished work, then release holds. Platforms holds are final once released.</Text>
                  
                  <View style={styles.releaseActionsRow}>
                    <TouchableOpacity 
                      style={[styles.miniActionBtn, styles.disputeBtnLine]} 
                      onPress={() => handleDisputePayment(b.id)}
                      disabled={loadingAction === b.id}
                    >
                      <Text style={styles.disputeTextMini}>Raise Dispute</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.miniActionBtn, styles.releaseBtn]} 
                      onPress={() => handleReleasePayment(b.id)}
                      disabled={loadingAction === b.id}
                    >
                      <Ionicons name="wallet-outline" size={14} color="#fff" />
                      <Text style={styles.releaseTextMini}>Release Rs. {Number(b.pricing?.total || 1500).toFixed(2)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.ratingSection}>
                    <Text style={styles.ratingLabel}>Feedback and Rating</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[1,2,3,4,5].map(star => (
                        <TouchableOpacity key={star} onPress={() => handleFeedback(b.id, star)}>
                          <Ionicons name="star" size={26} color={star <= 4 ? '#f59e0b' : '#e2e8f0'} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {isDisputed && (
                <View style={styles.disputedAlertBox}>
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text style={styles.disputedAlertText}>
                    Dispute open. ServicePilot support team is reviewing logs and chat histories. Payment remains locked.
                  </Text>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingBottom: 20, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#cbd5e1" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#0f172a" },
  headerSub: { fontSize: 12, color: "#4f46e5", fontWeight: "700", marginTop: 4 },
  countBadge: { backgroundColor: '#4f46e5', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  
  filterBar: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterChipText: { fontSize: 11, fontWeight: '800', color: '#64748b' },

  emptyContainer: { flex: 1, backgroundColor: '#f8fafc' },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', marginTop: 8 },
  emptyBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  list: { flex: 1 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  cardId: { color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },

  escrowStatusBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#d1fae5' },
  escrowStatusText: { fontSize: 11, fontWeight: '800', color: '#16a34a', flex: 1 },
  miniEscrowBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  miniEscrowBadgeText: { fontSize: 8, fontWeight: '900', color: '#1e4ed8' },

  providerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  providerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center" },
  providerAvatarText: { color: "#4f46e5", fontWeight: "900", fontSize: 16 },
  providerName: { color: "#0f172a", fontWeight: "800", fontSize: 15 },
  issueText: { color: "#64748b", fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  
  techActionContainer: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd6fe' },

  detailsBox: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, justifyContent: 'space-between', marginBottom: 12 },
  detailCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: '#334155', fontSize: 12, fontWeight: '700' },

  stepperContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 6, marginTop: 4 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e2e8f0' },
  stepDotActive: { backgroundColor: '#10b981' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0' },
  stepLineActive: { backgroundColor: '#10b981' },
  stepperLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  stepLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700' },
  stepLabelActive: { color: '#0f172a', fontWeight: '800' },

  simulateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  simulateBtnText: { fontSize: 9, color: '#4f46e5', fontWeight: '800' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6, borderWidth: 1 },
  disputeBtn: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  disputeBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 12 },
  completeBtn: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  completeBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  escrowCompletedContainer: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderHeight: 1, borderWidth: 1, borderColor: '#e2e8f0', gap: 8, marginTop: 4 },
  escrowCompletedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  escrowCompletedTitle: { fontSize: 13, fontWeight: '900', color: '#16a34a' },
  escrowCompletedDesc: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  
  releaseActionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  miniActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  disputeBtnLine: { borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff' },
  disputeTextMini: { fontSize: 11, fontWeight: '800', color: '#ef4444' },
  releaseBtn: { backgroundColor: '#16a34a', flexDirection: 'row', gap: 4 },
  releaseTextMini: { fontSize: 11, fontWeight: '900', color: '#fff' },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
  ratingSection: { alignItems: 'center', gap: 8 },
  ratingLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },

  disputedAlertBox: { flexDirection: 'row', gap: 8, backgroundColor: '#fef2f2', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5', marginTop: 4 },
  disputedAlertText: { fontSize: 11, color: '#ef4444', fontWeight: '700', lineHeight: 16, flex: 1 },
});

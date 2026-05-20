import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProviderDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  let p: any = null;
  let b: any = null;
  try {
    if (params.provider) p = JSON.parse(params.provider as string);
    if (params.bookingContext) b = JSON.parse(params.bookingContext as string);
  } catch (e) {}

  if (!p) return <View style={styles.container}><Text>Error loading provider details</Text></View>;

  const handleBookNow = () => {
    // In a real app, this would hit /api/confirm_booking.
    // Here we just navigate back to the Chat/Home and show the success message,
    // or navigate to Bookings tab to show it's confirmed.
    Alert.alert("Booking Confirmed!", `Your booking with ${p.name} has been confirmed. (Simulating Screen 4)`, [
      { text: "OK", onPress: () => router.navigate("/(tabs)/two") }
    ]);
  };

  const isHighCancellation = (p.cancellation_rate || 0) > 0.15;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Profile Header */}
        <LinearGradient colors={["#e0e7ff", "#f1f5f9"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{p.name.charAt(0)}</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{p.name}</Text>
            {p.verified !== false && <Ionicons name="checkmark-circle" size={18} color="#10b981" />}
          </View>
          <Text style={styles.serviceType}>{p.service_type || "Service Provider"}</Text>
          
          <View style={styles.tagsContainer}>
            {(p.specializations || ["General Services"]).map((spec: string, idx: number) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{spec}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* High Cancellation Warning */}
          {isHighCancellation && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#ef4444" />
              <View style={{flex:1}}>
                <Text style={styles.warningTitle}>High Cancellation Rate ({(p.cancellation_rate * 100).toFixed(0)}%)</Text>
                <Text style={styles.warningText}>This provider has cancelled frequently in the past 30 days.</Text>
              </View>
            </View>
          )}

          {/* Rating Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ratings & Reliability</Text>
            <View style={styles.ratingGrid}>
              <View style={styles.ratingCol}>
                <Text style={styles.ratingScore}>{p.rating?.toFixed(1) || "4.8"}</Text>
                <Text style={styles.ratingLabel}>Overall</Text>
              </View>
              <View style={styles.ratingCol}>
                <Text style={styles.ratingScore}>{(p.on_time_score || 0.9) * 100}%</Text>
                <Text style={styles.ratingLabel}>Punctual</Text>
              </View>
              <View style={styles.ratingCol}>
                <Text style={styles.ratingScore}>4.9</Text>
                <Text style={styles.ratingLabel}>Quality</Text>
              </View>
              <View style={styles.ratingCol}>
                <Text style={styles.ratingScore}>4.7</Text>
                <Text style={styles.ratingLabel}>Comms</Text>
              </View>
            </View>
          </View>

          {/* Availability Calendar (Mock Next 7 days) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability Calendar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal: -16, paddingHorizontal: 16}}>
              {[0, 1, 2, 3].map((dayOffset) => {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                const isSelected = dayOffset === 0;
                return (
                  <View key={dayOffset} style={[styles.dateCard, isSelected && styles.dateCardSelected]}>
                    <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>{date.toLocaleDateString('en-US', {weekday: 'short'})}</Text>
                    <Text style={[styles.dateNum, isSelected && styles.dateTextSelected]}>{date.getDate()}</Text>
                    <Text style={[styles.slotsText, isSelected && styles.dateTextSelected]}>{dayOffset === 1 ? '2 slots' : 'Open'}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Pricing Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            <View style={styles.priceBox}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Base Rate</Text>
                <Text style={styles.priceValue}>Rs. {p.pricing?.base_price || p.base_rate}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Distance Surcharge ({p.distance_km || 0}km)</Text>
                <Text style={styles.priceValue}>Rs. {p.pricing?.distance_cost || 0}</Text>
              </View>
              {p.pricing?.urgency_surcharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Urgency Multiplier</Text>
                  <Text style={styles.priceValue}>+Rs. {p.pricing.urgency_surcharge}</Text>
                </View>
              )}
              {p.pricing?.complexity_cost > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Complexity Multiplier</Text>
                  <Text style={styles.priceValue}>+Rs. {p.pricing.complexity_cost}</Text>
                </View>
              )}
              <View style={[styles.priceRow, styles.priceTotalRow]}>
                <Text style={styles.priceTotalLabel}>Total Estimated Price</Text>
                <Text style={styles.priceTotalValue}>Rs. {p.pricing?.total || 0}</Text>
              </View>
            </View>
          </View>

          {/* Recent Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {(p.recent_reviews || []).length === 0 && <Text style={styles.emptyText}>No reviews yet.</Text>}
            {(p.recent_reviews || []).map((rev: any, idx: number) => (
              <View key={idx} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.stars}>
                    {[1,2,3,4,5].map(star => (
                      <Ionicons key={star} name="star" size={12} color={star <= rev.rating ? "#f59e0b" : "#e2e8f0"} />
                    ))}
                  </View>
                  <View style={[styles.sentimentBadge, rev.sentiment === 'positive' ? styles.sentimentPos : styles.sentimentNeg]}>
                    <Text style={[styles.sentimentText, rev.sentiment === 'positive' ? styles.sentimentTextPos : styles.sentimentTextNeg]}>
                      {rev.sentiment.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>"{rev.text}"</Text>
                <Text style={styles.reviewDate}>{rev.date}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn}>
          <Ionicons name="bookmark-outline" size={24} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBookNow}>
          <Text style={styles.bookBtnText}>Book Now • Rs.{p.pricing?.total || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20, padding: 8 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 4, borderColor: '#fff' },
  avatarLargeText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  providerName: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  serviceType: { fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 2 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, paddingHorizontal: 20 },
  tag: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  tagText: { fontSize: 11, fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase' },

  body: { padding: 16 },
  
  warningBox: { flexDirection: 'row', gap: 12, backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 },
  warningTitle: { fontSize: 13, fontWeight: '800', color: '#ef4444' },
  warningText: { fontSize: 12, color: '#b91c1c', marginTop: 2 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  
  ratingGrid: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'space-between' },
  ratingCol: { alignItems: 'center', flex: 1 },
  ratingScore: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  ratingLabel: { fontSize: 9, color: '#64748b', fontWeight: '800', marginTop: 4, textTransform: 'uppercase' },

  dateCard: { width: 70, height: 80, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dateCardSelected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  dateDay: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  dateNum: { fontSize: 20, color: '#0f172a', fontWeight: '900', marginVertical: 2 },
  slotsText: { fontSize: 10, color: '#10b981', fontWeight: '800' },
  dateTextSelected: { color: '#fff' },

  priceBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  priceValue: { fontSize: 13, color: '#0f172a', fontWeight: '800' },
  priceTotalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  priceTotalLabel: { fontSize: 14, color: '#0f172a', fontWeight: '900' },
  priceTotalValue: { fontSize: 18, color: '#10b981', fontWeight: '900' },

  reviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 2 },
  sentimentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sentimentPos: { backgroundColor: '#ecfdf5' },
  sentimentNeg: { backgroundColor: '#fef2f2' },
  sentimentText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  sentimentTextPos: { color: '#10b981' },
  sentimentTextNeg: { color: '#ef4444' },
  reviewText: { fontSize: 13, color: '#334155', fontStyle: 'italic', marginBottom: 8 },
  reviewDate: { fontSize: 10, color: '#94a3b8' },
  emptyText: { fontSize: 13, color: '#64748b', fontStyle: 'italic' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 12 },
  saveBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  bookBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

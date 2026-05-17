import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createAdvanceBooking } from '@/services/api';

const SERVICES = ["AC Repair", "Electrician", "Plumbing", "Cleaning", "Car Mechanic", "Appliance Repair"];
const TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"];
const RECURRENCE = [
  { key: "one-time", label: "One Time", icon: "calendar" },
  { key: "weekly", label: "Weekly", icon: "repeat" },
  { key: "monthly", label: "Monthly", icon: "refresh-circle" },
];

export default function AdvanceBookingScreen() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState("");
  const [location, setLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [recurrence, setRecurrence] = useState("one-time");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Simple date options (next 7 days)
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const dayName = d.toLocaleDateString('en', { weekday: 'short' });
    const dateNum = d.getDate();
    const month = d.toLocaleDateString('en', { month: 'short' });
    return { key: d.toISOString().split('T')[0], dayName, dateNum, month };
  });

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate) {
      Alert.alert("Missing Info", "Please select a service and date.");
      return;
    }
    setLoading(true);
    try {
      const result = await createAdvanceBooking({
        service_type: selectedService,
        location,
        preferred_date: selectedDate,
        preferred_time: selectedTime,
        recurrence,
        notes,
      });
      Alert.alert("Booking Scheduled! ✅", result.message, [
        { text: "View Bookings", onPress: () => router.push('/(tabs)/bookings') },
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={styles.header}>
        <View style={[styles.headerRow, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Advance Booking</Text>
            <Text style={styles.headerSub}>Schedule a future service</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Service Type */}
        <Text style={styles.label}>Service Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
          {SERVICES.map(s => (
            <TouchableOpacity key={s} style={[styles.chip, selectedService === s && styles.chipActive]} onPress={() => setSelectedService(s)}>
              <Text style={[styles.chipText, selectedService === s && { color: '#fff' }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Location */}
        <Text style={styles.label}>Location (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. DHA Phase 5, Lahore"
          placeholderTextColor="#94a3b8"
          value={location}
          onChangeText={setLocation}
        />

        {/* Date Selection */}
        <Text style={styles.label}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
          {dateOptions.map(d => (
            <TouchableOpacity key={d.key} style={[styles.dateCard, selectedDate === d.key && styles.dateCardActive]} onPress={() => setSelectedDate(d.key)}>
              <Text style={[styles.dateDayName, selectedDate === d.key && { color: '#c7d2fe' }]}>{d.dayName}</Text>
              <Text style={[styles.dateNum, selectedDate === d.key && { color: '#fff' }]}>{d.dateNum}</Text>
              <Text style={[styles.dateMonth, selectedDate === d.key && { color: '#c7d2fe' }]}>{d.month}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time Selection */}
        <Text style={styles.label}>Preferred Time</Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map(t => (
            <TouchableOpacity key={t} style={[styles.timeChip, selectedTime === t && styles.timeChipActive]} onPress={() => setSelectedTime(t)}>
              <Text style={[styles.timeChipText, selectedTime === t && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recurrence */}
        <Text style={styles.label}>Recurrence</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {RECURRENCE.map(r => (
            <TouchableOpacity key={r.key} style={[styles.recurCard, recurrence === r.key && styles.recurCardActive]} onPress={() => setRecurrence(r.key)}>
              <Ionicons name={r.icon as any} size={20} color={recurrence === r.key ? '#fff' : '#64748b'} />
              <Text style={[styles.recurLabel, recurrence === r.key && { color: '#fff' }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.label}>Additional Notes</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Any specific requirements..."
          placeholderTextColor="#94a3b8"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={styles.submitBtnGradient}>
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>{loading ? "Scheduling..." : "Schedule Booking"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#4f46e5', fontWeight: '700' },
  
  label: { fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0f172a', marginBottom: 20 },
  
  dateCard: { width: 70, padding: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  dateCardActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  dateDayName: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  dateNum: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginVertical: 4 },
  dateMonth: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  timeChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  timeChipText: { fontSize: 12, fontWeight: '800', color: '#334155' },
  
  recurCard: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', gap: 6 },
  recurCardActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  recurLabel: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  
  submitBtn: { marginTop: 12 },
  submitBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

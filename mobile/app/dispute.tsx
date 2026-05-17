import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cancelBooking } from '@/services/api';

const ISSUE_TYPES = ["No-show", "Quality issue", "Price dispute", "Overrun", "Other"];

export default function DisputeScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [selectedIssue, setSelectedIssue] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bookingId = params.bookingId as string || "BK-0000";

  const handleSubmit = async () => {
    if (!selectedIssue) return;
    setSubmitting(true);
    try {
      await cancelBooking(bookingId);
      router.back();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={{width:40}}/>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Booking ID</Text>
          <Text style={styles.infoValue}>{bookingId}</Text>
        </View>

        <Text style={styles.label}>What went wrong?</Text>
        <View style={styles.chipsRow}>
          {ISSUE_TYPES.map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.chip, selectedIssue === type && styles.chipActive]}
              onPress={() => setSelectedIssue(type)}
            >
              <Text style={[styles.chipText, selectedIssue === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={styles.input} 
          multiline 
          numberOfLines={4} 
          placeholder="Please describe the issue..."
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Photo Evidence (Optional)</Text>
        <TouchableOpacity style={styles.uploadPlaceholder}>
          <Ionicons name="camera-outline" size={32} color="#94a3b8" />
          <Text style={styles.uploadText}>Tap to upload photo</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Escalation Process</Text>
        <View style={styles.ladderBox}>
          <View style={styles.ladderItem}>
            <Ionicons name="flash" size={16} color="#10b981" />
            <Text style={styles.ladderText}>Step 1: Auto-Resolve (Instant)</Text>
          </View>
          <View style={styles.ladderItem}>
            <Ionicons name="people" size={16} color="#f59e0b" />
            <Text style={styles.ladderText}>Step 2: Human Review (24h)</Text>
          </View>
          <View style={styles.ladderItem}>
            <Ionicons name="cash" size={16} color="#3b82f6" />
            <Text style={styles.ladderText}>Step 3: Refund & Compensation</Text>
          </View>
        </View>
        
        <View style={styles.timelineBox}>
          <Text style={styles.timelineTitle}>Dispute Status</Text>
          <View style={styles.timelineRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.line} />
            <View style={styles.dot} />
            <View style={styles.line} />
            <View style={styles.dot} />
          </View>
          <View style={styles.timelineLabels}>
            <Text style={[styles.tLabel, styles.tLabelActive]}>Filed</Text>
            <Text style={styles.tLabel}>Review</Text>
            <Text style={styles.tLabel}>Resolved</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, (!selectedIssue || submitting) && styles.btnDisabled]} 
          onPress={handleSubmit}
          disabled={!selectedIssue || submitting}
        >
          <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Dispute'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  content: { padding: 20 },
  infoBox: { backgroundColor: '#e0e7ff', padding: 12, borderRadius: 8, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { color: '#4f46e5', fontWeight: '700' },
  infoValue: { color: '#312e81', fontWeight: '900', fontFamily: 'monospace' },
  label: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipText: { color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 16, height: 100, textAlignVertical: 'top', marginBottom: 24 },
  uploadPlaceholder: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  uploadText: { color: '#64748b', marginTop: 8, fontWeight: '600' },
  
  timelineBox: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  timelineTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#cbd5e1' },
  dotActive: { backgroundColor: '#ef4444' },
  line: { flex: 1, height: 2, backgroundColor: '#cbd5e1' },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  tLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  tLabelActive: { color: '#ef4444', fontWeight: '800' },

  ladderBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 12, marginBottom: 24 },
  ladderItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ladderText: { fontSize: 13, color: '#475569', fontWeight: '600' },

  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  submitBtn: { backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});

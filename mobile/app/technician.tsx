import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, Linking, Modal, Image, TextInput, Alert, Animated } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createEscrow, createManualBooking } from '@/services/api';

export default function TechnicianProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  let p: any = {};
  try { if (params.data) p = JSON.parse(params.data as string); } catch(e) {}

  // Gallery Popup States
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [activeImageSource, setActiveImageSource] = useState<'service' | 'customer'>('service');

  // Booking Modal States
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState('2026-05-18');
  const [bookingTime, setBookingTime] = useState('11:00 AM'); // Recommended slot
  const [bookingOnsite, setBookingOnsite] = useState(true);
  const [urgencyMode, setUrgencyMode] = useState<'normal' | 'urgent'>('normal');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [taskNotes, setTaskNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const handleCall = () => { 
    Linking.openURL(`tel:${p.phone || '+923001234567'}`);
  };

  const handleChat = () => {
    const bookingId = 'booking_' + Math.random().toString(36).substr(2, 9);
    router.push({
      pathname: "/chat",
      params: {
        bookingId,
        providerName: p.name || 'Technician'
      }
    });
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    try {
      const base = p.base_rate || 1200;
      const urgencyFee = urgencyMode === 'urgent' ? 500 : 0;
      const platformFee = (base + urgencyFee) * 0.1;
      const total = base + urgencyFee + platformFee;
      
      const bookingId = 'booking_' + Math.random().toString(36).substr(2, 9);
      
      // 1. Create booking object in DB
      await createManualBooking({
        id: bookingId,
        provider_id: p.id,
        provider_name: p.name || 'Ahmed Cooling Services',
        service_type: p.service_type || 'AC Repair',
        amount: base + urgencyFee,
        preferred_date: bookingDate,
        preferred_time: bookingTime,
        payment_method: paymentMethod,
        notes: taskNotes,
      });

      // 2. Create backend escrow hold record
      await createEscrow(bookingId, total, paymentMethod);
      
      // Trigger smooth confirmation success screen
      setShowBookingModal(false);
      setShowSuccessOverlay(true);
      setTimeout(() => {
        setShowSuccessOverlay(false);
        router.push('/(tabs)/bookings');
      }, 3000);
    } catch (e: any) {
      Alert.alert("Payment Failed", e.message || "Insufficient wallet balance to secure escrow.");
    }
    setIsSubmitting(false);
  };

  const verificationItems = [
    { label: "CNIC", done: p.cnic_verified ?? true, icon: "card" },
    { label: "Phone & WhatsApp", done: p.phone_verified ?? true, icon: "call" },
    { label: "Background Criminal Record Check", done: p.profile_verified ?? true, icon: "shield-checkmark" },
  ];

  // Service images with captions
  const serviceGallery = [
    { url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=300', title: "Split AC Compressor Installation", caption: "Replacing compressor coils under dual-vacuum conditions." },
    { url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=300', title: "Tool kit calibration", desc: "Digital manifold pressure gauges." },
    { url: 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?q=80&w=300', title: "Before/After leak check", desc: "Nitrogen test proving 100% leak seal." },
  ];

  // Customer reviews photos
  const customerPhotos = [
    { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=300', title: "Completed Repair Neatness", caption: "Pipes protected with professional wrapping bands." },
    { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=300', title: "Technician punctuality", caption: "Arrived precisely on-time with safety boot covers." }
  ];

  const handleNextImage = () => {
    const currentList = activeImageSource === 'service' ? serviceGallery : customerPhotos;
    if (activeImageIndex !== null && activeImageIndex < currentList.length - 1) {
      setActiveImageIndex(activeImageIndex + 1);
    }
  };

  const handlePrevImage = () => {
    if (activeImageIndex !== null && activeImageIndex > 0) {
      setActiveImageIndex(activeImageIndex - 1);
    }
  };

  // Detailed categories reviews scoring
  const reviewScores = {
    punctuality: 96,
    behavior: 98,
    service_quality: 97,
    communication: 95,
    pricing_fairness: 94
  };

  return (
    <View style={styles.container}>
      {/* Scrollable Profile Body */}
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 110 }}>
        
        {/* Cover Banner */}
        <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={styles.coverBanner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.coverTextContainer}>
            <Text style={styles.coverStatusText}>🔥 {p.reliability_score || 96}% Repeat Job Success Rate</Text>
          </View>
        </LinearGradient>

        {/* Profile Info Section */}
        <View style={styles.profileContainer}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>{p.avatar_initials || p.name?.charAt(0) || 'T'}</Text>
            {p.is_verified && (
              <View style={styles.verifiedBadgeIcon}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.nameSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <View style={styles.aiRecommendedPill}>
                <Ionicons name="sparkles" size={10} color="#047857" />
                <Text style={styles.aiRecommendedPillText}>AI RECOMMENDED TOP PICK</Text>
              </View>
              <View style={styles.availablePill}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.availablePillText}>Available Now</Text>
              </View>
            </View>

            <Text style={styles.profileName}>{p.name || 'Ahmed Cooling Services'}</Text>
            <View style={styles.ratingBadgeRow}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.ratingText}>{p.rating || 4.8}</Text>
              <Text style={styles.reviewCountText}>({p.review_count || 124} verified bookings)</Text>
            </View>

            {/* Shop Location & Live ETA */}
            <View style={styles.locationEtaRow}>
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={12} color="#64748b" />
                <Text style={styles.locationBadgeText}>{p.area || 'DHA Phase 5, Lahore'}</Text>
              </View>
              <View style={styles.etaBadge}>
                <Ionicons name="time" size={12} color="#4f46e5" />
                <Text style={styles.etaBadgeText}>⚡ Live ETA: ~12 mins</Text>
              </View>
            </View>
            
            {p.verification_badge && (
              <View style={styles.verifiedBadgeLabel}>
                <Ionicons name="shield-checkmark" size={14} color="#1d4ed8" />
                <Text style={styles.verifiedBadgeLabelText}>{p.verification_badge} • Trust Score {p.reliability_score || 96}/100</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {/* Service Support Badges */}
          <View style={styles.supportBadgesRow}>
            <View style={[styles.supportBadge, styles.badgeOnsite]}>
              <Ionicons name="home" size={12} color="#1e3a8a" />
              <Text style={styles.supportBadgeText}>Onsite Support</Text>
            </View>
            {p.remote_available && (
              <View style={[styles.supportBadge, styles.badgeRemote]}>
                <Ionicons name="videocam" size={12} color="#065f46" />
                <Text style={[styles.supportBadgeText, { color: '#065f46' }]}>Remote Available</Text>
              </View>
            )}
            <View style={[styles.supportBadge, styles.badgeHybrid]}>
              <Ionicons name="flash" size={12} color="#7c2d12" />
              <Text style={[styles.supportBadgeText, { color: '#7c2d12' }]}>Instant Booking</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{p.total_jobs_completed || p.completed_jobs || 312}</Text>
              <Text style={styles.statLbl}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{p.punctuality_score || 94}%</Text>
              <Text style={styles.statLbl}>On-Time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{p.reliability_score || 96}%</Text>
              <Text style={styles.statLbl}>Reliability</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>~{p.response_time_minutes || 8} min</Text>
              <Text style={styles.statLbl}>Response Speed</Text>
            </View>
          </View>

          {/* About Section */}
          <Text style={styles.sectionTitle}>About & Work Style</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Providing high-end {p.service_type || 'AC Repair'} and troubleshooting diagnostics near {p.area || 'Lahore'}. Over {p.experience_years || 8} years of certified trade practice handling complex wiring faults, condenser refittings, filter sterilization, and compressor replacements. Follows rigorous platform Standard Operating Procedures (SOPs), maintains clinical cleanliness, and ensures fair, transparent upfront escrow balances.
            </Text>
          </View>

          {/* Interactive Gallery System */}
          <Text style={styles.sectionTitle}>Interactive Service Gallery (Click to Zoom)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
            {serviceGallery.map((g, idx) => (
              <TouchableOpacity key={idx} style={styles.galleryCard} onPress={() => { setActiveImageIndex(idx); setActiveImageSource('service'); }}>
                <Image source={{ uri: g.url }} style={styles.galleryImage} />
                <Text style={styles.galleryTitle}>{g.title}</Text>
                <Text style={styles.galleryDesc}>Tap to expand</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Customer Uploaded Photos */}
          <Text style={styles.sectionTitle}>Photos Uploaded By Customers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
            {customerPhotos.map((c, idx) => (
              <TouchableOpacity key={idx} style={styles.galleryCard} onPress={() => { setActiveImageIndex(idx); setActiveImageSource('customer'); }}>
                <Image source={{ uri: c.url }} style={styles.galleryImage} />
                <Text style={styles.galleryTitle}>{c.title}</Text>
                <Text style={styles.galleryDesc}>Tap to expand</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Verification Checks */}
          <Text style={styles.sectionTitle}>Marketplace Screening Checkpoints</Text>
          <View style={styles.verifyCard}>
            {verificationItems.map((v, i) => (
              <View key={i} style={styles.verifyRow}>
                <Ionicons name={v.icon as any} size={18} color={v.done ? "#10b981" : "#94a3b8"} />
                <Text style={styles.verifyLabel}>{v.label}</Text>
                <View style={[styles.verifyBadge, v.done ? styles.verifyDone : styles.verifyPending]}>
                  <Ionicons name={v.done ? "checkmark" : "time"} size={12} color={v.done ? "#10b981" : "#f59e0b"} />
                  <Text style={[styles.verifyBadgeText, { color: v.done ? "#10b981" : "#f59e0b" }]}>
                    {v.done ? "COMPLETED" : "PENDING"}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Core Skills & Specializations */}
          {p.specializations?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Skills & Specializations</Text>
              <View style={styles.tagsWrap}>
                {p.specializations.map((s: string, i: number) => (
                  <View key={i} style={styles.specTag}>
                    <Text style={styles.specTagText}>{s}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Detailed Review Metrics Categories */}
          <Text style={styles.sectionTitle}>Customer Satisfaction Metrics</Text>
          <View style={styles.satisfactionCard}>
            {[
              { label: 'Punctuality & Arrival Time', score: reviewScores.punctuality },
              { label: 'Professional Behavior & Safety SOPs', score: reviewScores.behavior },
              { label: 'Technical Service Quality', score: reviewScores.service_quality },
              { label: 'Communication & Problem Explanations', score: reviewScores.communication },
              { label: 'Pricing Fairness & Estimate Integrity', score: reviewScores.pricing_fairness }
            ].map((metric, idx) => (
              <View key={idx} style={styles.metricRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricScoreText}>{metric.score}%</Text>
                </View>
                <View style={styles.metricTrack}>
                  <View style={[styles.metricFill, { width: `${metric.score}%` }]} />
                </View>
              </View>
            ))}
          </View>

          {/* Customer Reviews */}
          {p.recent_reviews?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Verified Booking Reviews</Text>
              {p.recent_reviews.map((r: any, i: number) => (
                <View key={i} style={styles.reviewCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1,2,3,4,5].map(s => (
                        <Ionicons key={s} name="star" size={12} color={s <= r.rating ? "#fbbf24" : "#e2e8f0"} />
                      ))}
                    </View>
                    <Text style={styles.reviewDate}>{r.date}</Text>
                  </View>
                  <Text style={styles.reviewText}>"{r.text}"</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    {r.category && (
                      <View style={styles.reviewCatBadge}>
                        <Text style={styles.reviewCatText}>{r.category}</Text>
                      </View>
                    )}
                    <View style={styles.sentimentBadge}>
                      <Ionicons name="happy" size={10} color="#16a34a" />
                      <Text style={styles.sentimentText}>{r.sentiment || 'positive'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Marketplace Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Base Rate</Text>
          <Text style={styles.priceValue}>Rs. {p.pricing?.total || p.base_rate || 1200}</Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.bottomBtn, styles.callBtn]} onPress={handleCall}>
            <Ionicons name="call" size={18} color="#4f46e5" />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.bottomBtn, styles.chatBtn]} onPress={handleChat}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={styles.chatBtnText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.bottomBtn, styles.bookBtn]} onPress={() => setShowBookingModal(true)}>
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. INTERACTIVE FULLSCREEN IMAGE POPUP SYSTEM */}
      <Modal visible={activeImageIndex !== null} transparent animationType="fade">
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.closeFullscreenBtn} onPress={() => setActiveImageIndex(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {activeImageIndex !== null && (
            <View style={styles.fullscreenContent}>
              <Image 
                source={{ uri: (activeImageSource === 'service' ? serviceGallery : customerPhotos)[activeImageIndex]?.url }} 
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
              <Text style={styles.fullscreenTitle}>
                {(activeImageSource === 'service' ? serviceGallery : customerPhotos)[activeImageIndex]?.title}
              </Text>
              <Text style={styles.fullscreenDesc}>
                {(activeImageSource === 'service' ? serviceGallery : customerPhotos)[activeImageIndex]?.caption || "Verified Service Operation."}
              </Text>

              {/* Navigation swiping controls */}
              <View style={styles.navRow}>
                <TouchableOpacity 
                  style={[styles.navBtn, activeImageIndex === 0 && { opacity: 0.3 }]} 
                  onPress={handlePrevImage}
                  disabled={activeImageIndex === 0}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.navCountText}>
                  {activeImageIndex + 1} / {(activeImageSource === 'service' ? serviceGallery : customerPhotos).length}
                </Text>
                <TouchableOpacity 
                  style={[styles.navBtn, activeImageIndex === (activeImageSource === 'service' ? serviceGallery : customerPhotos).length - 1 && { opacity: 0.3 }]} 
                  onPress={handleNextImage}
                  disabled={activeImageIndex === (activeImageSource === 'service' ? serviceGallery : customerPhotos).length - 1}
                >
                  <Ionicons name="arrow-forward" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* 2. ADVANCED AI SLOT SCHEDULING BOOKING MODAL */}
      <Modal visible={showBookingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Secure Escrow Booking</Text>
                <Text style={styles.modalSubtitle}>Protected under Platform Wallet Hold Guarantee</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* Onsite / Remote Option */}
              <Text style={styles.filterSectionLabel}>Service Delivery Mode</Text>
              <View style={styles.gridSelectRow}>
                <TouchableOpacity 
                  style={[styles.gridSelectBtn, bookingOnsite && styles.gridSelectBtnActive]} 
                  onPress={() => setBookingOnsite(true)}
                >
                  <Ionicons name="home-outline" size={14} color={bookingOnsite ? "#fff" : "#4f46e5"} />
                  <Text style={[styles.gridSelectText, bookingOnsite && { color: '#fff' }]}>Onsite Visit</Text>
                </TouchableOpacity>
                {p.remote_available && (
                  <TouchableOpacity 
                    style={[styles.gridSelectBtn, !bookingOnsite && styles.gridSelectBtnActive]} 
                    onPress={() => setBookingOnsite(false)}
                  >
                    <Ionicons name="videocam-outline" size={14} color={!bookingOnsite ? "#fff" : "#4f46e5"} />
                    <Text style={[styles.gridSelectText, !bookingOnsite && { color: '#fff' }]}>Remote Consulting</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Urgency Dispatch Level */}
              <Text style={styles.filterSectionLabel}>Service Priority</Text>
              <View style={styles.gridSelectRow}>
                <TouchableOpacity 
                  style={[styles.gridSelectBtn, urgencyMode === 'normal' && styles.gridSelectBtnActive]} 
                  onPress={() => setUrgencyMode('normal')}
                >
                  <Text style={[styles.gridSelectText, urgencyMode === 'normal' && { color: '#fff' }]}>Standard Dispatch</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.gridSelectBtn, urgencyMode === 'urgent' && styles.gridSelectBtnActive]} 
                  onPress={() => setUrgencyMode('urgent')}
                >
                  <Ionicons name="warning-outline" size={12} color={urgencyMode === 'urgent' ? "#fff" : "#ef4444"} />
                  <Text style={[styles.gridSelectText, urgencyMode === 'urgent' && { color: '#fff' }]}>Urgent Dispatch (+Rs.500)</Text>
                </TouchableOpacity>
              </View>

              {/* Custom Date selection */}
              <Text style={styles.filterSectionLabel}>Preferred Booking Date</Text>
              <View style={styles.gridSelectRow}>
                {["2026-05-18", "2026-05-19", "2026-05-20"].map((d) => (
                  <TouchableOpacity 
                    key={d} 
                    style={[styles.gridSelectBtn, bookingDate === d && styles.gridSelectBtnActive]}
                    onPress={() => setBookingDate(d)}
                  >
                    <Text style={[styles.gridSelectText, bookingDate === d && { color: '#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Interactive AI Slot Recommendation */}
              <View style={styles.aiRecommendationCard}>
                <Ionicons name="sparkles" size={16} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiRecommendTitle}>AI Optimized Timing Suggestion</Text>
                  <Text style={styles.aiRecommendDesc}>
                    Recommended Slot: Tomorrow 11:00 AM. Lowest grid traffic and fastest technician route transit.
                  </Text>
                </View>
              </View>

              {/* Custom time slots picker */}
              <Text style={styles.filterSectionLabel}>Preferred Time Slot</Text>
              <View style={styles.gridSelectRow}>
                {["09:00 AM", "11:00 AM", "02:00 PM", "05:00 PM"].map((t) => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.gridSelectBtn, bookingTime === t && styles.gridSelectBtnActive]}
                    onPress={() => setBookingTime(t)}
                  >
                    <Text style={[styles.gridSelectText, bookingTime === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Time Preference Input */}
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>Or type a custom time preference:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12 }}>
                  <Ionicons name="time-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                  <TextInput
                    style={{ flex: 1, height: 38, fontSize: 13, color: '#0f172a', fontWeight: '700' }}
                    placeholder="e.g. 6:30 PM, 7:15 PM, 6:00 PM baje"
                    placeholderTextColor="#94a3b8"
                    value={bookingTime}
                    onChangeText={(t) => setBookingTime(t)}
                  />
                </View>
              </View>

              {/* Payment Methods */}
              <Text style={styles.filterSectionLabel}>Select Wallet Payment</Text>
              <View style={styles.gridSelectRow}>
                <TouchableOpacity 
                  style={[styles.gridSelectBtn, paymentMethod === 'wallet' && styles.gridSelectBtnActive]} 
                  onPress={() => setPaymentMethod('wallet')}
                >
                  <Ionicons name="wallet-outline" size={14} color={paymentMethod === 'wallet' ? "#fff" : "#4f46e5"} />
                  <Text style={[styles.gridSelectText, paymentMethod === 'wallet' && { color: '#fff' }]}>Wallet Balance</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.gridSelectBtn, paymentMethod === 'card' && styles.gridSelectBtnActive]} 
                  onPress={() => setPaymentMethod('card')}
                >
                  <Ionicons name="card-outline" size={14} color={paymentMethod === 'card' ? "#fff" : "#4f46e5"} />
                  <Text style={[styles.gridSelectText, paymentMethod === 'card' && { color: '#fff' }]}>Credit Card</Text>
                </TouchableOpacity>
              </View>

              {/* Problem notes */}
              <Text style={styles.filterSectionLabel}>Detailed Task Instructions</Text>
              <TextInput
                style={styles.taskNotesInput}
                placeholder="e.g. Please bring extra copper replacement coils, or AC filter kit..."
                placeholderTextColor="#94a3b8"
                value={taskNotes}
                onChangeText={setTaskNotes}
                multiline
                numberOfLines={3}
              />

              {/* Escrow Guarantee Cost breakdown */}
              <View style={styles.escrowBillBox}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Base Service Rate</Text>
                  <Text style={styles.billValue}>Rs. {p.base_rate || 1200}</Text>
                </View>
                {urgencyMode === 'urgent' && (
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Emergency Dispatch Surcharge</Text>
                    <Text style={styles.billValue}>Rs. 500</Text>
                  </View>
                )}
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Escrow Protection Hold Fee (10%)</Text>
                  <Text style={styles.billValue}>Rs. {((p.base_rate || 1200) + (urgencyMode === 'urgent' ? 500 : 0)) * 0.1}</Text>
                </View>
                <View style={[styles.billRow, { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 10, marginTop: 4 }]}>
                  <Text style={[styles.billLabel, { fontWeight: '900', color: '#0f172a' }]}>Held Securely in Escrow</Text>
                  <Text style={[styles.billValue, { fontWeight: '900', color: '#16a34a', fontSize: 16 }]}>
                    Rs. {((p.base_rate || 1200) + (urgencyMode === 'urgent' ? 500 : 0)) * 1.1}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetFiltersBtnModal} onPress={() => setShowBookingModal(false)}>
                <Text style={styles.resetFiltersBtnModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.applyBtnModal, { backgroundColor: '#10b981' }, isSubmitting && { opacity: 0.6 }]} 
                onPress={handleConfirmBooking}
                disabled={isSubmitting}
              >
                <Ionicons name="lock-closed" size={16} color="#fff" />
                <Text style={styles.applyBtnModalText}>
                  {isSubmitting ? 'Securing Hold...' : 'Confirm Escrow Booking'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. BOOKING SUCCESS ORCHESTRATION ANIMATION OVERLAY */}
      {showSuccessOverlay && (
        <Modal visible={showSuccessOverlay} transparent animationType="fade">
          <View style={styles.successOverlay}>
            <LinearGradient colors={["#10b981", "#059669"]} style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={56} color="#fff" />
              <Text style={styles.successTitle}>Booking Secured! 🔒</Text>
              <Text style={styles.successSub}>
                Rs. {((p.base_rate || 1200) + (urgencyMode === 'urgent' ? 500 : 0)) * 1.1} Locked In Escrow Guarantee.
              </Text>
              
              <View style={styles.divider} />
              
              <View style={styles.successMetricsBox}>
                <View style={styles.metricRowMini}>
                  <Ionicons name="person" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.metricMiniText}>Assigned: {p.name || 'Ahmed Cooling Services'}</Text>
                </View>
                <View style={styles.metricRowMini}>
                  <Ionicons name="time" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.metricMiniText}>ETA: ~12 minutes dispatch</Text>
                </View>
                <View style={styles.metricRowMini}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.metricMiniText}>Orchestration Status: Trace Logged</Text>
                </View>
              </View>

              <Text style={styles.successTip}>Navigating to active bookings order view...</Text>
            </LinearGradient>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  body: { flex: 1 },

  coverBanner: { height: 160, justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 44 : 12, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  coverTextContainer: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  coverStatusText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  profileContainer: { alignItems: 'center', marginTop: -50, marginBottom: 16 },
  avatarBig: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', position: 'relative', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  avatarBigText: { fontSize: 38, fontWeight: '900', color: '#4f46e5' },
  verifiedBadgeIcon: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },

  nameSection: { alignItems: 'center', marginTop: 12, paddingHorizontal: 20 },
  profileName: { fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  ratingBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingText: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  reviewCountText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  verifiedBadgeLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  verifiedBadgeLabelText: { color: '#1d4ed8', fontSize: 12, fontWeight: '800' },

  supportBadgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20, justifyContent: 'center' },
  supportBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeOnsite: { backgroundColor: '#dbeafe' },
  badgeRemote: { backgroundColor: '#d1fae5' },
  badgeHybrid: { backgroundColor: '#ffedd5' },
  supportBadgeText: { fontSize: 11, fontWeight: '800', color: '#1e3a8a' },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statNum: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  statLbl: { fontSize: 9, color: '#94a3b8', fontWeight: '800', marginTop: 4, textTransform: 'uppercase', textAlign: 'center' },

  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 18 },

  aboutCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  aboutText: { fontSize: 13, color: '#475569', lineHeight: 20, fontWeight: '500' },

  verifyCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 4, marginBottom: 8 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  verifyLabel: { flex: 1, fontSize: 12, fontWeight: '800', color: '#334155' },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifyDone: { backgroundColor: '#d1fae5' },
  verifyPending: { backgroundColor: '#fffbeb' },
  verifyBadgeText: { fontSize: 9, fontWeight: '900' },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  specTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  specTagText: { fontSize: 12, fontWeight: '800', color: '#475569' },

  galleryScroll: { gap: 12, paddingVertical: 4 },
  galleryCard: { width: 140, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 8, overflow: 'hidden' },
  galleryImage: { height: 90, borderRadius: 8, marginBottom: 8 },
  galleryTitle: { fontSize: 11, fontWeight: '800', color: '#334155', height: 16, overflow: 'hidden' },
  galleryDesc: { fontSize: 9, color: '#94a3b8', marginTop: 2, fontWeight: '600' },

  satisfactionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  metricRow: { gap: 4 },
  metricLabel: { fontSize: 11, fontWeight: '800', color: '#475569' },
  metricScoreText: { fontSize: 11, fontWeight: '900', color: '#4f46e5' },
  metricTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  metricFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 3 },

  reviewCard: { backgroundColor: '#fff', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  reviewDate: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  reviewText: { fontSize: 13, color: '#334155', lineHeight: 20, marginTop: 8, fontStyle: 'italic', fontWeight: '500' },
  reviewCatBadge: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  reviewCatText: { fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' },
  sentimentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sentimentText: { fontSize: 9, fontWeight: '900', color: '#065f46', textTransform: 'uppercase' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 34 : 14 },
  priceContainer: { flex: 0.6 },
  priceLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' },
  priceValue: { fontSize: 20, fontWeight: '900', color: '#10b981', marginTop: 2 },

  btnRow: { flex: 1.4, flexDirection: 'row', gap: 6 },
  bottomBtn: { height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  callBtn: { flex: 0.8, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  callBtnText: { color: '#4f46e5', fontSize: 12, fontWeight: '900' },
  chatBtn: { flex: 1, backgroundColor: '#4f46e5' },
  chatBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  bookBtn: { flex: 1.2, backgroundColor: '#10b981' },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  // Fullscreen image popup
  fullscreenOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  closeFullscreenBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  fullscreenContent: { width: '100%', alignItems: 'center', padding: 20 },
  fullscreenImage: { width: '100%', height: '70%' },
  fullscreenTitle: { fontSize: 18, color: '#fff', fontWeight: '900', marginTop: 20, textAlign: 'center' },
  fullscreenDesc: { fontSize: 13, color: '#94a3b8', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 24 },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  navCountText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Booking Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  modalSubtitle: { fontSize: 11, color: '#10b981', fontWeight: '700', marginTop: 2 },

  filterSectionLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, paddingHorizontal: 4 },
  gridSelectRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  gridSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
  gridSelectBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  gridSelectText: { fontSize: 11, fontWeight: '800', color: '#475569' },

  aiRecommendationCard: { flexDirection: 'row', gap: 8, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#d1fae5', marginTop: 8, alignItems: 'center' },
  aiRecommendTitle: { fontSize: 11, fontWeight: '900', color: '#16a34a' },
  aiRecommendDesc: { fontSize: 10, color: '#16a34a', marginTop: 1, lineHeight: 14 },

  taskNotesInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', backgroundColor: '#f8fafc', height: 72, textAlignVertical: 'top', marginTop: 6 },
  
  escrowBillBox: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  billValue: { fontSize: 12, color: '#0f172a', fontWeight: '800' },

  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  resetFiltersBtnModal: { flex: 0.4, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  resetFiltersBtnModalText: { color: '#475569', fontSize: 13, fontWeight: '800' },
  applyBtnModal: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#4f46e5', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  applyBtnModalText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Success Overlay
  successOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', gap: 12 },
  successTitle: { fontSize: 20, color: '#fff', fontWeight: '900', marginTop: 10 },
  successSub: { fontSize: 13, color: '#e6fffa', textAlign: 'center', lineHeight: 18 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', marginVertical: 10 },
  successMetricsBox: { width: '100%', gap: 8, marginVertical: 8 },
  metricRowMini: { flexDirection: 'row', alignItems: 'center' },
  metricMiniText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  successTip: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginTop: 12 },

  // Profile Header Upgrades
  aiRecommendedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  aiRecommendedPillText: { fontSize: 8, fontWeight: '900', color: '#047857', letterSpacing: 0.5 },
  availablePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#d1fae5' },
  availablePillText: { fontSize: 8, fontWeight: '900', color: '#16a34a' },
  greenPulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  locationEtaRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  locationBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  etaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  etaBadgeText: { fontSize: 10, fontWeight: '800', color: '#4f46e5' },
});

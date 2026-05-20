import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Dimensions, RefreshControl, Switch } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBookings, updateBookingStatus, getWallet } from '@/services/api';

const { width } = Dimensions.get('window');

// Mock Data for B2B Partners
const COMMUNITY_PROVIDERS = [
  { id: 'com_1', name: 'Asif Plumbing Masters', category: 'Plumber', rating: 4.9, completed: 420, area: 'DHA Phase 6', online: true },
  { id: 'com_2', name: 'Zahid Electrical Express', category: 'Electrician', rating: 4.8, completed: 310, area: 'Gulberg Lahore', online: true },
];

export default function ProviderDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 7 Core modules tab navigator
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'orders' | 'wallet' | 'verification' | 'community' | 'insights'>('overview');

  // Global Sync States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>({ balance: 12500, pending: 2500, transactions: [] });

  // Tab 1: Dynamic Trust score states
  const [isVerified, setIsVerified] = useState(false);

  // Tab 2: Fiverr-Style Listings States
  const [catalogGigs, setCatalogGigs] = useState([
    { 
      id: 'gig_1', 
      title: 'Deep Inverter AC Chemical Cleaning & Jet Wash', 
      desc: 'Complete high-pressure jet chemical washing of indoor and outdoor coils to restore optimal cooling.',
      priceBasic: '1500', pricePremium: '2500', 
      deliveryTime: '1 Day Delivery',
      tags: ['AC washing', 'chemical jet wash', 'cooling restore'],
      paused: false
    },
    { 
      id: 'gig_2', 
      title: 'Emergency AC Gas Leak Fix, Welding & Full Top-up', 
      desc: 'Complete location scan, aluminum/copper coil pressure welding, and standard gas top-up.',
      priceBasic: '3800', pricePremium: '5500', 
      deliveryTime: '2 Hours Emergency Delivery',
      tags: ['AC gas leak', 'coil welding', 'refrigerant refill'],
      paused: false
    },
  ]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriceBasic, setNewPriceBasic] = useState('');
  const [newPricePremium, setNewPricePremium] = useState('');
  const [newDeliveryTime, setNewDeliveryTime] = useState('1 Day Delivery');
  const [newTags, setNewTags] = useState('');
  const [editingGigId, setEditingGigId] = useState<string | null>(null);

  // Tab 4: Wallet withdrawal states
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Tab 5: Multi-Layer Verification Center (CNIC OCR & Live Face)
  const [cnicFrontUploaded, setCnicFrontUploaded] = useState(false);
  const [cnicBackUploaded, setCnicBackUploaded] = useState(false);
  const [isCnicScanning, setIsCnicScanning] = useState(false);
  const [extractedOcrName, setExtractedOcrName] = useState('');
  const [extractedOcrExpiry, setExtractedOcrExpiry] = useState('');
  
  // Face verification checklists
  const [faceBlinked, setFaceBlinked] = useState(false);
  const [headTurned, setHeadTurned] = useState(false);
  const [smileCaptured, setSmileCaptured] = useState(false);
  const [isLivenessScanning, setIsLivenessScanning] = useState(false);

  // Tab 6: B2B chat Referral
  const [selectedB2B, setSelectedB2B] = useState<any>(null);
  const [b2bMsg, setB2bMsg] = useState('');
  const [b2bMessages, setB2bMessages] = useState<any[]>([
    { sender: 'them', text: 'Assalam o Alaikum Ahmed, I have a client in DHA Phase 5 needing emergency AC leakage welding. Can I refer this job to you?' }
  ]);

  // Selected Booking details timeline modal
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [uploadedProofs, setUploadedProofs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Load active bookings from DB
      const bookingRes = await getBookings();
      const list = bookingRes.bookings || bookingRes || [];
      setBookings(list.map((b: any) => ({
        ...b,
        status: b.status || 'pending',
      })));

      // 2. Load wallet stats
      const walletRes = await getWallet('technician');
      if (walletRes.wallet) {
        setWallet(walletRes.wallet);
      }
    } catch(e) {}
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Withdraw flow
  const handleWithdraw = () => {
    if (wallet.balance <= 0) {
      Alert.alert("Empty Balance", "There are no withdrawable earnings.");
      return;
    }
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      const val = wallet.balance;
      setWallet((prev: any) => ({
        ...prev,
        balance: 0,
        transactions: [
          { id: 'txn_' + Math.random().toString(36).substr(2, 6), type: 'withdrawal', amount: -val, desc: 'Allied Bank instant transfer payout', date: new Date().toISOString().split('T')[0] },
          ...(prev.transactions || [])
        ]
      }));
      Alert.alert("Stripe Payout Released 🏦", `Rs. ${val} transferred cleanly to your bank account.`);
    }, 2000);
  };

  // CNIC Front & Back OCR scanner simulation
  const simulateCnicOcrScan = (side: 'front' | 'back') => {
    if (side === 'front') {
      setCnicFrontUploaded(true);
      setIsCnicScanning(true);
      setTimeout(() => {
        setIsCnicScanning(false);
        setExtractedOcrName("Ahmed Ali");
        setExtractedOcrExpiry("Dec 2030");
        Alert.alert("CNIC Front OCR Scan Complete ✅", "Extracted Name: Ahmed Ali\nExpiry: Dec 2030\nAuthenticity Index: 99.8% (Valid)");
      }, 2000);
    } else {
      setCnicBackUploaded(true);
    }
  };

  // AI 3D Liveness Detection checkers
  const handleVerifyLiveness = () => {
    if (!cnicFrontUploaded || !cnicBackUploaded) {
      Alert.alert("CNIC Missing", "Please scan both front & back copies of your CNIC before live verification.");
      return;
    }
    if (!faceBlinked || !headTurned || !smileCaptured) {
      Alert.alert("Liveness checklist incomplete", "Please complete all face movement instructions inside the guide frame.");
      return;
    }
    setIsLivenessScanning(true);
    setTimeout(() => {
      setIsLivenessScanning(false);
      setIsVerified(true);
      Alert.alert("AI Identity Match Approved! 🛡️", "Facial details verified against CNIC profile. Verified Blue badge activated successfully.");
    }, 2500);
  };

  // Gig listing CRUD actions
  const handleSaveGig = () => {
    if (!newTitle.trim() || !newPriceBasic.trim()) {
      Alert.alert("Fields Required", "Please input listing title and basic price.");
      return;
    }
    if (editingGigId) {
      setCatalogGigs(prev => prev.map(g => g.id === editingGigId ? {
        ...g,
        title: newTitle.trim(),
        desc: newDesc.trim(),
        priceBasic: newPriceBasic.trim(),
        pricePremium: newPricePremium.trim() || String(Number(newPriceBasic)*1.5),
        deliveryTime: newDeliveryTime,
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean)
      } : g));
      setEditingGigId(null);
      Alert.alert("Gig Updated 📦", "Listing changes saved successfully.");
    } else {
      const newGig = {
        id: 'gig_' + Math.random().toString(36).substr(2, 5),
        title: newTitle.trim(),
        desc: newDesc.trim() || 'Professional service item.',
        priceBasic: newPriceBasic.trim(),
        pricePremium: newPricePremium.trim() || String(Number(newPriceBasic)*1.5),
        deliveryTime: newDeliveryTime,
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
        paused: false
      };
      setCatalogGigs(prev => [...prev, newGig]);
      Alert.alert("Listing Published 🚀", `"${newGig.title}" is now active in your service catalog.`);
    }
    setNewTitle('');
    setNewDesc('');
    setNewPriceBasic('');
    setNewPricePremium('');
    setNewTags('');
  };

  const handleEditGig = (gig: any) => {
    setEditingGigId(gig.id);
    setNewTitle(gig.title);
    setNewDesc(gig.desc);
    setNewPriceBasic(gig.priceBasic);
    setNewPricePremium(gig.pricePremium);
    setNewDeliveryTime(gig.deliveryTime);
    setNewTags(gig.tags.join(', '));
    setActiveTab('listings');
  };

  const handlePauseGig = (id: string) => {
    setCatalogGigs(prev => prev.map(g => g.id === id ? { ...g, paused: !g.paused } : g));
    Alert.alert("Status Updated", "Listing state toggled.");
  };

  const handleDeleteGig = (id: string) => {
    setCatalogGigs(prev => prev.filter(g => g.id !== id));
    Alert.alert("Listing Deleted", "Listing removed from public catalog.");
  };

  const handleDuplicateGig = (gig: any) => {
    const dup = {
      ...gig,
      id: 'gig_' + Math.random().toString(36).substr(2, 5),
      title: `${gig.title} (Copy)`,
    };
    setCatalogGigs(prev => [...prev, dup]);
    Alert.alert("Duplicated", "Listing duplicated successfully.");
  };

  // Update stepper order status
  const handleAdvanceStatus = async (bookingId: string, status: string) => {
    try {
      await updateBookingStatus(bookingId, status);
      Alert.alert("Status Advanced ⚡", `Booking advanced to '${status}' successfully.`);
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking((prev: any) => ({ ...prev, status }));
      }
      fetchDashboardData();
    } catch(e) {}
  };

  const handleCaptureProof = (bookingId: string) => {
    setUploadingProof(bookingId);
    setTimeout(() => {
      setUploadingProof(null);
      setUploadedProofs(prev => ({ ...prev, [bookingId]: true }));
      Alert.alert("Proof Saved 📸", "Completion proof picture captured and saved to customer ledger database.");
    }, 1500);
  };

  // B2B chat referral send
  const handleSendB2BMessage = () => {
    if (!b2bMsg.trim()) return;
    setB2bMessages(prev => [...prev, { sender: 'me', text: b2bMsg.trim() }]);
    setB2bMsg('');
    setTimeout(() => {
      setB2bMessages(prev => [...prev, { sender: 'them', text: 'JazakAllah, Ahmed! I will share the client details right away.' }]);
    }, 1500);
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Awaiting Response', color: '#2563eb', bg: '#eff6ff' };
      case 'accepted': return { label: 'Accepted', color: '#4f46e5', bg: '#f5f3ff' };
      case 'technician_on_way': return { label: 'En Route', color: '#0284c7', bg: '#f0f9ff' };
      case 'arrived': return { label: 'Arrived at Site', color: '#7c3aed', bg: '#f5f3ff' };
      case 'in_progress': return { label: 'Working...', color: '#0d9488', bg: '#f0fdfa' };
      case 'completed': return { label: 'Completed', color: '#10b981', bg: '#ecfdf5' };
      default: return { label: status, color: '#64748b', bg: '#f1f5f9' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Stripe-Style Light Blue Header */}
      <View style={styles.headerBox}>
        <LinearGradient colors={["#2563eb", "#4f46e5"]} style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 24) }]}>
          <View style={styles.profileHeaderRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarCircleText}>AC</Text>
              {isVerified && (
                <View style={styles.verifiedBadgeHolder}>
                  <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
                </View>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.shopName}>Ahmed Cooling Services</Text>
                {isVerified && <Ionicons name="shield-checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.shopSub}>Elite Certified HVAC Partner</Text>
            </View>
            <TouchableOpacity onPress={() => router.replace('/auth')} style={styles.logoutBtn}>
              <Ionicons name="power" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Horizontal Tabs scroll panel */}
      <View style={styles.tabsPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {[
            { id: 'overview', icon: 'grid-outline', label: 'Overview' },
            { id: 'listings', icon: 'folder-open-outline', label: 'My Listings' },
            { id: 'orders', icon: 'receipt-outline', label: 'Escrow Orders' },
            { id: 'wallet', icon: 'wallet-outline', label: 'Wallet Payouts' },
            { id: 'verification', icon: 'shield-checkmark-outline', label: 'AI Verification' },
            { id: 'community', icon: 'people-outline', label: 'B2B Community' },
            { id: 'insights', icon: 'trending-up-outline', label: 'AI Insights' },
          ].map((tab) => (
            <TouchableOpacity 
              key={tab.id} 
              style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
              onPress={() => { setActiveTab(tab.id as any); setSelectedBooking(null); }}
            >
              <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.id ? '#2563eb' : '#64748b'} />
              <Text style={[styles.tabButtonText, activeTab === tab.id && styles.tabButtonTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.mainScroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />}
      >
        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '750' }}>Synchronizing premium workspace...</Text>
          </View>
        ) : (
          <React.Fragment>
            {/* 1. OVERVIEW & TRUST SYSTEM */}
            {activeTab === 'overview' && (
              <View style={{ gap: 16 }}>
                {/* Advanced Trust system meter */}
                <View style={styles.trustCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.trustTitle}>AI Dynamic trust index evaluation</Text>
                    <View style={styles.verifiedStateBadge}>
                      <Text style={styles.verifiedStateBadgeText}>{isVerified ? "Verified Badge Active" : "Verification Required"}</Text>
                    </View>
                  </View>
                  <View style={styles.gaugeBack}>
                    <LinearGradient colors={["#2563eb", "#60a5fa"]} style={[styles.gaugeFill, { width: isVerified ? '98%' : '78%' }]} />
                  </View>
                  <Text style={styles.trustDesc}>
                    {isVerified ? "🔒 Elite 98% trust index has unlocked maximum search priority in DHA Lahore." : "⚠️ Liveness scanning is required to activate the Blue Verified Badge."}
                  </Text>
                </View>

                {/* Fiverr metrics */}
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticLabel}>Response Speed</Text>
                    <Text style={styles.analyticVal}>8 mins</Text>
                    <Text style={styles.analyticDelta}>🟢 Top 5%</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticLabel}>Order Completion</Text>
                    <Text style={styles.analyticVal}>99.4%</Text>
                    <Text style={styles.analyticDelta}>🟢 Elite Rank</Text>
                  </View>
                </View>

                <View style={styles.alertPanel}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="sparkles" size={16} color="#1e40af" />
                    <Text style={styles.alertPanelTitle}>Dynamic AI Grid Demand High</Text>
                  </View>
                  <Text style={styles.alertPanelDesc}>Emergency cooling repairs have spiked 2.5x in Phase 5 DHA. Launch verified listings immediately to capitalize on premium surge holds.</Text>
                </View>
              </View>
            )}

            {/* 2. FIVERR-STYLE LISTINGS MANAGEMENT */}
            {activeTab === 'listings' && (
              <View style={{ gap: 16 }}>
                {/* AI Seller Optimizer Assistant */}
                <View style={styles.optimizerBanner}>
                  <Ionicons name="sparkles" size={18} color="#0284c7" />
                  <Text style={styles.optimizerText}>AI Assistant: Adding "24/7 Emergency AC Leak Repair DHA" will increase search discoverability index by 32%.</Text>
                </View>

                {/* Gig creation form */}
                <View style={styles.cardCard}>
                  <Text style={styles.cardCardHeader}>{editingGigId ? "Edit Service Listing" : "Create New Service Listing"}</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Listing Title</Text>
                    <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="e.g. Chemical washing with jet..." placeholderTextColor="#94a3b8" />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Listing Description</Text>
                    <TextInput style={[styles.input, { height: 60 }]} value={newDesc} onChangeText={setNewDesc} placeholder="Describe service details..." placeholderTextColor="#94a3b8" />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Basic Price (Rs.)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={newPriceBasic} onChangeText={setNewPriceBasic} placeholder="Basic tier price" />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Premium Price (Rs.)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={newPricePremium} onChangeText={setNewPricePremium} placeholder="Premium tier price" />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Searchable Tags (Comma-separated)</Text>
                    <TextInput style={styles.input} value={newTags} onChangeText={setNewTags} placeholder="e.g. ac cleaning, emergency gas charge" />
                  </View>

                  <TouchableOpacity style={styles.gigSaveBtn} onPress={handleSaveGig}>
                    <Text style={styles.gigSaveBtnText}>{editingGigId ? "Save Listing changes" : "Publish Listing"}</Text>
                  </TouchableOpacity>
                </View>

                {/* List Gigs */}
                <View style={styles.cardCard}>
                  <Text style={styles.cardCardHeader}>My Marketplace Active Listings ({catalogGigs.length})</Text>
                  {catalogGigs.map(g => (
                    <View key={g.id} style={[styles.gigRow, g.paused && { opacity: 0.6 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gigRowTitle}>{g.title}</Text>
                        <Text style={styles.gigRowDesc}>{g.desc}</Text>
                        <Text style={styles.gigRowPrices}>Basic: Rs. {g.priceBasic} | Premium: Rs. {g.pricePremium || String(Number(g.priceBasic)*1.5)}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {g.tags.map(t => (
                            <View key={t} style={styles.tagBadgeMini}>
                              <Text style={styles.tagBadgeMiniText}>#{t}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      
                      {/* Gig management actions */}
                      <View style={styles.gigActionsCol}>
                        <TouchableOpacity style={styles.gigActionIcon} onPress={() => handleEditGig(g)}>
                          <Ionicons name="create-outline" size={16} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.gigActionIcon} onPress={() => handlePauseGig(g.id)}>
                          <Ionicons name={g.paused ? "play-outline" : "pause-outline"} size={16} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.gigActionIcon} onPress={() => handleDuplicateGig(g)}>
                          <Ionicons name="copy-outline" size={16} color="#0d9488" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.gigActionIcon} onPress={() => handleDeleteGig(g.id)}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 3. ESCROW ORDERS TIMELINE & DISPATCH */}
            {activeTab === 'orders' && (
              <View style={{ gap: 16 }}>
                {selectedBooking ? (
                  // HIGH-FIDELITY DETAILED ESCROW STEPPER WINDOW
                  <View style={styles.cardCard}>
                    <TouchableOpacity style={styles.backBtnRow} onPress={() => setSelectedBooking(null)}>
                      <Ionicons name="arrow-back" size={16} color="#2563eb" />
                      <Text style={styles.backBtnRowText}>Back to Bookings</Text>
                    </TouchableOpacity>

                    <Text style={styles.detailOrderId}>Order ID: #{selectedBooking.id}</Text>
                    <Text style={styles.detailOrderService}>{selectedBooking.service_type || selectedBooking.intent?.service_type || 'General Maintenance'}</Text>
                    
                    {/* TIMELINE STEPPER CHECKPOINTS */}
                    <Text style={[styles.label, { marginTop: 16 }]}>Active Dispatch checkpoints Stepper:</Text>
                    <View style={styles.stepperLogs}>
                      {['pending', 'accepted', 'technician_on_way', 'arrived', 'in_progress', 'completed'].map((statusOption) => {
                        const isCurrent = selectedBooking.status === statusOption;
                        return (
                          <View key={statusOption} style={styles.stepperStepLine}>
                            <View style={[styles.stepperDotIndicator, isCurrent && styles.stepperDotIndicatorActive]} />
                            <Text style={[styles.stepperStepLabel, isCurrent && styles.stepperStepLabelActive]}>
                              {statusOption.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Escrow protect details */}
                    <View style={styles.escrowHighlightCard}>
                      <Text style={styles.escrowTitleText}>🔒 Secure Platform Escrow Held Active</Text>
                      <Text style={styles.escrowDescText}>Amount protected: Rs. {selectedBooking.amount}</Text>
                      <Text style={styles.escrowDescText}>Split: 90% payout released | 10% commission hold.</Text>
                    </View>

                    {/* Timeline stepper dispatch modifiers */}
                    {selectedBooking.status !== 'completed' && (
                      <View style={{ marginTop: 14, gap: 10 }}>
                        {selectedBooking.status === 'pending' && (
                          <TouchableOpacity style={styles.stepAdvancerBtn} onPress={() => handleAdvanceStatus(selectedBooking.id, 'accepted')}>
                            <Text style={styles.stepAdvancerBtnText}>Accept Booking Ticket</Text>
                          </TouchableOpacity>
                        )}
                        {selectedBooking.status === 'accepted' && (
                          <TouchableOpacity style={[styles.stepAdvancerBtn, { backgroundColor: '#3b82f6' }]} onPress={() => handleAdvanceStatus(selectedBooking.id, 'technician_on_way')}>
                            <Text style={styles.stepAdvancerBtnText}>Depart to Site Location</Text>
                          </TouchableOpacity>
                        )}
                        {selectedBooking.status === 'technician_on_way' && (
                          <TouchableOpacity style={[styles.stepAdvancerBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => handleAdvanceStatus(selectedBooking.id, 'arrived')}>
                            <Text style={styles.stepAdvancerBtnText}>Confirm Site Arrival</Text>
                          </TouchableOpacity>
                        )}
                        {selectedBooking.status === 'arrived' && (
                          <TouchableOpacity style={[styles.stepAdvancerBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => handleAdvanceStatus(selectedBooking.id, 'in_progress')}>
                            <Text style={styles.stepAdvancerBtnText}>Confirm Job Started</Text>
                          </TouchableOpacity>
                        )}
                        {selectedBooking.status === 'in_progress' && (
                          <View style={{ gap: 10 }}>
                            <TouchableOpacity style={styles.proofUploadBtn} onPress={() => handleCaptureProof(selectedBooking.id)}>
                              <Ionicons name="camera-outline" size={16} color="#64748b" />
                              <Text style={styles.proofUploadBtnText}>
                                {uploadedProofs[selectedBooking.id] ? "Completion_Proof.jpg Saved ✓" : "Upload Completion Proof Image"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.stepAdvancerBtn, { backgroundColor: '#10b981' }]} onPress={() => handleAdvanceStatus(selectedBooking.id, 'completed')}>
                              <Text style={styles.stepAdvancerBtnText}>Request Payout Payout Release</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ) : (
                  // STANDARD LISTINGS VIEW
                  bookings.map(b => {
                    const st = getStatusDetails(b.status);
                    return (
                      <TouchableOpacity key={b.id} style={styles.bookingListItem} onPress={() => setSelectedBooking(b)}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={styles.bookingListItemId}>Order #{b.id}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: st.color }]}>{st.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.bookingListItemService}>{b.service_type || b.intent?.service_type || 'General Service'}</Text>
                        <Text style={styles.bookingListItemMeta}>Tap to track dispatch checkpoints timeline ⏱️</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* 4. WALLET LEDGERS & STRIPE */}
            {activeTab === 'wallet' && (
              <View style={{ gap: 16 }}>
                <View style={styles.walletLedgerCard}>
                  <Text style={styles.walletLabel}>Withdrawable Available Funds</Text>
                  <Text style={styles.walletVal}>Rs. {wallet.balance}</Text>
                  <Text style={[styles.walletLabel, { marginTop: 14 }]}>Escrow Protection Hold</Text>
                  <Text style={[styles.walletVal, { color: '#fbbf24' }]}>Rs. {wallet.pending}</Text>
                  
                  <TouchableOpacity style={styles.stripeWithdrawBtn} onPress={handleWithdraw} disabled={isWithdrawing}>
                    {isWithdrawing ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <Text style={styles.stripeWithdrawText}>Stripe Payout to Bank</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* transaction logs */}
                <View style={styles.cardCard}>
                  <Text style={styles.cardCardHeader}>Payout Logs</Text>
                  {(!wallet.transactions || wallet.transactions.length === 0) ? (
                    <Text style={styles.emptyLogsText}>No payouts processed yet.</Text>
                  ) : (
                    wallet.transactions.map((t: any) => (
                      <View key={t.id} style={styles.txnRowItem}>
                        <Text style={styles.txnRowDesc}>{t.desc}</Text>
                        <Text style={styles.txnRowAmt}>Rs. {Math.abs(t.amount)}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* 5. MULTI-LAYER IDENTITY VERIFICATION CENTER */}
            {activeTab === 'verification' && (
              <View style={styles.cardCard}>
                <Text style={styles.cardCardHeader}>Multi-Layer AI Verification Center</Text>
                <Text style={styles.subtitleMuted}>Verifying identity aligns profile match algorithm priorities 4x higher in customer search results.</Text>

                {/* Step 1: CNIC scanner uploader */}
                <Text style={styles.stepTitle}>Step 1: CNIC Front & Back OCR Scan</Text>
                
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <TouchableOpacity style={[styles.uploadBox, cnicFrontUploaded && styles.uploadBoxActive]} onPress={() => simulateCnicOcrScan('front')}>
                    <Ionicons name={cnicFrontUploaded ? "checkmark-circle" : "document-text-outline"} size={22} color={cnicFrontUploaded ? "#2563eb" : "#64748b"} />
                    <Text style={styles.uploadBoxText}>{cnicFrontUploaded ? "Front Scanned" : "Scan Front"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.uploadBox, cnicBackUploaded && styles.uploadBoxActive]} onPress={() => simulateCnicOcrScan('back')}>
                    <Ionicons name={cnicBackUploaded ? "checkmark-circle" : "document-text-outline"} size={22} color={cnicBackUploaded ? "#2563eb" : "#64748b"} />
                    <Text style={styles.uploadBoxText}>{cnicBackUploaded ? "Back Scanned" : "Scan Back"}</Text>
                  </TouchableOpacity>
                </View>

                {isCnicScanning && (
                  <View style={styles.scanningOcrCard}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.scanningOcrText}>AI OCR extracting CNIC metadata parameters...</Text>
                  </View>
                )}

                {extractedOcrName !== '' && (
                  <View style={styles.ocrResultBox}>
                    <Text style={styles.ocrResultTitle}>Extracted AI CNIC Data:</Text>
                    <Text style={styles.ocrResultVal}>Name match: {extractedOcrName} (100% Match)</Text>
                    <Text style={styles.ocrResultVal}>Expiry date: {extractedOcrExpiry}</Text>
                  </View>
                )}

                {/* Step 2: AI 3D selfie liveness checklist */}
                <Text style={[styles.stepTitle, { marginTop: 20 }]}>Step 2: AI 3D Selfie Liveness Verification</Text>
                
                {/* Guide Frame Scan Ring */}
                <View style={styles.selfieRingGuide}>
                  <View style={styles.selfieInnerFrame}>
                    <Ionicons name="person-outline" size={50} color="#94a3b8" />
                  </View>
                  <View style={styles.laserBeam} />
                </View>

                <View style={styles.livenessChecklist}>
                  <TouchableOpacity style={styles.livenessItem} onPress={() => setFaceBlinked(true)}>
                    <Ionicons name={faceBlinked ? "checkmark-circle" : "ellipse-outline"} size={20} color={faceBlinked ? "#2563eb" : "#94a3b8"} />
                    <Text style={[styles.livenessItemText, faceBlinked && styles.livenessItemTextActive]}>Instructions: Blink your eyes twice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.livenessItem} onPress={() => setHeadTurned(true)}>
                    <Ionicons name={headTurned ? "checkmark-circle" : "ellipse-outline"} size={20} color={headTurned ? "#2563eb" : "#94a3b8"} />
                    <Text style={[styles.livenessItemText, headTurned && styles.livenessItemTextActive]}>Instructions: Turn head slowly left/right</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.livenessItem} onPress={() => setSmileCaptured(true)}>
                    <Ionicons name={smileCaptured ? "checkmark-circle" : "ellipse-outline"} size={20} color={smileCaptured ? "#2563eb" : "#94a3b8"} />
                    <Text style={[styles.livenessItemText, smileCaptured && styles.livenessItemTextActive]}>Instructions: Smile and complete matching</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.submitVerificationBtn} onPress={handleVerifyLiveness} disabled={isLivenessScanning || isVerified}>
                  {isLivenessScanning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitVerificationBtnText}>{isVerified ? "Verification Completed ✓" : "Complete AI Liveness Match"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* 6. B2B COMMUNITY DIRECTORY */}
            {activeTab === 'community' && (
              <View style={{ gap: 16 }}>
                {selectedB2B ? (
                  // B2B TEXT PANEL REFERRAL TUNNEL
                  <View style={styles.cardCard}>
                    <TouchableOpacity style={styles.backBtnRow} onPress={() => setSelectedB2B(null)}>
                      <Ionicons name="arrow-back" size={16} color="#2563eb" />
                      <Text style={styles.backBtnRowText}>Back to Community Directory</Text>
                    </TouchableOpacity>

                    <Text style={styles.b2bTitle}>B2B Referral Tunnel: {selectedB2B.name}</Text>
                    <ScrollView style={styles.b2bChatScroll} contentContainerStyle={{ paddingVertical: 10 }}>
                      {b2bMessages.map((msg, idx) => (
                        <View key={idx} style={[styles.b2bMsgBubbleRow, msg.sender === 'me' && { justifyContent: 'flex-end' }]}>
                          <View style={[styles.b2bMsgBubble, msg.sender === 'me' ? styles.b2bMeBubble : styles.b2bThemBubble]}>
                            <Text style={[styles.b2bMsgText, msg.sender === 'me' && { color: '#fff' }]}>{msg.text}</Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>

                    <View style={styles.b2bInputRow}>
                      <TextInput style={styles.b2bTextInput} placeholder="Type referral context..." placeholderTextColor="#64748b" value={b2bMsg} onChangeText={setB2bMsg} />
                      <TouchableOpacity style={styles.b2bSendBtn} onPress={handleSendB2BMessage}>
                        <Ionicons name="send" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // DIRECTORY LIST
                  <View style={styles.cardCard}>
                    <Text style={styles.cardCardHeader}>B2B Job Sharing & Referrals directory</Text>
                    {COMMUNITY_PROVIDERS.map(p => (
                      <View key={p.id} style={styles.communityListItem}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.communityItemName}>{p.name}</Text>
                            <View style={[styles.onlineDotIndicator, { backgroundColor: p.online ? '#10b981' : '#64748b' }]} />
                          </View>
                          <Text style={styles.communityItemSub}>{p.category} • {p.area} • Completed {p.completed} bookings</Text>
                        </View>
                        <TouchableOpacity style={styles.communityChatTriggerBtn} onPress={() => setSelectedB2B(p)}>
                          <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 7. AI SEARCH RANKING INSIGHTS */}
            {activeTab === 'insights' && (
              <View style={styles.cardCard}>
                <Text style={styles.cardCardHeader}>AI Performance Ranking Metrics</Text>
                <View style={styles.insightRow}>
                  <Ionicons name="trending-up" size={18} color="#2563eb" />
                  <Text style={styles.insightText}>Search views spiked by 18% in DHA Lahore grids this week.</Text>
                </View>
                <View style={[styles.insightRow, { marginTop: 14 }]}>
                  <Ionicons name="time" size={18} color="#4f46e5" />
                  <Text style={styles.insightText}>Responding within 8 minutes increased booking reservation rates by 24%.</Text>
                </View>
              </View>
            )}
          </React.Fragment>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerBox: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  headerGradient: { paddingBottom: 20, paddingHorizontal: 16 },
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarCircleText: { fontSize: 16, fontWeight: '900', color: '#2563eb' },
  verifiedBadgeHolder: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 9, padding: 1 },
  shopName: { fontSize: 16, fontWeight: '900', color: '#fff' },
  shopSub: { fontSize: 11, color: '#dbeafe', fontWeight: '700', marginTop: 2 },
  logoutBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  tabsPanel: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  tabButtonActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  tabButtonText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  tabButtonTextActive: { color: '#1e40af', fontWeight: '900' },

  mainScroll: { flex: 1 },
  
  trustCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
  trustTitle: { fontSize: 12, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  verifiedStateBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  verifiedStateBadgeText: { fontSize: 10, fontWeight: '900', color: '#2563eb' },
  gaugeBack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
  gaugeFill: { height: '100%', borderRadius: 4 },
  trustDesc: { fontSize: 12, color: '#64748b', fontWeight: '700' },

  analyticsGrid: { flexDirection: 'row', gap: 12 },
  analyticsCard: { flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  analyticLabel: { fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' },
  analyticVal: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginTop: 4 },
  analyticDelta: { fontSize: 11, color: '#2563eb', fontWeight: '700', marginTop: 4 },

  alertPanel: { backgroundColor: '#eff6ff', borderLeftWidth: 3, borderLeftColor: '#2563eb', padding: 16, borderRadius: 10 },
  alertPanelTitle: { fontSize: 13, fontWeight: '900', color: '#1e40af', textTransform: 'uppercase' },
  alertPanelDesc: { fontSize: 13, color: '#1e3a8a', lineHeight: 20 },

  cardCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
  cardCardHeader: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginBottom: 16 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, color: '#1e293b', fontSize: 14, fontWeight: '700' },

  gigSaveBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10 },
  gigSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  optimizerBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, gap: 8 },
  optimizerText: { flex: 1, fontSize: 12, color: '#0369a1', fontWeight: '800', lineHeight: 18 },

  gigRow: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  gigRowTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b' },
  gigRowDesc: { fontSize: 12, color: '#64748b', lineHeight: 18, marginTop: 4 },
  gigRowPrices: { fontSize: 13, color: '#2563eb', fontWeight: '800', marginTop: 8 },
  tagBadgeMini: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagBadgeMiniText: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  gigActionsCol: { gap: 8, paddingLeft: 12 },
  gigActionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f8fafc', borderStyle: 'solid', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },

  backBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backBtnRowText: { fontSize: 13, color: '#2563eb', fontWeight: '800' },
  detailOrderId: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  detailOrderService: { fontSize: 18, fontWeight: '950', color: '#1e293b', marginTop: 4 },

  stepperLogs: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, marginVertical: 12 },
  stepperStepLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  stepperDotIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' },
  stepperDotIndicatorActive: { backgroundColor: '#2563eb' },
  stepperStepLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  stepperStepLabelActive: { color: '#2563eb', fontWeight: '900' },

  escrowHighlightCard: { padding: 14, backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0', marginVertical: 12 },
  escrowTitleText: { fontSize: 13, fontWeight: '900', color: '#15803d' },
  escrowDescText: { fontSize: 12, color: '#166534', marginTop: 4, fontWeight: '600' },

  stepAdvancerBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  stepAdvancerBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  proofUploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', padding: 12, borderRadius: 8 },
  proofUploadBtnText: { color: '#64748b', fontSize: 12, fontWeight: '800' },

  bookingListItem: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  bookingListItemId: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  bookingListItemStatus: { fontSize: 11, fontWeight: '900' },
  bookingListItemService: { fontSize: 15, fontWeight: '850', color: '#1e293b', marginVertical: 6 },
  bookingListItemMeta: { fontSize: 12, color: '#2563eb', fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '900' },

  walletLedgerCard: { backgroundColor: '#1e3a8a', borderRadius: 16, padding: 20 },
  walletLabel: { fontSize: 11, color: '#dbeafe', fontWeight: '700', textTransform: 'uppercase' },
  walletVal: { fontSize: 24, fontWeight: '950', color: '#fff', marginTop: 4 },
  stripeWithdrawBtn: { backgroundColor: '#fff', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  stripeWithdrawText: { color: '#1e3a8a', fontSize: 13, fontWeight: '900' },
  txnRowItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txnRowDesc: { fontSize: 13, color: '#1e293b', fontWeight: '700' },
  txnRowAmt: { fontSize: 13, color: '#ef4444', fontWeight: '800' },
  emptyLogsText: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },

  stepTitle: { fontSize: 13, fontWeight: '900', color: '#1e293b', marginBottom: 12 },
  uploadBox: { flex: 1, height: 80, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  uploadBoxActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  uploadBoxText: { fontSize: 12, fontWeight: '750', color: '#64748b', marginTop: 4 },
  scanningOcrCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginVertical: 10 },
  scanningOcrText: { fontSize: 12, color: '#2563eb', fontWeight: '800' },
  ocrResultBox: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginVertical: 10 },
  ocrResultTitle: { fontSize: 12, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  ocrResultVal: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  subtitleMuted: { fontSize: 12, color: '#64748b', lineHeight: 18, marginBottom: 16 },

  selfieRingGuide: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderStyle: 'dashed', borderColor: '#2563eb', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 16 },
  selfieInnerFrame: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  laserBeam: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#2563eb' },
  
  livenessChecklist: { gap: 10, marginBottom: 20 },
  livenessItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10 },
  livenessItemText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  livenessItemTextActive: { color: '#2563eb', fontWeight: '900' },
  submitVerificationBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' },
  submitVerificationBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  communityListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  communityItemName: { fontSize: 14, fontWeight: '850', color: '#1e293b' },
  onlineDotIndicator: { width: 8, height: 8, borderRadius: 4 },
  communityItemSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  communityChatTriggerBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },

  b2bTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  b2bChatScroll: { height: 160, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginVertical: 12 },
  b2bMsgBubbleRow: { flexDirection: 'row', marginVertical: 4 },
  b2bMsgBubble: { padding: 10, borderRadius: 10, maxWidth: '80%' },
  b2bMeBubble: { backgroundColor: '#2563eb' },
  b2bThemBubble: { backgroundColor: '#e2e8f0' },
  b2bMsgText: { color: '#1e293b', fontSize: 13, fontWeight: '600' },
  b2bInputRow: { flexDirection: 'row', gap: 8 },
  b2bTextInput: { flex: 1, height: 40, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, color: '#1e293b' },
  b2bSendBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },

  insightRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  insightText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 18, fontWeight: '750' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginTop: 12 },
  toggleTitle: { fontSize: 14, fontWeight: '850', color: '#1e293b' },
  toggleDesc: { fontSize: 11, color: '#64748b', lineHeight: 16 }
});

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Switch, Platform, KeyboardAvoidingView, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProviderRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Step tracker
  const [currentStep, setCurrentStep] = useState(1); // 1: Business Profile, 2: Verification, 3: Services Catalog, 4: AI Settings

  // Step 1: Business Profile States
  const [businessName, setBusinessName] = useState('Ahmed Cooling Services');
  const [category, setCategory] = useState('AC Technician');
  const [experience, setExperience] = useState('8');
  const [operatingHours, setOperatingHours] = useState('09:00 AM - 08:00 PM');
  const [address, setAddress] = useState('DHA Phase 5, Lahore');
  const [onsiteSupport, setOnsiteSupport] = useState(true);
  const [remoteSupport, setRemoteSupport] = useState(true);

  // Step 2: Verification States
  const [cnicNumber, setCnicNumber] = useState('35201-1234567-9');
  const [cnicFrontUploaded, setCnicFrontUploaded] = useState(false);
  const [cnicBackUploaded, setCnicBackUploaded] = useState(false);
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [consentBackgroundCheck, setConsentBackgroundCheck] = useState(true);

  // Step 3: Service Catalog States
  const [services, setServices] = useState([
    { name: 'AC Filter Cleaning & Servicing', price: '1200' },
    { name: 'AC Compressor Replacement', price: '8500' },
  ]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  // Step 4: AI Settings States
  const [aiNegotiate, setAiNegotiate] = useState(true);
  const [minPriceBuffer, setMinPriceBuffer] = useState('10');
  const [aiDynamicSurge, setAiDynamicSurge] = useState(true);

  const handleAddService = () => {
    if (!newServiceName.trim() || !newServicePrice.trim()) {
      Alert.alert("Input Error", "Please provide both service name and base rate.");
      return;
    }
    setServices(prev => [...prev, { name: newServiceName.trim(), price: newServicePrice.trim() }]);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const handleRemoveService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const simulateUpload = (type: 'front' | 'back') => {
    if (type === 'front') {
      setIsUploadingFront(true);
      setTimeout(() => {
        setIsUploadingFront(false);
        setCnicFrontUploaded(true);
      }, 1200);
    } else {
      setIsUploadingBack(true);
      setTimeout(() => {
        setIsUploadingBack(false);
        setCnicBackUploaded(true);
      }, 1200);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!businessName.trim() || !category.trim()) {
        Alert.alert("Required Fields", "Please enter business name and service category.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!cnicNumber.trim() || !cnicFrontUploaded || !cnicBackUploaded) {
        Alert.alert("Verification Required", "Please upload both front/back copies of your CNIC.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (services.length === 0) {
        Alert.alert("Catalog Required", "Please add at least 1 service listing.");
        return;
      }
      setCurrentStep(4);
    } else {
      router.push('/provider-dashboard');
    }
  };

  const renderProgressIndicator = () => {
    return (
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <View style={[styles.progressDot, currentStep >= step && styles.progressDotActive]}>
              <Text style={[styles.progressDotText, currentStep >= step && styles.progressDotTextActive]}>
                {step}
              </Text>
            </View>
            {step < 4 && <View style={[styles.progressLine, currentStep > step && styles.progressLineActive]} />}
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => currentStep > 1 ? setCurrentStep(c => c - 1) : router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Partner Onboarding</Text>
          <Text style={styles.headerSub}>
            {currentStep === 1 && "1. Setup Business Profile"}
            {currentStep === 2 && "2. Verify Identity"}
            {currentStep === 3 && "3. Configure Public Catalog"}
            {currentStep === 4 && "4. AI Orchestration Settings"}
          </Text>
        </View>
      </View>

      {renderProgressIndicator()}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} style={styles.scrollBody}>
        {/* STEP 1: BUSINESS PROFILE */}
        {currentStep === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.cardHeader}>Business Overview</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name</Text>
              <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Ahmed Cooling Services" placeholderTextColor="#94a3b8" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Category</Text>
              <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="AC Technician" placeholderTextColor="#94a3b8" />
            </View>

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Experience</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={experience} onChangeText={setExperience} />
              </View>
              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <Text style={styles.label}>Operating Hours</Text>
                <TextInput style={styles.input} value={operatingHours} onChangeText={setOperatingHours} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Address</Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress} />
            </View>

            <Text style={styles.subTitle}>Delivery Methods</Text>
            
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Onsite Support Visit</Text>
                <Text style={styles.toggleDesc}>Travel directly to the customer site location.</Text>
              </View>
              <Switch value={onsiteSupport} onValueChange={setOnsiteSupport} trackColor={{ true: '#2563eb' }} />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Remote Online Consultation</Text>
                <Text style={styles.toggleDesc}>Assist customers via live video consultations.</Text>
              </View>
              <Switch value={remoteSupport} onValueChange={setRemoteSupport} trackColor={{ true: '#2563eb' }} />
            </View>
          </View>
        )}

        {/* STEP 2: TRUST & IDENTITY VERIFICATION */}
        {currentStep === 2 && (
          <View style={styles.formCard}>
            <View style={styles.badgeBanner}>
              <Ionicons name="shield-checkmark" size={16} color="#2563eb" />
              <Text style={styles.badgeBannerText}>Multi-Layer AI Verification Center</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>National CNIC Number</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={cnicNumber} onChangeText={setCnicNumber} placeholder="35201-1234567-9" placeholderTextColor="#94a3b8" />
            </View>

            <Text style={styles.label}>CNIC Front & Back Photo Copy</Text>
            
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
              <TouchableOpacity style={[styles.uploadBox, cnicFrontUploaded && styles.uploadBoxActive]} onPress={() => simulateUpload('front')}>
                {isUploadingFront ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : cnicFrontUploaded ? (
                  <View style={styles.uploadedInner}>
                    <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                    <Text style={[styles.uploadText, { color: '#1e3a8a' }]}>CNIC Front Saved</Text>
                  </View>
                ) : (
                  <View style={styles.uploadedInner}>
                    <Ionicons name="camera-outline" size={24} color="#64748b" />
                    <Text style={styles.uploadText}>Upload Front</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.uploadBox, cnicBackUploaded && styles.uploadBoxActive]} onPress={() => simulateUpload('back')}>
                {isUploadingBack ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : cnicBackUploaded ? (
                  <View style={styles.uploadedInner}>
                    <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                    <Text style={[styles.uploadText, { color: '#1e3a8a' }]}>CNIC Back Saved</Text>
                  </View>
                ) : (
                  <View style={styles.uploadedInner}>
                    <Ionicons name="camera-outline" size={24} color="#64748b" />
                    <Text style={styles.uploadText}>Upload Back</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Auto OCR Details Extraction</Text>
                <Text style={styles.toggleDesc}>Authorize AI system to scan and verify CNIC authenticity details.</Text>
              </View>
              <Switch value={consentBackgroundCheck} onValueChange={setConsentBackgroundCheck} trackColor={{ true: '#2563eb' }} />
            </View>
          </View>
        )}

        {/* STEP 3: CONFIGURE SERVICE CATALOG */}
        {currentStep === 3 && (
          <View style={styles.formCard}>
            <Text style={styles.cardHeader}>Services & Base Rates</Text>
            <Text style={styles.subtitleMuted}>List standard packages you offer. Customers see these price tags in directories.</Text>

            {services.map((item, idx) => (
              <View key={idx} style={styles.serviceItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceItemName}>{item.name}</Text>
                  <Text style={styles.serviceItemPrice}>Base Rate: Rs. {item.price}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveService(idx)} style={styles.removeServiceBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.divider} />

            <Text style={styles.addSubHeader}>Add Custom Service</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Title</Text>
              <TextInput style={styles.input} value={newServiceName} onChangeText={setNewServiceName} placeholder="e.g. AC Installation" placeholderTextColor="#94a3b8" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Base Rate (Rs.)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={newServicePrice} onChangeText={setNewServicePrice} placeholder="e.g. 2500" placeholderTextColor="#94a3b8" />
            </View>

            <TouchableOpacity style={styles.addServiceBtn} onPress={handleAddService}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addServiceBtnText}>Add Service to Catalog</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: AI SETTINGS */}
        {currentStep === 4 && (
          <View style={styles.formCard}>
            <View style={[styles.badgeBanner, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="sparkles" size={16} color="#0284c7" />
              <Text style={[styles.badgeBannerText, { color: '#0369a1' }]}>AI Dynamic Pricing & Bidding</Text>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>AI Auto-Negotiation</Text>
                <Text style={styles.toggleDesc}>Allow matching AI bots to bid and negotiate within budget constraints.</Text>
              </View>
              <Switch value={aiNegotiate} onValueChange={setAiNegotiate} trackColor={{ true: '#2563eb' }} />
            </View>

            {aiNegotiate && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Acceptable discount threshold (%)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={minPriceBuffer} onChangeText={setMinPriceBuffer} />
                <Text style={styles.inputMutedHint}>AI will negotiate bids up to {minPriceBuffer}% lower than base rates.</Text>
              </View>
            )}

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Dynamic Surge Pricing</Text>
                <Text style={styles.toggleDesc}>Automatically boost prices during high-traffic emergency grids in DHA Lahore.</Text>
              </View>
              <Switch value={aiDynamicSurge} onValueChange={setAiDynamicSurge} trackColor={{ true: '#2563eb' }} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.footerBackBtn} onPress={() => setCurrentStep(c => c - 1)}>
            <Text style={styles.footerBackBtnText}>Previous</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.footerNextBtn} onPress={handleNextStep}>
          <LinearGradient colors={["#2563eb", "#4f46e5"]} style={styles.footerNextGradient}>
            <Text style={styles.footerNextText}>
              {currentStep === 4 ? "Complete Setup & Dashboard" : "Continue"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  headerSub: { fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 2 },
  
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  progressDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  progressDotText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  progressDotTextActive: { color: '#fff' },
  progressLine: { width: 50, height: 2, backgroundColor: '#cbd5e1' },
  progressLineActive: { backgroundColor: '#2563eb' },

  scrollBody: { flex: 1 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
  cardHeader: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, color: '#1e293b', fontSize: 15, fontWeight: '700' },
  
  subTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: 12, marginBottom: 8, letterSpacing: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  toggleTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  toggleDesc: { fontSize: 12, color: '#64748b', lineHeight: 18, paddingRight: 12 },

  badgeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 8, marginBottom: 20 },
  badgeBannerText: { fontSize: 12, fontWeight: '800', color: '#1e40af' },
  
  uploadBox: { flex: 1, height: 100, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  uploadBoxActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  uploadedInner: { alignItems: 'center', gap: 6 },
  uploadText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  subtitleMuted: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 },
  serviceItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  serviceItemName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  serviceItemPrice: { fontSize: 13, color: '#2563eb', fontWeight: '800', marginTop: 2 },
  removeServiceBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
  addSubHeader: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginBottom: 16 },
  addServiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1e293b', borderRadius: 10, padding: 14 },
  addServiceBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  inputMutedHint: { fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 16 },

  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff', gap: 12 },
  footerBackBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  footerBackBtnText: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  footerNextBtn: { flex: 2, height: 50, borderRadius: 12, overflow: 'hidden' },
  footerNextGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 },
  footerNextText: { color: '#fff', fontSize: 15, fontWeight: '900' }
});

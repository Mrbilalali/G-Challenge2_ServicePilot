import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Linking, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sendChatMessage, getChatMessages } from '@/services/api';

const QUICK_REPLIES = ["Hi, what is your status?", "Are you on your way?", "Do you bring inverter tools?", "Refer a plumber?", "Shukriya! See you."];

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const bookingId = (params.bookingId as string) || 'demo_booking';
  const providerName = (params.providerName as string) || 'Technician';

  useEffect(() => {
    fetchMessages();
    if (messages.length === 0) {
      setMessages([
        {
          id: 'sys_1',
          sender: 'system',
          message: `🔒 Secure Escrow Chat enabled for Booking ID: ${bookingId}. All payments are held in secure platform protection.`,
          timestamp: new Date(Date.now() - 60000).toISOString(),
          status: 'read'
        },
        {
          id: 'tech_1',
          sender: 'technician',
          message: `Assalam o Alaikum! I'm ${providerName}. I am setting up the tools for your AC Repair service in DHA Lahore.`,
          timestamp: new Date(Date.now() - 30000).toISOString(),
          status: 'read'
        }
      ]);
    }
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await getChatMessages(bookingId);
      if (res.messages?.length > 0) {
        setMessages(prev => [...prev, ...res.messages]);
      }
    } catch(e) {}
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    
    // 1. Optimistic Add Customer Message
    const localMsg = {
      id: `local_${Date.now()}`,
      sender: 'customer',
      message: msg,
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };
    setMessages(prev => [...prev, localMsg]);
    
    // Simulate reading the message
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === localMsg.id ? { ...m, status: 'read' } : m));
    }, 2000);

    try {
      await sendChatMessage(bookingId, msg, 'customer');
      
      // 2. Trigger Live Typing Indicator
      setTimeout(() => {
        setIsTyping(true);
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 1000);

      // 3. Simulated Auto Response with typing fade out
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: `tech_${Date.now()}`,
          sender: 'technician',
          message: getAutoReply(msg),
          timestamp: new Date().toISOString(),
          status: 'read'
        }]);
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 3000);
    } catch(e) {}
    setSending(false);
  };

  const getAutoReply = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('eta') || m.includes('status') || m.includes('kab')) return "I have departed from Phase 5 DHA dispatch hub. Estimated ETA is 18 minutes, InshaAllah.";
    if (m.includes('inverter') || m.includes('tool') || m.includes('saman')) return "Ji, I've loaded my digital pressure manifold gauge, vacuum pump, and R410 refrigerant cylinder.";
    if (m.includes('plumber') || m.includes('refer')) return "Let me refer my partner Asif (Plumbing Masters). He is in Phase 6 right now and works on high-pressure leaks.";
    if (m.includes('shukriya') || m.includes('thank')) return "JazakAllah! Glad to help. I am en-route now.";
    return "Noted! I'm accelerating my dispatch. You can track my en-route location live on the timeline tracker.";
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleViewProviderProfile = () => {
    const mockTech = {
      id: 'PRV-001',
      name: providerName,
      is_verified: true,
      service_type: 'AC Repair',
      experience_years: 8,
      area: 'DHA Phase 5, Lahore',
      rating: 4.8,
      review_count: 124,
      reliability_score: 96,
      completed_jobs: 312,
      base_rate: 1500,
      phone: '+923001234567',
      verification_badge: 'ID & Background Checked',
      remote_available: true
    };
    router.push({
      pathname: "/technician",
      params: { data: JSON.stringify(mockTech) }
    });
  };

  const handleReferralAccept = () => {
    Alert.alert("Partner Connected 🤝", "Successfully established reference tunnel with Asif Plumbing Masters.");
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Deep Midnight Gradients matching Customer visual home */}
      <LinearGradient colors={["#0b0f19", "#022c22"]} style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleViewProviderProfile} style={styles.headerInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarCircleText}>{providerName.charAt(0)}</Text>
            <View style={styles.statusPulseDot} />
          </View>
          <View>
            <Text style={styles.headerName}>{providerName}</Text>
            <Text style={styles.headerStatusText}>Online • Certified HVAC Partner</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:+923001234567')}>
          <Ionicons name="call" size={18} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Chat Messages Workspace */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, i) => (
          <View key={msg.id || i} style={[styles.msgRow, msg.sender === 'customer' && styles.msgRowRight]}>
            {msg.sender === 'system' ? (
              <View style={styles.systemBubble}>
                <Ionicons name="lock-closed" size={12} color="#059669" />
                <Text style={styles.systemText}>{msg.message}</Text>
              </View>
            ) : (
              <View style={[styles.bubble, msg.sender === 'customer' ? styles.customerBubble : styles.techBubble]}>
                <Text style={[styles.bubbleText, msg.sender === 'customer' && { color: '#0f172a' }]}>{msg.message}</Text>
                
                {/* Meta details: Delivery read receipts and timestamps */}
                <View style={styles.bubbleMeta}>
                  <Text style={[styles.timeText, msg.sender === 'customer' && { color: 'rgba(15,23,42,0.6)' }]}>
                    {formatTime(msg.timestamp)}
                  </Text>
                  {msg.sender === 'customer' && (
                    <Ionicons 
                      name={msg.status === 'read' ? "checkmark-done" : "checkmark"} 
                      size={14} 
                      color={msg.status === 'read' ? "#10b981" : "#64748b"} 
                    />
                  )}
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Live Typing Indicator */}
        {isTyping && (
          <View style={styles.typingIndicatorRow}>
            <View style={styles.techBubbleTyping}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.typingText}>{providerName} is typing...</Text>
            </View>
          </View>
        )}

        {/* B2B Technician Partner Referral cards */}
        {messages.some(m => m.message.includes('refer')) && (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <Ionicons name="share-social-outline" size={16} color="#047857" />
              <Text style={styles.referralHeaderTitle}>B2B Partner Recommendation</Text>
            </View>
            <Text style={styles.referralDesc}>Asif Plumbing Masters is highly verified for structural leak repair in Phase 6 grid today.</Text>
            <View style={styles.referralActions}>
              <TouchableOpacity style={styles.referralDecline}>
                <Text style={styles.referralDeclineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.referralAccept} onPress={handleReferralAccept}>
                <Text style={styles.referralAcceptText}>Connect & Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Suggested Replies Grid */}
      <View style={styles.quickRepliesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
          {QUICK_REPLIES.map((qr, i) => (
            <TouchableOpacity key={i} style={styles.quickChip} onPress={() => setInput(qr)}>
              <Text style={styles.quickChipText}>{qr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messaging Control Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="image-outline" size={20} color="#64748b" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          placeholder="Message or type custom slots..."
          placeholderTextColor="#94a3b8"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity style={styles.micBtn}>
          <Ionicons name="mic-outline" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} 
          onPress={handleSend} 
          disabled={!input.trim() || sending}
        >
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.sendBtnGrad}>
            <Ionicons name="send" size={14} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarCircleText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  statusPulseDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', borderWidth: 1.5, borderColor: '#0b0f19' },
  headerName: { fontSize: 16, fontWeight: '900', color: '#fff' },
  headerStatusText: { fontSize: 11, color: '#a7f3d0', fontWeight: '700', marginTop: 2 },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

  chatScroll: { flex: 1 },
  msgRow: { flexDirection: 'row', marginVertical: 8 },
  msgRowRight: { justifyContent: 'flex-end' },
  
  systemBubble: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: 10, backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.1)' },
  systemText: { fontSize: 11, color: '#059669', fontWeight: '700', textAlign: 'center' },

  bubble: { maxWidth: '80%', padding: 14, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  customerBubble: { backgroundColor: '#e2e8f0' },
  techBubble: { backgroundColor: '#1f2937', borderLeftWidth: 3, borderLeftColor: '#10b981' },
  bubbleText: { fontSize: 14, color: '#fff', lineHeight: 20, fontWeight: '600' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6 },
  timeText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },

  typingIndicatorRow: { flexDirection: 'row', marginVertical: 8 },
  techBubbleTyping: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1f2937' },
  typingText: { fontSize: 12, color: '#10b981', fontWeight: '700' },

  referralCard: { backgroundColor: '#111827', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', marginVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  referralHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  referralHeaderTitle: { fontSize: 12, fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5 },
  referralDesc: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  referralActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  referralDecline: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  referralDeclineText: { fontSize: 12, color: '#ef4444', fontWeight: '800' },
  referralAccept: { flex: 2, height: 38, borderRadius: 8, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  referralAcceptText: { fontSize: 12, color: '#fff', fontWeight: '800' },

  quickRepliesContainer: { paddingVertical: 12, backgroundColor: '#0b0f19', borderTopWidth: 1, borderTopColor: '#1f2937' },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' },
  quickChipText: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },

  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#0b0f19', borderTopWidth: 1, borderTopColor: '#1f2937' },
  attachBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, height: 40, backgroundColor: '#1f2937', borderRadius: 10, paddingHorizontal: 12, color: '#fff', fontSize: 14, fontWeight: '600', marginHorizontal: 8 },
  micBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  sendBtnGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }
});

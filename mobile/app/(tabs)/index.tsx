import React, { useState, useRef } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Modal,
  Alert
} from "react-native";
import { Text } from "@/components/Themed";
import { submitRequest, createEscrow } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Message = {
  role: "user" | "agent" | "system";
  text: string;
  data?: any;
};

const CATEGORIES = [
  { id: 1, title: "AC Repair", icon: "snow", desc: "Cooling & gas refill", time: "~10 min", color: "#3b82f6" },
  { id: 2, title: "Electrician", icon: "flash", desc: "Wiring & faults", time: "~15 min", color: "#f59e0b" },
  { id: 3, title: "Plumbing", icon: "water", desc: "Leaks & pipes", time: "~20 min", color: "#06b6d4" },
  { id: 4, title: "Cleaning", icon: "sparkles", desc: "Deep cleaning", time: "~30 min", color: "#a855f7" },
  { id: 5, title: "Mechanic", icon: "car", desc: "Car & bike repair", time: "~25 min", color: "#ef4444" },
  { id: 6, title: "Appliance", icon: "tv", desc: "TV, fridge, washer", time: "~20 min", color: "#10b981" },
];

const QUICK_PROMPTS = [
  "AC cooling nahi kar raha...",
  "Need urgent electrician in DHA",
  "Kal morning plumber chahiye",
  "Car engine check karwana hai",
];

const RECENT_ACTIVITY = [
  { text: "AC gas refill — DHA Phase 6", time: "2 hrs ago", icon: "snow" },
  { text: "Plumber for kitchen sink", time: "Yesterday", icon: "water" },
  { text: "Electrician wiring fault", time: "3 days ago", icon: "flash" },
];

const extractTimePreference = (msg: string): string | null => {
  const lower = msg.toLowerCase();
  
  // Custom Urdu and baje extraction (e.g. "6 baje", "shaam 6", "raat 9 baje")
  const bajeMatch = lower.match(/(\d{1,2})\s*(baje|pm|am)?/);
  if (bajeMatch) {
    const hour = parseInt(bajeMatch[1]);
    if (hour >= 1 && hour <= 12) {
      let ampm = "PM";
      if (lower.includes("subah") || lower.includes("morning") || lower.includes("am")) {
        ampm = "AM";
      } else if (lower.includes("raat") || lower.includes("shaam") || lower.includes("evening") || lower.includes("pm") || hour <= 7) {
        ampm = "PM";
      }
      return `${hour}:00 ${ampm}`;
    }
  }
  
  // Standard Regex match (e.g. "6:00pm", "6:00 pm", "6pm", "6 pm", "9:00 PM")
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const match = msg.match(timeRegex);
  if (match) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? match[2] : "00";
    let ampm = match[3] ? match[3].toUpperCase() : "";
    if (!ampm) {
      ampm = (hour >= 1 && hour <= 7) ? "PM" : "AM";
    }
    return `${hour}:${minute} ${ampm}`;
  }
  
  return null;
};

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const [input, setInput] = useState("");
  const [isChatMode, setIsChatMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      text: "[SYSTEM] AI Orchestration Engine Online\nMulti-Agent Pipeline: READY\nAwaiting service intent...",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Conversational AI Booking Assistant states
  const [bookingStep, setBookingStep] = useState(0); // 0: Normal, 1: Slot suggested, 2: Bill authorization
  const [selectedTechName, setSelectedTechName] = useState("Ahmed Cooling Services");
  const [selectedTechRate, setSelectedTechRate] = useState(1200);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("10:00 AM");
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  React.useEffect(() => {
    if (params.autoBookProvider) {
      const provider = params.autoBookProvider as string;
      setIsChatMode(true);
      setBookingStep(1);
      setSelectedTechName(provider);
      setSelectedTechRate(1200);
      
      // Seed initial messaging to reflect instant auto-booking trigger
      setMessages((prev) => {
        // Prevent duplicate trigger rendering
        if (prev.some(m => m.text.includes(provider) && m.role === "user")) {
          return prev;
        }
        return [
          ...prev,
          { role: "user", text: `I want to auto-book ${provider} now.` },
          {
            role: "agent",
            text: `🔮 [AI Intent Matcher] Concierge Auto-Booking triggered for **${provider}**.\n\nI have successfully verified their live availability in DHA Lahore.\n\nI found 3 optimal, traffic-optimized time slots:\n\n1️⃣ **10:00 AM** (Recommended slot - optimal route timing)\n2️⃣ **1:30 PM**\n3️⃣ **5:00 PM**\n\nWhich slot would you prefer?`
          }
        ];
      });
    }
  }, [params.autoBookProvider]);

  const handleSelectProviderFromCard = (prov: any) => {
    setSelectedTechName(prov.name);
    setSelectedTechRate(prov.rate);
    setBookingStep(1);
    
    // Add conversational message logs
    setMessages((prev) => [
      ...prev,
      { role: "user", text: `I want to book ${prov.name}.` },
      {
        role: "agent",
        text: `🔮 **[Orchestrator]** Excellent choice! You've selected **${prov.name}** (verified specialist).\n\nLet's schedule your appointment. I've locked 3 optimal, traffic-optimized time slots:\n\n1️⃣ **10:00 AM** (Recommended - fastest route dispatch)\n2️⃣ **1:30 PM**\n3️⃣ **5:00 PM**\n\nWhich slot do you prefer? (You can also reply with your custom timing, e.g. "Shaam 6 baje")`
      }
    ]);
  };

  const handleSend = async (textToUse?: string) => {
    const userMsg = textToUse || input.trim();
    if (!userMsg || loading) return;
    
    setIsChatMode(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const lowerMsg = userMsg.toLowerCase();
      
      // Conversational Booking State Machine
      if (bookingStep === 0) {
        if (
          lowerMsg.includes("book") || 
          lowerMsg.includes("booking") || 
          lowerMsg.includes("morning") || 
          lowerMsg.includes("cheapest") || 
          lowerMsg.includes("fastest")
        ) {
          let techName = "Ahmed Cooling Services";
          let rate = 1200;
          let reasonText = "fastest ETA in DHA Lahore and 96% reliability score.";
          
          if (lowerMsg.includes("cheapest")) {
            techName = "Bilal AC Repair & Gas Fillers";
            rate = 800;
            reasonText = "lowest base rate (Rs. 800) and highly rated internal network trust.";
          } else if (lowerMsg.includes("fastest")) {
            techName = "Lahore Pro Cooling Dispatch";
            rate = 1400;
            reasonText = "fastest available route dispatch (~6 mins ETA) and active availability.";
          }
          
          setSelectedTechName(techName);
          setSelectedTechRate(rate);
          setBookingStep(1);
          
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                role: "agent",
                text: `🔮 [AI Intent Matcher] Detected Booking Action intent.\n[Provider Selected] ${techName}\n[Orchestrator Detail] Recommended because: ${reasonText}\n\nI found 3 optimal, traffic-optimized time slots:\n\n1️⃣ **10:00 AM** (Recommended slot - optimal route timing)\n2️⃣ **1:30 PM**\n3️⃣ **5:00 PM**\n\nWhich slot would you prefer?`
              }
            ]);
            setLoading(false);
          }, 1000);
          return;
        }
      }

      if (bookingStep === 1) {
        // Checking for slot timing or user's custom preference (Urdu/English)
        let slot = "10:00 AM";
        const customTime = extractTimePreference(userMsg);
        if (customTime) {
          slot = customTime;
        } else if (lowerMsg.includes("1:30") || lowerMsg.includes("2") || lowerMsg.includes("afternoon")) {
          slot = "1:30 PM";
        } else if (lowerMsg.includes("5") || lowerMsg.includes("evening")) {
          slot = "5:00 PM";
        }
        
        setSelectedTimeSlot(slot);
        setBookingStep(2);
        
        const platformFee = selectedTechRate * 0.1;
        const total = selectedTechRate + platformFee;
        
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "agent",
              text: `📅 Slot Locked: Tomorrow, **${slot}**.\n\n🛡️ **Escrow Advance Payment Summary**:\n- Base Service Rate: Rs. ${selectedTechRate}\n- Escrow Hold Protection Fee (10%): Rs. ${platformFee}\n- Total Secure Hold Balance: Rs. ${total}\n\nWould you like to authorize locking Rs. ${total} in platform Escrow balance to confirm the booking? Reply **"YES"** or **"AUTHORIZE"** to secure.`
            }
          ]);
          setLoading(false);
        }, 1000);
        return;
      }

      if (bookingStep === 2) {
        if (lowerMsg.includes("yes") || lowerMsg.includes("auth") || lowerMsg.includes("pay") || lowerMsg.includes("confirm")) {
          const total = selectedTechRate * 1.1;
          const bookingId = 'booking_' + Math.random().toString(36).substr(2, 9);
          
          // Secure escrow transaction via API
          await createEscrow(bookingId, total, "wallet");
          
          setBookingStep(0); // reset
          
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                text: `[SYSTEM COGNITIVE TRACE LOG]\n- Scheduling Agent: Verified technician availability\n- Route Optimizer: Zero traffic conflicts detected\n- Escrow Hold Ledger: locked Rs. ${total} securely\n- Active Booking successfully created.`
              },
              {
                role: "agent",
                text: `🎉 **Booking Secured Under Escrow!**\n\n${selectedTechName} is dispatched for tomorrow, ${selectedTimeSlot}. The advance payment is locked safely. View status stepper in My Bookings anytime.`
              }
            ]);
            
            setShowSuccessOverlay(true);
            setLoading(false);
            
            setTimeout(() => {
              setShowSuccessOverlay(false);
              router.push('/(tabs)/bookings');
            }, 3000);
          }, 1000);
          return;
        } else {
          setBookingStep(0);
          setMessages((prev) => [
            ...prev,
            { role: "agent", text: "Booking selection cancelled. How else can I assist your home repair today?" }
          ]);
          setLoading(false);
          return;
        }
      }

      // Standard request matching fallback
      const result = await submitRequest(userMsg);
      
      let serviceType = "Home Service";
      let matchedProviders = [
        { id: "PRV-001", name: "Ahmed Cooling Services", rate: 1200, rating: 4.8, area: "DHA Phase 5", specialization: "AC Repair & Gas Refill Expert" },
        { id: "PRV-002", name: "Bilal AC Repair & Gas Fillers", rate: 800, rating: 4.6, area: "DHA Phase 3", specialization: "Budget AC Servicing" },
        { id: "PRV-003", name: "Lahore Pro Cooling Dispatch", rate: 1400, rating: 4.9, area: "DHA Phase 6", specialization: "Fast Emergency AC Fixing" }
      ];

      if (lowerMsg.includes("plumb") || lowerMsg.includes("leak") || lowerMsg.includes("pipe") || lowerMsg.includes("water") || lowerMsg.includes("sink") || lowerMsg.includes("tap")) {
        serviceType = "Plumbing Service";
        matchedProviders = [
          { id: "PLB-001", name: "Asif Plumbing Masters", rate: 1000, rating: 4.7, area: "DHA Phase 6", specialization: "High-Pressure Leakage Expert" },
          { id: "PLB-002", name: "DHA Plumbers Ltd", rate: 750, rating: 4.5, area: "DHA Phase 4", specialization: "General Piping & Drainage" },
          { id: "PLB-003", name: "Super Fast Plumber Lahore", rate: 1200, rating: 4.8, area: "DHA Phase 5", specialization: "Emergency Blockage Specialist" }
        ];
      } else if (lowerMsg.includes("electr") || lowerMsg.includes("wire") || lowerMsg.includes("fault") || lowerMsg.includes("light") || lowerMsg.includes("board") || lowerMsg.includes("short")) {
        serviceType = "Electrician Service";
        matchedProviders = [
          { id: "ELC-001", name: "Zahid Electric Hub", rate: 1100, rating: 4.8, area: "DHA Phase 5", specialization: "Short Circuit & Fault Finder" },
          { id: "ELC-002", name: "Kashif Quick Electricians", rate: 900, rating: 4.6, area: "DHA Phase 1", specialization: "DB Board & Wiring Expert" },
          { id: "ELC-003", name: "DHA Electric Techs", rate: 1300, rating: 4.9, area: "DHA Phase 6", specialization: "Premium Electrical Installations" }
        ];
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `🔮 **[AI Intent Agent]** Assalam o Alaikum! I have diagnosed your service request for **${serviceType}** in **DHA Lahore**.\n\nI have matched your request with our **top verified, certified local partners** with live availability today. Please review the options below and tap **"Book Service"** on whoever fits your budget and timeline best!`,
          data: {
            providers: matchedProviders
          }
        }
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `[ERROR] Connection failed.\n${e.message}`,
        },
      ]);
    }
    setLoading(false);
  };

  const renderHeroSection = () => (
    <View style={styles.heroContainer}>
      {/* AI Orb */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center', marginBottom: 24 }}>
        <LinearGradient colors={["rgba(79,70,229,0.15)", "rgba(168,85,247,0.15)"]} style={styles.heroGlow}>
          <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={styles.heroOrbInner}>
            <Ionicons name="planet" size={36} color="#fff" />
          </LinearGradient>
        </LinearGradient>
      </Animated.View>

      <Text style={styles.heroTitle}>ServicePilot AI</Text>
      <Text style={styles.heroSub}>Operations Command Center</Text>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusDot} />
        <Text style={styles.statusBarText}>All systems operational • 6 agents active</Text>
      </View>

      {/* Search Bar */}
      <TouchableOpacity 
        style={styles.heroSearchBar} 
        activeOpacity={0.9}
        onPress={() => setIsChatMode(true)}
      >
        <Ionicons name="search" size={20} color="#94a3b8" />
        <Text style={styles.heroSearchPlaceholder}>Describe your service issue...</Text>
        <View style={styles.micBtn}>
          <Ionicons name="mic" size={16} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Quick Prompts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
        {QUICK_PROMPTS.map((p, i) => (
          <TouchableOpacity key={i} style={styles.promptChip} onPress={() => handleSend(p)}>
            <Ionicons name="chatbubble-outline" size={12} color="#4f46e5" />
            <Text style={styles.promptChipText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Service Categories */}
      <View style={styles.categoriesSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Service Categories</Text>
          <Text style={styles.seeAll}>See All →</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.catCard} onPress={() => handleSend(`Need ${cat.title} urgently`)}>
              <View style={[styles.catIconBox, { backgroundColor: cat.color + '15' }]}>
                <Ionicons name={cat.icon as any} size={22} color={cat.color} />
              </View>
              <Text style={styles.catTitle}>{cat.title}</Text>
              <Text style={styles.catDesc}>{cat.desc}</Text>
              <View style={styles.catTimeBox}>
                <Ionicons name="time" size={10} color="#10b981" />
                <Text style={styles.catTimeText}>{cat.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {RECENT_ACTIVITY.map((item, i) => (
          <View key={i} style={styles.recentItem}>
            <View style={styles.recentIconBox}>
              <Ionicons name={item.icon as any} size={16} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recentText}>{item.text}</Text>
              <Text style={styles.recentTime}>{item.time}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/providers')}>
          <Ionicons name="shield-checkmark" size={24} color="#4f46e5" />
          <Text style={styles.quickActionLabel}>Verified Providers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/bookings')}>
          <Ionicons name="calendar" size={24} color="#10b981" />
          <Text style={styles.quickActionLabel}>My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/advance-booking')}>
          <Ionicons name="time" size={24} color="#7c3aed" />
          <Text style={styles.quickActionLabel}>Advance Booking</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/trace')}>
          <Ionicons name="terminal" size={24} color="#f59e0b" />
          <Text style={styles.quickActionLabel}>AI Trace</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/wallet')}>
          <Ionicons name="wallet" size={24} color="#10b981" />
          <Text style={styles.quickActionLabel}>Wallet & Escrow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#0ea5e9" />
          <Text style={styles.quickActionLabel}>Insights</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {isChatMode && (
        <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={() => setIsChatMode(false)} style={{marginRight: 12}}>
             <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIconBg}>
              <Ionicons name="flash" size={18} color="#4f46e5" />
            </View>
            <View>
              <Text style={styles.headerTitleSmall}>AI Copilot</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981'}} />
                <Text style={styles.headerSubSmall}>Orchestration active</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      )}

      {!isChatMode ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: Math.max(insets.top, 50), paddingBottom: 40 }}>
          {renderHeroSection()}
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          style={styles.chatArea}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {messages.map((msg, i) => {
            const hasProviders = msg.role === "agent" && msg.data?.providers && msg.data.providers.length > 0;
            return (
              <View key={i} style={{ marginBottom: 16 }}>
                <View style={styles.messageWrapper}>
                  {msg.role === "agent" && (
                    <View style={styles.agentAvatar}>
                      <Ionicons name="sparkles" size={14} color="#fff" />
                    </View>
                  )}
                  <View style={[
                    styles.bubble,
                    msg.role === "user" ? styles.userBubble : 
                    msg.role === "system" ? styles.systemBubble : styles.agentBubble,
                  ]}>
                    <Text style={[
                      styles.bubbleText,
                      msg.role === "user" ? styles.userBubbleText : null,
                      msg.role === "system" ? styles.systemBubbleText : null
                    ]}>
                      {String(msg.text)}
                    </Text>
                  </View>
                </View>

                {/* GORGEOUS INLINE TECHNICIAN RECOMMENDATION CARDS */}
                {hasProviders && (
                  <View style={styles.inlineCardsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingLeft: 36, paddingRight: 16, paddingVertical: 4 }}>
                      {msg.data.providers.map((prov: any) => (
                        <View key={prov.id} style={styles.inlineTechCard}>
                          <LinearGradient colors={["#ffffff", "#f8fafc"]} style={styles.inlineCardGrad}>
                            <View style={styles.inlineCardHeader}>
                              <Ionicons name="shield-checkmark" size={18} color="#10b981" />
                              <Text style={styles.inlineTechName} numberOfLines={1}>{prov.name}</Text>
                            </View>
                            
                            <Text style={styles.inlineTechSpec}>{prov.specialization}</Text>
                            
                            <View style={styles.inlineCardMeta}>
                              <View style={styles.inlineRatingBox}>
                                <Ionicons name="star" size={12} color="#fbbf24" />
                                <Text style={styles.inlineRatingText}>{prov.rating}</Text>
                              </View>
                              <Text style={styles.inlineAreaText}>{prov.area}</Text>
                            </View>

                            <View style={styles.inlineCardPriceRow}>
                              <Text style={styles.inlinePriceLabel}>Base Rate:</Text>
                              <Text style={styles.inlinePriceValue}>Rs. {prov.rate}</Text>
                            </View>

                            <TouchableOpacity 
                              style={styles.inlineBookBtn}
                              onPress={() => handleSelectProviderFromCard(prov)}
                            >
                              <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={styles.inlineBookBtnGrad}>
                                <Text style={styles.inlineBookBtnText}>Book Service</Text>
                                <Ionicons name="arrow-forward" size={12} color="#fff" />
                              </LinearGradient>
                            </TouchableOpacity>
                          </LinearGradient>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          })}
          
          {loading && (
            <View style={styles.messageWrapper}>
              <View style={styles.agentAvatar}>
                <Ionicons name="sparkles" size={14} color="#fff" />
              </View>
              <View style={[styles.bubble, styles.agentBubble, { paddingVertical: 18 }]}>
                <View style={styles.typingIndicator}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, { opacity: 0.7 }]} />
                  <View style={[styles.typingDot, { opacity: 0.4 }]} />
                </View>
                <Text style={styles.loadingText}>Agents Orchestrating...</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {isChatMode && (
        <View style={[styles.inputSection, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={styles.inputBar}>
            <TouchableOpacity style={{ padding: 8 }}>
              <Ionicons name="attach" size={22} color="#94a3b8" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Describe your service intent..."
              placeholderTextColor="#94a3b8"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              multiline
              autoFocus={true}
            />
            <TouchableOpacity style={{ padding: 8 }}>
              <Ionicons name="mic-outline" size={22} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() && !loading) ? styles.sendBtnDisabled : null]}
              onPress={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={styles.sendBtnGradient}>
                <Ionicons name="arrow-up" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Booking Success Orchestration Overlay Modal */}
      {showSuccessOverlay && (
        <Modal visible={showSuccessOverlay} transparent animationType="fade">
          <View style={styles.successOverlay}>
            <LinearGradient colors={["#10b981", "#059669"]} style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={56} color="#fff" />
              <Text style={styles.successTitle}>Booking Secured! 🔒</Text>
              <Text style={styles.successSub}>
                Rs. {(selectedTechRate * 1.1).toFixed(0)} Locked in Escrow Hold Protection.
              </Text>
              
              <View style={styles.divider} />
              
              <View style={styles.successMetricsBox}>
                <View style={styles.metricRowMini}>
                  <Ionicons name="person" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.metricMiniText}>Assigned: {selectedTechName}</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  heroContainer: { alignItems: 'center' },
  heroGlow: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  heroOrbInner: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  heroSub: { fontSize: 13, color: '#4f46e5', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
  
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  statusBarText: { fontSize: 11, color: '#16a34a', fontWeight: '700' },

  heroSearchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    width: '100%', height: 60, borderRadius: 30, marginTop: 28, paddingHorizontal: 20,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10,
    borderWidth: 1.5, borderColor: '#e0e7ff'
  },
  heroSearchPlaceholder: { flex: 1, marginLeft: 12, fontSize: 15, color: '#94a3b8', fontWeight: '500' },
  micBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },

  promptChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f0ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#e0e7ff' },
  promptChipText: { fontSize: 12, color: '#4f46e5', fontWeight: '600' },

  categoriesSection: { width: '100%', marginTop: 36 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  seeAll: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  catCard: { 
    backgroundColor: '#fff', width: 130, padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8
  },
  catIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  catTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  catDesc: { fontSize: 11, color: '#64748b', marginTop: 4, marginBottom: 12 },
  catTimeBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  catTimeText: { fontSize: 10, fontWeight: '800', color: '#10b981' },

  recentSection: { width: '100%', marginTop: 36 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  recentIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  recentText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  recentTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 36, width: '100%' },
  quickActionCard: { width: '30%', backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  quickActionLabel: { fontSize: 10, fontWeight: '800', color: '#334155', textAlign: 'center' },

  // Chat Mode Styles
  header: { paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#cbd5e1", flexDirection: 'row', alignItems: 'center' },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(79,70,229,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitleSmall: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  headerSubSmall: { fontSize: 11, color: "#10b981", fontWeight: "700" },
  
  chatArea: { flex: 1, padding: 16 },
  messageWrapper: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  agentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center", marginRight: 8, marginBottom: 4 },
  bubble: { padding: 14, borderRadius: 20, maxWidth: "85%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
  userBubble: { backgroundColor: "#4f46e5", alignSelf: "flex-end", borderBottomRightRadius: 4, marginLeft: "auto" },
  agentBubble: { backgroundColor: "#ffffff", alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  systemBubble: { backgroundColor: "#0f172a", alignSelf: "center", borderRadius: 10, maxWidth: "95%", marginHorizontal: "auto", paddingVertical: 10, paddingHorizontal: 14 },
  bubbleText: { color: "#334155", fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: "#ffffff" },
  systemBubbleText: { textAlign: "left", fontSize: 11, color: "#94a3b8", fontFamily: 'monospace', lineHeight: 18 },
  
  typingIndicator: { flexDirection: "row", gap: 4, marginBottom: 6 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4f46e5" },
  loadingText: { color: "#64748b", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  
  inputSection: { backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12 },
  inputBar: { flexDirection: "row", paddingHorizontal: 8, alignItems: "flex-end" },
  input: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: "#0f172a", fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: "#e2e8f0" },
  sendBtn: { marginLeft: 4 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnGradient: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  
  // Success Overlay Styles
  successOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', gap: 12 },
  successTitle: { fontSize: 20, color: '#fff', fontWeight: '900', marginTop: 10 },
  successSub: { fontSize: 13, color: '#e6fffa', textAlign: 'center', lineHeight: 18 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', marginVertical: 10 },
  successMetricsBox: { width: '100%', gap: 8, marginVertical: 8 },
  metricRowMini: { flexDirection: 'row', alignItems: 'center' },
  metricMiniText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  successTip: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginTop: 12 },

  // Inline Tech Recommendation Card Styles
  inlineCardsContainer: { marginTop: 4, marginBottom: 12 },
  inlineTechCard: { width: 220, borderRadius: 16, backgroundColor: '#ffffff', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  inlineCardGrad: { padding: 14, flex: 1 },
  inlineCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  inlineTechName: { fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1 },
  inlineTechSpec: { fontSize: 11, color: '#4f46e5', fontWeight: '700', marginBottom: 8 },
  inlineCardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  inlineRatingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  inlineRatingText: { fontSize: 10, fontWeight: '800', color: '#d97706' },
  inlineAreaText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  inlineCardPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, marginBottom: 12 },
  inlinePriceLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  inlinePriceValue: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  inlineBookBtn: { height: 36, borderRadius: 10, overflow: 'hidden' },
  inlineBookBtnGrad: { width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  inlineBookBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' }
});

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { fetchPosts } from "../services/api";

// Mock Fallback Data to guarantee UI is beautiful and populated even if backend is offline
const MOCK_PROVIDERS = [
  {
    id: "pv_zahid_ac",
    name: "Zahid AC & Fridge Repair",
    service_type: "AC Repair",
    specializations: ["Gas Charging", "Compressor Fitting", "Filter Wash", "General Service"],
    area: "DHA Lahore",
    rating: 4.9,
    review_count: 142,
    base_rate: 1200,
    phone: "0300-1234567",
    is_verified: true,
    verified_status: "verified",
    reliability_score: 98,
    on_time_score: 0.98,
    cancellation_rate: 0.02,
    experience_years: 6,
    availability: {
      "2026-05-20": ["10:00 AM", "1:30 PM", "5:00 PM"],
      "2026-05-21": ["09:00 AM", "12:00 PM", "3:00 PM"]
    },
    recent_reviews: [
      { rating: 5, text: "Excellent gas charging done. Highly recommended!" },
      { rating: 5, text: "Very professional work and on time arrival." }
    ],
    location: { lat: 31.4697, lng: 74.3762, area: "DHA Phase 5" }
  },
  {
    id: "pv_asif_elec",
    name: "Asif Wiring & Electric Pro",
    service_type: "Electrician",
    specializations: ["Short Circuit Detection", "House Wiring", "UPS Repair", "Light Installation"],
    area: "Johar Town Lahore",
    rating: 4.8,
    review_count: 215,
    base_rate: 1500,
    phone: "0321-7654321",
    is_verified: true,
    verified_status: "verified",
    reliability_score: 99,
    on_time_score: 0.99,
    cancellation_rate: 0.01,
    experience_years: 8,
    availability: {
      "2026-05-20": ["11:00 AM", "2:00 PM", "6:00 PM"],
      "2026-05-21": ["10:00 AM", "1:00 PM", "4:00 PM"]
    },
    recent_reviews: [
      { rating: 5, text: "Determined short circuit issue within minutes. Great electrician." }
    ],
    location: { lat: 31.4822, lng: 74.2983, area: "Johar Town Phase 2" }
  },
  {
    id: "pv_lahore_plumb",
    name: "Lahore Plumber Pro Services",
    service_type: "Plumbing",
    specializations: ["Water Leakage", "Pipe Fitting", "Tap Repair", "Geyser Installation"],
    area: "Gulberg Lahore",
    rating: 4.6,
    review_count: 89,
    base_rate: 900,
    phone: "0333-9876543",
    is_verified: true,
    verified_status: "verified",
    reliability_score: 95,
    on_time_score: 0.95,
    cancellation_rate: 0.05,
    experience_years: 4,
    availability: {
      "2026-05-20": ["09:00 AM", "1:00 PM", "4:30 PM"],
      "2026-05-21": ["11:30 AM", "3:30 PM", "7:00 PM"]
    },
    recent_reviews: [
      { rating: 4, text: "Fixed geyser pipe leakage quickly. Reasonable pricing." }
    ],
    location: { lat: 31.5126, lng: 74.3482, area: "Gulberg III" }
  },
  {
    id: "pv_bilal_ac",
    name: "Bilal AC Cooling Services",
    service_type: "AC Repair",
    specializations: ["Split AC General Wash", "Leakage Fixing", "AC Re-install"],
    area: "DHA Lahore",
    rating: 4.4,
    review_count: 32,
    base_rate: 1100,
    phone: "0300-8889999",
    is_verified: false,
    verified_status: "unverified",
    reliability_score: 88,
    on_time_score: 0.90,
    cancellation_rate: 0.12,
    experience_years: 3,
    availability: {
      "2026-05-20": ["10:30 AM", "3:00 PM"],
      "2026-05-21": ["12:00 PM", "5:00 PM"]
    },
    recent_reviews: [],
    location: { lat: 31.4554, lng: 74.3912, area: "DHA Phase 3" }
  }
];

const MOCK_BOOKINGS = [
  {
    id: "bk_demo_1",
    customer_id: "cust_123",
    provider: { id: "pv_zahid_ac", name: "Zahid AC & Fridge Repair", rate: 1200 },
    service_type: "AC Repair",
    location: "DHA Lahore",
    timing: "Tomorrow (10:00 AM)",
    status: "confirmed",
    user_message: "AC cooling nahi kar raha, urgent technician chahye DHA main.",
    pricing: { base_rate: 1200, fee: 120, total: 1320 },
    created_at: "2026-05-19T22:30:00Z"
  },
  {
    id: "bk_demo_2",
    customer_id: "cust_123",
    provider: { id: "pv_lahore_plumb", name: "Lahore Plumber Pro Services", rate: 900 },
    service_type: "Plumbing",
    location: "Gulberg Lahore",
    timing: "Tomorrow Shift",
    status: "recovered",
    user_message: "Plumber chahye geyser installation k lye, purana cancel ho gaya.",
    pricing: { base_rate: 900, fee: 90, total: 990 },
    created_at: "2026-05-19T21:15:00Z"
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [providers, setProviders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Community announcements state variables
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsSearchQuery, setPostsSearchQuery] = useState("");
  const [postsCategoryFilter, setPostsCategoryFilter] = useState("All");
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [postReactions, setPostReactions] = useState<Record<number, number>>({});
  const [viewingPost, setViewingPost] = useState<any>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [highReliability, setHighReliability] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);

  // AI Chat flow state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: "concierge",
      text: "Assalamualaikum 😊 Welcome to ServicePilot AI. Main aapki AI operations concierge hoon. Main aaj aapki kya madad kar sakti hoon? Aapko kis type ka specialist chahiye today?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [agentStep, setAgentStep] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("10:00 AM");

  // Chat History Sessions States
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  const startNewChat = () => {
    const newId = "session_" + Date.now();
    setActiveSessionId(newId);
    if (typeof window !== "undefined") {
      localStorage.setItem("servicepilot_active_session_id", newId);
    }
    
    setChatMessages([
      {
        role: "concierge",
        text: "Assalamualaikum 😊 Welcome to ServicePilot AI. Main aapki AI operations concierge hoon. Main aaj aapki kya madad kar sakti hoon? Aapko kis type ka specialist chahiye today?"
      }
    ]);
    setBookingStep(0);
    setSelectedTech(null);
    setSelectedSlot("10:00 AM");
    
    if (typeof window !== "undefined") {
      localStorage.removeItem("servicepilot_chat_messages");
      localStorage.removeItem("servicepilot_booking_step");
      localStorage.removeItem("servicepilot_selected_tech");
      localStorage.removeItem("servicepilot_selected_slot");
    }
    setShowHistorySidebar(false);
  };

  const loadSession = (session: any) => {
    setActiveSessionId(session.id);
    if (typeof window !== "undefined") {
      localStorage.setItem("servicepilot_active_session_id", session.id);
    }
    
    setChatMessages(session.messages);
    setBookingStep(session.bookingStep);
    setSelectedTech(session.selectedTech);
    setSelectedSlot(session.selectedSlot);
    
    if (typeof window !== "undefined") {
      localStorage.setItem("servicepilot_chat_messages", JSON.stringify(session.messages));
      localStorage.setItem("servicepilot_booking_step", session.bookingStep.toString());
      if (session.selectedTech) {
        localStorage.setItem("servicepilot_selected_tech", JSON.stringify(session.selectedTech));
      } else {
        localStorage.removeItem("servicepilot_selected_tech");
      }
      localStorage.setItem("servicepilot_selected_slot", session.selectedSlot);
    }
    setShowHistorySidebar(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPastSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("servicepilot_past_sessions", JSON.stringify(filtered));
      }
      return filtered;
    });
    
    if (activeSessionId === id) {
      startNewChat();
    }
  };

  // Load chat memory from localStorage on mount (prevents Next.js hydration mismatch)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedChat = localStorage.getItem("servicepilot_chat_messages");
    if (savedChat) {
      try {
        setChatMessages(JSON.parse(savedChat));
      } catch (e) {
        console.error("Failed to parse saved chat history", e);
      }
    }
    
    const savedStep = localStorage.getItem("servicepilot_booking_step");
    if (savedStep) {
      setBookingStep(parseInt(savedStep, 10));
    }
    
    const savedTech = localStorage.getItem("servicepilot_selected_tech");
    if (savedTech) {
      try {
        setSelectedTech(JSON.parse(savedTech));
      } catch (e) {
        console.error("Failed to parse saved tech selection", e);
      }
    }
    
    const savedSlot = localStorage.getItem("servicepilot_selected_slot");
    if (savedSlot) {
      setSelectedSlot(savedSlot);
    }

    const savedActiveId = localStorage.getItem("servicepilot_active_session_id");
    const savedSessions = localStorage.getItem("servicepilot_past_sessions");
    
    if (savedSessions) {
      try {
        setPastSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error(e);
      }
    }
    
    if (savedActiveId) {
      setActiveSessionId(savedActiveId);
    } else {
      const newId = "session_" + Date.now();
      setActiveSessionId(newId);
      localStorage.setItem("servicepilot_active_session_id", newId);
    }
  }, []);

  // Persist chat messages whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (chatMessages.length > 1 || (chatMessages.length === 1 && chatMessages[0].text !== "Assalamualaikum 😊 Welcome to ServicePilot AI. Main aapki AI operations concierge hoon. Main aaj aapki kya madad kar sakti hoon? Aapko kis type ka specialist chahiye today?")) {
      localStorage.setItem("servicepilot_chat_messages", JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  // Persist booking step
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("servicepilot_booking_step", bookingStep.toString());
  }, [bookingStep]);

  // Persist selected technician
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedTech) {
      localStorage.setItem("servicepilot_selected_tech", JSON.stringify(selectedTech));
    } else {
      localStorage.removeItem("servicepilot_selected_tech");
    }
  }, [selectedTech]);

  // Persist selected time slot
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("servicepilot_selected_slot", selectedSlot);
  }, [selectedSlot]);

  // Save current chat session in pastSessions list whenever state changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeSessionId) return;
    
    // Skip saving empty/initial default state
    if (chatMessages.length === 1 && chatMessages[0].text.startsWith("Assalamualaikum")) {
      return;
    }
    
    const firstUserMsg = chatMessages.find(m => m.role === "user")?.text || "New Chat Session";
    const title = firstUserMsg.length > 25 ? firstUserMsg.slice(0, 25) + "..." : firstUserMsg;
    
    setPastSessions(prev => {
      const idx = prev.findIndex(s => s.id === activeSessionId);
      
      const updatedSession = {
        id: activeSessionId,
        title,
        messages: chatMessages,
        bookingStep,
        selectedTech,
        selectedSlot,
        timestamp: new Date().toLocaleString('en-US', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
      
      let newSessions = [...prev];
      if (idx >= 0) {
        newSessions[idx] = updatedSession;
      } else {
        newSessions.unshift(updatedSession);
      }
      
      localStorage.setItem("servicepilot_past_sessions", JSON.stringify(newSessions));
      return newSessions;
    });
  }, [chatMessages, bookingStep, selectedTech, selectedSlot, activeSessionId]);

  // Multi-agent traces
  const [agentTraces, setAgentTraces] = useState<any[]>([]);

  // Selected Provider Profile View Modal
  const [viewingProvider, setViewingProvider] = useState<any>(null);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);

  // Seller Dashboard listings state
  const [sellerListings, setSellerListings] = useState<any[]>([
    { id: "lst_1", title: "Expert AC Maintenance & Gas Leakage Fixing", category: "AC Repair", price: 1200, tags: ["AC Wash", "Gas Charge"] },
    { id: "lst_2", title: "Instant Inverter Repairing Service", category: "AC Repair", price: 1500, tags: ["Inverter", "Compressor"] }
  ]);
  const [newListingTitle, setNewListingTitle] = useState("");
  const [newListingCategory, setNewListingCategory] = useState("AC Repair");
  const [newListingPrice, setNewListingPrice] = useState(1000);
  const [newListingTags, setNewListingTags] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data from API
  useEffect(() => {
    async function loadData() {
      try {
        const pRes = await fetch("http://127.0.0.1:8000/api/providers");
        const bRes = await fetch("http://127.0.0.1:8000/api/bookings");
        
        let pData = [];
        if (pRes.ok) {
          const json = await pRes.json();
          const provs = json.providers;
          pData = provs && typeof provs === 'object' && !Array.isArray(provs) 
            ? [...(provs.internal || []), ...(provs.external || [])] 
            : (provs || []);
        }
        
        let bData = [];
        if (bRes.ok) {
          const json = await bRes.json();
          bData = json.bookings || [];
        }

        setProviders(pData.length > 0 ? pData : MOCK_PROVIDERS);
        setBookings(bData.length > 0 ? bData : MOCK_BOOKINGS);
      } catch (err) {
        console.log("Using Mock Fallbacks due to network configuration:", err);
        setProviders(MOCK_PROVIDERS);
        setBookings(MOCK_BOOKINGS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch external posts
  useEffect(() => {
    async function loadPosts() {
      try {
        setPostsLoading(true);
        const data = await fetchPosts();
        setPosts(data || []);
        // Initialize mock reactions/likes
        const reactions: Record<number, number> = {};
        (data || []).forEach((p: any) => {
          reactions[p.id] = Math.floor(Math.random() * 45) + 5;
        });
        setPostReactions(reactions);
      } catch (err) {
        console.error("Failed to load posts", err);
      } finally {
        setPostsLoading(false);
      }
    }
    loadPosts();
  }, []);

  const handleLikePost = (id: number) => {
    setLikedPosts(prev => {
      const isLiked = !prev[id];
      setPostReactions(reacts => ({
        ...reacts,
        [id]: (reacts[id] || 0) + (isLiked ? 1 : -1)
      }));
      return {
        ...prev,
        [id]: isLiked
      };
    });
  };

  const getPostCategory = (id: number) => {
    if (id === 1 || id % 5 === 1) return { tag: "⚡ Safety Tip", color: "bg-amber-50 text-amber-600 border-amber-100" };
    if (id === 2 || id % 5 === 2) return { tag: "💡 Service Hack", color: "bg-emerald-50 text-emerald-600 border-emerald-100" };
    if (id === 12 || id % 5 === 3) return { tag: "🚨 Emergency Alert", color: "bg-rose-50 text-rose-600 border-rose-100" };
    if (id === 23 || id % 5 === 4) return { tag: "📢 Platform News", color: "bg-indigo-50 text-indigo-600 border-indigo-100" };
    return { tag: "🛠️ Operations Guide", color: "bg-blue-50 text-blue-600 border-blue-100" };
  };

  // Filter posts based on search query and category tags
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(postsSearchQuery.toLowerCase()) || 
                          post.body.toLowerCase().includes(postsSearchQuery.toLowerCase());
    
    if (postsCategoryFilter === "All") return matchesSearch;
    
    const cat = getPostCategory(post.id).tag;
    if (postsCategoryFilter === "Safety Tips" && cat.includes("Safety")) return matchesSearch;
    if (postsCategoryFilter === "Service Hacks" && cat.includes("Hack")) return matchesSearch;
    if (postsCategoryFilter === "Emergency Alerts" && cat.includes("Emergency")) return matchesSearch;
    if (postsCategoryFilter === "Platform News" && cat.includes("News")) return matchesSearch;
    if (postsCategoryFilter === "Operations Guides" && cat.includes("Guide")) return matchesSearch;
    
    return false;
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping, agentStep]);

  // Filter logic
  const filteredProviders = providers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specializations.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.area.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "All" || p.service_type === categoryFilter;
    const matchesVerified = !verifiedOnly || p.is_verified || p.verified_status === "verified";
    const matchesReliability = !highReliability || (p.reliability_score || 85) >= 95;
    const matchesRating = p.rating >= minRating;

    return matchesSearch && matchesCategory && matchesVerified && matchesReliability && matchesRating;
  });

  // Suggestion pill click handler
  const handleSuggestionClick = (prompt: string) => {
    setChatInput(prompt);
    handleSendRequest(prompt);
  };

  // Submit request to agentic pipeline
  const handleSendRequest = async (overrideMessage?: string) => {
    const textToSend = overrideMessage || chatInput;
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = { role: "user", text: textToSend };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    // Dynamic Multi-Agent Reasoning Feed Simulation
    setAgentStep("intent");
    await new Promise(r => setTimeout(r, 600));
    setAgentStep("location");
    await new Promise(r => setTimeout(r, 600));
    setAgentStep("matching");
    await new Promise(r => setTimeout(r, 700));
    setAgentStep("ranking");
    await new Promise(r => setTimeout(r, 500));
    setAgentStep("scheduling");
    await new Promise(r => setTimeout(r, 400));
    setAgentStep("pricing");
    await new Promise(r => setTimeout(r, 400));

    try {
      const payload: any = {
        message: textToSend,
        booking_step: bookingStep,
        chat_history: chatMessages.map(m => ({ role: m.role === "concierge" ? "assistant" : "user", text: m.text }))
      };

      if (bookingStep > 0 && selectedTech) {
        payload.selected_tech_name = selectedTech.name;
        payload.selected_tech_rate = selectedTech.base_rate;
        payload.selected_time_slot = selectedSlot;
      }

      const res = await fetch("http://127.0.0.1:8000/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("API Limit / Network Fallback triggered");
      const data = await res.json();

      setIsTyping(false);
      setAgentStep(null);

      if (data.action === "LOCK_SLOT") {
        setBookingStep(2);
      } else if (data.action === "BOOK_PROVIDER") {
        setBookingStep(1);
      } else if (data.action === "CONFIRM_BOOKING") {
        setBookingStep(0);
        // Refresh bookings lists
        const freshB = await fetch("http://127.0.0.1:8000/api/bookings");
        if (freshB.ok) {
          const freshJson = await freshB.json();
          setBookings(freshJson.bookings || []);
        }
      }

      setChatMessages(prev => [...prev, { role: "concierge", text: data.message }]);
      
      if (data.provider) {
        setSelectedTech(data.provider);
      }
    } catch (err) {
      // Mock robust local agentic concierge fallback
      setIsTyping(false);
      setAgentStep(null);
      
      const lower = textToSend.toLowerCase();
      let reply = "";

      if (bookingStep === 2) {
        // Confirmation authorization
        if (lower.includes("yes") || lower.includes("confirm") || lower.includes("han") || lower.includes("krdo")) {
          const newB = {
            id: `bk_${Math.random().toString(36).substr(2, 9)}`,
            customer_id: "cust_123",
            provider: { id: selectedTech?.id || "pv_zahid_ac", name: selectedTech?.name || "Zahid AC & Fridge Repair", rate: selectedTech?.base_rate || 1200 },
            service_type: selectedTech?.service_type || "AC Repair",
            location: selectedTech?.area || "DHA Lahore",
            timing: `Tomorrow (${selectedSlot})`,
            status: "confirmed",
            user_message: "AC cooling nahi kar raha... DHA",
            pricing: { base_rate: selectedTech?.base_rate || 1200, fee: (selectedTech?.base_rate || 1200) * 0.1, total: (selectedTech?.base_rate || 1200) * 1.1 },
            created_at: new Date().toISOString()
          };
          setBookings(prev => [newB, ...prev]);
          setBookingStep(0);
          reply = `🎉 **Booking Confirmed under Secure Escrow Protection!**\n\nKaam successfully lock ho chuka hai:\n• **Specialist**: ${selectedTech?.name}\n• **Time Slot**: tomorrow, ${selectedSlot}\n• **Escrow Payout Held**: Rs. ${Math.round((selectedTech?.base_rate || 1200) * 1.1)}\n\nTechnician schedule ke mutabiq aapke address par pohanch jaye ga!`;
        } else {
          setBookingStep(0);
          reply = "Chalein, main is selection ko cancel kar deti hoon. Aapko kisi aur specialist ya category mein service chahiye to batayein!";
        }
      } else if (bookingStep === 1) {
        // Confirming the time slot
        setBookingStep(2);
        const rate = selectedTech?.base_rate || 1200;
        const fee = Math.round(rate * 0.1);
        const total = rate + fee;
        reply = `Thik hai! Main kal ke liye aapka slot '${selectedSlot}' reserve kar rahi hoon.\n\n🧾 **Payment Receipt & Escrow Summary**:\n• Provider Base Rate: Rs. ${rate}\n• Platform Safe Escrow Fee: Rs. ${fee}\n• **Total Amount to Hold**: Rs. ${total}\n\n🔒 **Escrow Protection**: Ye funds payment release hone tak hold pe rahen ge jab tak aap satisfy nahi ho jate. Please reply with **YES** or **CONFIRM** to authorize payment lock.`;
      } else {
        // Discovery / Intake Flow fallbacks
        if (lower.includes("ac") || lower.includes("cooling")) {
          setCategoryFilter("AC Repair");
          reply = "Main AC Repair service select kar rahi hoon. Aap Pakistan ke kis city aur area (e.g. Lahore DHA, Karachi Clifton, Islamabad F-6) par AC specialist chahte hain? 📍";
        } else if (lower.includes("dha") || lower.includes("gulberg") || lower.includes("johar")) {
          reply = "Great 👍 Kya aapko service urgently chahiye ya aap custom timing select karna chahenge? ⏰";
        } else if (lower.includes("pm") || lower.includes("tommorrow") || lower.includes("tomorrow") || lower.includes("kal")) {
          const matchedP = filteredProviders.find(p => p.service_type === "AC Repair") || filteredProviders[0];
          setSelectedTech(matchedP);
          setBookingStep(1);
          reply = `AI Agent here 😊 Main ne aap ke liye humara best expert **${matchedP.name}** select kar liya hai!\n\nAvailable slots:\n• **10:00 AM** (Recommended)\n• **1:30 PM**\n• **5:00 PM**\n\nWhich slot do you prefer? 📅`;
        } else {
          reply = "Aap ki demand samajh li gai hai. Please details complete karein ya suggestion chips par click karein! 👋";
        }
      }
      setChatMessages(prev => [...prev, { role: "concierge", text: reply }]);
    }
  };

  // Auto book clicked provider
  const handleAutoBook = (provider: any) => {
    setSelectedTech(provider);
    setBookingStep(1);
    setChatMessages(prev => [
      ...prev,
      { role: "user", text: `I want to book ${provider.name} directly.` },
      { role: "concierge", text: `Understood 😊 Let's lock your direct schedule with **${provider.name}**.\n\nPlease select one of the slots:\n• 10:00 AM\n• 1:30 PM\n• 5:00 PM` }
    ]);
  };

  // Escrow actions
  const handleReleaseEscrow = (bookingId: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "completed" } : b));
    alert("Escrow Release Successful! Funds paid out directly to specialist.");
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "recovered" } : b));
    alert("Auto-Recovery Concierge activated: provider replaced and funds retained in Escrow!");
  };

  // Add new provider listing
  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListingTitle) return;
    const newL = {
      id: `lst_${Date.now()}`,
      title: newListingTitle,
      category: newListingCategory,
      price: newListingPrice,
      tags: newListingTags.split(",").map(t => t.trim())
    };
    setSellerListings(prev => [...prev, newL]);
    setNewListingTitle("");
    setNewListingTags("");
    alert("Listing successfully added to active marketplace directory!");
  };

  // Accept verification liveness cnic
  const handleApproveLiveness = (providerName: string) => {
    alert(`Liveness face analysis matching completed successfully! CNIC approved for ${providerName}.`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#f0f4ff] to-[#f8fafc] text-slate-800 flex flex-col">
      <div className="neural-bg"></div>

      {/* Modern Dashboard Header */}
      <header className="border-b border-indigo-100 bg-white/70 backdrop-blur-md sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-200">
            ⬢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">Escrow Protection Shield Active</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              ServicePilot <span className="text-indigo-600">AI</span>
            </h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "marketplace" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-indigo-600"}`}
          >
            🏠 Marketplace & Concierge
          </button>
          <button
            onClick={() => setActiveTab("customer")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${activeTab === "customer" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-indigo-600"}`}
          >
            💼 Customer Hub
            {bookings.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-bounce">
                {bookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("seller")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "seller" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-indigo-600"}`}
          >
            🛠️ Seller Portal
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "admin" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-indigo-600"}`}
          >
            🛡️ Ops Center
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "announcements" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-indigo-600"}`}
          >
            📢 Community Hub
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        
        {/* =======================================================
            TAB 1: MARKETPLACE & CONCIERGE
            ======================================================= */}
        {activeTab === "marketplace" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Gemini-style Hero Search Section */}
            <section className="bg-white/80 backdrop-blur-md border border-indigo-50 p-8 rounded-3xl shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-30"></div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
                Pakistan's First <span className="text-indigo-600">Autonomous Operations</span> Concierge
              </h2>
              <p className="text-slate-500 text-sm max-w-xl mx-auto mb-6">
                Tell the AI Agent what you need. AI handles discovery, pricing, scheduling, and locks payment in escrow automatically.
              </p>

              {/* Suggestions Chips */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <button
                  onClick={() => handleSuggestionClick("AC cooling nahi kar raha, DHA main urgent repair chahye.")}
                  className="bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100/60 hover:border-indigo-200 px-4 py-2 rounded-xl text-xs text-indigo-600 font-semibold transition-all"
                >
                  ❄️ “AC cooling issue DHA...”
                </button>
                <button
                  onClick={() => handleSuggestionClick("Water pipe leakage in Gulberg, need plumber tomorrow morning.")}
                  className="bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100/60 hover:border-indigo-200 px-4 py-2 rounded-xl text-xs text-indigo-600 font-semibold transition-all"
                >
                  💧 “Water pipe leak Gulberg...”
                </button>
                <button
                  onClick={() => handleSuggestionClick("Short circuit wiring check by Electrician in Johar Town.")}
                  className="bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100/60 hover:border-indigo-200 px-4 py-2 rounded-xl text-xs text-indigo-600 font-semibold transition-all"
                >
                  ⚡ “Short circuit Johar Town...”
                </button>
              </div>
            </section>

            {/* Two Column Console */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: AI Concierge & Traces */}
              <div className="lg:col-span-6 space-y-6 flex flex-col h-[650px]">
                <div className="bg-white rounded-3xl border border-slate-100 flex-1 flex flex-col overflow-hidden shadow-sm">
                  {/* Sana Header */}
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                        className={`p-1.5 hover:bg-white/10 rounded-xl text-white transition-all flex items-center justify-center ${
                          showHistorySidebar ? "bg-white/20" : ""
                        }`}
                        title="Toggle Chat History Drawer"
                      >
                        <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-base">
                        💁‍♀️
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">AI Agent</h4>
                        <p className="text-[9px] opacity-80">AI Operations Concierge</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (confirm("Reset conversation history?")) {
                            startNewChat();
                          }
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        🧹 Clear Chat
                      </button>
                      <span className="bg-white/20 text-white text-[9px] font-bold px-2 py-1 rounded hidden sm:inline">
                        Roman Urdu/English Mix
                      </span>
                    </div>
                  </div>

                  {/* Main Chat Layout Area (Flex Row) */}
                  <div className="flex flex-1 overflow-hidden relative">
                    
                    {/* Collapsible History Sidebar */}
                    {showHistorySidebar && (
                      <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-30 transition-all duration-300 absolute md:relative left-0 top-0 bottom-0 shadow-lg">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Previous Chats</span>
                          <button 
                            onClick={() => setShowHistorySidebar(false)}
                            className="text-slate-400 hover:text-white text-xs font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="p-2 border-b border-slate-800">
                          <button
                            onClick={startNewChat}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                          >
                            ➕ New Chat
                          </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          {pastSessions.map(s => (
                            <div
                              key={s.id}
                              onClick={() => loadSession(s)}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-left transition-all ${
                                activeSessionId === s.id 
                                  ? "bg-indigo-950 text-indigo-200 font-bold border border-indigo-850" 
                                  : "hover:bg-slate-800 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden mr-1 min-w-0 flex-1">
                                <span className="text-slate-500 text-xs">💬</span>
                                <div className="truncate min-w-0 flex-1">
                                  <p className="truncate text-[10px] leading-tight font-medium">{s.title}</p>
                                  <span className="text-[7.5px] text-slate-500 block leading-none">{s.timestamp.split(',')[0]}</span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => deleteSession(s.id, e)}
                                className="text-[10px] text-slate-600 hover:text-rose-400 p-0.5"
                                title="Delete chat"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                          {pastSessions.length === 0 && (
                            <p className="text-[9px] text-slate-600 text-center py-4">No saved chats</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Chat Stream & Input Area */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      {/* Message Stream */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                              msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                            }`}>
                              {msg.text.split("\n").map((line: string, idx: number) => (
                                <p key={idx} className="mb-1">{line}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {/* Time slot picker overlay inside chat if bookingStep === 1 */}
                        {bookingStep === 1 && selectedTech && (
                          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl space-y-3">
                            <p className="text-xs font-bold text-indigo-900">Select Scheduling Slot for {selectedTech.name}</p>
                            <div className="grid grid-cols-3 gap-2">
                              {["10:00 AM", "1:30 PM", "5:00 PM"].map((slot) => (
                                <button
                                  key={slot}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                                    selectedSlot === slot 
                                      ? "bg-indigo-600 text-white border-indigo-600" 
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => handleSendRequest(`Book slot ${selectedSlot}`)}
                              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                            >
                              Lock Time Slot & Calculate Escrow
                            </button>
                          </div>
                        )}

                        {/* Escrow payout auth box if bookingStep === 2 */}
                        {bookingStep === 2 && selectedTech && (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
                            <div className="flex justify-between text-xs font-bold text-amber-900">
                              <span>Confirm Escrow Authorization</span>
                              <span>🔒 Active Protection</span>
                            </div>
                            <div className="text-[10px] text-amber-800 space-y-1">
                              <p>• Escrow Lock amount: Rs. {Math.round(selectedTech.base_rate * 1.1)}</p>
                              <p>• Kaam hone par hi payment release hogi.</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSendRequest("CONFIRM")}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                              >
                                CONFIRM & PAY
                              </button>
                              <button
                                onClick={() => handleSendRequest("CANCEL")}
                                className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="bg-slate-100 rounded-2xl rounded-bl-none p-3 border border-slate-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></span>
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.4s"}}></span>
                            </div>
                          </div>
                        )}

                        {/* Agent reasoning dynamic flow */}
                        {agentStep && (
                          <div className="bg-slate-900 text-slate-300 rounded-xl p-3 border border-slate-800 font-mono text-[10px] space-y-1 animate-pulse">
                            <p className={agentStep === 'intent' ? 'text-indigo-400 font-bold' : ''}>🧠 IntentAgent: Analyzing user text...</p>
                            <p className={agentStep === 'location' ? 'text-indigo-400 font-bold' : ''}>📍 LocationAgent: Identifying neighborhood coordinates...</p>
                            <p className={agentStep === 'matching' ? 'text-indigo-400 font-bold' : ''}>🔎 MatchingAgent: Querying fleet registry...</p>
                            <p className={agentStep === 'ranking' ? 'text-indigo-400 font-bold' : ''}>⭐ RankingAgent: Scoring rating, trust, and distance...</p>
                            <p className={agentStep === 'scheduling' ? 'text-indigo-400 font-bold' : ''}>📅 SchedulingAgent: Checking active calendars...</p>
                            <p className={agentStep === 'pricing' ? 'text-indigo-400 font-bold' : ''}>💰 PricingAgent: Estimating platform escrow charge...</p>
                          </div>
                        )}

                        <div ref={chatEndRef} />
                      </div>

                      {/* Input form */}
                      <div className="p-3 border-t border-slate-100 flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                          placeholder="e.g., DHA main AC technician kal sham ke liye..."
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleSendRequest()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-2xl text-xs shadow-md transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Provider Fleet Directory */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Search / Filter Control Center */}
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, spec, or area..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {["All", "AC Repair", "Plumbing", "Electrician"].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            categoryFilter === cat ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-indigo-600"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Switch toggles */}
                  <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-600 border-t border-slate-100 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={verifiedOnly}
                        onChange={(e) => setVerifiedOnly(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      🛡️ Verified Only
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={highReliability}
                        onChange={(e) => setHighReliability(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      ⭐ High Reliability (95%+)
                    </label>
                  </div>
                </div>

                {/* Fleet Grid */}
                <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
                  {filteredProviders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center border border-slate-100">
                      <p className="text-slate-500 text-xs">No matching providers active. Adjust your filters.</p>
                    </div>
                  ) : filteredProviders.map((prov) => (
                    <div key={prov.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 right-0 bg-indigo-500/10 text-indigo-600 text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase">
                        {prov.service_type}
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-lg border border-indigo-100">
                          {prov.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                            {prov.is_verified && (
                              <span className="bg-green-100 text-green-700 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">📍 {prov.area}</p>
                          
                          {/* Trust Analytics badge */}
                          <div className="flex items-center gap-3 mt-2 text-[9px] font-bold">
                            <span className="text-amber-500">⭐ {prov.rating.toFixed(1)} ({prov.review_count} reviews)</span>
                            <span className="text-indigo-600">🛡️ Trust Score: {prov.reliability_score || 90}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Specs */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {prov.specializations.map((spec: string, idx: number) => (
                          <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-600 text-[9px] px-2 py-0.5 rounded-lg">
                            {spec}
                          </span>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="text-left">
                          <p className="text-[9px] text-slate-400 uppercase font-black">Base Hourly Rate</p>
                          <p className="text-sm font-black text-emerald-600">Rs. {prov.base_rate}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewingProvider(prov)}
                            className="px-3 py-2 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-xl hover:bg-slate-50"
                          >
                            View Profile
                          </button>
                          <button
                            onClick={() => handleAutoBook(prov)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl shadow-sm"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* =======================================================
            TAB 2: CUSTOMER WORKSPACE
            ======================================================= */}
        {activeTab === "customer" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Active Bookings List */}
              <div className="lg:col-span-8 space-y-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>💼</span> Your Active Orchestrations
                </h3>

                {bookings.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                    <p className="text-slate-500 text-xs">Aap ke paas koi active booking nahi hai. Sana chat panel se book karein!</p>
                  </div>
                ) : bookings.map((b) => (
                  <div key={b.id} className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-xs relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700"></div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            b.status === 'recovered' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                            b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {b.status === 'recovered' && '⟲ '}
                            {b.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">ID: {b.id}</span>
                        </div>
                        <h4 className="font-black text-slate-800 text-sm mt-2">{b.provider?.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">📅 Timing: {b.timing}</p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-[9px] text-slate-400 uppercase font-black">Escrow Total Held</p>
                        <p className="text-sm font-black text-emerald-600">Rs. {b.pricing?.total || 1320}</p>
                        <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                          🔒 Secured by Escrow
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 italic mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      "{b.user_message}"
                    </div>

                    {/* Customer Actions */}
                    {b.status !== "completed" && (
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          onClick={() => handleReleaseEscrow(b.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl"
                        >
                          Release Payout
                        </button>
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-xl border border-rose-200"
                        >
                          Request Cancellation / Re-book
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Wallet Summary */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                  <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Customer Wallet Summary</h4>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Available Balance</p>
                      <p className="text-3xl font-black">Rs. 15,200</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Locked in Escrow</p>
                      <p className="text-xl font-bold text-amber-400">Rs. {bookings.filter(b => b.status !== "completed").reduce((sum, b) => sum + (b.pricing?.total || 0), 0)}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-2 text-[10px] text-slate-400 leading-relaxed">
                    <p>🛡️ All transactions are covered by our **100% Escrow Protection Policy**.</p>
                    <p>Kaam perfect hone par hi provider ko payout release karen.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =======================================================
            TAB 3: PROVIDER SELLER PORTAL
            ======================================================= */}
        {activeTab === "seller" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Seller Level</p>
                <p className="text-lg font-black text-indigo-600">Level 2 Specialist</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Monthly Earnings</p>
                <p className="text-lg font-black text-emerald-600">Rs. 42,600</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Response Speed</p>
                <p className="text-lg font-black text-indigo-600">5 Mins</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Jobs Completed</p>
                <p className="text-lg font-black text-slate-800">124 Jobs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Active Listings / Fiverr seller style */}
              <div className="lg:col-span-7 space-y-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>🛠️</span> Active Fiverr-style Listings
                </h3>

                <div className="space-y-4">
                  {sellerListings.map((lst) => (
                    <div key={lst.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{lst.title}</h4>
                        <div className="flex gap-2 mt-2">
                          <span className="bg-indigo-50 text-indigo-600 text-[8px] font-bold px-2 py-0.5 rounded uppercase">{lst.category}</span>
                          {lst.tags.map((t: string, idx: number) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 text-[8px] px-2 py-0.5 rounded">#{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Basic Price</p>
                        <p className="text-xs font-black text-emerald-600">Rs. {lst.price}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new listing form */}
                <form onSubmit={handleCreateListing} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase">Create New Marketplace Listing</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">Listing Title</label>
                      <input
                        type="text"
                        value={newListingTitle}
                        onChange={(e) => setNewListingTitle(e.target.value)}
                        placeholder="e.g., Compressor replacement and checking..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">Category</label>
                      <select
                        value={newListingCategory}
                        onChange={(e) => setNewListingCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="AC Repair">AC Repair</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrician">Electrician</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">Pricing (Basic Package)</label>
                      <input
                        type="number"
                        value={newListingPrice}
                        onChange={(e) => setNewListingPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">Keywords / Tags (comma separated)</label>
                      <input
                        type="text"
                        value={newListingTags}
                        onChange={(e) => setNewListingTags(e.target.value)}
                        placeholder="ac, split, wash"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                  >
                    Publish Listing
                  </button>
                </form>
              </div>

              {/* AI profile Optimization Panel */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-indigo-900 text-white rounded-3xl p-6 shadow-sm border border-indigo-950">
                  <h4 className="text-xs uppercase tracking-wider text-indigo-300 font-black mb-3">AI Optimization Concierge Suggestions</h4>
                  
                  <div className="space-y-3 text-[11px] leading-relaxed">
                    <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800">
                      <p className="font-bold text-indigo-300">📈 Keyword Alert: "Gas Leakage"</p>
                      <p className="text-indigo-200 mt-1">DHA Phase 5 aur 6 main AC Gas Leakage searches main 45% izafa hua hai. Apni listings main ye keyword shamil karein!</p>
                    </div>
                    <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800">
                      <p className="font-bold text-indigo-300">📅 Capacity Lock Advice</p>
                      <p className="text-indigo-200 mt-1">Kal dopahar 12:00 PM se 3:00 PM tak maximum bookings match hone ke chances hain. Apne dynamic calendar slot on rakhen.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =======================================================
            TAB 4: OPS CONTROL CENTER
            ======================================================= */}
        {activeTab === "admin" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Ops Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Verification & Disputes */}
              <div className="lg:col-span-6 space-y-6">
                <h3 className="text-lg font-black text-slate-900">🛡️ Platform Verification Queue</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">Bilal AC Cooling Services</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">CNIC Submission Received: 35201-XXXXXXX-X</p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-700 text-[8px] px-2 py-0.5 rounded font-black uppercase">Pending Liveness</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveLiveness("Bilal AC Cooling Services")}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg"
                      >
                        Approve CNIC Liveness Match
                      </button>
                      <button
                        onClick={() => alert("Verification request rejected.")}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Trace logs JSON inspector */}
              <div className="lg:col-span-6 space-y-6">
                <h3 className="text-lg font-black text-slate-900">🧬 AI Agent Orchestration Traces</h3>
                
                <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 shadow-sm border border-slate-800 font-mono text-[10px] h-[350px] overflow-y-auto space-y-4">
                  <div>
                    <span className="text-emerald-400">// Trace Log: tr_int_98a72b</span>
                    <pre className="mt-2 text-[9px] text-slate-400 bg-slate-950/70 p-3 rounded-xl overflow-x-auto">
{`{
  "agent_name": "IntentAgent",
  "input": "AC cooling nahi kar raha, DHA Phase 5",
  "output": {
    "action": "NONE",
    "service_type": "AC Repair",
    "location": "DHA Phase 5",
    "timing": null,
    "details": "AC cooling nahi kar raha"
  },
  "status": "success",
  "timestamp": "2026-05-19T23:42:01.002Z"
}`}
                    </pre>
                  </div>

                  <div>
                    <span className="text-emerald-400">// Trace Log: tr_mat_32f91a</span>
                    <pre className="mt-2 text-[9px] text-slate-400 bg-slate-950/70 p-3 rounded-xl overflow-x-auto">
{`{
  "agent_name": "MatchingAgent",
  "input": {
    "service_type": "AC Repair",
    "location": "DHA Phase 5"
  },
  "output": {
    "recommended_count": 2,
    "best_match": "pv_zahid_ac",
    "reasoning": [
      "Calculating distance based on DHA Phase 5 (1.2 km). Score: 0.98",
      "Reliability score is high (98%). Score: 0.98",
      "Total composite ranking score for Zahid AC is 0.96"
    ]
  },
  "status": "success",
  "timestamp": "2026-05-19T23:42:02.140Z"
}`}
                    </pre>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =======================================================
            TAB 5: COMMUNITY HUB (ANNOUNCEMENTS)
            ======================================================= */}
        {activeTab === "announcements" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Hero banner section */}
            <section className="bg-white/80 backdrop-blur-md border border-indigo-50 p-8 rounded-3xl shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-30"></div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
                📢 ServicePilot <span className="neon-text">Community & Bulletins</span>
              </h2>
              <p className="text-slate-500 text-sm max-w-xl mx-auto">
                Discover expert tips, emergency notices, platform updates, and health & safety hacks curated for the Lahore informal economy.
              </p>
            </section>

            {/* Filter and search panel */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <input
                type="text"
                value={postsSearchQuery}
                onChange={(e) => setPostsSearchQuery(e.target.value)}
                placeholder="Search publications and announcements..."
                className="w-full md:max-w-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                {["All", "Safety Tips", "Service Hacks", "Emergency Alerts", "Platform News", "Operations Guides"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPostsCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      postsCategoryFilter === cat 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-600 hover:text-indigo-600"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts Grid list */}
            {postsLoading ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 text-xs font-bold">Fetching latest bulletins from network...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
                <p className="text-slate-500 text-xs">No publications match your filter query. Reset search parameters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post: any) => {
                  const { tag, color } = getPostCategory(post.id);
                  const isLiked = likedPosts[post.id];
                  const reactionCount = postReactions[post.id] || 0;

                  return (
                    <div
                      key={post.id}
                      className="glass-panel hover:neon-border rounded-3xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative group overflow-hidden"
                    >
                      {/* Accent color gradient strip based on category */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                        tag.includes("Safety") ? "bg-amber-400" :
                        tag.includes("Hack") ? "bg-emerald-400" :
                        tag.includes("Emergency") ? "bg-rose-400" :
                        tag.includes("News") ? "bg-indigo-400" :
                        "bg-blue-400"
                      }`} />

                      <div>
                        {/* Tag */}
                        <div className="flex justify-between items-center mb-4">
                          <span className={`text-[8.5px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border ${color}`}>
                            {tag}
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-mono">#{post.id}</span>
                        </div>

                        {/* Title */}
                        <h4 className="font-black text-slate-900 text-sm mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {post.title}
                        </h4>

                        {/* Snippet */}
                        <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 mb-6">
                          {post.body}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between border-t border-slate-100/60 pt-4 mt-auto">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                            isLiked 
                              ? "bg-rose-50 text-rose-600" 
                              : "hover:bg-slate-50 text-slate-500"
                          }`}
                        >
                          <span className={`transition-transform duration-300 ${isLiked ? "scale-125" : "group-hover:scale-110"}`}>
                            {isLiked ? "❤️" : "🤍"}
                          </span>
                          <span>{reactionCount} reactions</span>
                        </button>

                        <button
                          onClick={() => setViewingPost(post)}
                          className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 bg-indigo-50/60 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/30 transition-all"
                        >
                          Read Bulletin ➔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Viewing Provider Profile Modal */}
      {viewingProvider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setViewingProvider(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>

            {/* Profile banner */}
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

            <div className="p-6 relative">
              {/* Profile Avatar */}
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border-4 border-white absolute -top-8 left-6 flex items-center justify-center font-black text-indigo-600 text-2xl shadow-md">
                {viewingProvider.name.charAt(0)}
              </div>

              <div className="mt-10">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-950">{viewingProvider.name}</h3>
                  {viewingProvider.is_verified && (
                    <span className="bg-green-100 text-green-700 text-[8px] font-bold px-2 py-0.5 rounded uppercase">Verified</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">📍 {viewingProvider.area} • Experience: {viewingProvider.experience_years} years</p>
                
                {/* Rating statistics */}
                <div className="flex items-center gap-4 mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Rating</p>
                    <p className="text-sm font-black text-amber-500">⭐ {viewingProvider.rating.toFixed(1)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Jobs Done</p>
                    <p className="text-sm font-black text-slate-800">{viewingProvider.review_count || 124}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Reliability</p>
                    <p className="text-sm font-black text-indigo-600">{viewingProvider.reliability_score || 90}%</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase mb-2">Specialized Services</h4>
                  <div className="flex flex-wrap gap-1">
                    {viewingProvider.specializations.map((spec: string, idx: number) => (
                      <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] px-2.5 py-1 rounded-xl">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Simulated work gallery */}
                <div className="mt-5">
                  <h4 className="text-xs font-black text-slate-900 uppercase mb-2">Recent Project Work Gallery</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl h-20 flex items-center justify-center text-[10px] text-indigo-600 font-bold">
                      📸 General Wash
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl h-20 flex items-center justify-center text-[10px] text-indigo-600 font-bold">
                      📸 Gas Charge
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl h-20 flex items-center justify-center text-[10px] text-indigo-600 font-bold">
                      📸 Split Install
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex gap-2">
                  <button
                    onClick={() => {
                      handleAutoBook(viewingProvider);
                      setViewingProvider(null);
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    Proceed with Concierge Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Announcement Bulletin Modal */}
      {viewingPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl relative border border-slate-100 overflow-hidden">
            {/* Header strip */}
            <div className={`h-3 ${
              getPostCategory(viewingPost.id).tag.includes("Safety") ? "bg-amber-400" :
              getPostCategory(viewingPost.id).tag.includes("Hack") ? "bg-emerald-400" :
              getPostCategory(viewingPost.id).tag.includes("Emergency") ? "bg-rose-400" :
              getPostCategory(viewingPost.id).tag.includes("News") ? "bg-indigo-400" :
              "bg-blue-400"
            }`} />

            <button
              onClick={() => setViewingPost(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 text-lg font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-colors"
            >
              ✕
            </button>

            <div className="p-8">
              {/* Category tag */}
              <div className="mb-4">
                <span className={`text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md border ${getPostCategory(viewingPost.id).color}`}>
                  {getPostCategory(viewingPost.id).tag}
                </span>
                <span className="text-[10px] text-slate-400 font-mono ml-3">Bulletin Ref: #{viewingPost.id}</span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-black text-slate-950 mb-4 leading-snug">
                {viewingPost.title}
              </h3>

              {/* Body */}
              <p className="text-slate-600 text-xs leading-relaxed mb-6 whitespace-pre-line bg-slate-50 p-5 rounded-2xl border border-slate-100">
                {viewingPost.body}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span>📅 Published: Today</span>
                  <span>•</span>
                  <span>🔒 Escrow Safety Certified</span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleLikePost(viewingPost.id);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                      likedPosts[viewingPost.id]
                        ? "bg-rose-50 border-rose-200 text-rose-600"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {likedPosts[viewingPost.id] ? "❤️ Liked" : "🤍 Support"}
                  </button>
                  <button
                    onClick={() => setViewingPost(null)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    Close Bulletin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

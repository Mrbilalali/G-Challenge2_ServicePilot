import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, Platform, Linking } from 'react-native';
import { Text } from '@/components/Themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getProviders, createEscrow, createManualBooking } from '@/services/api';
import { useRouter } from 'expo-router';

export default function ProvidersScreen() {
  const [loading, setLoading] = useState(true);
  const [internalProviders, setInternalProviders] = useState<any[]>([]);
  const [externalProviders, setExternalProviders] = useState<any[]>([]);
  const [useLocation, setUseLocation] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [externalOnly, setExternalOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Sort State
  const [sortBy, setSortBy] = useState('recommended'); // recommended, rating, nearest, price_low, experience, speed
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Booking Modal States
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('2026-05-18');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [bookingOnsite, setBookingOnsite] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [notes, setNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Auto-complete suggestion keywords
  const predictiveSuggestions = ["AC Repair", "Plumber", "Electrician", "Cleaning", "Mechanic"];

  useEffect(() => {
    fetchData();
  }, [useLocation]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const simulatedLocation = useLocation ? "Lahore" : undefined;
      const data = await getProviders(simulatedLocation);
      
      if (data.providers) {
        setInternalProviders(data.providers.internal || []);
        setExternalProviders(data.providers.external || []);
      }
    } catch (e) {
      console.log("Error fetching providers:", e);
    }
    setLoading(false);
  };

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(prev => prev.filter(f => f !== id));
    } else {
      setFavorites(prev => [...prev, id]);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone || '+923001234567'}`);
  };

  const handleChat = (provider: any) => {
    const bookingId = 'booking_' + Math.random().toString(36).substr(2, 9);
    router.push({
      pathname: "/chat",
      params: {
        bookingId,
        providerName: provider.name
      }
    });
  };

  const handleViewProfile = (provider: any) => {
    router.push({
      pathname: "/technician",
      params: { data: JSON.stringify(provider) }
    });
  };

  const handleAutoBook = (provider: any) => {
    router.push({
      pathname: "/(tabs)",
      params: { autoBookProvider: provider.name }
    });
  };

  const handleOpenMap = (provider: any) => {
    const lat = provider.lat || provider.location?.lat || 31.5204;
    const lng = provider.lng || provider.location?.lng || 74.3587;
    const label = encodeURIComponent(provider.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    });
    Linking.openURL(url);
  };

  const initiateBooking = (provider: any) => {
    setSelectedProvider(provider);
    setBookingDate('2026-05-18');
    setBookingTime('10:00 AM');
    setBookingOnsite(true);
    setNotes('');
  };

  const handleConfirmBooking = async () => {
    if (!selectedProvider) return;
    setBookingSubmitting(true);
    try {
      const base = selectedProvider.base_rate || 1200;
      const fee = base * 0.1;
      const total = base + fee;
      
      const bookingId = 'booking_' + Math.random().toString(36).substr(2, 9);
      
      // 1. Create booking object in DB
      await createManualBooking({
        id: bookingId,
        provider_id: selectedProvider.id,
        provider_name: selectedProvider.name,
        service_type: selectedProvider.service_type || "General Maintenance",
        amount: base,
        preferred_date: bookingDate,
        preferred_time: bookingTime,
        payment_method: paymentMethod,
        notes: notes,
      });

      // 2. Call secure escrow endpoint
      await createEscrow(bookingId, total, paymentMethod);
      
      Alert.alert(
        "Secure Payment Confirmed 🔒",
        `Rs. ${total} has been held securely in ServicePilot Escrow. Payment will only release to ${selectedProvider.name} after you confirm completion.`,
        [
          { 
            text: "View Booking", 
            onPress: () => {
              setSelectedProvider(null);
              router.push('/(tabs)/bookings'); 
            }
          }
        ]
      );
    } catch (e: any) {
      Alert.alert("Booking Error", e.message || "Failed to secure escrow balance.");
    }
    setBookingSubmitting(false);
  };

  // Advanced Filtering and Sorting logic
  const allProvidersCombined = useMemo(() => {
    const list = [
      ...internalProviders.map(p => ({ ...p, is_external: false })),
      ...externalProviders.map(p => ({ ...p, is_external: true, base_rate: p.base_rate || 800 }))
    ];
    return list;
  }, [internalProviders, externalProviders]);

  const filteredAndSortedList = useMemo(() => {
    let list = [...allProvidersCombined];

    // Search Query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.service_type?.toLowerCase().includes(query) ||
        p.specializations?.some((s: string) => s.toLowerCase().includes(query))
      );
    }

    // Category Filter selection
    if (selectedCategory !== 'All') {
      const cat = selectedCategory.toLowerCase();
      list = list.filter(p => p.service_type?.toLowerCase().includes(cat));
    }

    // Verified Switch
    if (verifiedOnly) {
      list = list.filter(p => p.is_verified);
    }

    // External Switch
    if (externalOnly) {
      list = list.filter(p => p.is_external);
    }

    // Remote Support Switch
    if (remoteOnly) {
      list = list.filter(p => p.remote_available);
    }

    // Ratings Filter
    if (minRating !== null) {
      list = list.filter(p => p.rating >= minRating);
    }

    // Radius Distance Filter
    if (maxDistance !== null) {
      list = list.filter(p => (p.distance_km || 5) <= maxDistance);
    }

    // Budget Filter
    if (maxPrice !== null) {
      list = list.filter(p => p.base_rate <= maxPrice);
    }

    // Sorting operations
    list.sort((a, b) => {
      if (sortBy === 'recommended') {
        const scoreA = a.is_verified ? (a.reliability_score || 90) : (a.trust_score || 70);
        const scoreB = b.is_verified ? (b.reliability_score || 90) : (b.trust_score || 70);
        return scoreB - scoreA;
      }
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'nearest') {
        return (a.distance_km || 99) - (b.distance_km || 99);
      }
      if (sortBy === 'price_low') {
        return (a.base_rate || 9999) - (b.base_rate || 9999);
      }
      if (sortBy === 'experience') {
        return (b.experience_years || 0) - (a.experience_years || 0);
      }
      if (sortBy === 'speed') {
        return (a.response_time_minutes || 99) - (b.response_time_minutes || 99);
      }
      return 0;
    });

    return list;
  }, [allProvidersCombined, searchQuery, selectedCategory, verifiedOnly, externalOnly, remoteOnly, minRating, maxDistance, maxPrice, sortBy]);

  const getSortLabel = () => {
    switch(sortBy) {
      case 'recommended': return '🔥 AI Recommended';
      case 'rating': return '⭐ Highest Rated';
      case 'nearest': return '📍 Nearest First';
      case 'price_low': return '💵 Lowest Price';
      case 'experience': return '💼 Experience Level';
      case 'speed': return '⚡ Fastest Response';
      default: return 'Sort By';
    }
  };

  const renderMarketplaceCard = (p: any, idx: number) => {
    const isSaved = favorites.includes(p.id || p.name);
    const eta = p.is_external ? Math.max(10, Math.round(p.distance_km * 4)) : (p.response_time_minutes || 8);
    const ratingCount = p.review_count || (p.reviews || []).length || 0;

    return (
      <View key={p.id || idx} style={[styles.richCard, p.is_verified && styles.richCardVerified]}>
        
        {/* Cover Gradient/Banner */}
        <TouchableOpacity onPress={() => handleViewProfile(p)} activeOpacity={0.95}>
          <LinearGradient 
            colors={p.is_verified ? ["#4f46e5", "#8b5cf6"] : ["#475569", "#64748b"]} 
            style={styles.cardCover}
          >
            <View style={styles.cardCoverHeader}>
              <View style={[styles.badgePill, p.is_verified ? styles.badgeVerified : styles.badgeExternal]}>
                <Ionicons name={p.is_verified ? "shield-checkmark" : "logo-google"} size={10} color="#fff" />
                <Text style={styles.badgePillText}>
                  {p.is_verified ? "VERIFIED PROVIDER" : "EXTERNAL UNVERIFIED"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggleFavorite(p.id || p.name)} style={styles.favoriteCircle}>
                <Ionicons name={isSaved ? "heart" : "heart-outline"} size={16} color={isSaved ? "#ef4444" : "#64748b"} />
              </TouchableOpacity>
            </View>
            {p.is_verified && (p.reliability_score || 95) >= 95 && (
              <View style={styles.badgeAiRecommend}>
                <Ionicons name="sparkles" size={10} color="#fff" />
                <Text style={styles.badgeAiRecommendText}>AI TOP PICK</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <View style={styles.cardMainInfo}>
            {/* Profile Picture / Initials */}
            <TouchableOpacity onPress={() => handleViewProfile(p)} style={styles.profileAvatarBox}>
              <Text style={styles.profileAvatarText}>{p.avatar_initials || p.name?.charAt(0) || 'T'}</Text>
              {p.is_verified && (
                <View style={styles.avatarVerifiedCheck}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleViewProfile(p)} style={{ flex: 1 }}>
              <Text style={styles.providerCardName}>{p.name}</Text>
              <Text style={styles.categorySubText}>{p.service_type || 'Maintenance'} • {p.area || 'Lahore'}</Text>
              
              <View style={styles.cardStatsRow}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.statScoreText}>{p.rating || 4.7}</Text>
                <Text style={styles.statCountText}>({ratingCount})</Text>
                <Text style={styles.statSpacer}>•</Text>
                <Ionicons name="location-outline" size={12} color="#94a3b8" />
                <Text style={styles.statCountText}>{p.distance_km || 3}km away</Text>
              </View>
            </TouchableOpacity>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardPriceLabel}>Est. Rate</Text>
              <Text style={styles.cardPriceValue}>Rs. {p.base_rate || p.pricing?.total || 1200}</Text>
            </View>
          </View>

          {/* Expanded AI Insight Panel */}
          {p.is_verified && (
            <View style={styles.aiInsightPanel}>
              <Ionicons name="bulb" size={14} color="#4f46e5" />
              <Text style={styles.aiInsightText}>
                AI Insight: {p.reliability_score || 96}% reliability, {p.on_time_score * 100 || 88}% on-time, {p.customer_repeat_rate * 100 || 42}% repeat rate.
              </Text>
            </View>
          )}

          {/* Details Row: Experience, ETA, Remote status */}
          <View style={styles.detailsBadgeRow}>
            <View style={styles.detailsMiniBadge}>
              <Ionicons name="time-outline" size={10} color="#64748b" />
              <Text style={styles.detailsMiniBadgeText}>Response: {eta}m</Text>
            </View>
            {p.experience_years && (
              <View style={styles.detailsMiniBadge}>
                <Ionicons name="briefcase-outline" size={10} color="#64748b" />
                <Text style={styles.detailsMiniBadgeText}>{p.experience_years} Yrs Exp</Text>
              </View>
            )}
            {p.remote_available && (
              <View style={[styles.detailsMiniBadge, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="videocam" size={10} color="#0284c7" />
                <Text style={[styles.detailsMiniBadgeText, { color: '#0284c7' }]}>Remote</Text>
              </View>
            )}
            {!p.is_verified && (
              <View style={[styles.detailsMiniBadge, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="shield-outline" size={10} color="#dc2626" />
                <Text style={[styles.detailsMiniBadgeText, { color: '#dc2626' }]}>Trust: {p.trust_score || 75}/100</Text>
              </View>
            )}
          </View>

          {/* Primary Call-to-Actions */}
          <View style={styles.primaryActionsRow}>
            <TouchableOpacity style={[styles.ctaBtn, styles.ctaBook]} onPress={() => initiateBooking(p)}>
              <Ionicons name="calendar" size={16} color="#fff" />
              <Text style={styles.ctaText}>Book Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.ctaBtn, styles.ctaAutoBook]} onPress={() => handleAutoBook(p)}>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={styles.ctaText}>AI Auto Book</Text>
            </TouchableOpacity>
          </View>

          {/* Secondary Utilities */}
          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity style={styles.utilityBtn} onPress={() => handleChat(p)}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#4f46e5" />
              <Text style={styles.utilityBtnText}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.utilityBtn} onPress={() => handleCall(p.phone)}>
              <Ionicons name="call-outline" size={14} color="#64748b" />
              <Text style={styles.utilityBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.utilityBtn} onPress={() => handleViewProfile(p)}>
              <Ionicons name="person-outline" size={14} color="#64748b" />
              <Text style={styles.utilityBtnText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.utilityBtn} onPress={() => handleOpenMap(p)}>
              <Ionicons name="map-outline" size={14} color="#64748b" />
              <Text style={styles.utilityBtnText}>Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Command Header */}
      <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="planet" size={28} color="#fff" />
            <View>
              <Text style={styles.headerTitle}>ServicePilot Directory</Text>
              <Text style={styles.headerSub}>AI Orchestration Network Center</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.filterMenuBtn} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Global Smart Search Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, skills, category..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Predictive Suggestion Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
          {predictiveSuggestions.map((suggestion, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.suggestionChip, selectedCategory === suggestion && styles.suggestionChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === suggestion ? 'All' : suggestion)}
            >
              <Ionicons name="sparkles" size={10} color={selectedCategory === suggestion ? "#fff" : "#4f46e5"} />
              <Text style={[styles.suggestionChipText, selectedCategory === suggestion && { color: '#fff' }]}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Sorting Control Bar */}
      <View style={styles.sortingControlBar}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortOptions(!showSortOptions)}>
          <Ionicons name="swap-vertical" size={14} color="#4f46e5" />
          <Text style={styles.sortBtnText}>{getSortLabel()}</Text>
          <Ionicons name={showSortOptions ? "chevron-up" : "chevron-down"} size={12} color="#64748b" />
        </TouchableOpacity>

        {/* Quick Toggles */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity 
            style={[styles.quickToggleChip, verifiedOnly && styles.quickToggleChipActive]}
            onPress={() => setVerifiedOnly(!verifiedOnly)}
          >
            <Ionicons name="shield-checkmark" size={10} color={verifiedOnly ? "#fff" : "#3b82f6"} />
            <Text style={[styles.quickToggleText, verifiedOnly && { color: '#fff' }]}>Verified Only</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickToggleChip, remoteOnly && styles.quickToggleChipActive]}
            onPress={() => setRemoteOnly(!remoteOnly)}
          >
            <Ionicons name="videocam" size={10} color={remoteOnly ? "#fff" : "#10b981"} />
            <Text style={[styles.quickToggleText, remoteOnly && { color: '#fff' }]}>Remote</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Options Panel */}
      {showSortOptions && (
        <View style={styles.sortMenu}>
          {[
            { key: 'recommended', label: 'AI Recommended', icon: 'sparkles' },
            { key: 'rating', label: 'Highest Rated', icon: 'star' },
            { key: 'nearest', label: 'Nearest First', icon: 'navigate' },
            { key: 'price_low', label: 'Lowest Price', icon: 'wallet' },
            { key: 'experience', label: 'Experience Level', icon: 'briefcase' },
            { key: 'speed', label: 'Fastest Response', icon: 'flash' }
          ].map(opt => (
            <TouchableOpacity 
              key={opt.key} 
              style={styles.sortMenuItem} 
              onPress={() => { setSortBy(opt.key); setShowSortOptions(false); }}
            >
              <Ionicons name={opt.icon as any} size={16} color={sortBy === opt.key ? "#4f46e5" : "#94a3b8"} />
              <Text style={[styles.sortMenuLabel, sortBy === opt.key && styles.sortMenuLabelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Location Toggle view */}
      <View style={styles.locationBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.locationDot, useLocation ? styles.locationDotActive : null]} />
          <Text style={styles.locationText}>
            {useLocation ? "Lahore Live Matching Active 📍" : "Global Unfiltered View"}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggleBtn, useLocation ? styles.toggleBtnActive : null]} 
          onPress={() => setUseLocation(!useLocation)}
        >
          <Text style={[styles.toggleBtnText, useLocation ? { color: '#fff' } : null]}>
            {useLocation ? "Location Lock On" : "Filter Nearby"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Primary Scrollable List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={{ marginTop: 12, fontWeight: '700', color: '#64748b' }}>Parsing Marketplace Network...</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}>
          {filteredAndSortedList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>No Technicians Match Filters</Text>
              <Text style={styles.emptyStateSub}>Try resetting search filters or expanding your distance range.</Text>
              <TouchableOpacity style={styles.resetBtn} onPress={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setVerifiedOnly(false);
                setExternalOnly(false);
                setRemoteOnly(false);
                setMinRating(null);
                setMaxDistance(null);
                setMaxPrice(null);
              }}>
                <Text style={styles.resetBtnText}>Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAndSortedList.map((p, i) => renderMarketplaceCard(p, i))
          )}
        </ScrollView>
      )}

      {/* ADVANCED FILTER SYSTEM SHEET MODAL */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Search Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* Category selector */}
              <Text style={styles.filterSectionLabel}>Service Category</Text>
              <View style={styles.gridSelectRow}>
                {["All", "AC Repair", "Electrician", "Plumber", "Cleaning"].map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.gridSelectBtn, selectedCategory === cat && styles.gridSelectBtnActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.gridSelectText, selectedCategory === cat && { color: '#fff' }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rating criteria */}
              <Text style={styles.filterSectionLabel}>Minimum Rating</Text>
              <View style={styles.gridSelectRow}>
                {[4.5, 4.0, 3.5].map((stars) => (
                  <TouchableOpacity 
                    key={stars} 
                    style={[styles.gridSelectBtn, minRating === stars && styles.gridSelectBtnActive]}
                    onPress={() => setMinRating(minRating === stars ? null : stars)}
                  >
                    <Ionicons name="star" size={12} color={minRating === stars ? "#fff" : "#fbbf24"} />
                    <Text style={[styles.gridSelectText, minRating === stars && { color: '#fff' }]}>{stars}+ Stars</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Distance radius */}
              <Text style={styles.filterSectionLabel}>Max Distance Radius (km)</Text>
              <View style={styles.gridSelectRow}>
                {[3, 5, 10].map((dist) => (
                  <TouchableOpacity 
                    key={dist} 
                    style={[styles.gridSelectBtn, maxDistance === dist && styles.gridSelectBtnActive]}
                    onPress={() => setMaxDistance(maxDistance === dist ? null : dist)}
                  >
                    <Text style={[styles.gridSelectText, maxDistance === dist && { color: '#fff' }]}>{dist} km</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Budget budget */}
              <Text style={styles.filterSectionLabel}>Max Budget (Rs.)</Text>
              <View style={styles.gridSelectRow}>
                {[800, 1200, 1600].map((price) => (
                  <TouchableOpacity 
                    key={price} 
                    style={[styles.gridSelectBtn, maxPrice === price && styles.gridSelectBtnActive]}
                    onPress={() => setMaxPrice(maxPrice === price ? null : price)}
                  >
                    <Text style={[styles.gridSelectText, maxPrice === price && { color: '#fff' }]}>Under {price}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Multi-toggle criteria */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleRowText}>Only Show Verified Technicians</Text>
                <TouchableOpacity onPress={() => setVerifiedOnly(!verifiedOnly)}>
                  <Ionicons name={verifiedOnly ? "checkbox" : "square-outline"} size={22} color={verifiedOnly ? "#4f46e5" : "#cbd5e1"} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleRowText}>Only Show External Falling Options</Text>
                <TouchableOpacity onPress={() => setExternalOnly(!externalOnly)}>
                  <Ionicons name={externalOnly ? "checkbox" : "square-outline"} size={22} color={externalOnly ? "#4f46e5" : "#cbd5e1"} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleRowText}>Offers Remote Consultation Support</Text>
                <TouchableOpacity onPress={() => setRemoteOnly(!remoteOnly)}>
                  <Ionicons name={remoteOnly ? "checkbox" : "square-outline"} size={22} color={remoteOnly ? "#4f46e5" : "#cbd5e1"} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetFiltersBtnModal} onPress={() => {
                setVerifiedOnly(false);
                setExternalOnly(false);
                setRemoteOnly(false);
                setMinRating(null);
                setMaxDistance(null);
                setMaxPrice(null);
                setSelectedCategory('All');
              }}>
                <Text style={styles.resetFiltersBtnModalText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtnModal} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyBtnModalText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BOOK NOW INTERACTIVE ESCROW BOOKING SHEET */}
      {selectedProvider && (
        <Modal visible={!!selectedProvider} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Secure Escrow Booking</Text>
                  <Text style={styles.modalSubtitle}>Protected under Platform Wallet Hold Guarantee</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedProvider(null)}>
                  <Ionicons name="close" size={24} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                
                {/* Provider Mini Summary */}
                <View style={styles.summaryBox}>
                  <View style={styles.summaryAvatar}>
                    <Text style={styles.summaryAvatarText}>{selectedProvider.name?.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryName}>{selectedProvider.name}</Text>
                    <Text style={styles.summarySub}>{selectedProvider.service_type} • {selectedProvider.area}</Text>
                  </View>
                  <View style={styles.escrowLockedBanner}>
                    <Ionicons name="lock-closed" size={14} color="#16a34a" />
                    <Text style={styles.escrowLockedText}>Escrow Active</Text>
                  </View>
                </View>

                {/* Onsite / Remote Consultation Switch */}
                <Text style={styles.filterSectionLabel}>Service Mode</Text>
                <View style={styles.gridSelectRow}>
                  <TouchableOpacity 
                    style={[styles.gridSelectBtn, bookingOnsite && styles.gridSelectBtnActive]} 
                    onPress={() => setBookingOnsite(true)}
                  >
                    <Ionicons name="home-outline" size={14} color={bookingOnsite ? "#fff" : "#4f46e5"} />
                    <Text style={[styles.gridSelectText, bookingOnsite && { color: '#fff' }]}>Onsite Visit</Text>
                  </TouchableOpacity>
                  {selectedProvider.remote_available && (
                    <TouchableOpacity 
                      style={[styles.gridSelectBtn, !bookingOnsite && styles.gridSelectBtnActive]} 
                      onPress={() => setBookingOnsite(false)}
                    >
                      <Ionicons name="videocam-outline" size={14} color={!bookingOnsite ? "#fff" : "#4f46e5"} />
                      <Text style={[styles.gridSelectText, !bookingOnsite && { color: '#fff' }]}>Remote Support</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Preferred Date Schedule */}
                <Text style={styles.filterSectionLabel}>Select Preferred Date</Text>
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

                {/* Preferred time slot chips */}
                <Text style={styles.filterSectionLabel}>Select Preferred Time Slot</Text>
                <View style={styles.gridSelectRow}>
                  {["09:00 AM", "12:00 PM", "03:00 PM", "06:00 PM"].map((t) => (
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

                {/* Payment Method Selector */}
                <Text style={styles.filterSectionLabel}>Payment Method</Text>
                <View style={styles.gridSelectRow}>
                  <TouchableOpacity 
                    style={[styles.gridSelectBtn, paymentMethod === 'wallet' && styles.gridSelectBtnActive]} 
                    onPress={() => setPaymentMethod('wallet')}
                  >
                    <Ionicons name="wallet-outline" size={14} color={paymentMethod === 'wallet' ? "#fff" : "#4f46e5"} />
                    <Text style={[styles.gridSelectText, paymentMethod === 'wallet' && { color: '#fff' }]}>Wallet Ledger</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridSelectBtn, paymentMethod === 'card' && styles.gridSelectBtnActive]} 
                    onPress={() => setPaymentMethod('card')}
                  >
                    <Ionicons name="card-outline" size={14} color={paymentMethod === 'card' ? "#fff" : "#4f46e5"} />
                    <Text style={[styles.gridSelectText, paymentMethod === 'card' && { color: '#fff' }]}>Credit Card</Text>
                  </TouchableOpacity>
                </View>

                {/* Special directions text box */}
                <Text style={styles.filterSectionLabel}>Detailed Task Instructions</Text>
                <TextInput
                  style={styles.taskNotesInput}
                  placeholder="e.g. Please bring extra piping tool, or standard AC filter change kit..."
                  placeholderTextColor="#94a3b8"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />

                {/* Escrow Guarantee Cost breakdown */}
                <View style={styles.escrowBillBox}>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Advance Technician Fee</Text>
                    <Text style={styles.billValue}>Rs. {selectedProvider.base_rate || 1200}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Escrow Protection Fee (10%)</Text>
                    <Text style={styles.billValue}>Rs. {(selectedProvider.base_rate || 1200) * 0.1}</Text>
                  </View>
                  <View style={[styles.billRow, { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 10, marginTop: 4 }]}>
                    <Text style={[styles.billLabel, { fontWeight: '900', color: '#0f172a' }]}>Held Securely in Escrow</Text>
                    <Text style={[styles.billValue, { fontWeight: '900', color: '#16a34a', fontSize: 16 }]}>
                      Rs. {(selectedProvider.base_rate || 1200) * 1.1}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.resetFiltersBtnModal} onPress={() => setSelectedProvider(null)}>
                  <Text style={styles.resetFiltersBtnModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.applyBtnModal, { backgroundColor: '#10b981' }, bookingSubmitting && { opacity: 0.6 }]} 
                  onPress={handleConfirmBooking}
                  disabled={bookingSubmitting}
                >
                  <Ionicons name="lock-closed" size={16} color="#fff" />
                  <Text style={styles.applyBtnModalText}>
                    {bookingSubmitting ? 'Securing hold...' : 'Confirm Escrow Booking'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingBottom: 20, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 11, color: "#cbd5e1", fontWeight: "700" },
  filterMenuBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },

  searchBarBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, height: 48, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: '#0f172a', fontWeight: '600' },

  suggestionScroll: { gap: 8, marginTop: 14 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f1f5f9' },
  suggestionChipActive: { backgroundColor: '#4f46e5' },
  suggestionChipText: { fontSize: 10, fontWeight: '800', color: '#4f46e5' },

  sortingControlBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  sortBtnText: { fontSize: 11, fontWeight: '800', color: '#4f46e5' },
  
  quickToggleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  quickToggleChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  quickToggleText: { fontSize: 10, fontWeight: '800', color: '#64748b' },

  sortMenu: { position: 'absolute', top: 164, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', zIndex: 100, padding: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  sortMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8 },
  sortMenuLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  sortMenuLabelActive: { color: '#4f46e5', fontWeight: '800' },

  locationBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  locationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1', marginRight: 8 },
  locationDotActive: { backgroundColor: '#10b981', shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  locationText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  toggleBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  toggleBtnText: { fontSize: 10, fontWeight: '800', color: '#64748b' },

  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },

  richCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, overflow: 'hidden', marginBottom: 16 },
  richCardVerified: { borderColor: '#c7d2fe', borderWidth: 1.5 },
  
  cardCover: { height: 48, justifyContent: 'center', paddingHorizontal: 16, position: 'relative' },
  cardCoverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeVerified: { backgroundColor: '#1d4ed8' },
  badgeExternal: { backgroundColor: '#f97316' },
  badgePillText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  
  favoriteCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  badgeAiRecommend: { position: 'absolute', bottom: -10, right: 16, backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeAiRecommendText: { color: '#fff', fontSize: 8, fontWeight: '900' },

  cardBody: { padding: 16 },
  cardMainInfo: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  profileAvatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarVerifiedCheck: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  profileAvatarText: { fontSize: 18, fontWeight: '900', color: '#4f46e5' },
  providerCardName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  categorySubText: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 1 },
  
  cardStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statScoreText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  statCountText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  statSpacer: { fontSize: 11, color: '#cbd5e1', marginHorizontal: 2 },
  
  cardPriceLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' },
  cardPriceValue: { fontSize: 16, fontWeight: '900', color: '#10b981', marginTop: 2 },

  aiInsightPanel: { flexDirection: 'row', gap: 6, backgroundColor: '#f5f3ff', padding: 10, borderRadius: 10, marginTop: 12, alignItems: 'flex-start' },
  aiInsightText: { fontSize: 11, color: '#4f46e5', fontWeight: '600', flex: 1, lineHeight: 15 },

  detailsBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  detailsMiniBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  detailsMiniBadgeText: { fontSize: 9, fontWeight: '800', color: '#64748b' },

  primaryActionsRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 14, 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    paddingTop: 12 
  },
  ctaBtn: { 
    flex: 1, 
    height: 40, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6 
  },
  ctaBook: { 
    backgroundColor: '#10b981' 
  },
  ctaAutoBook: { 
    backgroundColor: '#8b5cf6' 
  },
  ctaText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '900' 
  },
  secondaryActionsRow: { 
    flexDirection: 'row', 
    gap: 6, 
    marginTop: 8, 
    justifyContent: 'space-between' 
  },
  utilityBtn: { 
    flex: 1, 
    height: 34, 
    borderRadius: 10, 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 3 
  },
  utilityBtnText: { 
    color: '#64748b', 
    fontSize: 10, 
    fontWeight: '800' 
  },

  // Modal styles
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

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  toggleRowText: { fontSize: 13, fontWeight: '800', color: '#334155' },

  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  resetFiltersBtnModal: { flex: 0.4, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  resetFiltersBtnModalText: { color: '#475569', fontSize: 13, fontWeight: '800' },
  applyBtnModal: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#4f46e5', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  applyBtnModalText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Booking summary elements
  summaryBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#e0e7ff', marginBottom: 6 },
  summaryAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  summaryAvatarText: { fontSize: 16, fontWeight: '900', color: '#4f46e5' },
  summaryName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  summarySub: { fontSize: 11, color: '#4f46e5', marginTop: 1, fontWeight: '700' },
  escrowLockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  escrowLockedText: { fontSize: 9, fontWeight: '900', color: '#065f46' },

  taskNotesInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', backgroundColor: '#f8fafc', height: 72, textAlignVertical: 'top', marginTop: 6 },
  
  escrowBillBox: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  billValue: { fontSize: 12, color: '#0f172a', fontWeight: '800' },

  emptyState: { alignItems: 'center', padding: 32, gap: 10, marginTop: 60 },
  emptyStateTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  emptyStateSub: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  resetBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 10 },
  resetBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

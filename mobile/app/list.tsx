import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, Linking, TextInput, Modal, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProviderListScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  let result: any = null;
  try {
    if (params.data) result = JSON.parse(params.data as string);
  } catch (e) {}

  if (!result || !result.booking) {
    return (
      <View style={styles.container}>
        <Text style={{textAlign: 'center', marginTop: 100, color: '#64748b'}}>No providers found.</Text>
      </View>
    );
  }

  const b = result.booking;
  const isExternal = b.provider?.is_external === true;
  
  const initialProviders = useMemo(() => {
    return isExternal 
      ? [b.provider, ...(b.alternatives || [])]
      : [
          { ...b.provider, pricing: b.pricing, isTopPick: true },
          ...(b.alternatives || []).map((alt: any) => ({ ...alt, isTopPick: false }))
        ];
  }, [b, isExternal]);

  // States for Search, Filter, Sort
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recommended'); // recommended, rating, nearest, price_low, experience, response
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Advanced Filter Modal States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert("Error", "No phone number listed.");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleProviderPress = (providerData: any) => {
    // Navigate to Technician Profile
    router.push({
      pathname: "/technician",
      params: { data: JSON.stringify(providerData) }
    });
  };

  const handleBookNow = (provider: any) => {
    const bookingId = b.id || 'booking_' + Math.random().toString(36).substr(2, 9);
    const amount = provider.pricing?.total || provider.base_rate || 1200;
    router.push({
      pathname: "/escrow",
      params: {
        bookingId,
        amount: amount.toString(),
        providerName: provider.name
      }
    });
  };

  const handleChat = (provider: any) => {
    const bookingId = b.id || 'booking_' + Math.random().toString(36).substr(2, 9);
    router.push({
      pathname: "/chat",
      params: {
        bookingId,
        providerName: provider.name
      }
    });
  };

  const handleAutoBook = (provider: any) => {
    router.push({
      pathname: "/(tabs)",
      params: { autoBookProvider: provider.name }
    });
  };

  const handleViewLocation = (provider: any) => {
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

  // Filter & Sort Logic
  const processedProviders = useMemo(() => {
    let filtered = [...initialProviders];

    // Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.service_type?.toLowerCase().includes(q) || 
        p.specializations?.some((s: string) => s.toLowerCase().includes(q))
      );
    }

    // Verified Toggle
    if (verifiedOnly) {
      filtered = filtered.filter(p => p.is_verified);
    }

    // Remote Support Toggle
    if (remoteOnly) {
      filtered = filtered.filter(p => p.remote_available);
    }

    // Min Rating
    if (minRating !== null) {
      filtered = filtered.filter(p => p.rating >= minRating);
    }

    // Max Distance
    if (maxDistance !== null) {
      filtered = filtered.filter(p => p.distance_km <= maxDistance);
    }

    // Max Price
    if (maxPrice !== null) {
      filtered = filtered.filter(p => {
        const cost = p.pricing?.total || p.base_rate || 0;
        return cost <= maxPrice;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'recommended') {
        // AI score priority
        const scoreA = a.isTopPick ? 1000 : (a.match_score || a.trust_score || 50);
        const scoreB = b.isTopPick ? 1000 : (b.match_score || b.trust_score || 50);
        return scoreB - scoreA;
      }
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'nearest') {
        return (a.distance_km || 99) - (b.distance_km || 99);
      }
      if (sortBy === 'price_low') {
        const priceA = a.pricing?.total || a.base_rate || 99999;
        const priceB = b.pricing?.total || b.base_rate || 99999;
        return priceA - priceB;
      }
      if (sortBy === 'experience') {
        return (b.experience_years || 0) - (a.experience_years || 0);
      }
      if (sortBy === 'response') {
        return (a.response_time_minutes || 99) - (b.response_time_minutes || 99);
      }
      return 0;
    });

    return filtered;
  }, [initialProviders, search, sortBy, verifiedOnly, remoteOnly, minRating, maxDistance, maxPrice]);

  const openProviders = processedProviders.filter((p: any) => p.is_open_now !== false);
  const closedProviders = processedProviders.filter((p: any) => p.is_open_now === false);

  const getSortLabel = () => {
    switch(sortBy) {
      case 'recommended': return 'AI Recommended';
      case 'rating': return 'Highest Rated';
      case 'nearest': return 'Nearest First';
      case 'price_low': return 'Lowest Price';
      case 'experience': return 'Experience Level';
      case 'response': return 'Fastest Response';
      default: return 'Sort By';
    }
  };

  const renderProviderCard = (p: any, idx: number) => (
    <View key={idx} style={[styles.card, p.isTopPick && styles.topCard, p.is_open_now === false && styles.closedCard]}>
      {p.isTopPick && !p.is_external && (
        <View style={styles.topBadge}>
          <Ionicons name="sparkles" size={12} color="#fff" style={{marginRight: 4}} />
          <Text style={styles.topBadgeText}>AI RECOMMENDED TOP PICK</Text>
        </View>
      )}

      {p.is_external && (
        <View style={styles.externalTopBadge}>
          <Ionicons name="logo-google" size={10} color="#fff" style={{marginRight: 4}} />
          <Text style={styles.topBadgeText}>EXTERNAL UNVERIFIED</Text>
        </View>
      )}

      <TouchableOpacity onPress={() => handleProviderPress(p)}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, p.is_open_now === false && { opacity: 0.5 }]}>
            {p.is_external ? (
              <Ionicons name="business" size={20} color="#f97316" />
            ) : (
              <Text style={styles.avatarText}>{p.avatar_initials || p.name?.charAt(0) || 'U'}</Text>
            )}
            {p.is_verified && (
              <View style={styles.miniVerifiedCheck}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.providerName}>{p.name}</Text>
              {!p.is_external && p.is_verified && (
                <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
              )}
            </View>
            
            {p.address ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="location-outline" size={12} color="#64748b" />
                <Text style={styles.addressText} numberOfLines={1}>{p.address}</Text>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.statText}>{p.rating} ({p.review_count || 0})</Text>
              <Text style={styles.statDot}>•</Text>
              <Ionicons name="navigate-outline" size={12} color="#64748b" />
              <Text style={styles.statText}>{p.distance_km}km</Text>
              {p.experience_years && (
                <>
                  <Text style={styles.statDot}>•</Text>
                  <Ionicons name="briefcase-outline" size={12} color="#64748b" />
                  <Text style={styles.statText}>{p.experience_years} yrs exp</Text>
                </>
              )}
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            {p.is_external ? (
              <>
                <View style={styles.trustBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#16a34a" style={{marginRight: 2}} />
                  <Text style={styles.trustText}>Trust: {p.trust_score || 75}/100</Text>
                </View>
                <Text style={styles.etaText}>~{Math.max(10, Math.round(p.distance_km * 4))} min</Text>
              </>
            ) : (
              <>
                <Text style={styles.priceText}>Rs. {Number(p.pricing?.total || p.base_rate || 0).toFixed(2)}</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>{(p.match_score || p.score * 100 || 85).toFixed(0)}% Match</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Specializations & Badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        {p.specializations && p.specializations.length > 0 && (
          <View style={styles.tagsRow}>
            {p.specializations.slice(0, 3).map((s: string, si: number) => (
              <View key={si} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
        
        {p.remote_available && (
          <View style={styles.remoteBadge}>
            <Ionicons name="laptop-outline" size={10} color="#10b981" />
            <Text style={styles.remoteBadgeText}>Remote Consultation</Text>
          </View>
        )}
      </View>

      {/* Operating Hours */}
      {p.operating_hours ? (
        <View style={styles.hoursRow}>
          <Ionicons name="time-outline" size={14} color={p.is_open_now !== false ? "#10b981" : "#f59e0b"} />
          <Text style={[styles.hoursText, p.is_open_now === false && { color: '#f59e0b' }]}>
            {p.operating_hours} {p.is_open_now !== false ? '• Open Now' : '• Closed'}
          </Text>
        </View>
      ) : null}

      {/* Why Ranking or Google Details */}
      {!p.is_external ? (
        <>
          <View style={styles.divider} />
          {p.why_recommended && p.why_recommended.length > 0 ? (
            <View>
              <Text style={styles.whyTitle}>Why recommended</Text>
              <View style={styles.whyChipsRow}>
                {p.why_recommended.slice(0, 4).map((reason: string, ri: number) => (
                  <View key={ri} style={styles.whyChip}>
                    <Text style={styles.whyChipText}>{reason}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.whyBox}>
              <Text style={styles.whyTitle}>Why this ranking?</Text>
              <Text style={styles.whyText}>
                {p.isTopPick 
                  ? 'Highest availability and specialization match for your request.' 
                  : 'Good alternative, but lower reliability score than the top pick.'}
              </Text>
            </View>
          )}
        </>
      ) : null}
      {/* Action Buttons Row - Restructured into modern 2-row layout */}
      <View style={styles.divider} />
      <View style={styles.actionsContainer}>
        {/* Row 1: Primary Transactional Actions */}
        <View style={styles.primaryActionsRow}>
          <TouchableOpacity style={[styles.primaryActionBtn, styles.bookBtn]} onPress={() => handleBookNow(p)}>
            <Ionicons name="calendar" size={15} color="#fff" />
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryActionBtn, styles.autoBookBtn]} onPress={() => handleAutoBook(p)}>
            <Ionicons name="sparkles" size={15} color="#fff" />
            <Text style={styles.autoBookBtnText}>AI Auto Book</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Secondary Communication & Details Utilities */}
        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity style={[styles.secondaryActionBtn, styles.chatBtn]} onPress={() => handleChat(p)}>
            <Ionicons name="chatbubble-ellipses" size={15} color="#4f46e5" />
            <Text style={styles.chatBtnText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryActionBtn, styles.callActionBtn]} onPress={() => handleCall(p.phone)}>
            <Ionicons name="call" size={15} color="#0891b2" />
            <Text style={styles.callActionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryActionBtn, styles.profileBtn]} onPress={() => handleProviderPress(p)}>
            <Ionicons name="person" size={15} color="#64748b" />
            <Text style={styles.profileBtnText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryActionBtn, styles.mapBtn]} onPress={() => handleViewLocation(p)}>
            <Ionicons name="map" size={15} color="#059669" />
            <Text style={styles.mapBtnText}>Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Technician Directory</Text>
            <Text style={styles.headerSub}>{b.service_type || 'Services'} • {b.location || 'Lahore'}</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Dynamic Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or skills..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </LinearGradient>

      {/* Sorting & Basic Toggle Bar */}
      <View style={styles.sortingBar}>
        <TouchableOpacity style={styles.sortDropdownButton} onPress={() => setShowSortDropdown(!showSortDropdown)}>
          <Ionicons name="swap-vertical" size={14} color="#4f46e5" />
          <Text style={styles.sortDropdownText}>{getSortLabel()}</Text>
          <Ionicons name={showSortDropdown ? "chevron-up" : "chevron-down"} size={14} color="#64748b" />
        </TouchableOpacity>

        {/* Verified Quick Toggle */}
        <TouchableOpacity 
          style={[styles.verifiedToggleChip, verifiedOnly && styles.verifiedToggleChipActive]} 
          onPress={() => setVerifiedOnly(!verifiedOnly)}
        >
          <Ionicons name="shield-checkmark" size={12} color={verifiedOnly ? "#fff" : "#3b82f6"} />
          <Text style={[styles.verifiedToggleText, verifiedOnly && styles.verifiedToggleTextActive]}>Verified Only</Text>
        </TouchableOpacity>

        {/* Remote Support Quick Toggle */}
        <TouchableOpacity 
          style={[styles.verifiedToggleChip, remoteOnly && styles.verifiedToggleChipActive]} 
          onPress={() => setRemoteOnly(!remoteOnly)}
        >
          <Ionicons name="laptop" size={12} color={remoteOnly ? "#fff" : "#10b981"} />
          <Text style={[styles.verifiedToggleText, remoteOnly && styles.verifiedToggleTextActive]}>Remote</Text>
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown Menu */}
      {showSortDropdown && (
        <View style={styles.sortMenu}>
          <TouchableOpacity style={styles.sortMenuItem} onPress={() => { setSortBy('recommended'); setShowSortDropdown(false); }}>
            <Ionicons name="sparkles" size={16} color={sortBy === 'recommended' ? "#4f46e5" : "#94a3b8"} />
            <Text style={[styles.sortMenuLabel, sortBy === 'recommended' && styles.sortMenuLabelActive]}>AI Recommended</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortMenuItem} onPress={() => { setSortBy('rating'); setShowSortDropdown(false); }}>
            <Ionicons name="star" size={16} color={sortBy === 'rating' ? "#4f46e5" : "#94a3b8"} />
            <Text style={[styles.sortMenuLabel, sortBy === 'rating' && styles.sortMenuLabelActive]}>Highest Rated</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortMenuItem} onPress={() => { setSortBy('nearest'); setShowSortDropdown(false); }}>
            <Ionicons name="navigate" size={16} color={sortBy === 'nearest' ? "#4f46e5" : "#94a3b8"} />
            <Text style={[styles.sortMenuLabel, sortBy === 'nearest' && styles.sortMenuLabelActive]}>Nearest First</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortMenuItem} onPress={() => { setSortBy('price_low'); setShowSortDropdown(false); }}>
            <Ionicons name="wallet" size={16} color={sortBy === 'price_low' ? "#4f46e5" : "#94a3b8"} />
            <Text style={[styles.sortMenuLabel, sortBy === 'price_low' && styles.sortMenuLabelActive]}>Lowest Price</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortMenuItem} onPress={() => { setSortBy('experience'); setShowSortDropdown(false); }}>
            <Ionicons name="briefcase" size={16} color={sortBy === 'experience' ? "#4f46e5" : "#94a3b8"} />
            <Text style={[styles.sortMenuLabel, sortBy === 'experience' && styles.sortMenuLabelActive]}>Experience Level</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortMenuItem} onPress={() => { setSortBy('response'); setShowSortDropdown(false); }}>
            <Ionicons name="flash" size={16} color={sortBy === 'response' ? "#4f46e5" : "#94a3b8"} />
            <Text style={[styles.sortMenuLabel, sortBy === 'response' && styles.sortMenuLabelActive]}>Fastest Response</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Provider List Scroll */}
      <ScrollView style={styles.list} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        {isExternal && openProviders.length > 0 && (
          <View style={styles.externalWarningBox}>
            <Ionicons name="warning" size={24} color="#f97316" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.externalWarningTitle, { color: '#c2410c' }]}>🚨 Emergency Discovery Activated</Text>
              <Text style={[styles.externalWarningText, { color: '#ea580c' }]}>No internal verified providers matched in this area. Showing fallback external businesses discovered from Google Business listings.</Text>
            </View>
          </View>
        )}

        {/* Count Indicator */}
        <Text style={styles.resultsCountText}>Showing {processedProviders.length} matching technicians</Text>

        {/* Open Providers */}
        {openProviders.map((p: any, idx: number) => renderProviderCard(p, idx))}

        {/* Closed Providers Section */}
        {closedProviders.length > 0 && (
          <>
            <View style={styles.sectionDivider}>
              <View style={styles.sectionDividerLine} />
              <View style={styles.sectionDividerBadge}>
                <Ionicons name="moon" size={12} color="#f59e0b" />
                <Text style={styles.sectionDividerText}>Currently Offline / Closed ({closedProviders.length})</Text>
              </View>
              <View style={styles.sectionDividerLine} />
            </View>
            {closedProviders.map((p: any, idx: number) => renderProviderCard(p, openProviders.length + idx))}
          </>
        )}

        {processedProviders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Technicians Match Your Filters</Text>
            <Text style={styles.emptySub}>Try adjusting your search query, price range, or turning off 'Verified Only' filters.</Text>
            <TouchableOpacity style={styles.resetFiltersBtn} onPress={() => {
              setSearch('');
              setVerifiedOnly(false);
              setRemoteOnly(false);
              setMinRating(null);
              setMaxDistance(null);
              setMaxPrice(null);
            }}>
              <Text style={styles.resetFiltersBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Advanced Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Search Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* Rating Filter */}
              <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
              <View style={styles.filterOptionsGrid}>
                {[4.5, 4.0, 3.5].map((stars) => (
                  <TouchableOpacity 
                    key={stars} 
                    style={[styles.filterGridBtn, minRating === stars && styles.filterGridBtnActive]}
                    onPress={() => setMinRating(minRating === stars ? null : stars)}
                  >
                    <Ionicons name="star" size={14} color={minRating === stars ? "#fff" : "#f59e0b"} />
                    <Text style={[styles.filterGridBtnText, minRating === stars && { color: '#fff' }]}>{stars}+ Stars</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Distance Filter */}
              <Text style={styles.filterSectionTitle}>Max Distance (Radius)</Text>
              <View style={styles.filterOptionsGrid}>
                {[3, 5, 10].map((dist) => (
                  <TouchableOpacity 
                    key={dist} 
                    style={[styles.filterGridBtn, maxDistance === dist && styles.filterGridBtnActive]}
                    onPress={() => setMaxDistance(maxDistance === dist ? null : dist)}
                  >
                    <Text style={[styles.filterGridBtnText, maxDistance === dist && { color: '#fff' }]}>{dist} km</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price Filter */}
              <Text style={styles.filterSectionTitle}>Max Price Budget (Rs.)</Text>
              <View style={styles.filterOptionsGrid}>
                {[700, 1000, 1500].map((price) => (
                  <TouchableOpacity 
                    key={price} 
                    style={[styles.filterGridBtn, maxPrice === price && styles.filterGridBtnActive]}
                    onPress={() => setMaxPrice(maxPrice === price ? null : price)}
                  >
                    <Text style={[styles.filterGridBtnText, maxPrice === price && { color: '#fff' }]}>Under Rs.{price}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Extra toggles */}
              <View style={styles.extraToggleRow}>
                <Text style={styles.extraToggleLabel}>Only Show Verified</Text>
                <TouchableOpacity onPress={() => setVerifiedOnly(!verifiedOnly)}>
                  <Ionicons 
                    name={verifiedOnly ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={verifiedOnly ? "#4f46e5" : "#cbd5e1"} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.extraToggleRow}>
                <Text style={styles.extraToggleLabel}>Allows Remote Consultation</Text>
                <TouchableOpacity onPress={() => setRemoteOnly(!remoteOnly)}>
                  <Ionicons 
                    name={remoteOnly ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={remoteOnly ? "#4f46e5" : "#cbd5e1"} 
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetFiltersBtnInline} onPress={() => {
                setMinRating(null);
                setMaxDistance(null);
                setMaxPrice(null);
                setVerifiedOnly(false);
                setRemoteOnly(false);
              }}>
                <Text style={styles.resetFiltersBtnInlineText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
  filterBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 12, color: "#cbd5e1", fontWeight: "700" },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: '#0f172a', fontWeight: '600' },

  sortingBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 8, alignItems: 'center' },
  sortDropdownButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  sortDropdownText: { fontSize: 11, fontWeight: '800', color: '#4f46e5' },
  
  verifiedToggleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  verifiedToggleChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  verifiedToggleText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  verifiedToggleTextActive: { color: '#fff' },

  sortMenu: { position: 'absolute', top: 160, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', zIndex: 100, padding: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  sortMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8 },
  sortMenuLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  sortMenuLabelActive: { color: '#4f46e5', fontWeight: '800' },

  list: { flex: 1 },
  resultsCountText: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, marginBottom: 16 },
  topCard: { borderColor: '#c7d2fe', borderWidth: 2 },
  closedCard: { opacity: 0.75 },
  
  topBadge: { position: 'absolute', top: -10, left: 16, backgroundColor: '#4f46e5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  externalTopBadge: { position: 'absolute', top: -10, left: 16, backgroundColor: '#f97316', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  topBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  cardHeader: { flexDirection: 'row', gap: 12, marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  miniVerifiedCheck: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#4f46e5' },
  providerName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  addressText: { fontSize: 11, color: '#94a3b8', fontWeight: '600', flex: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statDot: { fontSize: 12, color: '#cbd5e1', marginHorizontal: 2 },
  
  priceText: { fontSize: 18, fontWeight: '900', color: '#10b981' },
  scoreBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  scoreText: { color: '#10b981', fontSize: 10, fontWeight: '800' },
  
  trustBadge: { backgroundColor: '#dcfce7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  trustText: { color: '#16a34a', fontSize: 10, fontWeight: '800' },
  etaText: { fontSize: 13, fontWeight: '800', color: '#dc2626' },

  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  tag: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 10, color: '#475569', fontWeight: '700' },
  
  remoteBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  remoteBadgeText: { fontSize: 9, color: '#0369a1', fontWeight: '800' },

  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#f8fafc', padding: 8, borderRadius: 8 },
  hoursText: { fontSize: 11, color: '#64748b', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  
  whyBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 },
  whyTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  whyText: { fontSize: 11, color: '#64748b', lineHeight: 16 },

  whyChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  whyChip: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  whyChipText: { fontSize: 10, fontWeight: '800', color: '#4338ca' },
  actionsContainer: { gap: 8, marginTop: 4 },
  primaryActionsRow: { flexDirection: 'row', gap: 8 },
  primaryActionBtn: { flex: 1, height: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bookBtn: { backgroundColor: '#10b981' },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  autoBookBtn: { backgroundColor: '#8b5cf6' },
  autoBookBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  
  secondaryActionsRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  secondaryActionBtn: { flex: 1, height: 36, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1 },
  chatBtn: { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
  chatBtnText: { color: '#4f46e5', fontSize: 11, fontWeight: '800' },
  callActionBtn: { backgroundColor: '#ecfeff', borderColor: '#cffafe' },
  callActionText: { color: '#0891b2', fontSize: 11, fontWeight: '800' },
  profileBtn: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  profileBtnText: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  mapBtn: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
  mapBtnText: { color: '#059669', fontSize: 11, fontWeight: '800' },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  sectionDividerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sectionDividerText: { fontSize: 11, fontWeight: '800', color: '#b45309' },

  externalWarningBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  externalWarningTitle: { fontSize: 13, fontWeight: '900', marginBottom: 2 },
  externalWarningText: { fontSize: 11, lineHeight: 16, fontWeight: '600' },

  emptyState: { alignItems: 'center', padding: 24, gap: 12, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  resetFiltersBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 10 },
  resetFiltersBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Modal styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  
  filterSectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, paddingHorizontal: 4 },
  filterOptionsGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  filterGridBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
  filterGridBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  filterGridBtnText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  
  extraToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  extraToggleLabel: { fontSize: 13, fontWeight: '800', color: '#334155' },

  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  resetFiltersBtnInline: { flex: 0.4, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  resetFiltersBtnInlineText: { color: '#475569', fontSize: 13, fontWeight: '800' },
  applyBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#4f46e5', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

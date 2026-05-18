"""
Provider Matching Agent
Ranks providers using a weighted multi-factor scoring algorithm.
Score = (Reliability × 0.3) + (Distance_Inv × 0.2) + (Rating × 0.15) + (Price_Fit × 0.15) + (Reviews × 0.1) + (Capacity × 0.1)
"""
import math
from core.database import db_get_providers

# Reference coordinates for common areas in Lahore
AREA_COORDS = {
    "dha": (31.4697, 74.3762),
    "dha phase 5": (31.4697, 74.3762),
    "dha phase 4": (31.4660, 74.3700),
    "dha phase 6": (31.4745, 74.3850),
    "gulberg": (31.5204, 74.3587),
    "gulberg iii": (31.5204, 74.3587),
    "johar town": (31.4647, 74.2685),
    "model town": (31.4803, 74.3244),
    "bahria town": (31.3660, 74.1820),
    "cantt": (31.5120, 74.3556),
    "garden town": (31.5157, 74.3350),
    "wapda town": (31.4530, 74.2920),
    "iqbal town": (31.4923, 74.2810),
    "township": (31.4510, 74.3100),
    "gulshan-e-ravi": (31.5380, 74.3680),
    "faisal town": (31.4840, 74.3050),
    "askari 10": (31.4570, 74.3420),
    "lahore": (31.5204, 74.3587),  # Default Lahore center
}

WEIGHTS = {
    "distance": 0.15,
    "availability": 0.20,
    "rating": 0.15,
    "recency": 0.10,
    "reliability": 0.15,
    "specialization": 0.15,
    "budget": 0.05,
    "capacity": 0.05,
}


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def _get_user_coords(location: str) -> tuple[float, float]:
    """Resolve a location string to approximate coordinates."""
    if not location:
        return AREA_COORDS["lahore"]
    loc_lower = str(location).lower().strip()
    for key, coords in AREA_COORDS.items():
        if key in loc_lower or loc_lower in key:
            return coords
    return AREA_COORDS["lahore"]  # Default


async def match_providers(intent: dict, exclude_ids: list[str] | None = None) -> dict:
    """Find and rank the best providers for the given intent."""
    
    trace = {
        "agent": "MatchingAgent",
        "input": {
            "service_type": intent.get("service_type"),
            "location": intent.get("location"),
            "urgency": intent.get("urgency"),
        },
        "reasoning": [],
    }
    
    exclude_ids = exclude_ids or []
    
    # Step 1: Fetch providers matching service type
    providers = db_get_providers({"service_type": intent.get("service_type", "")})
    providers = [p for p in providers if p["id"] not in exclude_ids]
    
    trace["reasoning"].append(f"Found {len(providers)} providers for '{intent.get('service_type')}' (excluded {len(exclude_ids)} previously cancelled)")
    
    if not providers:
        trace["reasoning"].append(f"No active platform providers found for {intent.get('service_type')}.")
        trace["status"] = "no_internal_providers"
        trace["output"] = []
        return {"providers": [], "trace": trace}
    
    # Step 2: Calculate user coordinates
    user_location = intent.get("location") or "Lahore"
    user_coords = _get_user_coords(user_location)
    trace["reasoning"].append(f"User location resolved: '{user_location}' → ({user_coords[0]:.4f}, {user_coords[1]:.4f})")
    
    # Step 3: Score each provider
    scored = []
    issue_desc = intent.get("issue_description", "").lower()
    user_budget_sensitive = intent.get("budget_sensitivity") == "high"
    
    for p in providers:
        dist_km = _haversine(user_coords[0], user_coords[1], p["location"]["lat"], p["location"]["lng"])
        travel_time_minutes = dist_km * 3  # rough estimate
        
        # 1. Distance Score
        distance_score = max(0, 1 - (travel_time_minutes / 60))
        
        # 2. Availability Score
        availability_score = 1.0 if len(p.get("availability", {})) > 0 else 0.0
        
        # 3. Rating Score
        rating_score = max(0, (p.get("rating", 1) - 1) / 4)
        
        # 4. Recency Score
        total_revs = p.get("review_count", 1)
        recent_revs = len(p.get("recent_reviews", []))
        recency_score = min(1.0, recent_revs / max(1, total_revs))
        
        # 5. Reliability Score
        on_time = p.get("on_time_score", 0.5)
        cancel_rate = p.get("cancellation_rate", 0.5)
        reliability_score = on_time * (1 - cancel_rate)
        
        # 6. Specialization Score
        spec_match = 0
        provider_specs = [s.lower() for s in p.get("specializations", [])]
        if issue_desc:
            for s in provider_specs:
                if s in issue_desc:
                    spec_match += 1
        spec_score = min(1.0, spec_match / max(1, len(provider_specs))) if provider_specs else 0.5
        
        # 7. Budget Score
        base_rate = p.get("base_rate", 1000)
        budget_score = max(0, 1 - (base_rate / 2000)) if user_budget_sensitive else 0.5
        
        # 8. Capacity Score
        capacity = p.get("capacity", 1)
        jobs_today = p.get("jobs_today", 0)
        capacity_score = max(0, (capacity - jobs_today) / capacity)
        
        score = (
            distance_score * WEIGHTS["distance"] +
            availability_score * WEIGHTS["availability"] +
            rating_score * WEIGHTS["rating"] +
            recency_score * WEIGHTS["recency"] +
            reliability_score * WEIGHTS["reliability"] +
            spec_score * WEIGHTS["specialization"] +
            budget_score * WEIGHTS["budget"] +
            capacity_score * WEIGHTS["capacity"]
        ) * 100
        
        # ===== TRUST & VERIFICATION BOOST =====
        verification_bonus = 0
        if p.get("is_verified"):
            if p.get("verified_status") == "fully_verified":
                verification_bonus = 15
            elif p.get("verified_status") == "partially_verified":
                verification_bonus = 8
        
        # Repeat customer boost
        repeat_bonus = min(5, p.get("customer_repeat_rate", 0) * 10)
        
        # Sentiment boost
        sentiment_bonus = min(3, p.get("review_sentiment_score", 0.5) * 3)
        
        score += verification_bonus + repeat_bonus + sentiment_bonus
        
        # ===== BUILD "WHY RECOMMENDED" REASONS =====
        why_recommended = []
        if p.get("is_verified"):
            why_recommended.append(f"✓ {p.get('verification_badge', 'Verified')}")
        if p.get("on_time_score", 0) >= 0.85:
            why_recommended.append(f"{p.get('punctuality_score', int(p.get('on_time_score',0)*100))}% on-time")
        if p.get("cancellation_rate", 1) <= 0.05:
            why_recommended.append("Low cancellation")
        if p.get("customer_repeat_rate", 0) >= 0.3:
            why_recommended.append(f"{int(p.get('customer_repeat_rate',0)*100)}% repeat customers")
        if p.get("review_sentiment_score", 0) >= 0.85:
            why_recommended.append("Excellent reviews")
        if p.get("response_time_minutes", 60) <= 10:
            why_recommended.append(f"Responds in ~{p.get('response_time_minutes', 10)} min")
        if p.get("total_jobs_completed", 0) >= 300:
            why_recommended.append(f"{p.get('total_jobs_completed')}+ jobs done")
        if p.get("certifications"):
            why_recommended.append(p["certifications"][0])
        
        breakdown = {
            "distance": round(distance_score * WEIGHTS["distance"], 3),
            "availability": round(availability_score * WEIGHTS["availability"], 3),
            "rating": round(rating_score * WEIGHTS["rating"], 3),
            "recency": round(recency_score * WEIGHTS["recency"], 3),
            "reliability": round(reliability_score * WEIGHTS["reliability"], 3),
            "specialization": round(spec_score * WEIGHTS["specialization"], 3),
            "budget": round(budget_score * WEIGHTS["budget"], 3),
            "capacity": round(capacity_score * WEIGHTS["capacity"], 3),
            "verification_bonus": round(verification_bonus, 1),
        }
        
        scored.append({
            **p,
            "distance_km": round(dist_km, 1),
            "match_score": round(score, 2),
            "score_breakdown": breakdown,
            "why_recommended": why_recommended,
        })
    
    # Step 4: Sort by score descending
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Step 5: Add reasoning for top 3
    for i, p in enumerate(scored[:3]):
        rank = i + 1
        verified_label = "✓ VERIFIED" if p.get("is_verified") else "⚠ UNVERIFIED"
        trace["reasoning"].append(
            f"#{rank} {p['name']} [{verified_label}] (Score: {p['match_score']}) — "
            f"Distance: {p['distance_km']}km, Rating: {p['rating']}/5, "
            f"Reliability: {p.get('reliability_score', p.get('on_time_score',0)*100):.0f}%, "
            f"Base: Rs.{p.get('base_rate', 1000)}"
        )
    
    if len(scored) > 1:
        trace["reasoning"].append(f"Decision: {scored[0]['name']} ranked #1 over {scored[1]['name']} due to higher trust + match score.")
    
    if intent.get("urgency") == "emergency":
        trace["reasoning"].append("⚡ Emergency mode: Boosted capacity and distance weights")
    
    trace["output"] = [p["id"] for p in scored[:5]]
    trace["status"] = "success"
    
    return {"providers": scored, "trace": trace}

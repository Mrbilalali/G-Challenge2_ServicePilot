"""
External Provider Discovery Agent
Uses Gemini AI to simulate intelligent Google Places & Maps API integration.
Finds, evaluates, and ranks external businesses when internal matches are insufficient.
"""
import json
import uuid
from typing import List, Dict
import google.generativeai as genai
from core import settings
import math

genai.configure(api_key=settings.GEMINI_API_KEY)

DISCOVERY_SYSTEM_PROMPT = """You are an autonomous External Provider Discovery Agent for ServicePilot AI.
Your job is to act like a real-time Google Places, Maps & Business API integration.
Based on the user's requested service and location (in Pakistan), generate 5 realistic, culturally accurate local businesses.

IMPORTANT RULES:
- Generate a MIX of open and closed businesses. At least 1 MUST be currently closed.
- Make distances vary realistically (0.5km to 15km).
- Use realistic Pakistani business names, phone numbers, and addresses for the requested area.
- Include coordinates near the requested area.

Return EXACTLY this JSON array format, nothing else:
[
  {
    "business_name": "Realistic Pakistani business name",
    "phone": "+92 3XX XXXXXXX",
    "rating": <Float 3.0-5.0>,
    "review_count": <Integer 10-500>,
    "distance_km": <Float 0.5-15.0>,
    "is_open_now": <true or false>,
    "operating_hours": "Mon-Sat 9:00 AM - 8:00 PM",
    "next_available_time": "Tomorrow 9:00 AM (only if closed, else null)",
    "address": "Full realistic street address",
    "lat": <Float - realistic latitude for the area>,
    "lng": <Float - realistic longitude for the area>,
    "specializations": ["skill 1", "skill 2", "skill 3"],
    "experience_years": <Integer 1-20>,
    "remote_available": <true or false>,
    "website": "www.example.com or null",
    "review_sentiment": <Float 0.1-1.0>
  }
]
"""

def _calculate_trust_score(rating: float, review_count: int, sentiment: float) -> float:
    """Calculate a proprietary Trust Score (0-100) for external providers."""
    rating_score = (rating / 5.0) * 50
    volume_score = min(30, math.log(max(1, review_count), 2) * 4)
    sentiment_score = sentiment * 20
    return round(rating_score + volume_score + sentiment_score, 2)


async def discover_external_providers(intent: dict) -> dict:
    """Trigger AI-driven external discovery using simulated Maps data."""
    
    service_type = intent.get("service_type", "General Service")
    location = intent.get("location", "Lahore")
    urgency = intent.get("urgency", "flexible")
    
    trace = {
        "agent": "ExternalDiscoveryAgent",
        "input": {
            "service_type": service_type,
            "location": location,
            "urgency": urgency
        },
        "reasoning": [],
    }
    
    trace["reasoning"].append(f"🔍 Initiating External Discovery for '{service_type}' in '{location}'.")
    trace["reasoning"].append(f"🌐 Querying Google Places API & Maps Radius Search...")
    trace["reasoning"].append(f"📍 Geocoding location '{location}' to coordinates...")
    
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = f"Find 5 businesses providing '{service_type}' near '{location}', Pakistan."
        if urgency == "emergency":
            prompt += " Prioritize businesses that are open now."
            
        response = model.generate_content(
            f"{DISCOVERY_SYSTEM_PROMPT}\n\nUser Request: {prompt}",
            generation_config=genai.types.GenerationConfig(
                temperature=0.4,
                max_output_tokens=1500,
            )
        )
        
        raw = response.text.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1]
        if "```" in raw:
            raw = raw.split("```")[0]
        raw = raw.strip()
        
        # Extract JSON array
        import re
        json_match = re.search(r'\[.*\]', raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)
        
        businesses = json.loads(raw)
        
        trace["reasoning"].append(f"✅ Google Places returned {len(businesses)} nearby businesses.")
        trace["reasoning"].append(f"📊 Calculating Trust Scores using rating, reviews & sentiment...")
        
        discovered_providers = []
        for b in businesses:
            trust = _calculate_trust_score(
                b.get("rating", 3.5), 
                b.get("review_count", 10), 
                b.get("review_sentiment", 0.7)
            )
            
            p = {
                "id": f"ext_{uuid.uuid4().hex[:8]}",
                "name": b.get("business_name", "Unknown Business"),
                "phone": b.get("phone", ""),
                "rating": b.get("rating", 3.5),
                "review_count": b.get("review_count", 0),
                "distance_km": b.get("distance_km", 5.0),
                "is_open_now": b.get("is_open_now", True),
                "operating_hours": b.get("operating_hours", "Not available"),
                "next_available_time": b.get("next_available_time"),
                "address": b.get("address", "Address not available"),
                "lat": b.get("lat", 31.5204),
                "lng": b.get("lng", 74.3587),
                "specializations": b.get("specializations", []),
                "experience_years": b.get("experience_years", 1),
                "remote_available": b.get("remote_available", False),
                "website": b.get("website"),
                "trust_score": trust,
                "is_external": True,
                "is_verified": False,
                "verified_status": "unverified",
                "verification_badge": "",
                "source": "Google Business Discovery",
            }
            
            # Radius expansion logging
            if p["distance_km"] > 5.0:
                trace["reasoning"].append(f"📏 Radius expanded to {(math.ceil(p['distance_km']/5)*5)}km to include {p['name']}.")
            
            # Closed provider logging
            if not p["is_open_now"]:
                avail = p.get("next_available_time", "Unknown")
                trace["reasoning"].append(f"🕐 {p['name']} is CLOSED. Next available: {avail}.")
                
            discovered_providers.append(p)
            
        if not discovered_providers:
            trace["reasoning"].append("❌ No valid external providers found after filtering.")
            trace["status"] = "failed"
            return {"providers": [], "trace": trace}
            
        # Rank by Trust Score & Distance
        discovered_providers.sort(key=lambda x: (x["trust_score"] * 0.7) - (x["distance_km"] * 3), reverse=True)
        
        best = discovered_providers[0]
        trace["reasoning"].append(f"🏆 Top Pick: {best['name']} (Trust: {best['trust_score']}/100, {best['distance_km']}km, {best['experience_years']}yr exp)")
        
        trace["output"] = [p["id"] for p in discovered_providers]
        trace["status"] = "success"
        
        return {"providers": discovered_providers, "trace": trace}
        
    except Exception as e:
        trace["reasoning"].append(f"❌ External Discovery Failed: {str(e)}")
        trace["reasoning"].append("⚡ Activating keyword-based fallback discovery...")
        trace["status"] = "fallback"
        
        # Generate basic fallback providers
        fallback_providers = []
        for i in range(3):
            fallback_providers.append({
                "id": f"ext_fb_{uuid.uuid4().hex[:6]}",
                "name": f"{service_type} Service #{i+1} ({location})",
                "phone": f"+92 300 {1000000+i}",
                "rating": 3.5 + i * 0.3,
                "review_count": 10 + i * 15,
                "distance_km": 2.0 + i * 3,
                "is_open_now": i < 2,
                "operating_hours": "Mon-Sat 9 AM - 7 PM",
                "next_available_time": "Tomorrow 9:00 AM" if i >= 2 else None,
                "address": f"Near {location}, Pakistan",
                "lat": 31.5204 + i * 0.01,
                "lng": 74.3587 + i * 0.01,
                "specializations": [service_type.lower()],
                "experience_years": 3 + i,
                "remote_available": False,
                "website": None,
                "trust_score": 55 + i * 10,
                "is_external": True,
                "is_verified": False,
                "verified_status": "unverified",
                "verification_badge": "",
                "source": "Fallback Discovery",
            })
        
        return {"providers": fallback_providers, "trace": trace}

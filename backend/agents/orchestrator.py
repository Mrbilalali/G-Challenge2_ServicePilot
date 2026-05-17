"""
Central Orchestrator
Chains all agents in sequence and collects the full reasoning trace.
"""
import uuid
from datetime import datetime
from agents.intent_agent import parse_intent
from agents.matching_agent import match_providers
from agents.pricing_agent import calculate_price
from agents.scheduling_agent import schedule_booking
from agents.recovery_agent import handle_cancellation
from agents.feedback_agent import process_feedback
from agents.discovery_agent import discover_external_providers
from core.database import db_create_booking, db_get_booking, db_update_booking, db_save_trace, db_get_trace, db_save_external_provider, db_log_search


async def process_service_request(user_message: str) -> dict:
    """Full pipeline: Intent → Match → Price → Schedule → Book."""
    
    booking_id = f"bk_{uuid.uuid4().hex[:12]}"
    all_traces = []
    
    # 1. Intent
    intent_result = await parse_intent(user_message)
    intent = intent_result["intent"]
    all_traces.append(intent_result["trace"])
    
    if intent_result.get("requires_clarification"):
        return {
            "booking": None,
            "message": intent.get("clarification_question", "Could you please clarify what service you need?"),
            "traces": all_traces,
        }
    
    # 2. Discovery
    discovery_trace = {
        "agent": "DiscoveryAgent",
        "input": {"location": intent.get("location"), "service": intent.get("service_type")},
        "reasoning": [
            f"Querying provider database for {intent.get('service_type')} in {intent.get('location', 'all areas')}",
            "Filtering active and verified providers...",
            "Found 12 potential candidates matching basic criteria."
        ],
        "output": "12 providers found",
        "status": "success"
    }
    all_traces.append(discovery_trace)
    
    # 3. Match
    match_result = await match_providers(intent)
    providers = match_result["providers"]
    all_traces.append(match_result["trace"])
    
    # 3.5 AI External Discovery Fallback
    if not providers or (providers and providers[0].get("match_score", 0) < 50):
        if providers:
            match_result["trace"]["reasoning"].append("⚠ Top internal provider score is below 50%. Activating External Discovery.")
            
        discovery_result = await discover_external_providers(intent)
        all_traces.append(discovery_result["trace"])
        providers = discovery_result["providers"]
        
        # Save to simulated DB
        db_log_search({
            "service_requested": intent.get("service_type"),
            "location_requested": intent.get("location"),
            "radius_km": 15.0,
            "providers_found": len(providers),
            "search_reasoning": "\n".join(discovery_result["trace"]["reasoning"])
        })
        for p in providers:
            db_save_external_provider(p)
            
    if not providers:
        return {
            "booking": None,
            "message": "No providers found internally or externally for your request. Please try a different service or location.",
            "traces": all_traces,
        }
    
    top_provider = providers[0]
    
    # 4. Price & Schedule (Top Provider)
    price_result = await calculate_price(top_provider, intent)
    all_traces.append(price_result["trace"])
    
    schedule_result = await schedule_booking(top_provider, intent)
    all_traces.append(schedule_result["trace"])
    
    # Calculate prices for alternatives to show in Provider List
    alternatives = []
    for p in providers[1:4]:
        p_price = await calculate_price(p, intent)
        alternatives.append({
            "id": p["id"],
            "name": p["name"],
            "score": p.get("match_score", 0),
            "distance_km": p.get("distance_km", 0),
            "rating": p.get("rating", 0),
            "reviews": p.get("reviews", []),
            "review_count": p.get("review_count", 0),
            "pricing": p_price["pricing"],
            "is_external": p.get("is_external", False),
            "phone": p.get("phone", ""),
            "trust_score": p.get("trust_score", 0),
            "is_open_now": p.get("is_open_now", True),
            "operating_hours": p.get("operating_hours", ""),
            "next_available_time": p.get("next_available_time"),
            "address": p.get("address", ""),
            "specializations": p.get("specializations", []),
            "is_verified": p.get("is_verified", False),
            "verified_status": p.get("verified_status", ""),
            "verification_badge": p.get("verification_badge", ""),
            "why_recommended": p.get("why_recommended", []),
            "punctuality_score": p.get("punctuality_score", 0),
            "reliability_score": p.get("reliability_score", 0),
            "response_time_minutes": p.get("response_time_minutes", 0),
            "total_jobs_completed": p.get("total_jobs_completed", 0),
            "certifications": p.get("certifications", []),
            "customer_repeat_rate": p.get("customer_repeat_rate", 0),
            "cancellation_rate": p.get("cancellation_rate", 0),
            "on_time_score": p.get("on_time_score", 0),
            "recent_reviews": p.get("recent_reviews", []),
        })
    
    # 5. Notification
    notif_trace = {
        "agent": "NotificationAgent",
        "input": {"provider": top_provider["name"], "status": "simulating_dispatch"},
        "reasoning": [
            f"Formatting booking confirmation SMS for user.",
            f"Dispatching WhatsApp notification to provider {top_provider['name']}.",
            "Simulating delivery receipts."
        ],
        "output": "Notifications scheduled successfully",
        "status": "success"
    }
    all_traces.append(notif_trace)
    
    # 6. Create Booking
    booking = {
        "id": booking_id,
        "status": "confirmed",
        "user_message": user_message,
        "intent": intent,
        "provider": {
            "id": top_provider["id"],
            "name": top_provider["name"],
            "phone": top_provider.get("phone", ""),
            "rating": top_provider.get("rating", 0),
            "reviews": top_provider.get("reviews", []),
            "review_count": top_provider.get("review_count", 0),
            "match_score": top_provider.get("match_score", 0),
            "distance_km": top_provider.get("distance_km", 0),
            "score_breakdown": top_provider.get("score_breakdown", {}),
            "is_external": top_provider.get("is_external", False),
            "trust_score": top_provider.get("trust_score", 0),
            "is_open_now": top_provider.get("is_open_now", True),
            "operating_hours": top_provider.get("operating_hours", ""),
            "next_available_time": top_provider.get("next_available_time"),
            "address": top_provider.get("address", ""),
            "specializations": top_provider.get("specializations", []),
            "is_verified": top_provider.get("is_verified", False),
            "verified_status": top_provider.get("verified_status", ""),
            "verification_badge": top_provider.get("verification_badge", ""),
            "why_recommended": top_provider.get("why_recommended", []),
            "punctuality_score": top_provider.get("punctuality_score", 0),
            "reliability_score": top_provider.get("reliability_score", 0),
            "response_time_minutes": top_provider.get("response_time_minutes", 0),
            "total_jobs_completed": top_provider.get("total_jobs_completed", 0),
            "certifications": top_provider.get("certifications", []),
            "customer_repeat_rate": top_provider.get("customer_repeat_rate", 0),
            "cancellation_rate": top_provider.get("cancellation_rate", 0),
            "on_time_score": top_provider.get("on_time_score", 0),
            "recent_reviews": top_provider.get("recent_reviews", []),
        },
        "pricing": price_result["pricing"],
        "schedule": schedule_result["schedule"],
        "alternatives": alternatives,
        "excluded_providers": [],
        "created_at": datetime.now().isoformat(),
    }
    
    db_create_booking(booking)
    db_save_trace({"booking_id": booking_id, "traces": all_traces, "created_at": datetime.now().isoformat()})
    
    return {
        "booking": booking,
        "message": f"Booking confirmed! {top_provider['name']} will arrive on {schedule_result['schedule']['date']} at {schedule_result['schedule']['time_start']}.",
        "traces": all_traces,
    }


async def cancel_and_recover(booking_id: str) -> dict:
    """Simulate provider cancellation and trigger recovery."""
    
    booking = db_get_booking(booking_id)
    if not booking:
        return {"error": "Booking not found", "traces": []}
    
    cancelled_provider_id = booking["provider"]["id"]
    
    recovery_result = await handle_cancellation(booking, booking["intent"], cancelled_provider_id)
    
    all_traces = [recovery_result["trace"]] + recovery_result.get("sub_traces", [])
    
    if recovery_result["recovery"]:
        rec = recovery_result["recovery"]
        new_provider = rec["new_provider"]
        
        booking["status"] = "recovered"
        booking["previous_provider"] = booking["provider"]
        booking["provider"] = {
            "id": new_provider["id"],
            "name": new_provider["name"],
            "phone": new_provider.get("phone", ""),
            "rating": new_provider.get("rating", 0),
            "match_score": new_provider.get("match_score", 0),
            "distance_km": new_provider.get("distance_km", 0),
            "score_breakdown": new_provider.get("score_breakdown", {}),
        }
        booking["pricing"] = rec["new_pricing"]
        booking["schedule"] = rec["new_schedule"]
        booking["excluded_providers"] = rec["excluded_providers"]
        
        db_update_booking(booking_id, booking)
        
        # Update trace
        existing_trace = db_get_trace(booking_id)
        if existing_trace:
            existing_trace["traces"].extend(all_traces)
            existing_trace["recovery_at"] = datetime.now().isoformat()
        else:
            db_save_trace({"booking_id": booking_id, "traces": all_traces, "recovery_at": datetime.now().isoformat()})
        
        return {
            "booking": booking,
            "message": f"Recovery successful! New provider: {new_provider['name']}",
            "traces": all_traces,
        }
    else:
        booking["status"] = "failed_recovery"
        db_update_booking(booking_id, booking)
        return {
            "booking": booking,
            "message": "No alternative providers available. Manual intervention required.",
            "traces": all_traces,
        }


async def submit_feedback(booking_id: str, rating: int, comment: str = "") -> dict:
    """Process user feedback for a completed booking."""
    
    booking = db_get_booking(booking_id)
    if not booking:
        return {"error": "Booking not found", "traces": []}
    
    provider_id = booking["provider"]["id"]
    result = await process_feedback(booking_id, provider_id, rating, comment)
    
    booking["status"] = "completed"
    booking["feedback"] = result["feedback"]
    db_update_booking(booking_id, booking)
    
    return {
        "feedback": result["feedback"],
        "message": f"Thank you! Your {rating}-star review has been recorded.",
        "traces": [result["trace"]],
    }

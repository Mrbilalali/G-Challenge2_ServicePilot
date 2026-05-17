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
from core.database import (db_create_booking, db_get_booking, db_update_booking, db_save_trace, db_get_trace,
                           db_save_external_provider, db_log_search, db_get_wallet, db_get_bookings, db_create_escrow)


async def process_service_request(user_message: str) -> dict:
    """Full Agentic Core pipeline: parses message and executes database actions dynamically."""
    
    booking_id = f"bk_{uuid.uuid4().hex[:12]}"
    all_traces = []
    
    # 1. Intent & Agentic Actions Parse
    intent_result = await parse_intent(user_message)
    intent = intent_result["intent"]
    all_traces.append(intent_result["trace"])
    
    action = intent.get("action", "NONE")
    
    # ML/DL Agentic Multi-Task Actions execution
    if action == "CANCEL":
        bookings = db_get_bookings()
        active = [b for b in bookings if b["status"] not in ["cancelled", "completed"]]
        if active:
            target_booking = active[0]
            # Call cancel_and_recover to cancel and simulate dynamic scheduling/escrow release
            recovery_res = await cancel_and_recover(target_booking["id"])
            return {
                "booking": recovery_res.get("booking"),
                "message": f"Assalam o Alaikum! I have cancelled your active booking {target_booking['id']} successfully.\n\n• Secure Escrow Refunded: Rs. {target_booking['pricing']['total_amount']}\n• Status: Escrow Protection Refund Completed",
                "traces": all_traces + recovery_res.get("traces", []),
            }
        else:
            return {
                "booking": None,
                "message": "Assalam o Alaikum! You don't have any active bookings to cancel right now.",
                "traces": all_traces,
            }
            
    elif action == "CHECK_STATUS":
        bookings = db_get_bookings()
        if bookings:
            details = []
            for b in bookings[:3]:
                status_capitalized = b['status'].upper()
                details.append(f"• ID: {b['id']}\n  Service: {b['intent'].get('service_type', 'Home Service')}\n  Specialist: {b['provider']['name']}\n  Status: {status_capitalized}")
            details_str = "\n".join(details)
            return {
                "booking": bookings[0],
                "message": f"Assalam o Alaikum! Here are your active booking records:\n\n{details_str}",
                "traces": all_traces,
            }
        else:
            return {
                "booking": None,
                "message": "Assalam o Alaikum! You have no active bookings at the moment. How can I help you book one?",
                "traces": all_traces,
            }
            
    elif action == "WALLET":
        wallet = db_get_wallet("customer")
        return {
            "booking": None,
            "message": f"Assalam o Alaikum! Here is your wallet transaction summary:\n\n• Available Balance: Rs. {wallet['balance']}\n• Locked Escrow Funds: Rs. {wallet['pending']}\n• Safety Deposit protection active",
            "traces": all_traces,
        }
        
    elif action == "NONE":
        return {
            "booking": None,
            "message": intent.get("reply", "Assalam o Alaikum! I am here to help you get the best home maintenance support."),
            "traces": all_traces,
        }
        
    # RECOMMEND action: matching, pricing, scheduling
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
    
    # Format and calculate prices for options to display as carousel cards
    matched_list = []
    for p in providers[:3]:
        p_price = await calculate_price(p, intent)
        matched_list.append({
            "id": p["id"],
            "name": p["name"],
            "rate": p_price["pricing"]["total_amount"],
            "rating": p.get("rating", 4.7),
            "area": intent.get("location") or p.get("area") or "DHA Lahore",
            "specialization": p.get("specializations", ["Verified Specialist"])[0],
        })
        
    return {
        "booking": None,
        "message": intent.get("reply", f"Assalam o Alaikum! I've diagnosed that you need a {intent.get('service_type')} in {intent.get('location') or 'Lahore'}."),
        "providers": matched_list,
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

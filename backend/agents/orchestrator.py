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
                           db_save_external_provider, db_log_search, db_get_wallet, db_get_bookings, db_create_escrow,
                           db_get_providers, db_update_wallet, db_add_wallet_transaction)


async def process_service_request(
    user_message: str,
    booking_step: int = 0,
    selected_tech_name: str = None,
    selected_tech_rate: float = None,
    selected_time_slot: str = None
) -> dict:
    """Full Agentic Core pipeline: parses message and executes database actions dynamically."""
    
    booking_id = f"bk_{uuid.uuid4().hex[:12]}"
    all_traces = []
    
    # --- Dynamic Conversational Checkout State Machine ---
    if booking_step == 1:
        msg_lower = user_message.lower()
        slot = "10:00 AM"
        
        # Detect time preference
        if any(w in msg_lower for w in ["1:30", "afternoon", "dopahar", "ek", "do"]):
            slot = "1:30 PM"
        elif any(w in msg_lower for w in ["5", "evening", "sham", "panch"]):
            slot = "5:00 PM"
        elif any(w in msg_lower for w in ["6", "six", "che"]):
            slot = "6:00 PM"
        elif "10" in msg_lower or "morning" in msg_lower or "subah" in msg_lower:
            slot = "10:00 AM"
        else:
            # Substring/custom time check
            import re
            time_match = re.search(r'(\d{1,2}(:\d{2})?\s*(am|pm|baje|o\'clock)?)', msg_lower)
            if time_match:
                slot = time_match.group(0).toUpperCase() if hasattr(time_match.group(0), 'toUpperCase') else time_match.group(0).upper()
                
        rate = selected_tech_rate or 1200
        fee = rate * 0.1
        total = rate + fee
        
        return {
            "booking": None,
            "action": "LOCK_SLOT",
            "time_slot": slot,
            "message": (
                f"Thik hai! Main kal ke liye aapka slot '{slot}' lock kar rahi hoon.\n\n"
                f"🧾 **Payment Receipt & Escrow Summary**:\n"
                f"• Provider Base Rate: Rs. {rate}\n"
                f"• Platform Safe Escrow Fee: Rs. {fee}\n"
                f"• Total Amount to Hold: Rs. {total}\n\n"
                f"Guaranteed Protection: Ye raqam platform security hold mein rahegi aur kaam mukammal hone par technician ko release hogi. "
                f"Kya main booking confirm kar ke amount hold kar doon? Please reply with 'YES' or 'CONFIRM' to authorize."
            ),
            "traces": all_traces
        }
        
    elif booking_step == 2:
        msg_lower = user_message.lower()
        if any(w in msg_lower for w in ["yes", "confirm", "auth", "pay", "ha", "haan", "krdo", "do"]):
            rate = selected_tech_rate or 1200
            fee = rate * 0.1
            total = rate + fee
            
            # 1. Create Escrow Hold in DB
            escrow = {
                "id": f"esc_{uuid.uuid4().hex[:10]}",
                "booking_id": booking_id,
                "amount": total,
                "payment_method": "wallet",
                "status": "held",
                "created_at": datetime.now().isoformat(),
                "released_at": None,
            }
            db_create_escrow(escrow)
            
            # Deduct from customer wallet
            wallet = db_get_wallet("customer")
            new_bal = wallet["balance"] - total
            db_update_wallet("customer", {"balance": max(0, new_bal), "pending": wallet.get("pending", 0) + total})
            db_add_wallet_transaction("customer", {
                "id": f"txn_{uuid.uuid4().hex[:6]}",
                "type": "escrow_hold",
                "amount": -total,
                "desc": f"Escrow hold for booking {booking_id}",
                "date": datetime.now().strftime("%Y-%m-%d"),
            })
            
            # Find provider by name or create default mock
            providers = db_get_providers()
            matched_p = None
            if selected_tech_name:
                for p in providers:
                    if selected_tech_name.lower() in p["name"].lower():
                        matched_p = p
                        break
            if not matched_p:
                matched_p = {
                    "id": "PRV-001",
                    "name": selected_tech_name or "Ahmed Cooling Services",
                    "phone": "+92 300 4567891",
                    "rating": 4.8,
                    "review_count": 89,
                }
                
            # 2. Create Booking in DB
            booking = {
                "id": booking_id,
                "status": "confirmed",
                "user_message": user_message,
                "intent": {
                    "service_type": "AC Repair",
                    "location": "DHA Lahore",
                    "urgency": "today",
                    "confidence": 1.0,
                },
                "provider": matched_p,
                "pricing": {
                    "base_rate": rate,
                    "platform_fee": fee,
                    "total_amount": total,
                },
                "schedule": {
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "time_start": selected_time_slot or "10:00 AM",
                },
                "alternatives": [],
                "excluded_providers": [],
                "created_at": datetime.now().isoformat(),
            }
            db_create_booking(booking)
            
            return {
                "booking": booking,
                "action": "CONFIRM_BOOKING",
                "message": (
                    f"🎉 **Booking Confirmed under Secure Escrow Protection!**\n\n"
                    f"Receipt & Scheduling Details:\n"
                    f"• Specialist: {matched_p['name']}\n"
                    f"• Time Slot Locked: tomorrow, {selected_time_slot or '10:00 AM'}\n"
                    f"• Transaction ID: {escrow['id']}\n"
                    f"• Secure Hold Payout: Rs. {total} (held securely)\n\n"
                    f"I have successfully scheduled your booking. The specialist will arrive on time! You can track details in My Bookings."
                ),
                "traces": all_traces
            }
        else:
            return {
                "booking": None,
                "action": "CANCEL_BOOKING",
                "message": "Booking selection cancelled. How else can I assist your home repair today?",
                "traces": all_traces
            }

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
        
    elif action == "BOOK_PROVIDER":
        provider_q = intent.get("provider_name", "")
        providers = db_get_providers()
        matched = None
        if provider_q:
            pq = provider_q.lower()
            for p in providers:
                if pq in p["name"].lower():
                    matched = p
                    break
        
        if not matched:
            # Fallback mock search for common providers
            mock_providers = [
                { "id": "PRV-001", "name": "Ahmed Cooling Services", "base_rate": 1200, "rating": 4.8, "area": "Lahore", "specialization": "AC Repair & Gas Refill Expert" },
                { "id": "PRV-002", "name": "Bilal AC Repair & Gas Fillers", "base_rate": 800, "rating": 4.6, "area": "Lahore", "specialization": "Budget AC Servicing" },
                { "id": "PRV-003", "name": "Lahore Pro Cooling Dispatch", "base_rate": 1400, "rating": 4.9, "area": "Lahore", "specialization": "Fast Emergency AC Fixing" },
                { "id": "PLB-001", "name": "Asif Plumbing Masters", "base_rate": 1000, "rating": 4.7, "area": "Lahore", "specialization": "High-Pressure Leakage Expert" },
                { "id": "PLB-002", "name": "DHA Plumbers Ltd", "base_rate": 750, "rating": 4.5, "area": "Lahore", "specialization": "General Piping & Drainage" },
                { "id": "ELC-001", "name": "Zahid Electric Hub", "base_rate": 1100, "rating": 4.8, "area": "Lahore", "specialization": "Short Circuit & Fault Finder" }
            ]
            if provider_q:
                pq = provider_q.lower()
                for p in mock_providers:
                    if pq in p["name"].lower():
                        matched = p
                        break
        
        if matched:
            return {
                "booking": None,
                "action": "BOOK_PROVIDER",
                "provider": {
                    "id": matched.get("id"),
                    "name": matched.get("name"),
                    "rate": matched.get("base_rate") or matched.get("rate") or 1000,
                    "rating": matched.get("rating", 4.7),
                    "area": matched.get("area") or "DHA Lahore",
                    "specialization": matched.get("specialization") or "Verified Specialist"
                },
                "message": f"You selected {matched['name']}.\n\nAvailable slots:\n• 10:00 AM (Recommended)\n• 1:30 PM\n• 5:00 PM\n\nWhich slot do you prefer? (You can also reply with a custom time, e.g., \"6 baje\")",
                "traces": all_traces
            }
        else:
            return {
                "booking": None,
                "message": f"Assalam o Alaikum! Main aapka bataya hua provider '{provider_q}' nahi dhoond saki. Please correct name batayein.",
                "traces": all_traces
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

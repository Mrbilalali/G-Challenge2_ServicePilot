"""
Recovery Agent
Handles provider cancellations by re-running the matching pipeline.
"""
from agents.matching_agent import match_providers
from agents.pricing_agent import calculate_price
from agents.scheduling_agent import schedule_booking


async def handle_cancellation(booking: dict, intent: dict, cancelled_provider_id: str) -> dict:
    trace = {
        "agent": "Dispute & RecoveryAgent",
        "input": {"cancelled_provider": cancelled_provider_id, "booking_id": booking.get("id")},
        "reasoning": [],
    }
    
    exclude_ids = booking.get("excluded_providers", [])
    if cancelled_provider_id not in exclude_ids:
        exclude_ids.append(cancelled_provider_id)
    
    trace["reasoning"].append(f"Provider '{cancelled_provider_id}' cancelled")
    trace["reasoning"].append(f"Exclusion list: {exclude_ids}")
    trace["reasoning"].append("Re-running provider matching...")
    
    match_result = await match_providers(intent, exclude_ids=exclude_ids)
    matched = match_result["providers"]
    
    if not matched:
        trace["reasoning"].append("No alternative providers available")
        trace["status"] = "failed"
        trace["output"] = None
        return {"recovery": None, "trace": trace, "sub_traces": [match_result["trace"]]}
    
    new_provider = matched[0]
    trace["reasoning"].append(f"Alternative found: {new_provider['name']} (Score: {new_provider['match_score']:.3f})")
    
    price_result = await calculate_price(new_provider, intent)
    schedule_result = await schedule_booking(new_provider, intent)
    
    trace["reasoning"].append(f"New price: Rs.{price_result['pricing']['total']}")
    trace["reasoning"].append(f"New schedule: {schedule_result['schedule']['date']} {schedule_result['schedule']['time_start']}")
    trace["reasoning"].append("Recovery complete")
    trace["status"] = "recovered"
    trace["output"] = {"new_provider_id": new_provider["id"], "new_provider_name": new_provider["name"]}
    
    return {
        "recovery": {
            "new_provider": new_provider,
            "new_pricing": price_result["pricing"],
            "new_schedule": schedule_result["schedule"],
            "excluded_providers": exclude_ids,
            "attempt": len(exclude_ids),
        },
        "trace": trace,
        "sub_traces": [match_result["trace"], price_result["trace"], schedule_result["trace"]],
    }

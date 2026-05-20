"""
Scheduling Agent
Manages time-slot allocation with travel buffers and conflict detection.
"""
from datetime import datetime, timedelta


TIME_SLOTS = {
    "morning": ("09:00", "12:00"),
    "afternoon": ("12:00", "16:00"),
    "evening": ("16:00", "20:00"),
}

# Simple in-memory schedule (production would use DB)
_schedule: dict[str, list[dict]] = {}


def _resolve_date(urgency: str) -> str:
    """Convert urgency to a target date string."""
    now = datetime.now()
    if urgency in ("emergency", "today"):
        return now.strftime("%Y-%m-%d")
    elif urgency == "tomorrow":
        return (now + timedelta(days=1)).strftime("%Y-%m-%d")
    elif urgency == "this_week":
        # Next available weekday
        days_ahead = max(1, 5 - now.weekday())
        return (now + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    else:
        return (now + timedelta(days=2)).strftime("%Y-%m-%d")


def _resolve_time_slot(time_pref: str) -> tuple[str, str]:
    """Convert time preference to a slot."""
    pref_lower = time_pref.lower().strip() if time_pref else ""
    for key, slot in TIME_SLOTS.items():
        if key in pref_lower:
            return slot
    # Default: morning
    return TIME_SLOTS["morning"]


async def schedule_booking(provider: dict, intent: dict) -> dict:
    """Find the best available time slot for the provider."""
    
    trace = {
        "agent": "SchedulingAgent",
        "input": {
            "provider": provider.get("name"),
            "urgency": intent.get("urgency"),
            "time_preference": intent.get("time_preference"),
        },
        "reasoning": [],
    }
    
    provider_id = provider.get("id", "unknown")
    target_date = _resolve_date(intent.get("urgency", "flexible"))
    time_slot = _resolve_time_slot(intent.get("time_preference", ""))
    
    trace["reasoning"].append(f"Target date resolved: {target_date}")
    trace["reasoning"].append(f"Preferred time slot: {time_slot[0]} - {time_slot[1]}")
    
    # Check existing bookings for this provider on this date
    key = f"{provider_id}_{target_date}"
    existing = _schedule.get(key, [])
    
    if len(existing) >= provider.get("capacity_today", 3):
        trace["reasoning"].append(f"⚠ Provider fully booked on {target_date} ({len(existing)}/{provider.get('capacity_today', 3)} slots used)")
        
        # Try next day
        next_date = (datetime.strptime(target_date, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
        trace["reasoning"].append(f"Attempting next available date: {next_date}")
        target_date = next_date
        key = f"{provider_id}_{target_date}"
        existing = _schedule.get(key, [])
    
    # Check for time conflicts
    conflict = False
    for booking in existing:
        if booking.get("start") == time_slot[0]:
            conflict = True
            break
    
    if conflict:
        # Shift to next available slot
        slots = list(TIME_SLOTS.values())
        current_idx = slots.index(time_slot) if time_slot in slots else 0
        for i in range(1, len(slots)):
            alt_slot = slots[(current_idx + i) % len(slots)]
            alt_conflict = any(b.get("start") == alt_slot[0] for b in existing)
            if not alt_conflict:
                trace["reasoning"].append(f"Time conflict at {time_slot[0]}. Shifted to {alt_slot[0]}-{alt_slot[1]}")
                time_slot = alt_slot
                conflict = False
                break
    
    # Add travel buffer
    distance_km = provider.get("distance_km", 5)
    travel_minutes = max(15, round(distance_km * 4))  # ~15 km/h in Lahore traffic
    trace["reasoning"].append(f"Travel buffer: {travel_minutes} minutes (estimated for {distance_km}km in city traffic)")
    
    # Reserve the slot
    booking_slot = {
        "start": time_slot[0],
        "end": time_slot[1],
        "date": target_date,
    }
    if key not in _schedule:
        _schedule[key] = []
    _schedule[key].append(booking_slot)
    
    schedule = {
        "date": target_date,
        "time_start": time_slot[0],
        "time_end": time_slot[1],
        "travel_buffer_minutes": travel_minutes,
        "estimated_arrival": f"{target_date} {time_slot[0]}",
        "provider_id": provider_id,
    }
    
    trace["reasoning"].append(f"✅ Slot confirmed: {target_date} {time_slot[0]}-{time_slot[1]}")
    trace["output"] = schedule
    trace["status"] = "success"
    
    return {"schedule": schedule, "trace": trace}

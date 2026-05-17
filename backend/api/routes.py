"""
REST API Routes for ServicePilot AI
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.orchestrator import process_service_request, cancel_and_recover, submit_feedback
from core.database import (db_get_booking, db_get_bookings, db_get_providers, db_get_provider, db_get_trace, db_create_booking,
    db_create_escrow, db_get_escrow, db_update_escrow, db_get_wallet, db_update_wallet, db_add_wallet_transaction,
    db_save_chat, db_get_chat, _use_memory, _mem_external_providers, get_supabase)
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter()


# --- Request Models ---
class ServiceRequest(BaseModel):
    message: str
    booking_step: Optional[int] = 0
    selected_tech_name: Optional[str] = None
    selected_tech_rate: Optional[float] = None
    selected_time_slot: Optional[str] = None

class FeedbackRequest(BaseModel):
    rating: int  # 1-5
    comment: str = ""


# --- Routes ---

@router.post("/request")
async def create_request(req: ServiceRequest):
    """Submit a natural-language service request. Triggers the full agent pipeline."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    result = await process_service_request(
        req.message,
        booking_step=req.booking_step,
        selected_tech_name=req.selected_tech_name,
        selected_tech_rate=req.selected_tech_rate,
        selected_time_slot=req.selected_time_slot
    )
    return result


@router.get("/booking/{booking_id}")
async def get_booking(booking_id: str):
    """Get booking status and details."""
    booking = db_get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"booking": booking}


@router.get("/bookings")
async def list_bookings():
    """List all bookings."""
    return {"bookings": db_get_bookings()}


@router.post("/cancel/{booking_id}")
async def cancel_booking(booking_id: str):
    """Simulate provider cancellation → triggers Recovery Agent."""
    booking = db_get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    result = await cancel_and_recover(booking_id)
    return result


@router.post("/feedback/{booking_id}")
async def post_feedback(booking_id: str, req: FeedbackRequest):
    """Submit user feedback for a booking."""
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    result = await submit_feedback(booking_id, req.rating, req.comment)
    return result


@router.get("/providers")
async def list_providers(location: Optional[str] = None):
    """List all available service providers (internal + external)."""
    internal = db_get_providers()
    if location:
        loc = location.lower()
        internal = [p for p in internal if loc in str(p.get("area", "")).lower() or loc in str(p.get("location", "")).lower()]
        
    external = []
    if _use_memory():
        external = _mem_external_providers
    else:
        sb = get_supabase()
        external = sb.table("external_providers").select("*").execute().data
        
    # Map external database rows to standard provider format if needed
    mapped_external = []
    for e in external:
        mapped_external.append({
            "id": str(e.get("id")),
            "name": e.get("business_name") or e.get("name"),
            "phone": e.get("phone_number") or e.get("phone"),
            "rating": e.get("rating", 0),
            "review_count": e.get("review_count", 0),
            "trust_score": e.get("trust_score", 0),
            "is_external": True,
            "specializations": e.get("specializations", []),
            "is_open_now": e.get("is_open_now", True),
            "operating_hours": e.get("operating_hours", ""),
            "next_available_time": e.get("next_available_time"),
            "address": e.get("address", ""),
            "distance_km": e.get("distance_km", 0),
        })
        
    # Combine and return
    return {"providers": {"internal": internal, "external": mapped_external}}


@router.get("/trace/{booking_id}")
async def get_trace(booking_id: str):
    """Get the full AI reasoning trace for a booking."""
    trace = db_get_trace(booking_id)
    if not trace:
        raise HTTPException(status_code=404, detail="Trace not found")
    return {"trace": trace}


class BookingStatusUpdate(BaseModel):
    status: str


@router.post("/booking/update/{booking_id}")
async def update_booking_status(booking_id: str, req: BookingStatusUpdate):
    """Update a booking status."""
    booking = db_get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    updated = db_update_booking(booking_id, {"status": req.status})
    return {"booking": updated, "message": f"Booking status advanced to '{req.status}'"}


# --- Advance Booking ---
class AdvanceBookingRequest(BaseModel):
    service_type: str
    location: str = ""
    preferred_date: str
    preferred_time: str = ""
    recurrence: str = "one-time"  # one-time, weekly, monthly
    notes: str = ""


@router.post("/advance-booking")
async def create_advance_booking(req: AdvanceBookingRequest):
    """Create an advance/scheduled booking."""
    booking_id = f"abk_{uuid.uuid4().hex[:12]}"
    booking = {
        "id": booking_id,
        "status": "scheduled",
        "user_message": f"Advance booking: {req.service_type}",
        "intent": {
            "service_type": req.service_type,
            "location": req.location,
            "urgency": "scheduled",
            "confidence": 1.0,
        },
        "provider": None,
        "pricing": None,
        "schedule": {
            "date": req.preferred_date,
            "time_start": req.preferred_time or "TBD",
            "recurrence": req.recurrence,
        },
        "notes": req.notes,
        "alternatives": [],
        "excluded_providers": [],
        "created_at": datetime.now().isoformat(),
    }
    db_create_booking(booking)
    return {
        "booking": booking,
        "message": f"Advance booking created for {req.service_type} on {req.preferred_date}. We'll match you with the best provider."
    }


# --- Manual Booking ---
class ManualBookingRequest(BaseModel):
    id: str
    provider_id: str
    provider_name: str
    service_type: str
    amount: float
    preferred_date: str
    preferred_time: str
    payment_method: str = "wallet"
    notes: str = ""


@router.post("/booking/create")
async def create_manual_booking(req: ManualBookingRequest):
    """Create a manual booking with a selected provider."""
    provider = db_get_provider(req.provider_id)
    if not provider:
        # Fallback dictionary for dynamic/external providers
        provider = {
            "id": req.provider_id,
            "name": req.provider_name,
            "service_type": req.service_type,
            "base_rate": req.amount,
            "area": "DHA Lahore",
            "rating": 4.8,
            "review_count": 45,
            "reliability_score": 96,
            "response_time_minutes": 10,
        }
    
    booking = {
        "id": req.id,
        "status": "pending",
        "user_message": f"Manual booking for {req.provider_name}",
        "intent": {
            "service_type": req.service_type,
            "location": "DHA Lahore",
            "urgency": "scheduled",
            "confidence": 1.0,
        },
        "provider": provider,
        "pricing": {
            "base_rate": req.amount,
            "platform_fee": req.amount * 0.1,
            "total_held": req.amount * 1.1,
        },
        "schedule": {
            "date": req.preferred_date,
            "time_start": req.preferred_time,
        },
        "notes": req.notes,
        "alternatives": [],
        "excluded_providers": [],
        "created_at": datetime.now().isoformat(),
    }
    db_create_booking(booking)
    return {"booking": booking, "message": "Manual booking successfully created."}


# --- Escrow Payment System ---
class EscrowRequest(BaseModel):
    booking_id: str
    amount: float
    payment_method: str = "wallet"  # wallet, card, cash


@router.post("/escrow/create")
async def create_escrow(req: EscrowRequest):
    """Create an escrow hold for a booking payment."""
    existing = db_get_escrow(req.booking_id)
    if existing:
        return {"escrow": existing, "message": "Escrow already exists for this booking."}
    escrow = {
        "id": f"esc_{uuid.uuid4().hex[:10]}",
        "booking_id": req.booking_id,
        "amount": req.amount,
        "payment_method": req.payment_method,
        "status": "held",
        "created_at": datetime.now().isoformat(),
        "released_at": None,
    }
    db_create_escrow(escrow)
    # Deduct from customer wallet if payment method is wallet
    if req.payment_method == "wallet":
        wallet = db_get_wallet("customer")
        new_bal = wallet["balance"] - req.amount
        db_update_wallet("customer", {"balance": max(0, new_bal), "pending": wallet.get("pending", 0) + req.amount})
        db_add_wallet_transaction("customer", {
            "id": f"txn_{uuid.uuid4().hex[:6]}",
            "type": "escrow_hold",
            "amount": -req.amount,
            "desc": f"Escrow hold for booking {req.booking_id}",
            "date": datetime.now().strftime("%Y-%m-%d"),
        })
    return {"escrow": escrow, "message": f"Rs. {req.amount} held in escrow securely."}


@router.post("/escrow/release/{booking_id}")
async def release_escrow(booking_id: str):
    """Release escrow payment to technician after job completion."""
    escrow = db_get_escrow(booking_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    if escrow["status"] != "held":
        return {"escrow": escrow, "message": f"Escrow already {escrow['status']}."}
    db_update_escrow(booking_id, {"status": "released", "released_at": datetime.now().isoformat()})
    # Credit technician wallet
    tech_wallet = db_get_wallet("technician")
    platform_fee = escrow["amount"] * 0.1  # 10% platform fee
    payout = escrow["amount"] - platform_fee
    db_update_wallet("technician", {"balance": tech_wallet["balance"] + payout, "pending": max(0, tech_wallet.get("pending", 0) - escrow["amount"])})
    db_add_wallet_transaction("technician", {
        "id": f"txn_{uuid.uuid4().hex[:6]}",
        "type": "credit",
        "amount": payout,
        "desc": f"Payment for booking {booking_id} (after 10% fee)",
        "date": datetime.now().strftime("%Y-%m-%d"),
    })
    # Update customer pending
    cust_wallet = db_get_wallet("customer")
    db_update_wallet("customer", {"pending": max(0, cust_wallet.get("pending", 0) - escrow["amount"])})
    return {"escrow": db_get_escrow(booking_id), "message": f"Rs. {payout} released to technician. Platform fee: Rs. {platform_fee}"}


@router.post("/escrow/dispute/{booking_id}")
async def dispute_escrow(booking_id: str):
    """Hold escrow for dispute resolution."""
    escrow = db_get_escrow(booking_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    db_update_escrow(booking_id, {"status": "disputed"})
    return {"escrow": db_get_escrow(booking_id), "message": "Payment held for dispute resolution."}


@router.post("/escrow/refund/{booking_id}")
async def refund_escrow(booking_id: str):
    """Refund escrow payment to customer."""
    escrow = db_get_escrow(booking_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    db_update_escrow(booking_id, {"status": "refunded", "released_at": datetime.now().isoformat()})
    cust_wallet = db_get_wallet("customer")
    db_update_wallet("customer", {
        "balance": cust_wallet["balance"] + escrow["amount"],
        "pending": max(0, cust_wallet.get("pending", 0) - escrow["amount"])
    })
    db_add_wallet_transaction("customer", {
        "id": f"txn_{uuid.uuid4().hex[:6]}",
        "type": "refund",
        "amount": escrow["amount"],
        "desc": f"Refund for booking {booking_id}",
        "date": datetime.now().strftime("%Y-%m-%d"),
    })
    return {"escrow": db_get_escrow(booking_id), "message": f"Rs. {escrow['amount']} refunded to customer wallet."}


# --- Wallet ---
@router.get("/wallet/{user_type}")
async def get_wallet(user_type: str):
    """Get wallet balance and transactions."""
    wallet = db_get_wallet(user_type)
    return {"wallet": wallet}


# --- Chat ---
class ChatMessage(BaseModel):
    booking_id: str
    sender: str = "customer"  # customer or technician
    message: str
    message_type: str = "text"  # text, image, voice_note


@router.post("/chat/send")
async def send_chat(msg: ChatMessage):
    """Send a chat message."""
    chat = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "booking_id": msg.booking_id,
        "sender": msg.sender,
        "message": msg.message,
        "message_type": msg.message_type,
        "timestamp": datetime.now().isoformat(),
    }
    db_save_chat(chat)
    return {"message": chat}


@router.get("/chat/{booking_id}")
async def get_chat_messages(booking_id: str):
    """Get all chat messages for a booking."""
    messages = db_get_chat(booking_id)
    return {"messages": messages}

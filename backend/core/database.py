import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
from database.connection import engine, SessionLocal, Base
from database import models
from data.seed import PROVIDERS

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

def get_db_session() -> Session:
    return SessionLocal()

# Seed database with providers if empty
def seed_providers_if_empty():
    db = get_db_session()
    try:
        count = db.query(models.Provider).count()
        if count == 0:
            print("[INFO] Seeding database with initial providers...")
            for p in PROVIDERS:
                # Create user first
                user_id = f"usr_{p['id'].lower().replace('-', '_')}"
                db_user = db.query(models.User).filter(models.User.id == user_id).first()
                if not db_user:
                    db_user = models.User(
                        id=user_id,
                        email=f"{p['name'].lower().replace(' ', '')}@servicepilot.pk",
                        phone=p.get("phone", "+92 300 0000000"),
                        role="provider",
                        status="active"
                    )
                    db.add(db_user)
                    db.commit()
                
                # Create provider
                db_provider = models.Provider(
                    id=p["id"],
                    user_id=user_id,
                    name=p["name"],
                    rating=p.get("rating", 4.5),
                    review_count=p.get("review_count", 0),
                    trust_score=p.get("trust_score", 50.0),
                    cancellation_rate=p.get("cancellation_rate", 0.0),
                    base_rate=p.get("base_rate", 1000.0),
                    experience_years=p.get("experience_years", 1),
                    on_time_score=p.get("on_time_score", 0.9),
                    reliability_score=p.get("reliability_score", 90.0),
                    customer_repeat_rate=p.get("customer_repeat_rate", 0.1),
                    response_time_minutes=p.get("response_time_minutes", 10),
                    area=p.get("area", p.get("location", {}).get("area")),
                    is_verified=p.get("is_verified", True),
                    verified_status=p.get("verified_status", "fully_verified"),
                    phone=p.get("phone")
                )
                db.add(db_provider)
                db.commit()

                # Add profile
                db_profile = models.ProviderProfile(
                    id=f"prof_{p['id']}",
                    provider_id=p["id"],
                    biography=f"Professional {p['service_type']} services.",
                    certifications=p.get("certifications", []),
                    profile_verified=p.get("profile_verified", True)
                )
                db.add(db_profile)

                # Add category if not exists
                cat_name = p["service_type"]
                cat_id = f"cat_{cat_name.lower().replace(' ', '_')}"
                db_cat = db.query(models.ServiceCategory).filter(models.ServiceCategory.id == cat_id).first()
                if not db_cat:
                    db_cat = models.ServiceCategory(
                        id=cat_id,
                        name=cat_name,
                        description=f"{cat_name} services category",
                        base_rate_estimate=p.get("base_rate", 1000.0)
                    )
                    db.add(db_cat)
                    db.commit()

                # Add listing
                db_listing = models.ProviderListing(
                    id=f"lst_{p['id']}",
                    provider_id=p["id"],
                    category_id=cat_id,
                    title=f"Expert {p['service_type']} Services by {p['name']}",
                    description=f"Specialized in: {', '.join(p.get('specializations', []))}",
                    pricing_packages={"basic": p.get("base_rate", 1000.0)},
                    faqs=[]
                )
                db.add(db_listing)

                # Add availability
                for date, slots in p.get("availability", {}).items():
                    db_avail = models.ProviderAvailability(
                        id=f"av_{p['id']}_{date.replace('-', '')}",
                        provider_id=p["id"],
                        date=date,
                        slots=slots,
                        capacity_limit=p.get("capacity", 4)
                    )
                    db.add(db_avail)

                # Add keywords
                for spec in p.get("specializations", []):
                    db_keyword = models.ProviderKeyword(
                        id=f"kw_{p['id']}_{spec.replace(' ', '')}",
                        provider_id=p["id"],
                        keyword=spec
                    )
                    db.add(db_keyword)
            db.commit()
    except Exception as e:
        print(f"Error seeding providers: {e}")
        db.rollback()
    finally:
        db.close()

seed_providers_if_empty()

# ---------- Helper methods to bridge to ORM ----------

def db_get_providers(filters: dict | None = None) -> list[dict]:
    db = get_db_session()
    try:
        query = db.query(models.Provider)
        if filters:
            if filters.get("service_type"):
                st = filters["service_type"].lower()
                query = query.filter(models.Provider.name.ilike(f"%{st}%") | models.Provider.id.in_(
                    db.query(models.ProviderListing.provider_id).join(models.ServiceCategory).filter(
                        models.ServiceCategory.name.ilike(f"%{st}%")
                    )
                ))
            if filters.get("location"):
                query = query.filter(models.Provider.area.ilike(f"%{filters['location']}%"))
        
        providers = query.all()
        results = []
        for p in providers:
            p_listings = getattr(p, "listings", []) or []
            p_keywords = getattr(p, "keywords", []) or []
            p_availability = getattr(p, "availability", []) or []
            p_reviews = getattr(p, "reviews", []) or []
            p_bookings = getattr(p, "bookings_as_provider", []) or []
            results.append({
                "id": p.id,
                "name": p.name,
                "service_type": p_listings[0].category.name if p_listings else "Specialist",
                "service_types": [l.category.name.lower() for l in p_listings] if p_listings else [],
                "specializations": [kw.keyword for kw in p_keywords],
                "area": p.area,
                "rating": p.rating,
                "review_count": p.review_count,
                "base_rate": p.base_rate,
                "phone": p.phone,
                "is_verified": p.is_verified,
                "verified_status": p.verified_status,
                "reliability_score": p.reliability_score,
                "on_time_score": p.on_time_score,
                "cancellation_rate": p.cancellation_rate,
                "availability": {av.date: av.slots for av in p_availability} if p_availability else {},
                "recent_reviews": [{"rating": r.rating, "text": r.comment} for r in p_reviews] if p_reviews else [{"rating": r.rating, "text": r.comment} for b in p_bookings for r in getattr(b, "reviews", [])] if p_bookings else [],
                "location": {
                    "lat": 31.4697,
                    "lng": 74.3762,
                    "area": p.area
                }
            })
        return results
    finally:
        db.close()

def db_get_provider(provider_id: str) -> dict | None:
    db = get_db_session()
    try:
        p = db.query(models.Provider).filter(models.Provider.id == provider_id).first()
        if not p:
            return None
        p_listings = getattr(p, "listings", []) or []
        p_keywords = getattr(p, "keywords", []) or []
        p_availability = getattr(p, "availability", []) or []
        p_reviews = getattr(p, "reviews", []) or []
        p_bookings = getattr(p, "bookings_as_provider", []) or []
        return {
            "id": p.id,
            "name": p.name,
            "service_type": p_listings[0].category.name if p_listings else "Specialist",
            "specializations": [kw.keyword for kw in p_keywords],
            "area": p.area,
            "rating": p.rating,
            "review_count": p.review_count,
            "base_rate": p.base_rate,
            "phone": p.phone,
            "is_verified": p.is_verified,
            "verified_status": p.verified_status,
            "reliability_score": p.reliability_score,
            "availability": {av.date: av.slots for av in p_availability} if p_availability else {},
            "recent_reviews": [{"rating": r.rating, "text": r.comment} for r in p_reviews] if p_reviews else [{"rating": r.rating, "text": r.comment} for b in p_bookings for r in getattr(b, "reviews", [])] if p_bookings else [],
            "location": {
                "lat": 31.4697,
                "lng": 74.3762,
                "area": p.area
            }
        }
    finally:
        db.close()

def db_update_provider(provider_id: str, updates: dict) -> dict | None:
    db = get_db_session()
    try:
        p = db.query(models.Provider).filter(models.Provider.id == provider_id).first()
        if not p:
            return None
        for k, v in updates.items():
            if hasattr(p, k):
                setattr(p, k, v)
        db.commit()
        return db_get_provider(provider_id)
    finally:
        db.close()

def db_save_external_provider(provider: dict) -> dict:
    # External providers are mapped to the standard Provider table marked with external listing status
    db = get_db_session()
    try:
        user_id = f"usr_ext_{provider.get('name', '').lower().replace(' ', '')[:20]}"
        # Ensure external user exists
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not db_user:
            db_user = models.User(id=user_id, role="provider", status="active")
            db.add(db_user)
            db.commit()

        p_id = f"EXT-{provider.get('name', '')[:3].upper()}-{datetime.utcnow().microsecond}"
        db_provider = models.Provider(
            id=p_id,
            user_id=user_id,
            name=provider.get("name"),
            rating=provider.get("rating", 4.0),
            review_count=provider.get("review_count", 0),
            trust_score=provider.get("trust_score", 50.0),
            base_rate=provider.get("rate", 1000.0),
            phone=provider.get("phone", "+92 300 0000000"),
            area=provider.get("area", "Lahore"),
            is_verified=True,
            verified_status="fully_verified"
        )
        db.add(db_provider)
        db.commit()
        
        provider["id"] = p_id
        return provider
    finally:
        db.close()

def db_log_search(log_data: dict) -> dict:
    return log_data

# ---------- Booking helpers ----------

def db_create_booking(booking_data: dict) -> dict:
    db = get_db_session()
    try:
        # Create users if not exist
        cust_id = booking_data.get("customer_id", "customer")
        db_cust = db.query(models.User).filter(models.User.id == cust_id).first()
        if not db_cust:
            db_cust = models.User(id=cust_id, role="customer")
            db.add(db_cust)
            db.commit()

        prov_id = booking_data.get("provider", {}).get("id") or booking_data.get("provider_id", "PRV-001")
        
        db_booking = models.Booking(
            id=booking_data.get("id"),
            customer_id=cust_id,
            provider_id=prov_id,
            service_type=booking_data.get("service_type") or booking_data.get("intent", {}).get("service_type") or "AC Repair",
            location=booking_data.get("location") or booking_data.get("intent", {}).get("location"),
            timing=booking_data.get("timing") or booking_data.get("schedule", {}).get("time_start"),
            urgency=booking_data.get("urgency") or booking_data.get("intent", {}).get("urgency") or "Normal",
            status=booking_data.get("status", "pending"),
            details=booking_data.get("details") or booking_data.get("user_message"),
            total_amount=booking_data.get("pricing", {}).get("total_amount") or booking_data.get("pricing", {}).get("total_held") or booking_data.get("total_amount") or 1000.0
        )
        db.add(db_booking)
        db.commit()

        # Log initial status
        db_log = models.BookingStatusLog(
            id=f"log_{db_booking.id}_{datetime.utcnow().microsecond}",
            booking_id=db_booking.id,
            status=db_booking.status,
            changed_by="system"
        )
        db.add(db_log)
        db.commit()

        return booking_data
    finally:
        db.close()

def db_get_booking(booking_id: str) -> dict | None:
    db = get_db_session()
    try:
        b = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not b:
            return None
        return {
            "id": b.id,
            "customer_id": b.customer_id,
            "service_type": b.service_type,
            "location": b.location,
            "timing": b.timing,
            "urgency": b.urgency,
            "status": b.status,
            "details": b.details,
            "pricing": {
                "base_rate": b.total_amount / 1.1,
                "platform_fee": b.total_amount * 0.1,
                "total_amount": b.total_amount,
                "total": b.total_amount
            },
            "provider": {
                "id": b.provider.id,
                "name": b.provider.name,
                "rate": b.provider.base_rate,
                "phone": b.provider.phone,
                "area": b.provider.area
            }
        }
    finally:
        db.close()

def db_update_booking(booking_id: str, updates: dict) -> dict | None:
    db = get_db_session()
    try:
        b = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not b:
            return None
        
        status_changed = "status" in updates and updates["status"] != b.status
        
        for k, v in updates.items():
            if k == "status":
                b.status = v
            elif k == "details":
                b.details = v
            elif k == "location":
                b.location = v
            elif k == "timing":
                b.timing = v
        
        db.commit()

        if status_changed:
            db_log = models.BookingStatusLog(
                id=f"log_{b.id}_{datetime.utcnow().microsecond}",
                booking_id=b.id,
                status=b.status,
                changed_by="system"
            )
            db.add(db_log)
            db.commit()

        return db_get_booking(booking_id)
    finally:
        db.close()

def db_get_bookings() -> list[dict]:
    db = get_db_session()
    try:
        bookings = db.query(models.Booking).order_by(models.Booking.created_at.desc()).all()
        results = []
        for b in bookings:
            results.append({
                "id": b.id,
                "customer_id": b.customer_id,
                "service_type": b.service_type,
                "location": b.location,
                "timing": b.timing,
                "status": b.status,
                "pricing": {"total_amount": b.total_amount, "total": b.total_amount},
                "provider": {"name": b.provider.name}
            })
        return results
    finally:
        db.close()

# ---------- Trace helpers ----------

def db_save_trace(trace: dict) -> dict:
    db = get_db_session()
    try:
        b_id = trace.get("booking_id")
        # Ensure target booking exists or use None
        if b_id and not db.query(models.Booking).filter(models.Booking.id == b_id).first():
            b_id = None

        db_trace = models.AITraceLog(
            id=f"tr_{datetime.utcnow().microsecond}",
            booking_id=b_id,
            agent_name=trace.get("agent", "AgenticCore"),
            input_payload={"input": trace.get("input")},
            reasoning=trace.get("reasoning", []),
            output_payload={"output": trace.get("output")},
            status=trace.get("status", "success")
        )
        db.add(db_trace)
        db.commit()
        return trace
    finally:
        db.close()

def db_get_trace(booking_id: str) -> dict | None:
    db = get_db_session()
    try:
        logs = db.query(models.AITraceLog).filter(models.AITraceLog.booking_id == booking_id).order_by(models.AITraceLog.created_at.asc()).all()
        if not logs:
            return None
        
        traces = []
        recovery_at = None
        for t in logs:
            traces.append({
                "agent": t.agent_name,
                "input": t.input_payload.get("input") if t.input_payload else "",
                "reasoning": t.reasoning or [],
                "output": t.output_payload.get("output") if t.output_payload else "",
                "status": t.status
            })
            if t.status == "recovered" or t.agent_name == "RecoveryAgent":
                recovery_at = t.created_at.isoformat() if hasattr(t.created_at, "isoformat") else str(t.created_at)
                
        return {
            "booking_id": booking_id,
            "traces": traces,
            "steps": traces,  # Mapped to traces for complete mobile compatibility
            "recovery_at": recovery_at
        }
    finally:
        db.close()

# ---------- Escrow helpers ----------

def db_create_escrow(escrow: dict) -> dict:
    db = get_db_session()
    try:
        db_escrow = models.EscrowTransaction(
            id=f"esc_{escrow.get('booking_id')}_{datetime.utcnow().microsecond}",
            booking_id=escrow.get("booking_id"),
            customer_id=escrow.get("customer_id", "customer"),
            provider_id=escrow.get("provider_id", "PRV-001"),
            amount=escrow.get("amount", 1000.0),
            status=escrow.get("status", "locked"),
            release_authorized=False
        )
        db.add(db_escrow)
        db.commit()
        return escrow
    finally:
        db.close()

def db_get_escrow(booking_id: str) -> dict | None:
    db = get_db_session()
    try:
        e = db.query(models.EscrowTransaction).filter(models.EscrowTransaction.booking_id == booking_id).first()
        if not e:
            return None
        return {
            "booking_id": e.booking_id,
            "amount": e.amount,
            "status": e.status,
            "release_authorized": e.release_authorized
        }
    finally:
        db.close()

def db_update_escrow(booking_id: str, updates: dict) -> dict | None:
    db = get_db_session()
    try:
        e = db.query(models.EscrowTransaction).filter(models.EscrowTransaction.booking_id == booking_id).first()
        if not e:
            return None
        for k, v in updates.items():
            if hasattr(e, k):
                setattr(e, k, v)
        db.commit()
        return db_get_escrow(booking_id)
    finally:
        db.close()

# ---------- Wallet helpers ----------

_mem_wallets = {
    "customer": {"balance": 5000, "pending": 0, "transactions": []},
    "technician": {"balance": 12500, "pending": 2500, "transactions": []}
}

def db_get_wallet(user_type: str) -> dict:
    return _mem_wallets.get(user_type, {"balance": 0, "pending": 0, "transactions": []})

def db_update_wallet(user_type: str, updates: dict) -> dict:
    _mem_wallets[user_type].update(updates)
    return _mem_wallets[user_type]

def db_add_wallet_transaction(user_type: str, txn: dict) -> dict:
    _mem_wallets[user_type]["transactions"].insert(0, txn)
    return txn

# ---------- Chat helpers ----------

def db_save_chat(message: dict) -> dict:
    db = get_db_session()
    try:
        b_id = message.get("booking_id")
        room_id = f"room_{b_id}"
        db_room = db.query(models.ChatRoom).filter(models.ChatRoom.id == room_id).first()
        if not db_room:
            db_room = models.ChatRoom(
                id=room_id,
                booking_id=b_id,
                customer_id="customer",
                provider_id="PRV-001"
            )
            db.add(db_room)
            db.commit()
        
        db_msg = models.Message(
            id=f"msg_{datetime.utcnow().microsecond}",
            chat_room_id=room_id,
            sender_id=message.get("role", "user"),
            text=message.get("text"),
            created_at=datetime.utcnow()
        )
        db.add(db_msg)
        db.commit()
        return message
    finally:
        db.close()

def db_get_chat(booking_id: str) -> list[dict]:
    db = get_db_session()
    try:
        room_id = f"room_{booking_id}"
        messages = db.query(models.Message).filter(models.Message.chat_room_id == room_id).order_by(models.Message.created_at.asc()).all()
        results = []
        for m in messages:
            results.append({
                "booking_id": booking_id,
                "role": m.sender_id,
                "text": m.text,
                "timestamp": m.created_at.isoformat()
            })
        return results
    finally:
        db.close()

# ---------- Compatibility Helpers ----------
def _use_memory():
    return True

_mem_external_providers = []

def get_supabase():
    class MockSupabase:
        class MockTable:
            def select(self, *args, **kwargs):
                return self
            def execute(self):
                class MockData:
                    data = []
                return MockData()
        def table(self, name):
            return self.MockTable()
    return MockSupabase()


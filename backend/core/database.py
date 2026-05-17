from core import settings
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None
import json

_supabase: Client | None = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        else:
            raise RuntimeError("Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_KEY in .env")
    return _supabase


# ---------------------------------------------------------------------------
# In-memory fallback store (used when Supabase is not configured)
# This allows the entire demo to run without any external dependency.
# ---------------------------------------------------------------------------

_mem_providers: list[dict] = []
_mem_bookings: list[dict] = []
_mem_traces: list[dict] = []
_mem_external_providers: list[dict] = []
_mem_search_logs: list[dict] = []
_mem_escrow: list[dict] = []
_mem_chats: list[dict] = []
_mem_wallets: dict = {
    "customer": {"balance": 5000, "pending": 0, "transactions": [
        {"id": "txn_001", "type": "credit", "amount": 5000, "desc": "Welcome bonus", "date": "2025-05-01"},
    ]},
    "technician": {"balance": 12500, "pending": 2500, "earnings_total": 45000, "transactions": [
        {"id": "txn_t01", "type": "credit", "amount": 3500, "desc": "Booking #BK-201 payment", "date": "2025-05-14"},
        {"id": "txn_t02", "type": "credit", "amount": 2800, "desc": "Booking #BK-198 payment", "date": "2025-05-12"},
    ]},
}

def _use_memory() -> bool:
    """Return True when we should use the in-memory store."""
    return create_client is None or not (settings.SUPABASE_URL and settings.SUPABASE_KEY)


# ---------- Provider helpers ----------

def db_get_providers(filters: dict | None = None) -> list[dict]:
    if _use_memory():
        if not _mem_providers:
            from data.seed import PROVIDERS
            _mem_providers.extend(PROVIDERS)
        results = list(_mem_providers)
        if filters:
            if filters.get("service_type"):
                st = filters["service_type"].lower()
                results = [p for p in results if 
                    st in p.get("service_type", "").lower() or
                    any(st in s.lower() for s in p.get("service_types", []))
                ]
            if filters.get("location"):
                results = [p for p in results if filters["location"].lower() in str(p.get("area", "")).lower()]
        return results
    # Supabase path
    sb = get_supabase()
    query = sb.table("providers").select("*")
    if filters:
        if filters.get("service_type"):
            query = query.ilike("service_type", f"%{filters['service_type']}%")
        if filters.get("location"):
            query = query.ilike("area", f"%{filters['location']}%")
    return query.execute().data


def db_get_provider(provider_id: str) -> dict | None:
    if _use_memory():
        if not _mem_providers:
            from data.seed import PROVIDERS
            _mem_providers.extend(PROVIDERS)
        return next((p for p in _mem_providers if p["id"] == provider_id), None)
    sb = get_supabase()
    rows = sb.table("providers").select("*").eq("id", provider_id).execute().data
    return rows[0] if rows else None


def db_update_provider(provider_id: str, updates: dict) -> dict | None:
    if _use_memory():
        for p in _mem_providers:
            if p["id"] == provider_id:
                p.update(updates)
                return p
        return None
    sb = get_supabase()
    rows = sb.table("providers").update(updates).eq("id", provider_id).execute().data
    return rows[0] if rows else None


# ---------- External Providers helpers ----------

def db_save_external_provider(provider: dict) -> dict:
    if _use_memory():
        _mem_external_providers.append(provider)
        return provider
    sb = get_supabase()
    # Map the dict keys to the Supabase schema if necessary, or just insert
    # Assuming provider dict has correct structure for external_providers table
    row = {
        "business_name": provider.get("name"),
        "phone_number": provider.get("phone"),
        "rating": provider.get("rating"),
        "review_count": provider.get("review_count"),
        "trust_score": provider.get("trust_score"),
        "specializations": provider.get("specializations", []),
        "is_open_now": provider.get("is_open_now", True)
    }
    return sb.table("external_providers").insert(row).execute().data[0]

def db_log_search(log_data: dict) -> dict:
    if _use_memory():
        _mem_search_logs.append(log_data)
        return log_data
    sb = get_supabase()
    return sb.table("external_provider_search_logs").insert(log_data).execute().data[0]


# ---------- Booking helpers ----------

def db_create_booking(booking: dict) -> dict:
    if _use_memory():
        _mem_bookings.append(booking)
        return booking
    sb = get_supabase()
    return sb.table("bookings").insert(booking).execute().data[0]


def db_get_booking(booking_id: str) -> dict | None:
    if _use_memory():
        return next((b for b in _mem_bookings if b["id"] == booking_id), None)
    sb = get_supabase()
    rows = sb.table("bookings").select("*").eq("id", booking_id).execute().data
    return rows[0] if rows else None


def db_update_booking(booking_id: str, updates: dict) -> dict | None:
    if _use_memory():
        for b in _mem_bookings:
            if b["id"] == booking_id:
                b.update(updates)
                return b
        return None
    sb = get_supabase()
    rows = sb.table("bookings").update(updates).eq("id", booking_id).execute().data
    return rows[0] if rows else None


def db_get_bookings() -> list[dict]:
    if _use_memory():
        return list(_mem_bookings)
    sb = get_supabase()
    return sb.table("bookings").select("*").order("created_at", desc=True).execute().data


# ---------- Trace helpers ----------

def db_save_trace(trace: dict) -> dict:
    if _use_memory():
        _mem_traces.append(trace)
        return trace
    sb = get_supabase()
    return sb.table("traces").insert(trace).execute().data[0]


def db_get_trace(booking_id: str) -> dict | None:
    if _use_memory():
        return next((t for t in _mem_traces if t.get("booking_id") == booking_id), None)
    sb = get_supabase()
    rows = sb.table("traces").select("*").eq("booking_id", booking_id).execute().data
    return rows[0] if rows else None


# ---------- Escrow helpers ----------

def db_create_escrow(escrow: dict) -> dict:
    _mem_escrow.append(escrow)
    return escrow

def db_get_escrow(booking_id: str) -> dict | None:
    return next((e for e in _mem_escrow if e.get("booking_id") == booking_id), None)

def db_update_escrow(booking_id: str, updates: dict) -> dict | None:
    for e in _mem_escrow:
        if e.get("booking_id") == booking_id:
            e.update(updates)
            return e
    return None


# ---------- Wallet helpers ----------

def db_get_wallet(user_type: str) -> dict:
    return _mem_wallets.get(user_type, {"balance": 0, "pending": 0, "transactions": []})

def db_update_wallet(user_type: str, updates: dict) -> dict:
    if user_type not in _mem_wallets:
        _mem_wallets[user_type] = {"balance": 0, "pending": 0, "transactions": []}
    _mem_wallets[user_type].update(updates)
    return _mem_wallets[user_type]

def db_add_wallet_transaction(user_type: str, txn: dict) -> dict:
    if user_type not in _mem_wallets:
        _mem_wallets[user_type] = {"balance": 0, "pending": 0, "transactions": []}
    _mem_wallets[user_type]["transactions"].insert(0, txn)
    return txn


# ---------- Chat helpers ----------

def db_save_chat(message: dict) -> dict:
    _mem_chats.append(message)
    return message

def db_get_chat(booking_id: str) -> list[dict]:
    return [m for m in _mem_chats if m.get("booking_id") == booking_id]

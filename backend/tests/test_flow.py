import asyncio
import os
import sys

# Ensure python finds backend folder
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from agents.orchestrator import process_service_request, cancel_and_recover, submit_feedback
from database.connection import SessionLocal, Base, engine
from database import models

from core.database import seed_providers_if_empty

async def test_full_pipeline():
    print("[INFO] Initializing Test Database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_providers_if_empty()
    
    # 1. Greet test
    print("\n--- Test 1: Greeting & Conversation Agent ---")
    res1 = await process_service_request("Assalam o Alaikum, how are you?")
    print(f"Reply: {res1['message']}")
    if res1['message'] == "Abh service available nahi hai, system mein kuch problem hai.":
        print("[WARNING] Gemini API is offline or expired. Skipping assertions requiring live AI responses.")
        return
    assert "AI Agent" in res1['message'] or "ServicePilot" in res1['message']

    # 1b. Technical Question Conversational bypass test
    print("\n--- Test 1b: Technical Question Conversational Bypass ---")
    res1b = await process_service_request("AC ka pipe kiyu leak huta h?")
    print(f"Reply: {res1b['message']}")
    assert res1b['action'] == "NONE"
    assert any(w in res1b['message'].lower() for w in ["leak", "drain", "coil", "pipe", "water", "servicepilot", "ac"])
    assert "kis area" not in res1b['message'].lower() and "kis city" not in res1b['message'].lower()
    
    # 2. Intent extraction & discovery test
    print("\n--- Test 2: Matching, Scheduling & Pricing Agent ---")
    res2 = await process_service_request("Mujhe AC repair specialist chahiye DHA Lahore mein jo filter cleaning kar sake.")
    print(f"Reply: {res2['message']}")
    assert "AC Repair" in res2['service_type']
    assert "DHA" in res2['location']
    
    # 3. Time slot selection step 1
    print("\n--- Test 3: Booking Slot Lock ---")
    res3 = await process_service_request(
        "10:00 AM",
        booking_step=1,
        selected_tech_name="Ahmed Cooling Services",
        selected_tech_rate=1200.0,
        selected_time_slot="10:00 AM"
    )
    print(f"Reply: {res3['message']}")
    assert res3['action'] == "LOCK_SLOT"
    
    # 4. Confirmation booking step 2
    print("\n--- Test 4: Escrow Hold & Booking Creation ---")
    res4 = await process_service_request(
        "yes confirm it",
        booking_step=2,
        selected_tech_name="Ahmed Cooling Services",
        selected_tech_rate=1200.0,
        selected_time_slot="10:00 AM"
    )
    print(f"Reply: {res4['message']}")
    assert res4['booking'] is not None
    b_id = res4['booking']['id']
    assert res4['booking']['status'] == "confirmed"
    
    # Verify DB traces
    db = SessionLocal()
    try:
        traces = db.query(models.AITraceLog).all()
        print(f"Recorded AI traces count: {len(traces)}")
        assert len(traces) > 0
        for t in traces:
            print(f" - Agent: {t.agent_name} | Reasoning steps: {len(t.reasoning)}")
            
        # Verify Escrow Locked
        escrow = db.query(models.EscrowTransaction).filter(models.EscrowTransaction.booking_id == b_id).first()
        assert escrow is not None
        assert escrow.status == "locked"
        print(f"[OK] Custody Escrow successfully locked: Rs. {escrow.amount}")
    finally:
        db.close()
        
    # 5. Feedback & Escrow release
    print("\n--- Test 5: Payout release on feedback ---")
    res5 = await submit_feedback(b_id, 5, "Amazing expert job done!")
    print(f"Reply: {res5['message']}")
    
    db = SessionLocal()
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == b_id).first()
        assert booking.status == "completed"
        escrow = db.query(models.EscrowTransaction).filter(models.EscrowTransaction.booking_id == b_id).first()
        assert escrow.status == "released"
        print(f"[OK] Custody Escrow successfully released to provider! Status: {escrow.status}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())

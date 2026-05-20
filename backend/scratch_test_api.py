import os
import sys
import asyncio

# Ensure python finds backend folder
sys.path.append(os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from core.ai_manager import ai_manager
from agents.intent_agent import parse_intent

async def main():
    print("=== Testing AIManager ===")
    print(f"Vertex AI Available: {ai_manager.vertex_available}")
    print(f"Legacy Gemini Available: {ai_manager.legacy_available}")
    
    # 1. Test Static Bypass
    print("\n--- Test 1: Static Greeting Bypass ---")
    res1 = await parse_intent("hi")
    print(f"Bypassed Reply: {res1['intent']['reply']}")
    assert "ServicePilot AI" in res1['intent']['reply']
    print("[OK] Greeting bypass works.")
    
    # 2. Test LLM Intent Extraction (will hit Vertex or Legacy)
    print("\n--- Test 2: LLM Intent Parsing ---")
    res2 = await parse_intent("Mujhe AC repair specialist chahiye DHA Lahore mein jo filter cleaning kar sake.")
    print(f"Parsed JSON intent: {res2['intent']}")
    assert res2['intent']['service_type'] == "AC Repair"
    assert "DHA" in res2['intent']['location'].upper()
    print("[OK] LLM Intent parsing works.")
    
    # 3. Test Caching
    print("\n--- Test 3: Caching Verification ---")
    print("Calling same message again...")
    import time
    start = time.time()
    res3 = await parse_intent("Mujhe AC repair specialist chahiye DHA Lahore mein jo filter cleaning kar sake.")
    duration = time.time() - start
    print(f"Second call duration: {duration:.4f} seconds")
    # Cache hit should be near-instantaneous (under 10ms)
    assert duration < 0.1
    print("[OK] Cache hit works near-instantaneously.")

if __name__ == "__main__":
    asyncio.run(main())

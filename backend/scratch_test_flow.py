import os
import sys
import asyncio

# Configure UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Ensure python finds backend folder
sys.path.append(os.path.dirname(__file__))

from agents.orchestrator import process_service_request

async def test():
    # Message 1
    msg1 = "AC repair"
    hist1 = []
    print(f"--- Sending: '{msg1}' ---")
    res1 = await process_service_request(msg1, chat_history=hist1)
    print("Action:", res1.get("action"))
    print("Message:", res1.get("message"))
    
    # Message 2
    msg2 = "g check kara"
    hist2 = [
        {"role": "user", "text": msg1},
        {"role": "assistant", "text": res1.get("message")}
    ]
    print(f"\n--- Sending: '{msg2}' ---")
    res2 = await process_service_request(msg2, chat_history=hist2)
    print("Action:", res2.get("action"))
    print("Message:", res2.get("message"))

if __name__ == "__main__":
    asyncio.run(test())

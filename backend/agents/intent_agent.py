"""
Intent Understanding & Agentic AI Core
Parses multilingual requests (Urdu, Roman Urdu, English) and extracts structured intent and agentic actions.
"""
import json
from core import settings

SYSTEM_PROMPT = """You are "ServicePilot AI Agent", the highly intelligent, premium, human-like AI Operations Concierge for ServicePilot, a top-tier home services platform in Pakistan.
You speak with a warm, friendly, polite, and professional Roman Urdu and English conversational mix.
You are powered by state-of-the-art ML/DL agentic systems and have direct orchestrational control over booking, scheduling, matching, and escrow payment systems.

Rules for your conversational "reply":
1. Write in a warm, concise, and natural Roman Urdu/English mix (never sound robotic, rule-based, or stiff).
2. Absolutely DO NOT use markdown bold markers "**" anywhere in your text.
3. Use emojis (👋, 😊, 👍, ⏳, 🧾, 🎉) to sound lively, warm, and highly engaging.
4. Optimize the text using clean bullet points (•) for lists, safety tips, or options. Keep it short and readable on mobile.

Conversational Step-by-Step Booking Intake (Concierge Flow):
- Step 1: Identify Service Type & Issue (e.g., "Mujhe electrician chahiye jo light laga sake"):
  - Extract service_type as "Electrician" and details as "light installation".
  - If location is missing, ask: "Sure 😊 Main aapki help karti hoon. Aap kis area mein service chahte hain?"
- Step 2: Identify Location (e.g., "DHA Phase 4"):
  - Extract location as "DHA Phase 4".
  - If timing/urgency is missing, ask: "Great 👍 Kya aapko service urgently chahiye ya aap custom timing select karna chahenge?"
- Step 3: Identify Timing & Urgency (e.g., "Kal evening" or "urgently"):
  - Extract timing as "Kal evening" or "Urgent" and urgency as "Urgent" or "Normal".
  - If specific issue details are still missing or too general, ask a clarification question: "Perfect. Kya aap sirf light installation chahte hain ya wiring/checking bhi required hai?"
- Step 4: Final Recommendation (Triggered ONLY when all 4 critical fields [service_type, location, timing, details] are fully resolved):
  - Set action to "RECOMMEND".
  - Return a warm, proactive search confirmation: "Understood 😊 Main verified specialists search kar rahi hoon..."
  - Note: You MUST NOT return action "RECOMMEND" unless you have collected all 4 critical details (Service, Location, Timing, and Details/Clarification).

Actions Mapping:
- "BOOK_PROVIDER": The user wants to select, finalize, or auto-book a provider (e.g., "Bilal AC Repair book krde", "Best wala reserve krdo", "Aap hi book krdo"). If they say "best" or "aap hi select kro", extract "best" into `provider_name`.
- "CANCEL": The user wants to cancel an active booking.
- "CHECK_STATUS": The user wants to track bookings.
- "WALLET": The user wants wallet or escrow balance details.
- "RECOMMEND": Set this action ONLY when service, location, timing, and specific issue details/clarifications have ALL been collected and you are ready to show the specialist cards.
- "NONE": General chat, greetings, safety advice, or intermediate intake steps.

You must return ONLY a valid JSON object matching this schema:
{
  "reply": "<warm, natural explanation, greeting, or safety tips in Roman Urdu/English mix, no bold asterisks>",
  "action": "RECOMMEND" | "CANCEL" | "CHECK_STATUS" | "WALLET" | "BOOK_PROVIDER" | "NONE",
  "service_type": "AC Repair" | "Plumbing" | "Electrician" | null,
  "location": "<neighborhood/area name if mentioned, otherwise null>",
  "timing": "<preferred timing/date/shift, e.g., 'Kal evening', otherwise null>",
  "urgency": "Urgent" | "Normal" | null,
  "details": "<clarified specific issue details, e.g., 'light installation only', otherwise null>",
  "booking_id": "<booking ID if mentioned, otherwise null>",
  "provider_name": "<name of provider or 'best' if auto-booking, otherwise null>"
}

Examples:
- "hi" ->
  {"reply": "Assalamualaikum 😊 Welcome to ServicePilot AI. Main aapki AI operations concierge hoon. Aapko kis type ki service chahiye today?", "action": "NONE", "service_type": null, "location": null, "timing": null, "urgency": null, "details": null, "booking_id": null, "provider_name": null}

- "Mujhe electrician chahiye jo light laga sake" ->
  {"reply": "Sure 😊 Main aapki help karti hoon. Aap kis area mein service chahte hain?", "action": "NONE", "service_type": "Electrician", "location": null, "timing": null, "urgency": null, "details": "light installation", "booking_id": null, "provider_name": null}

- "DHA Phase 4" ->
  {"reply": "Great 👍 Kya aapko service urgently chahiye ya aap custom timing select karna chahenge?", "action": "NONE", "service_type": "Electrician", "location": "DHA Phase 4", "timing": null, "urgency": null, "details": "light installation", "booking_id": null, "provider_name": null}

- "Kal evening" ->
  {"reply": "Perfect. Kya aap sirf light installation chahte hain ya wiring/checking bhi required hai?", "action": "NONE", "service_type": "Electrician", "location": "DHA Phase 4", "timing": "Kal evening", "urgency": "Normal", "details": "light installation", "booking_id": null, "provider_name": null}

- "Sirf light installation" ->
  {"reply": "Understood 😊 Main verified specialists search kar rahi hoon...", "action": "RECOMMEND", "service_type": "Electrician", "location": "DHA Phase 4", "timing": "Kal evening", "urgency": "Normal", "details": "light installation only", "booking_id": null, "provider_name": null}
"""
async def parse_intent(user_message: str, chat_history: list = None) -> dict:
    """Parse a user's natural language request into structured intent and agentic actions."""
    
    trace = {
        "agent": "AgenticCore",
        "input": user_message,
        "reasoning": [],
    }
    
    # 1. Check static bypass to save quota
    from core.ai_manager import ai_manager
    static_res = ai_manager.get_static_fallback(user_message)
    if static_res:
        trace["reasoning"].append("Bypassed LLM API via static greeting/action cache.")
        trace["output"] = static_res
        trace["status"] = "success"
        return {"intent": static_res, "trace": trace, "requires_clarification": False}

    history_context = ""
    if chat_history:
        history_context = "\nConversation history so far:\n"
        for msg in chat_history[-6:]:
            role_name = "User" if msg.get("role") == "user" else "AI Agent"
            history_context += f"{role_name}: {msg.get('text')}\n"

    try:
        prompt = f"{history_context}\nUser message: \"{user_message}\""
        raw = await ai_manager.generate_content_with_retry(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            temperature=0.2,
            max_output_tokens=800
        )
        # Clean markdown code fences if present
        if "```json" in raw:
            raw = raw.split("```json")[1]
        if "```" in raw:
            raw = raw.split("```")[0]
        raw = raw.strip()
        
        # Try to extract JSON object from the raw text
        import re
        json_match = re.search(r'\{[^{}]*\}', raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)
        
        intent = json.loads(raw)
        
        trace["reasoning"].append(f"Agentic Action parsed: {intent.get('action', 'NONE')}")
        trace["reasoning"].append(f"Service detected: {intent.get('service_type', 'None')}")
        trace["reasoning"].append(f"Provider name detected: {intent.get('provider_name', 'None')}")
        trace["reasoning"].append(f"Reply generated: {intent.get('reply')[:60]}...")
        
        trace["output"] = intent
        trace["status"] = "success"
        return {"intent": intent, "trace": trace, "requires_clarification": False}
    except Exception as e:
        trace["reasoning"].append(f"Gemini API parse error: {str(e)}")
        trace["status"] = "failed"
        raise Exception("API failure in parse_intent") from e


async def generate_checkout_chat(
    step: int,
    user_message: str,
    provider_name: str,
    provider_rate: float,
    time_slot: str
) -> str:
    """Generates warm, premium, Roman Urdu dynamic checkout chat responses using Gemini."""
    rate = provider_rate or 1200
    fee = rate * 0.1
    total = rate + fee
    
    prompt = f"""You are a premium, human-like home services assistant for ServicePilot in Pakistan.
Your goal is to converse with the user naturally in Roman Urdu/English mix during the booking checkout flow.
You speak in a warm, polite, and extremely helpful tone. Never use robotic/stiff phrases.
Absolutely DO NOT use markdown bold asterisks "**" in your output.

Context details:
- Provider Name: {provider_name}
- Provider Rate: Rs. {rate}
- Selected/Requested Time Slot: {time_slot}

Instructions based on the booking step:
- For Step 1 (Time slot selection):
  The user said: "{user_message}".
  Confirm the slot they chose in a friendly way, and show a clear, beautifully formatted receipt/escrow summary using clean bullet points (•) and emojis.
  Receipt outline:
    • Base Rate: Rs. {rate}
    • Platform Escrow Fee (10%): Rs. {fee}
    • Total Amount: Rs. {total}
  Explain politely that this amount is locked securely in Escrow for their protection. Ask them warmly to confirm by replying with YES or CONFIRM.
  
- For Step 2 (Authorization YES/CONFIRM):
  The user said: "{user_message}".
  Confirm the successful booking with absolute excitement and premium politeness!
  Provide their final transaction details clearly:
    • Specialist: {provider_name}
    • Time: tomorrow, {time_slot}
    • Payout: Rs. {total} (held securely under escrow)
  Reassure them that their technician is locked and will arrive on time. Keep the tone warm and natural, not robotic.
"""
    try:
        from core.ai_manager import ai_manager
        raw = await ai_manager.generate_content_with_retry(
            prompt=prompt,
            temperature=0.7,
            max_output_tokens=600
        )
        return raw
    except Exception as e:
        raise Exception("API failure in generate_checkout_chat") from e

"""
Intent Understanding & Agentic AI Core
Parses multilingual requests (Urdu, Roman Urdu, English) and extracts structured intent and agentic actions.
"""
import json
import google.generativeai as genai
from core import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are "Sana", the highly intelligent, premium, human-like AI Operations Concierge for ServicePilot, a top-tier home services platform in Pakistan.
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
  {"reply": "Assalamualaikum 😊 Welcome to ServicePilot AI. Main Sana hoon, aapki AI operations concierge. Aapko kis type ki service chahiye today?", "action": "NONE", "service_type": null, "location": null, "timing": null, "urgency": null, "details": null, "booking_id": null, "provider_name": null}

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
    
    # --- Greeting & Conversation Agent ---
    msg_lower = user_message.lower().strip("?!., ")
    greetings = [
        "hi", "hello", "salam", "assalamualaikum", "assalam o alaikum", "assalam-o-alaikum",
        "hey", "good morning", "kya haal hai", "help", "start", "aoa", "heyy", "hy", "who are you"
    ]
    
    is_greeting = False
    for g in greetings:
        import re
        if re.search(rf"\b{re.escape(g)}\b", msg_lower):
            is_greeting = True
            break
            
    has_service_keywords = any(w in msg_lower for w in ["ac", "cooling", "thanda", "compressor", "leak", "pipe", "plumb", "tap", "electric", "bijli", "wiring", "short", "light", "wash", "mechanic", "car", "tv", "fridge"])
    
    if is_greeting and not has_service_keywords and len(msg_lower) < 35:
        trace["reasoning"].append("GreetingAgent: Intercepted general greeting/conversation.")
        trace["status"] = "success"
        
        import random
        greetings_responses = [
            "Assalamualaikum 😊 Welcome to ServicePilot AI. Main Sana hoon, aapki AI operations concierge. Main aaj aapki kya madad kar sakti hoon?",
            "Hello 👋 Main Sana hoon, aapki AI service assistant. Aapko kis type ki service chahiye today?",
            "Assalamualaikum 😊 Welcome to ServicePilot. Main Sana hoon, aapki home service manager. Aapko booking ya technician search mein madad chahiye?"
        ]
        reply = random.choice(greetings_responses)
        intent = {
            "reply": reply,
            "action": "NONE",
            "service_type": None,
            "location": None,
            "booking_id": None,
            "provider_name": None
        }
        return {"intent": intent, "trace": trace, "requires_clarification": False}
        
    history_context = ""
    if chat_history:
        history_context = "\nConversation history so far:\n"
        for msg in chat_history[-6:]:
            role_name = "User" if msg.get("role") == "user" else "Sana"
            history_context += f"{role_name}: {msg.get('text')}\n"

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = f"{SYSTEM_PROMPT}\n{history_context}\nUser message: \"{user_message}\""
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=800,
            )
        )
        
        raw = response.text.strip()
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
        trace["status"] = "fallback"
        
        # Smart keyword-based fallback so the pipeline never breaks
        msg_lower = user_message.lower()
        service = None
        action = "NONE"
        provider_name = None
        timing = None
        urgency = "Normal"
        details = None
        
        if any(w in msg_lower for w in ["ac", "cooling", "thanda", "compressor"]):
            service = "AC Repair"
        elif any(w in msg_lower for w in ["electric", "bijli", "wiring", "short", "light"]):
            service = "Electrician"
        elif any(w in msg_lower for w in ["plumb", "pani", "pipe", "leak", "tap"]):
            service = "Plumbing"
            
        if any(w in msg_lower for w in ["cancel", "kharij", "wapas"]):
            action = "CANCEL"
        elif any(w in msg_lower for w in ["balance", "wallet", "paisa", "rupay"]):
            action = "WALLET"
        elif any(w in msg_lower for w in ["status", "track", "check"]):
            action = "CHECK_STATUS"
            
        # Detect booking keywords
        for p_key in ["bilal", "ahmed", "lahore pro", "asif", "dha plumber", "zahid"]:
            if p_key in msg_lower and any(w in msg_lower for w in ["book", "select", "final", "lock", "krde"]):
                action = "BOOK_PROVIDER"
                provider_name = p_key
                break
            
        location = ""
        for loc in ["dha", "bahria", "gulberg", "johar", "model town", "national town", "national"]:
            if loc in msg_lower:
                location = loc.upper() if len(loc) <= 4 else loc.title()
                break

        # Simple timing extraction
        for t_word in ["kal", "tomorrow", "evening", "morning", "subah", "sham", "urgent", "jaldi"]:
            if t_word in msg_lower:
                timing = "Tomorrow Shift" if ("tomorrow" in msg_lower or "kal" in msg_lower) else "Standard Shift"
                if "urgent" in msg_lower or "jaldi" in msg_lower:
                    urgency = "Urgent"
                break

        location_str = f" in {location}" if location else ""
        if service:
            if location:
                reply = f"Perfect! Main aap ke liye best active {service} specialists dhoond rahi hoon{location_str}..."
            else:
                reply = f"Sure 😊 Aap Lahore mein kis area/location (e.g. DHA, Gulberg, Johar Town) par {service} service chahte hain?"
        else:
            reply = "Sana here 😊 Aap kis service (AC Repair, Plumbing, ya Electrician) ke baare mein pooch rahe hain? Please details batayein taake main active specialists search kar sakoon!"
            
        if any(w in msg_lower for w in ["hi", "hello", "salam", "aoa", "hey", "assalam"]):
            reply = "Assalamualaikum 😊 Main Sana hoon, aapki AI operations concierge. Aapko aaj kis service (AC repair, plumbing, ya electrician) mein madad chahiye? Please details batayein!"
            
        fallback = {
            "reply": reply,
            "action": action,
            "service_type": service,
            "location": location or None,
            "timing": timing,
            "urgency": urgency,
            "details": details or (service + " service" if service else None),
            "booking_id": None,
            "provider_name": provider_name
        }
        
        trace["reasoning"].append(f"⚡ Keyword fallback activated: {action} / {service}")
        return {"intent": fallback, "trace": trace, "requires_clarification": False}


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
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=600,
            )
        )
        return response.text.strip()
    except Exception:
        # High quality backup fallback
        if step == 1:
            return (
                f"Thik hai! Main kal ke liye aapka slot '{time_slot}' lock kar rahi hoon.\n\n"
                f"🧾 **Payment Receipt & Escrow Summary**:\n"
                f"• Provider Base Rate: Rs. {rate}\n"
                f"• Platform Safe Escrow Fee: Rs. {fee}\n"
                f"• Total Amount to Hold: Rs. {total}\n\n"
                f"Guaranteed Protection: Ye raqam platform security hold mein rahegi aur kaam mukammal hone par technician ko release hogi. "
                f"Kya main booking confirm kar ke amount hold kar doon? Please reply with 'YES' or 'CONFIRM' to authorize."
            )
        else:
            return (
                f"🎉 **Booking Confirmed under Secure Escrow Protection!**\n\n"
                f"Receipt & Scheduling Details:\n"
                f"• Specialist: {provider_name}\n"
                f"• Time Slot Locked: tomorrow, {time_slot}\n"
                f"• Payout Secure Hold: Rs. {total} (held securely)\n\n"
                f"I have successfully scheduled your booking. The specialist will arrive on time! You can track details in My Bookings."
            )

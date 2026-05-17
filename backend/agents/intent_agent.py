"""
Intent Understanding & Agentic AI Core
Parses multilingual requests (Urdu, Roman Urdu, English) and extracts structured intent and agentic actions.
"""
import json
import google.generativeai as genai
from core import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are the master Agentic AI Core of ServicePilot, a premium home-services platform in Pakistan.
You are trained in ML/DL and agentic orchestration. You speak with a warm, friendly, Urdu/English mix tone.

Your goal is to parse the user's message, provide conversational guidance, and return an Action command if they want to control their bookings, wallet, or select/book specialists.

Rules for your conversational "reply":
1. Write in a warm, concise, Urdu/English conversational mix.
2. Absolutely DO NOT use markdown bold markers "**" anywhere in your text.
3. Optimize the text using clean bullet points (•) for lists or steps. Keep it short and readable on a mobile screen.
4. If they ask for general guidance or troubleshooting (e.g. AC thanda nahi kar raha, pipe leak, electric spark safety), explain the safety precautions and guide them clearly using simple bullets.

Actions mapping:
- "BOOK_PROVIDER": Use this action when the user explicitly wants to book, select, or finalize a specific technician or provider (e.g. "Bilal AC repair booking krde", "Ahmed cooling services book krdo", "Bilal wala final krdo", "Asif plumbing book krdo"). In this case, extract their name or keywords into the `provider_name` field.
- "CANCEL": If the user wants to cancel a booking.
- "CHECK_STATUS": If the user wants to track bookings.
- "WALLET": If the user wants wallet or escrow balance details.
- "RECOMMEND": If the user wants to find or get recommendations for a service in a location (e.g. "AC repair chahiye Gulberg mein").
- "NONE": General chat, greetings, safety advice, or general discussion.

You must return ONLY a valid JSON object matching this schema:
{
  "reply": "<friendly, conversational explanation or safety guidance in Urdu/English mix, no bold asterisks>",
  "action": "RECOMMEND" | "CANCEL" | "CHECK_STATUS" | "WALLET" | "BOOK_PROVIDER" | "NONE",
  "service_type": "AC Repair" | "Plumbing" | "Electrician" | null,
  "location": "<neighborhood or area name if mentioned, otherwise null>",
  "booking_id": "<booking ID if mentioned, otherwise null>",
  "provider_name": "<name of provider user wants to book, e.g. 'Bilal AC Repair' or 'Ahmed Cooling', otherwise null>"
}

Examples:
- "hi" ->
  {"reply": "Assalam o Alaikum! I am here to help you get the best home maintenance support. Aapko aaj kis service (AC repair, plumbing, ya electrician) mein madad chahiye? Please details batayein!", "action": "NONE", "service_type": null, "location": null, "booking_id": null, "provider_name": null}

- "Bilal AC repair booking krde" ->
  {"reply": "Thik hai! Main Bilal AC Repair & Gas Fillers ko book karne ka process start kar rahi hoon.", "action": "BOOK_PROVIDER", "service_type": "AC Repair", "location": null, "booking_id": null, "provider_name": "Bilal AC Repair"}

- "Ahmed cooling wala book krdo" ->
  {"reply": "G bilkul! Main Ahmed Cooling Services select kar rahi hoon.", "action": "BOOK_PROVIDER", "service_type": "AC Repair", "location": null, "booking_id": null, "provider_name": "Ahmed Cooling"}
"""

async def parse_intent(user_message: str) -> dict:
    """Parse a user's natural language request into structured intent and agentic actions."""
    
    trace = {
        "agent": "AgenticCore",
        "input": user_message,
        "reasoning": [],
    }
    
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\nUser message: \"{user_message}\"",
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
        
        if any(w in msg_lower for w in ["ac", "cooling", "thanda", "compressor"]):
            service = "AC Repair"
            action = "RECOMMEND"
        elif any(w in msg_lower for w in ["electric", "bijli", "wiring", "short", "light"]):
            service = "Electrician"
            action = "RECOMMEND"
        elif any(w in msg_lower for w in ["plumb", "pani", "pipe", "leak", "tap"]):
            service = "Plumbing"
            action = "RECOMMEND"
            
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
        for loc in ["dha", "bahria", "gulberg", "johar", "model town"]:
            if loc in msg_lower:
                location = loc.upper() if len(loc) <= 4 else loc.title()
                break

        fallback = {
            "reply": "Assalam o Alaikum! I am ready to assist. Please specify your home maintenance issue or booking action details.",
            "action": action,
            "service_type": service,
            "location": location or None,
            "booking_id": None,
            "provider_name": provider_name
        }
        
        trace["reasoning"].append(f"⚡ Keyword fallback activated: {action} / {service}")
        return {"intent": fallback, "trace": trace, "requires_clarification": False}

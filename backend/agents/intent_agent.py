"""
Intent Understanding Agent
Parses multilingual requests (Urdu, Roman Urdu, English) and extracts structured intent.
"""
import json
import google.generativeai as genai
from core import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are an intent extraction agent for a home-services platform in Pakistan.
The user may write in English, Urdu (Roman script), or mix of both.

Extract the following fields from their message. Return ONLY valid JSON, nothing else.

  "service_type": "AC Repair" | "Plumbing" | "Electrician" | "Other",
  "issue_description": "<short English summary of the problem>",
  "location": "<area / neighborhood mentioned, or empty string>",
  "urgency": "emergency" | "today" | "tomorrow" | "this_week" | "flexible",
  "time_preference": "<morning / afternoon / evening / specific time, or empty string>",
  "language_detected": "english" | "roman_urdu" | "urdu_mix" | "gibberish",
  "confidence": <float 0-1>,
  "clarification_question": "<If confidence is below 0.5, provide a polite question in Roman Urdu asking for clarity, otherwise empty string>"
}

Examples:
- "AC thanda nahi kar raha, kal morning DHA mein technician chahiye" →
  {"service_type":"AC Repair","issue_description":"AC not cooling properly","location":"DHA","urgency":"tomorrow","time_preference":"morning","language_detected":"roman_urdu","confidence":0.95}

- "Need an electrician ASAP, short circuit in kitchen" →
  {"service_type":"Electrician","issue_description":"Short circuit in kitchen","location":"","urgency":"emergency","time_preference":"","language_detected":"english","confidence":0.98}

- "Pani ka pipe leak ho raha hai garden town mein" →
  {"service_type":"Plumbing","issue_description":"Water pipe leaking","location":"Garden Town","urgency":"today","time_preference":"","language_detected":"roman_urdu","confidence":0.93, "clarification_question": ""}

- "asdfghjk dsfs" →
  {"service_type":"Other","issue_description":"","location":"","urgency":"flexible","time_preference":"","language_detected":"gibberish","confidence":0.1, "clarification_question": "Maazrat, main aapki baat samajh nahi saka. Kya aap dobara bata saktay hain aapko kaunsi service chahiye?"}
"""


async def parse_intent(user_message: str) -> dict:
    """Parse a user's natural language request into structured intent."""
    
    trace = {
        "agent": "IntentAgent",
        "input": user_message,
        "reasoning": [],
    }
    
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\nUser message: \"{user_message}\"",
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=500,
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
        
        trace["reasoning"].append(f"Detected language: {intent.get('language_detected', 'unknown')}")
        trace["reasoning"].append(f"Extracted service: {intent.get('service_type')} with {intent.get('confidence', 0)*100:.0f}% confidence")
        trace["reasoning"].append(f"Location mentioned: {intent.get('location', 'not specified')}")
        trace["reasoning"].append(f"Urgency level: {intent.get('urgency', 'flexible')}")
        
        confidence = intent.get('confidence', 0)
        if confidence < 0.5:
            trace["reasoning"].append("⚠ LOW CONFIDENCE: Input is too vague or unreadable.")
            trace["status"] = "failed"
            return {"intent": intent, "trace": trace, "requires_clarification": True}
            
        trace["output"] = intent
        trace["status"] = "success"
        
        return {"intent": intent, "trace": trace, "requires_clarification": False}
        
    except json.JSONDecodeError as e:
        trace["reasoning"].append(f"Failed to parse LLM output as JSON: {str(e)}")
        trace["reasoning"].append(f"Raw output: {raw[:200]}")
        trace["status"] = "fallback"
        
        # Smart keyword-based fallback so the pipeline never breaks
        msg_lower = user_message.lower()
        service = "Other"
        if any(w in msg_lower for w in ["ac", "cooling", "thanda", "air condition"]):
            service = "AC Repair"
        elif any(w in msg_lower for w in ["electric", "bijli", "wiring", "short circuit", "switch", "socket"]):
            service = "Electrician"
        elif any(w in msg_lower for w in ["plumb", "pani", "pipe", "leak", "nulka", "washroom"]):
            service = "Plumbing"
        elif any(w in msg_lower for w in ["clean", "safai"]):
            service = "Cleaning"
        elif any(w in msg_lower for w in ["mechanic", "car", "bike", "gaari", "engine"]):
            service = "Car Mechanic"
            
        urgency = "flexible"
        if any(w in msg_lower for w in ["urgent", "asap", "abhi", "emergency", "foran"]):
            urgency = "emergency"
        elif any(w in msg_lower for w in ["today", "aaj"]):
            urgency = "today"
        elif any(w in msg_lower for w in ["tomorrow", "kal"]):
            urgency = "tomorrow"
            
        # Extract location keywords
        import re as re2
        location = ""
        loc_patterns = ["dha", "bahria", "gulberg", "johar", "model town", "garden town", "g-13", "f-8", "f-10", "i-8", "defence"]
        for loc in loc_patterns:
            if loc in msg_lower:
                location = loc.upper() if len(loc) <= 4 else loc.title()
                break

        fallback = {
            "service_type": service,
            "issue_description": user_message[:100],
            "location": location,
            "urgency": urgency,
            "time_preference": "",
            "language_detected": "english",
            "confidence": 0.75,
            "clarification_question": ""
        }
        
        trace["reasoning"].append(f"⚡ Keyword fallback activated: {service} in {location or 'unspecified'}")
        return {"intent": fallback, "trace": trace, "requires_clarification": False}
    
    except Exception as e:
        trace["reasoning"].append(f"Gemini API error: {str(e)}")
        trace["status"] = "fallback"
        
        # Same keyword fallback for API errors too
        msg_lower = user_message.lower()
        service = "Other"
        if any(w in msg_lower for w in ["ac", "cooling", "thanda"]):
            service = "AC Repair"
        elif any(w in msg_lower for w in ["electric", "bijli", "wiring", "electrician"]):
            service = "Electrician"
        elif any(w in msg_lower for w in ["plumb", "pani", "pipe", "plumber"]):
            service = "Plumbing"

        urgency = "flexible"
        if any(w in msg_lower for w in ["urgent", "asap", "abhi", "emergency"]):
            urgency = "emergency"
            
        location = ""
        for loc in ["dha", "bahria", "gulberg", "johar", "model town"]:
            if loc in msg_lower:
                location = loc.upper() if len(loc) <= 4 else loc.title()
                break

        fallback = {
            "service_type": service,
            "issue_description": user_message[:100],
            "location": location,
            "urgency": urgency,
            "time_preference": "",
            "language_detected": "unknown",
            "confidence": 0.7,
            "clarification_question": ""
        }
        trace["reasoning"].append(f"⚡ Keyword fallback activated due to API error: {service}")
        return {"intent": fallback, "trace": trace, "requires_clarification": False}

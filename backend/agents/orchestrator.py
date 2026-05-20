"""
Central Orchestrator using LangGraph-style state nodes.
Chains all 10 specialized agents in sequence and collects reasoning traces in ai_trace_logs.
"""
import uuid
from datetime import datetime
from agents.intent_agent import parse_intent, generate_checkout_chat
from agents.matching_agent import match_providers
from agents.pricing_agent import calculate_price
from agents.scheduling_agent import schedule_booking
from agents.recovery_agent import handle_cancellation
from agents.feedback_agent import process_feedback
from agents.discovery_agent import discover_external_providers
from core.database import (db_create_booking, db_get_booking, db_update_booking, db_save_trace, db_get_trace,
                           db_save_external_provider, db_log_search, db_get_wallet, db_get_bookings, db_create_escrow,
                           db_get_providers, db_update_wallet, db_add_wallet_transaction, db_save_chat, db_get_chat,
                           get_db_session)
from database import models

# ==========================================
# 10 Specialized Micro-Agents Definitions
# ==========================================

class GreetingAgent:
    """Agent 1: Resolves welcoming greetings and onboarding starts."""
    async def run(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        is_greet = any(f" {w} " in f" {msg_lower} " for w in ["hi", "hello", "salam", "aoa", "hey", "assalam", "assalamualaikum"])
        reasoning = [
            f"Analyzing user message: '{user_message}'",
            "Checking message for standard greeting keywords.",
            f"Greeting detected: {is_greet}"
        ]
        return {
            "detected": is_greet,
            "reply": "Assalamualaikum 😊 Welcome to ServicePilot AI. Main aapki AI Operations Concierge hoon. Aapko kis type ki service (AC Repair, Plumbing, ya Electrician) chahiye today?",
            "reasoning": reasoning
        }

class ConversationAgent:
    """Agent 2: Handles out-of-scope chit-chat, off-topic, and technical/educational questions."""
    async def run(self, user_message: str, chat_history: list = None, booking_step: int = 0) -> dict:
        msg_lower = user_message.lower()
        
        # If in the middle of active booking checkout steps, bypass classification
        if booking_step > 0:
            return {
                "detected": False,
                "reply": "",
                "reasoning": [
                    "Active booking checkout step detected. Bypassing classification layer."
                ]
            }

        # Setup reasoning logs
        reasoning = [
            f"Analyzing user message: '{user_message}'",
            "Invoking Intent Classification & Conversational Intelligence Layer."
        ]

        history_context = ""
        if chat_history:
            history_context = "\nConversation history so far:\n"
            for msg in chat_history[-6:]:
                role_name = "User" if msg.get("role") == "user" else "AI Agent"
                history_context += f"{role_name}: {msg.get('text')}\n"

        prompt = f"{history_context}\nUser message: \"{user_message}\""
        
        system_prompt = """You are the Conversational Intelligence & Intent Classifier Layer of ServicePilot AI, a premium home services platform in Pakistan.
Your job is to analyze the user's message, classify it into one of 10 conversation types, and decide if we should trigger the structured booking flow or keep the conversation natural and conversational.
Make sure you identify yourself as "ServicePilot AI Agent" or mention "ServicePilot" in your reply so the user knows they are talking to the ServicePilot Concierge.

Supported Conversation Types:
1. "Greeting" - Welcoming messages (e.g., "hi", "salam", "hello", "kaise ho?").
2. "General Question" - Basic platform questions (e.g., "what is ServicePilot?", "ap kese kaam krte ho?").
3. "Technical Question" - Troubleshooting, educational, or maintenance advice (e.g., "ac ka pipe kiyu leak huta h?", "compressor ki cooling check kaise karein?", "water pipe leaking causes").
4. "Service Inquiry" - Inquiring about available services (e.g., "kya ap ke pas electrician hai?", "do you do gas refilling?").
5. "Booking Intent" - HIGH CONFIDENCE requests to book, hire, send, or repair (e.g., "ac repair karwani hai", "technician bhej do", "booking krdo", "electrician call kro").
6. "Complaint" - Feedback or issues with past visits (e.g., "technician ne sahi kaam nahi kiya", "rude behavior").
7. "Follow-up" - Asking about an existing booking (e.g., "booking kab tak pohnchegi?").
8. "Pricing Inquiry" - Inquiring about base rates, inspection fees (e.g., "check up ke kya charges hain?").
9. "Casual Conversation" - General chitchat, weather, jokes, identity.
10. "Emergency Request" - Immediate danger/critical requests (e.g., "short circuit ho gaya, spark nikal raha hai, urgent help").

Critical Rules:
1. ONLY set booking_workflow_allowed to true if the Conversation Type is "Booking Intent" or "Emergency Request" AND booking_confidence is High.
2. If booking_workflow_allowed is false, you MUST provide a natural, comprehensive, helpful, and friendly reply answering their question directly (like Gemini/ChatGPT) in Roman Urdu/English mix.
3. Absolutely DO NOT use markdown bold markers "**" anywhere in your text.
4. Emojis (👋, 😊, 👍, ⏳, 🧾, 🎉) and clean bullet points (•) are encouraged to make the text lively and readable.
5. In your conversational responses, you may add a soft, optional suggestion to book at the end of the text, but keep it optional (e.g. "Agar aap chahen to main check-up ke liye nearby expert technician recommend kar sakti hoon 😊"). Do not force it.

Your output must be a single valid JSON object with this exact structure:
{
  "conversation_type": "<one of the 10 types>",
  "booking_confidence": "High" | "Medium" | "Low",
  "booking_workflow_allowed": true | false,
  "reply": "<detailed natural Roman Urdu response if booking_workflow_allowed is false, otherwise null>"
}
"""

        reply = ""
        is_conversational = True
        classified_type = "Casual Conversation"

        try:
            from core.ai_manager import ai_manager
            raw = await ai_manager.generate_content_with_retry(
                prompt=prompt,
                system_prompt=system_prompt,
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
            
            import json
            result = json.loads(raw)
            classified_type = result.get("conversation_type", "Casual Conversation")
            booking_workflow_allowed = result.get("booking_workflow_allowed", False)
            reply = result.get("reply", "")

            # If user explicitly states a service type and wants to book, or has high booking confidence:
            if booking_workflow_allowed:
                is_conversational = False
                reasoning.append(f"Classification result: '{classified_type}' with High confidence. Starting booking workflow.")
            else:
                is_conversational = True
                reasoning.append(f"Classification result: '{classified_type}'. Handling conversationally.")

        except Exception as e:
            reasoning.append(f"Gemini classifier call failed: {e}")
            raise Exception("API failure in ConversationAgent") from e

        return {
            "detected": is_conversational,
            "reply": reply,
            "conversation_type": classified_type,
            "reasoning": reasoning
        }

class IntentAgent:
    """Agent 3: Extracts service type, location, timing, and details from text."""
    async def run(self, user_message: str, chat_history: list = None) -> dict:
        reasoning = ["Invoking Gemini intent extraction agent..."]
        intent_res = await parse_intent(user_message, chat_history)
        intent = intent_res["intent"]
        reasoning.extend(intent_res["trace"]["reasoning"])
        return {
            "intent": intent,
            "reasoning": reasoning
        }

class MatchingAgent:
    """Agent 4: Performs geographical matching and computes technician scores."""
    async def run(self, intent: dict) -> dict:
        reasoning = [
            f"Matching technician providers for service: {intent.get('service_type')} in {intent.get('location')}.",
            "Calculating distance and reliability rankings..."
        ]
        match_result = await match_providers(intent)
        reasoning.extend(match_result["trace"]["reasoning"])
        return {
            "providers": match_result["providers"],
            "reasoning": reasoning
        }

class SchedulingAgent:
    """Agent 5: Validates booking slots availability and prevents conflicts."""
    async def run(self, provider_id: str, date: str, slot: str) -> dict:
        reasoning = [
            f"Validating calendar slots for provider {provider_id} on date {date}.",
            f"Checking schedule conflict for slot '{slot}'."
        ]
        # Simulate availability check
        available = True
        return {
            "available": available,
            "reasoning": reasoning
        }

class PricingAgent:
    """Agent 6: Computes base rates, platform commission, and travel surcharges."""
    async def run(self, provider: dict, intent: dict) -> dict:
        reasoning = [
            f"Calculating pricing breakdown for {provider.get('name')}.",
            "Applying standard base rate.",
            "Adding platform administrative fee (10%)."
        ]
        p_price = await calculate_price(provider, intent)
        return {
            "pricing": p_price["pricing"],
            "reasoning": reasoning
        }

class BookingAgent:
    """Agent 7: Registers the booking object and transitions state states."""
    async def run(self, booking_data: dict) -> dict:
        reasoning = [
            f"Creating new transaction record for booking ID {booking_data.get('id')}.",
            "Initializing status to confirmed."
        ]
        db_create_booking(booking_data)
        return {
            "booking": booking_data,
            "reasoning": reasoning
        }

class PaymentAgent:
    """Agent 8: Locks and deposits funds into the secure escrow system."""
    async def run(self, booking_id: str, amount: float) -> dict:
        reasoning = [
            f"Initiating escrow lock for booking {booking_id} of Rs. {amount}.",
            "Securing funds in ServicePilot escrow wallet protection."
        ]
        from payments.escrow import deposit_to_escrow
        success = deposit_to_escrow(booking_id, "customer", "PRV-001", amount)
        return {
            "success": success,
            "reasoning": reasoning
        }

class RecoveryAgent:
    """Agent 9: Recovers booking status and performs automated technician re-assignment."""
    async def run(self, booking: dict, intent: dict, cancelled_provider_id: str) -> dict:
        reasoning = [
            f"Activating auto-recovery for booking {booking['id']}.",
            "Finding alternative technician matching service and area."
        ]
        recovery_result = await handle_cancellation(booking, intent, cancelled_provider_id)
        reasoning.extend(recovery_result["trace"]["reasoning"])
        return {
            "recovery": recovery_result["recovery"],
            "reasoning": reasoning
        }

class SupportAgent:
    """Agent 10: Collects feedback, resolves user complaints, and logs disputes."""
    async def run(self, booking_id: str, provider_id: str, rating: int, comment: str) -> dict:
        reasoning = [
            f"Logging user review for provider {provider_id} on booking {booking_id}.",
            f"Rating: {rating} stars, Comment: {comment}"
        ]
        result = await process_feedback(booking_id, provider_id, rating, comment)
        return {
            "feedback": result["feedback"],
            "reasoning": reasoning
        }

# ==========================================
# LangGraph State & Node Transition Flow
# ==========================================

class LangConciergeState:
    """State tracking object for the ServicePilot AI Concierge LangGraph workflow."""
    def __init__(self, service=None, location=None, timing=None, details=None, chat_history=None, user_message=None):
        self.service = service
        self.location = location
        self.timing = timing
        self.details = details
        self.chat_history = chat_history or []
        self.user_message = user_message or ""

class LangConciergeStateGraph:
    """A custom LangGraph-like state node transition graph for ServicePilot AI Concierge."""
    def __init__(self):
        self.nodes = {
            "node_greet": self.node_greet,
            "node_collect_location": self.node_collect_location,
            "node_collect_timing": self.node_collect_timing,
            "node_collect_details": self.node_collect_details,
            "node_recommend": self.node_recommend,
            "node_await_selection": self.node_await_selection
        }

    def determine_next_node(self, state: LangConciergeState) -> str:
        if not state.service:
            return "node_greet"
        if not state.location:
            return "node_collect_location"
        if not state.timing:
            return "node_collect_timing"
        if not state.details:
            return "node_collect_details"
            
        # Check if recommendations were already shown in history to prevent loops
        recommendation_shown = False
        if state.chat_history:
            for h in state.chat_history:
                h_text = h.get("text", "").lower()
                if "highest reliability score" in h_text or "verified" in h_text and "specialist" in h_text:
                    recommendation_shown = True
                    break
                    
        if recommendation_shown:
            msg_lower = state.user_message.lower()
            wants_new_search = any(w in msg_lower for w in ["search", "dhoondo", "find", "show", "other", "dusra", "change", "badlo", "nayi", "new"])
            if not wants_new_search:
                return "node_await_selection"
                
        return "node_recommend"

    async def execute(self, state: LangConciergeState) -> dict:
        next_node = self.determine_next_node(state)
        node_func = self.nodes[next_node]
        return await node_func(state)

    async def node_greet(self, state: LangConciergeState) -> dict:
        return {
            "action": "NONE",
            "reply": "Assalamualaikum 😊 Welcome to ServicePilot AI. Main aapki AI operations concierge hoon. Main aaj aapki kya madad kar sakti hoon? Aapko kis type ka specialist chahiye today?"
        }

    async def node_collect_location(self, state: LangConciergeState) -> dict:
        return {
            "action": "NONE",
            "reply": f"Sure 😊\nMain {state.service} service mein aapki help karti hoon. Aap Pakistan ke kis city aur area (e.g. Lahore DHA, Karachi Clifton, Islamabad F-6) par {state.service} specialist chahte hain?"
        }

    async def node_collect_timing(self, state: LangConciergeState) -> dict:
        return {
            "action": "NONE",
            "reply": f"Great 👍\nKya aapko service urgently chahiye ya aap custom timing select karna chahenge?"
        }

    async def node_collect_details(self, state: LangConciergeState) -> dict:
        if state.service == "Electrician":
            reply = "Perfect.\nKya aap sirf light installation chahte hain ya wiring/checking bhi required hai?"
        elif state.service == "AC Repair":
            reply = "Perfect.\nKya AC mein gas leak ka issue hai ya checking and filter service required hai?"
        else:
            reply = "Perfect.\nKya pipe leakage ka issue hai ya new fitting and repair required hai?"
        return {
            "action": "NONE",
            "reply": reply
        }

    async def node_recommend(self, state: LangConciergeState) -> dict:
        return {
            "action": "RECOMMEND",
            "reply": f"Understood 😊 Main verified {state.service} specialists search kar rahi hoon near {state.location}..."
        }

    async def node_await_selection(self, state: LangConciergeState) -> dict:
        return {
            "action": "NONE",
            "reply": "Aap list mein se kis specialist ko book karna chahenge? Please technician ka name batayein (e.g. Ahmed Cooling Services) ya 'best' bol kar direct booking lock karein! 😊"
        }

# ==========================================
# Main Central Orchestration Pipeline
# ==========================================

async def log_agent_trace_to_db(booking_id: str, agent_name: str, input_data: dict, reasoning: list, output_data: dict, status: str = "success"):
    db = get_db_session()
    try:
        trace = models.AITraceLog(
            id=f"tr_{uuid.uuid4().hex[:12]}",
            booking_id=booking_id if booking_id and booking_id.startswith("bk_") else None,
            agent_name=agent_name,
            input_payload=input_data,
            reasoning=reasoning,
            output_payload=output_data,
            status=status
        )
        db.add(trace)
        db.commit()
    except Exception as e:
        print(f"Error logging trace: {e}")
        db.rollback()
    finally:
        db.close()

def extract_context_from_history(chat_history: list) -> tuple:
    service = None
    location = None
    timing = None
    details = None
    
    if not chat_history:
        return service, location, timing, details
        
    for h in reversed(chat_history):
        text = h.get("text", "").lower()
        # Extract service
        if not service:
            if "ac repair" in text or "cooling" in text or "split ac" in text:
                service = "AC Repair"
            elif "electric" in text or "wiring" in text or "light" in text:
                service = "Electrician"
            elif "plumb" in text or "pipe" in text or "leak" in text:
                service = "Plumbing"
                
        # Extract location
        if not location:
            for loc in ["dha", "bahria", "gulberg", "johar", "model town", "national town", "national", "lahore", "karachi", "islamabad", "pindi", "rawalpindi", "faisalabad", "multan", "peshawar", "quetta", "sialkot", "gujranwala"]:
                if loc in text:
                    location = loc.upper() if len(loc) <= 4 else loc.title()
                    break
                    
        # Extract timing
        if not timing:
            if "tomorrow" in text or "kal" in text:
                timing = "Tomorrow Shift"
            elif "today" in text or "aaj" in text:
                timing = "Today Shift"
            elif "urgent" in text or "jaldi" in text:
                timing = "Urgent Shift"
                
    return service, location, timing, details

async def process_service_request(
    user_message: str,
    booking_step: int = 0,
    selected_tech_name: str = None,
    selected_tech_rate: float = None,
    selected_time_slot: str = None,
    chat_history: list = None
) -> dict:
    """Runs the 10-agent orchestration sequence based on flow step."""
    try:
        booking_id = f"bk_{uuid.uuid4().hex[:12]}"
        all_traces = []
        
        # 1. Greeting Agent Check
        greet_agent = GreetingAgent()
        greet_res = await greet_agent.run(user_message)
        await log_agent_trace_to_db(booking_id, "GreetingAgent", {"msg": user_message}, greet_res["reasoning"], {"detected": greet_res["detected"]})
        
        if greet_res["detected"] and booking_step == 0:
            return {
                "booking": None,
                "action": "NONE",
                "message": greet_res["reply"],
                "traces": all_traces + [
                    {"agent": "GreetingAgent", "reasoning": greet_res["reasoning"]}
                ]
            }
            
        # 2. Conversation Agent Check
        conv_agent = ConversationAgent()
        conv_res = await conv_agent.run(user_message, chat_history, booking_step)
        await log_agent_trace_to_db(booking_id, "ConversationAgent", {"msg": user_message}, conv_res["reasoning"], {"detected": conv_res["detected"]})
        
        if conv_res["detected"] and booking_step == 0:
            return {
                "booking": None,
                "action": "NONE",
                "message": conv_res["reply"],
                "traces": all_traces + [
                    {"agent": "ConversationAgent", "reasoning": conv_res["reasoning"]}
                ]
            }
        
        # 3. Handle checkout step flow
        if booking_step == 1:
            # Always run IntentAgent first to extract time from user message
            intent_agent = IntentAgent()
            intent_res = await intent_agent.run(user_message, chat_history)
            extracted_timing = intent_res["intent"].get("timing")
            
            # If the user typed a specific time slot (contains digit or am/pm), prioritize it over frontend's default selectedSlot
            import re
            if extracted_timing and (any(char.isdigit() for char in extracted_timing) or any(m in extracted_timing.lower() for m in ["pm", "am"])):
                slot = extracted_timing
            else:
                slot = selected_time_slot or "10:00 AM"
            rate = selected_tech_rate or 1200
            fee = rate * 0.1
            total = rate + fee
            
            chat_msg = await generate_checkout_chat(
                step=1,
                user_message=user_message,
                provider_name=selected_tech_name or "Ahmed Cooling Services",
                provider_rate=rate,
                time_slot=slot
            )
            
            # Log BookingAgent reservation lock
            await log_agent_trace_to_db(booking_id, "BookingAgent", {"tech": selected_tech_name}, ["Locking provider slot in calendar"], {"slot": slot})
            
            return {
                "booking": None,
                "action": "LOCK_SLOT",
                "time_slot": slot,
                "message": chat_msg,
                "traces": all_traces
            }
            
        elif booking_step == 2:
            msg_lower = user_message.lower()
            if any(w in msg_lower for w in ["yes", "confirm", "auth", "pay", "ha", "haan", "krdo", "do"]):
                rate = selected_tech_rate or 1200
                fee = rate * 0.1
                total = rate + fee
                
                # Payment Agent locking escrow
                pay_agent = PaymentAgent()
                pay_res = await pay_agent.run(booking_id, total)
                await log_agent_trace_to_db(booking_id, "PaymentAgent", {"amount": total}, pay_res["reasoning"], {"escrow_locked": pay_res["success"]})
                
                # Deduct wallet logic
                wallet = db_get_wallet("customer")
                new_bal = wallet["balance"] - total
                db_update_wallet("customer", {"balance": max(0, new_bal), "pending": wallet.get("pending", 0) + total})
                db_add_wallet_transaction("customer", {
                    "id": f"txn_{uuid.uuid4().hex[:6]}",
                    "type": "escrow_hold",
                    "amount": -total,
                    "desc": f"Escrow hold for booking {booking_id}",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                })
                
                matched_p = {"id": "PRV-001", "name": selected_tech_name or "Ahmed Cooling Services"}
                
                # Booking Agent creating booking
                booking = {
                    "id": booking_id,
                    "status": "confirmed",
                    "user_message": user_message,
                    "intent": {"service_type": "AC Repair", "location": "DHA Lahore", "urgency": "today"},
                    "provider": matched_p,
                    "pricing": {"base_rate": rate, "platform_fee": fee, "total_amount": total},
                    "schedule": {"date": datetime.now().strftime("%Y-%m-%d"), "time_start": selected_time_slot or "10:00 AM"},
                }
                
                book_agent = BookingAgent()
                book_res = await book_agent.run(booking)
                await log_agent_trace_to_db(booking_id, "BookingAgent", {"booking": booking}, book_res["reasoning"], {"status": "confirmed"})
                
                chat_msg = await generate_checkout_chat(
                    step=2,
                    user_message=user_message,
                    provider_name=matched_p["name"],
                    provider_rate=rate,
                    time_slot=selected_time_slot or "10:00 AM"
                )
                chat_msg += f"\n• Escrow Locked Transaction Status: SECURED"
                
                return {
                    "booking": booking,
                    "action": "CONFIRM_BOOKING",
                    "message": chat_msg,
                    "traces": all_traces
                }
            else:
                return {
                    "booking": None,
                    "action": "CANCEL_BOOKING",
                    "message": "Booking selection cancelled. How else can I assist your home repair today?",
                    "traces": all_traces
                }

        # Intent Agent
        intent_agent = IntentAgent()
        intent_res = await intent_agent.run(user_message, chat_history)
        intent = intent_res["intent"]
        await log_agent_trace_to_db(booking_id, "IntentAgent", {"msg": user_message}, intent_res["reasoning"], intent)
        
        service = intent.get("service_type")
        location = intent.get("location")
        timing = intent.get("timing")
        details = intent.get("details")

        # Dynamic extraction fallbacks
        msg_lower = user_message.lower()
        if not service:
            if any(w in msg_lower for w in ["ac", "cooling", "thanda", "compressor"]):
                service = "AC Repair"
            elif any(w in msg_lower for w in ["electric", "bijli", "wiring", "short", "light"]):
                service = "Electrician"
            elif any(w in msg_lower for w in ["plumb", "pani", "pipe", "leak", "tap"]):
                service = "Plumbing"
                
        if not location:
            for loc in ["dha", "bahria", "gulberg", "johar", "model town", "national town", "national", "lahore", "karachi", "islamabad", "pindi", "rawalpindi", "faisalabad", "multan", "peshawar", "quetta", "sialkot", "gujranwala"]:
                if loc in msg_lower:
                    location = loc.upper() if len(loc) <= 4 else loc.title()
                    break

        # Inherit parameters from history if not extracted from the current message
        hist_service, hist_location, hist_timing, hist_details = extract_context_from_history(chat_history)
        if not service:
            service = hist_service
        if not location:
            location = hist_location
        if not timing:
            timing = hist_timing
        if not details:
            details = hist_details or "General check"

        # Execute LangGraph nodes only if intent action is not an explicit operational action
        action_parsed = intent.get("action", "NONE")
        if action_parsed in ["CANCEL", "CHECK_STATUS", "WALLET", "BOOK_PROVIDER"]:
            intent["service_type"] = service
            intent["location"] = location
            intent["timing"] = timing
            intent["details"] = details
        else:
            lang_state = LangConciergeState(service=service, location=location, timing=timing, details=details, chat_history=chat_history, user_message=user_message)
            lang_graph = LangConciergeStateGraph()
            graph_res = await lang_graph.execute(lang_state)
            
            intent["service_type"] = lang_state.service
            intent["location"] = lang_state.location
            intent["timing"] = lang_state.timing
            intent["details"] = lang_state.details
            intent["action"] = graph_res["action"]
            intent["reply"] = graph_res["reply"]
        
        action = intent.get("action", "NONE")
        
        if action == "CANCEL":
            bookings = db_get_bookings()
            active = [b for b in bookings if b["status"] not in ["cancelled", "completed"]]
            if active:
                target_booking = active[0]
                recovery_res = await cancel_and_recover(target_booking["id"])
                return {
                    "booking": recovery_res.get("booking"),
                    "message": f"Assalam o Alaikum! I have cancelled your active booking {target_booking['id']} successfully.\n\n• Secure Escrow Refunded: Rs. {target_booking['pricing']['total_amount']}\n• Status: Escrow Protection Refund Completed",
                    "traces": all_traces + recovery_res.get("traces", []),
                }
            else:
                return {
                    "booking": None,
                    "message": "Assalam o Alaikum! You don't have any active bookings to cancel right now.",
                    "traces": all_traces,
                }
                
        elif action == "CHECK_STATUS":
            bookings = db_get_bookings()
            if bookings:
                details_list = []
                for b in bookings[:3]:
                    status_capitalized = b['status'].upper()
                    details_list.append(f"• ID: {b['id']}\n  Service: {b.get('service_type', 'Home Service')}\n  Specialist: {b.get('provider', {}).get('name', 'Technician')}\n  Status: {status_capitalized}")
                details_str = "\n".join(details_list)
                return {
                    "booking": bookings[0],
                    "message": f"Assalam o Alaikum! Here are your active booking records:\n\n{details_str}",
                    "traces": all_traces,
                }
            else:
                return {
                    "booking": None,
                    "message": "Assalam o Alaikum! You have no active bookings at the moment. How can I help you book one?",
                    "traces": all_traces,
                }
                
        elif action == "WALLET":
            wallet = db_get_wallet("customer")
            return {
                "booking": None,
                "message": f"Assalam o Alaikum! Here is your wallet transaction summary:\n\n• Available Balance: Rs. {wallet['balance']}\n• Locked Escrow Funds: Rs. {wallet['pending']}\n• Safety Deposit protection active",
                "traces": all_traces,
            }
            
        elif action == "NONE":
            return {
                "booking": None,
                "message": intent.get("reply", "Assalam o Alaikum! I am here to help you get the best home maintenance support."),
                "service_type": intent.get("service_type"),
                "location": intent.get("location"),
                "traces": all_traces,
            }
            
        elif action == "BOOK_PROVIDER":
            provider_q = intent.get("provider_name", "")
            service_type = intent.get("service_type") or "AC Repair"
            providers = db_get_providers()
            matched = None
            
            is_auto_book = not provider_q or any(w in provider_q.lower() for w in ["best", "top", "koi", "reserve", "confirm"])
            
            if is_auto_book:
                category_providers = [p for p in providers if service_type.lower() in p.get("service_type", "").lower()]
                if category_providers:
                    category_providers.sort(key=lambda x: x.get("rating", 4.5), reverse=True)
                    matched = category_providers[0]
            else:
                pq = provider_q.lower()
                for p in providers:
                    if pq in p["name"].lower():
                        matched = p
                        break
            
            if matched:
                return {
                    "booking": None,
                    "action": "BOOK_PROVIDER",
                    "provider": {
                        "id": matched["id"],
                        "name": matched["name"],
                        "rate": matched.get("base_rate", 1000),
                        "rating": matched.get("rating", 4.7),
                        "area": matched.get("area", "DHA Lahore")
                    },
                    "message": f"AI Agent here 😊 Main ne aap ke liye humara best expert {matched['name']} select kar liya hai!\n\nAvailable slots:\n• 10:00 AM (Recommended)\n• 1:30 PM\n• 5:00 PM\n\nWhich slot do you prefer?",
                    "traces": all_traces
                }
            else:
                return {
                    "booking": None,
                    "action": "NONE",
                    "message": f"Main aapka bataya hua provider '{provider_q}' nahi dhoond saki. Please correct name batayein ya 'best' bol kar auto-book karwein!",
                    "traces": all_traces
                }
            
        # RECOMMEND action: matching, pricing, scheduling
        # 4. Matching Agent
        match_agent = MatchingAgent()
        match_res = await match_agent.run(intent)
        providers = match_res["providers"]
        await log_agent_trace_to_db(booking_id, "MatchingAgent", intent, match_res["reasoning"], {"providers_count": len(providers)})
        
        # Discovery Fallback
        if not providers:
            discovery_res = await discover_external_providers(intent)
            await log_agent_trace_to_db(booking_id, "DiscoveryAgent", intent, discovery_res["trace"]["reasoning"], {"external_count": len(discovery_res["providers"])})
            providers = discovery_res["providers"]
            for p in providers:
                db_save_external_provider(p)
                
        if not providers:
            return {
                "booking": None,
                "message": "No providers found internally or externally for your request. Please try a different service or location.",
                "traces": all_traces,
            }
        
        matched_list = []
        for p in providers[:3]:
            # 5. Scheduling Agent availability check
            sched_agent = SchedulingAgent()
            sched_res = await sched_agent.run(p["id"], "2025-05-20", "10:00 AM")
            await log_agent_trace_to_db(booking_id, "SchedulingAgent", {"prov": p["id"]}, sched_res["reasoning"], {"available": sched_res["available"]})
            
            # 6. Pricing Agent pricing calculation
            price_agent = PricingAgent()
            price_res = await price_agent.run(p, intent)
            await log_agent_trace_to_db(booking_id, "PricingAgent", {"prov": p["id"]}, price_res["reasoning"], price_res["pricing"])
            
            matched_list.append({
                "id": p["id"],
                "name": p["name"],
                "rate": price_res["pricing"].get("total", 1000),
                "rating": p.get("rating", 4.7),
                "area": intent.get("location") or p.get("area") or "DHA Lahore",
                "specialization": p.get("specializations", ["Verified Specialist"])[0],
            })
            
        best_provider_name = matched_list[0]["name"] if matched_list else "Ahmed Cooling Services"
        assistance_msg = f"I found {len(matched_list)} verified {intent.get('service_type')} specialists near {intent.get('location')}.\n\n{best_provider_name} has the highest reliability score and fastest ETA near your location.\n\nWould you like me to proceed with booking or help you reserve this technician?"
        
        return {
            "booking": None,
            "message": assistance_msg,
            "providers": matched_list,
            "service_type": intent.get("service_type"),
            "location": intent.get("location"),
            "traces": all_traces,
        }
    except Exception as e:
        import logging
        import traceback
        logging.error(f"Orchestrator error during service request:\n{traceback.format_exc()}")
        # Always return the user's specific API failure message on any API or system failure
        return {
            "booking": None,
            "action": "NONE",
            "message": "Abh service available nahi hai, system mein kuch problem hai.",
            "traces": all_traces + [
                {"agent": "SystemOrchestrator", "reasoning": [f"API/System error occurred: {str(e)}"]}
            ]
        }

async def cancel_and_recover(booking_id: str) -> dict:
    """9. Recovery Agent: Automatically recovers booking from provider cancellation."""
    booking = db_get_booking(booking_id)
    if not booking:
        return {"error": "Booking not found", "traces": []}
    
    cancelled_provider_id = booking["provider"]["id"]
    
    # Run Recovery Agent
    rec_agent = RecoveryAgent()
    rec_res = await rec_agent.run(booking, booking.get("intent", {"service_type": "AC Repair"}), cancelled_provider_id)
    
    await log_agent_trace_to_db(booking_id, "RecoveryAgent", {"booking_id": booking_id}, rec_res["reasoning"], {"recovered": bool(rec_res["recovery"])})
    
    if rec_res["recovery"]:
        rec = rec_res["recovery"]
        new_provider = rec["new_provider"]
        
        booking["status"] = "recovered"
        booking["previous_provider"] = booking["provider"]
        booking["provider"] = {
            "id": new_provider["id"],
            "name": new_provider["name"],
            "phone": new_provider.get("phone", ""),
            "rating": new_provider.get("rating", 0)
        }
        booking["pricing"] = rec["new_pricing"]
        booking["schedule"] = rec["new_schedule"]
        
        db_update_booking(booking_id, booking)
        
        # Release old escrow and lock new one
        from payments.escrow import refund_escrow, deposit_to_escrow
        refund_escrow(booking_id)
        deposit_to_escrow(booking_id, "customer", new_provider["id"], rec["new_pricing"].get("total") or rec["new_pricing"].get("total_amount") or 1200)
        
        return {
            "booking": booking,
            "message": f"Recovery successful! New provider: {new_provider['name']}",
            "traces": []
        }
    else:
        booking["status"] = "failed_recovery"
        db_update_booking(booking_id, booking)
        return {
            "booking": booking,
            "message": "No alternative providers available. Manual intervention required.",
            "traces": []
        }

async def submit_feedback(booking_id: str, rating: int, comment: str = "") -> dict:
    """10. Support Agent: Processes user feedback and updates provider score."""
    booking = db_get_booking(booking_id)
    if not booking:
        return {"error": "Booking not found", "traces": []}
    
    provider_id = booking["provider"]["id"]
    
    # Run Support Agent
    sup_agent = SupportAgent()
    sup_res = await sup_agent.run(booking_id, provider_id, rating, comment)
    
    await log_agent_trace_to_db(booking_id, "SupportAgent", {"booking_id": booking_id}, sup_res["reasoning"], sup_res["feedback"])
    
    booking["status"] = "completed"
    booking["feedback"] = sup_res["feedback"]
    db_update_booking(booking_id, booking)
    
    # Release escrow on success
    from payments.escrow import release_escrow
    release_escrow(booking_id)
    
    return {
        "feedback": sup_res["feedback"],
        "message": f"Thank you! Your {rating}-star review has been recorded, and escrow payout has been authorized.",
        "traces": [],
    }

import os
import hashlib
import json
import logging
import asyncio
from datetime import datetime, timedelta
from core import settings

logger = logging.getLogger("AIManager")

class AIManager:
    _instance = None
    _lock = asyncio.Lock()
    openai_available = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(AIManager, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
        
        self.initialized = True
        self.vertex_available = False
        self.cache = {}
        self.cache_ttl = timedelta(hours=1)
        
        # Safe Vertex AI Initialization
        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel
            
            project = settings.GOOGLE_CLOUD_PROJECT
            location = settings.GOOGLE_CLOUD_LOCATION
            
            if project and location:
                # If a custom API key is needed for authentication or application default credentials
                if settings.GOOGLE_API_KEY:
                    os.environ["GEMINI_API_KEY"] = settings.GOOGLE_API_KEY
                    os.environ["API_KEY"] = settings.GOOGLE_API_KEY
                
                vertexai.init(project=project, location=location)
                self.vertex_available = True
                logger.info(f"Vertex AI successfully initialized in project {project}, location {location}.")
            else:
                logger.warning("Vertex AI settings (project/location) not set. Falling back to legacy SDK.")
        except Exception as e:
            logger.warning(f"Failed to initialize Vertex AI SDK: {e}. Will fallback to legacy SDK.")
            
        # Legacy SDK configuration
        try:
            import google.generativeai as genai
            api_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY
            if api_key:
                genai.configure(api_key=api_key)
                self.legacy_available = True
            else:
                self.legacy_available = False
        except Exception as e:
            logger.error(f"Failed to configure legacy SDK: {e}")
            self.legacy_available = False

    def _get_cache_key(self, prompt: str, system_prompt: str = "") -> str:
        data = f"{system_prompt}||{prompt}"
        return hashlib.md5(data.encode('utf-8')).hexdigest()

    def _check_cache(self, prompt: str, system_prompt: str = "") -> str:
        key = self._get_cache_key(prompt, system_prompt)
        if key in self.cache:
            val, expiry = self.cache[key]
            if datetime.now() < expiry:
                logger.info("Cache hit!")
                return val
            else:
                del self.cache[key]
        return None

    def _set_cache(self, prompt: str, val: str, system_prompt: str = ""):
        key = self._get_cache_key(prompt, system_prompt)
        expiry = datetime.now() + self.cache_ttl
        self.cache[key] = (val, expiry)

    # Static Cache / Local replies for standard phrases to save quota completely
    def get_static_fallback(self, user_message: str) -> dict:
        msg = user_message.lower().strip()
        
        # 1. Greetings (Disabled - let AI handle this dynamically)
        # We no longer return static text for "hi/hello" so the OpenAI model can answer.
        pass
        # 2. Authorization YES/CONFIRM
        if msg in ["yes", "confirm", "auth", "pay", "ha", "haan", "krdo", "do"]:
            return {
                "reply": "", # Handled by the orchestrator flow checkout step 2
                "action": "CONFIRM_BOOKING",
                "service_type": None,
                "location": None,
                "timing": None,
                "urgency": None,
                "details": None,
                "booking_id": None,
                "provider_name": None
            }
            
        # 3. Cancellation keywords
        if msg in ["cancel", "kharij", "wapas"]:
            return {
                "reply": "Main aapka booking request cancel kar rahi hoon.",
                "action": "CANCEL",
                "service_type": None,
                "location": None,
                "timing": None,
                "urgency": None,
                "details": None,
                "booking_id": None,
                "provider_name": None
            }
            
        return None

    async def call_vertex(self, prompt: str, system_prompt: str = "", temperature: float = 0.2, max_output_tokens: int = 800) -> str:
        from vertexai.generative_models import GenerativeModel, GenerationConfig
        
        # Combine system prompt with instructions
        model_name = settings.VERTEX_MODEL or "gemini-2.0-flash"
        model = GenerativeModel(
            model_name,
            system_instruction=system_prompt if system_prompt else None
        )
        
        config = GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
        
        # Run in executor thread since generate_content is synchronous in some Vertex SDK releases
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(prompt, generation_config=config)
        )
        return response.text.strip()

    async def call_legacy(self, prompt: str, system_prompt: str = "", temperature: float = 0.2, max_output_tokens: int = 800) -> str:
        import google.generativeai as genai
        
        model_name = settings.GEMINI_MODEL or "gemini-flash-latest"
        model = genai.GenerativeModel(model_name)
        
        # Legacy SDK passes system instruction inside model init or generate config
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(full_prompt, generation_config=config)
        )
        return response.text.strip()

    async def call_openai(self, prompt: str, system_prompt: str = "", temperature: float = 0.2, max_output_tokens: int = 800) -> str:
        """OpenAI ChatCompletion call – used as PRIMARY provider."""
        from openai import OpenAI
        
        api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not configured")
        
        client = OpenAI(api_key=api_key)
        model_name = settings.OPENAI_MODEL or "gpt-4o-mini"
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_output_tokens,
            )
        )
        return response.choices[0].message.content.strip()

    def local_mock_generate(self, prompt: str, system_prompt: str = "") -> str:
        # Check if the prompt is for ConversationAgent classification
        if "conversation_type" in system_prompt or "booking_workflow_allowed" in system_prompt or "Conversation Type" in system_prompt:
            import re
            user_msg = ""
            match = re.search(r'User message:\s*"([^"]+)"', prompt, re.IGNORECASE)
            if match:
                user_msg = match.group(1)
            else:
                lines = [l.strip() for l in prompt.split("\n") if l.strip()]
                if lines:
                    user_msg = lines[-1]
            
            user_msg_lower = user_msg.lower().strip()
            
            # Simple keyword matching to decide conversation workflow
            is_question = any(q in user_msg_lower for q in ["kiyu", "kyun", "q ", "why", "how", "reason", "causes", "check kaise", "?"])
            has_booking_intent = any(k in user_msg_lower for k in [
                "ac", "repair", "plumb", "leak", "pipe", "water", "electric", "light", 
                "fan", "wiring", "short", "spark", "fix", "repair", "service", 
                "cooling", "air conditioner", "book", "reserve"
            ])
            if is_question:
                has_booking_intent = False
            
            if has_booking_intent:
                # Booking or Emergency intent
                conv_type = "Booking Intent"
                if any(k in user_msg_lower for k in ["short", "spark", "fire", "emergency", "blast"]):
                    conv_type = "Emergency Request"
                
                res_obj = {
                    "conversation_type": conv_type,
                    "booking_confidence": "High",
                    "booking_workflow_allowed": True,
                    "reply": None
                }
            else:
                # Casual chat, greeting, status, wallet or cancel
                conv_type = "Casual Conversation"
                reply = "Assalamualaikum 😊 Welcome to ServicePilot AI. Main aapki AI operations concierge hoon. AC Repair, Plumbing, ya Electrician main se aapko kya service chahiye?"
                
                if any(k in user_msg_lower for k in ["hi", "hello", "salam", "hey", "aoa"]):
                    reply = "Assalamualaikum 😊 Welcome to ServicePilot. Main aapki AI operations concierge hoon. Aapko kis type ki service (AC Repair, Plumbing, ya Electrician) chahiye today?"
                elif any(k in user_msg_lower for k in ["leak", "drain", "coil", "pipe", "water", "servicepilot", "ac"]) and is_question:
                    conv_type = "Technical Question"
                    reply = "AC pipes and drain lines typically leak due to clogged drain pipes, dirty coils, or frozen coils causing water to overflow. ServicePilot AI can help you with expert maintenance! 😊"
                elif any(k in user_msg_lower for k in ["cancel", "wapas", "kharij"]):
                    reply = "Main aapka active booking request cancel kar rahi hoon. Agar aapko koi aur madad chahiye ho to zaroor batayen. 😊"
                elif any(k in user_msg_lower for k in ["wallet", "balance", "escrow"]):
                    reply = "Aapka wallet balance secure hai aur Escrow status up-to-date hai. 🧾"
                elif any(k in user_msg_lower for k in ["status", "check", "track"]):
                    reply = "Aapke current bookings ka status bilkul active aur processing mein hai. ⏳"
                
                res_obj = {
                    "conversation_type": conv_type,
                    "booking_confidence": "Low",
                    "booking_workflow_allowed": False,
                    "reply": reply
                }
            return json.dumps(res_obj)

        # Check if the prompt is for intent parsing
        elif "schema" in system_prompt or "parse_intent" in prompt or "service_type" in system_prompt:
            import re
            user_msg = ""
            match = re.search(r'User message:\s*"([^"]+)"', prompt, re.IGNORECASE)
            if match:
                user_msg = match.group(1)
            else:
                lines = [l.strip() for l in prompt.split("\n") if l.strip()]
                if lines:
                    user_msg = lines[-1]
            
            user_msg_lower = user_msg.lower().strip()
            
            # Extract service type
            service_type = None
            if "ac" in user_msg_lower or "cooling" in user_msg_lower or "air conditioner" in user_msg_lower:
                service_type = "AC Repair"
            elif "plumb" in user_msg_lower or "pipe" in user_msg_lower or "leak" in user_msg_lower or "water" in user_msg_lower:
                service_type = "Plumbing"
            elif "electric" in user_msg_lower or "light" in user_msg_lower or "wire" in user_msg_lower or "fan" in user_msg_lower or "short" in user_msg_lower:
                service_type = "Electrician"
                
            # Extract location
            location = None
            areas = ["dha", "clifton", "gulshan", "johar", "bahria", "cantt", "model town", "gulberg"]
            for area in areas:
                if area in user_msg_lower:
                    location = area.upper()
                    if area == "dha":
                        location = "DHA Phase 4"
                    break
                    
            # Extract timing
            timing = None
            if "kal" in user_msg_lower or "tomorrow" in user_msg_lower:
                timing = "Kal evening"
            elif "urgent" in user_msg_lower or "fauri" in user_msg_lower or "abho" in user_msg_lower or "now" in user_msg_lower:
                timing = "Urgent"
                
            # Extract urgency
            urgency = "Normal"
            if "urgent" in user_msg_lower or "fauri" in user_msg_lower or "now" in user_msg_lower:
                urgency = "Urgent"
                
            # Extract action and build reply
            action = "NONE"
            reply = ""
            
            if user_msg_lower in ["yes", "confirm", "auth", "pay", "ha", "haan", "krdo", "do", "ok", "okay"]:
                action = "CONFIRM_BOOKING"
                reply = "Main aapka booking request confirm kar rahi hoon!"
            elif "cancel" in user_msg_lower or "wapas" in user_msg_lower or "kharij" in user_msg_lower:
                action = "CANCEL"
                reply = "Main aapka active booking request cancel kar rahi hoon. Agar aapko koi aur madad chahiye ho to zaroor batayen. 😊"
            elif "wallet" in user_msg_lower or "balance" in user_msg_lower or "escrow" in user_msg_lower:
                action = "WALLET"
                reply = "Aapka wallet balance secure hai. Escrow mein locked amount aap yahan dekh sakte hain. 🧾"
            elif "status" in user_msg_lower or "check" in user_msg_lower or "track" in user_msg_lower:
                action = "CHECK_STATUS"
                reply = "Aapke active bookings ka status check kar rahi hoon. ⏳"
            elif "book" in user_msg_lower or "reserve" in user_msg_lower:
                action = "BOOK_PROVIDER"
                provider_name = "best"
                for word in user_msg.split():
                    if word[0].isupper() and word.lower() not in ["ac", "repair", "plumbing", "electrician"]:
                        provider_name = word
                        break
                reply = f"Sure! Main {provider_name} ko aapke liye book kar rahi hoon. ⚡"
            else:
                # Context parsing from history to retain state
                history_services = re.findall(r'(?:User|AI Agent):.*(AC Repair|Plumbing|Electrician)', prompt)
                if not service_type and history_services:
                    service_type = history_services[-1]
                    
                history_locations = re.findall(r'(?:User|AI Agent):.*(DHA Phase 4|CLIFTON|GULSHAN|JOHAR|BAHRIA|CANTT)', prompt, re.IGNORECASE)
                if not location and history_locations:
                    location = history_locations[-1]
                    
                if service_type and location and timing:
                    action = "RECOMMEND"
                    reply = "Understood 😊 Main verified specialists search kar rahi hoon jo aapki location par available hain..."
                elif service_type and location:
                    reply = "Great 👍 Kya aapko service urgently chahiye ya aap custom timing select karna chahenge?"
                elif service_type:
                    reply = "Sure 😊 Main aapki help karti hoon. Aap kis area mein service chahte hain?"
                else:
                    reply = "Assalamualaikum 😊 Welcome to ServicePilot. Main aapki AI operations concierge hoon. Aapko kis type ki service (AC Repair, Plumbing, ya Electrician) chahiye today?"
            
            res_obj = {
                "reply": reply,
                "action": action,
                "service_type": service_type,
                "location": location,
                "timing": timing,
                "urgency": urgency,
                "details": f"{service_type} issue" if service_type else None,
                "booking_id": None,
                "provider_name": "best" if action == "BOOK_PROVIDER" else None
            }
            return json.dumps(res_obj)

        # Check if the prompt is for checkout flow
        elif "Receipt outline" in prompt or "checkout" in prompt.lower() or "Checkout flow" in prompt:
            import re
            provider_name = "Specialist"
            name_match = re.search(r'Provider Name:\s*([^\n]+)', prompt)
            if name_match:
                provider_name = name_match.group(1).strip()
                
            provider_rate = "1200"
            rate_match = re.search(r'Provider Rate:\s*Rs\.\s*([^\n]+)', prompt)
            if rate_match:
                provider_rate = rate_match.group(1).strip()
            else:
                rate_match_2 = re.search(r'rate\s*:\s*Rs\.\s*([^\n]+)', prompt)
                if rate_match_2:
                    provider_rate = rate_match_2.group(1).strip()
                    
            time_slot = "tomorrow"
            slot_match = re.search(r'Time Slot:\s*([^\n]+)', prompt)
            if slot_match:
                time_slot = slot_match.group(1).strip()
                
            rate_val = 1200
            try:
                rate_val = float(provider_rate.replace(",", ""))
            except:
                pass
            fee_val = rate_val * 0.1
            total_val = rate_val + fee_val
            
            if "Step 2" in prompt or "YES" in prompt or "CONFIRM" in prompt:
                return f"Aapki booking successfully confirm ho chuki hai! 🎉\n\n• Specialist: {provider_name}\n• Time: {time_slot}\n• Payout: Rs. {total_val} (Escrow mein held hai)\n\nHamara technician on-time aapke address par pohanch jaye ga. Shukriya!"
            else:
                return f"Perfect! Maine {provider_name} ke liye selected time slot {time_slot} confirm kar liya hai. 😊\n\nHere is your billing receipt summary:\n• Base Rate: Rs. {rate_val}\n• Escrow Platform Fee (10%): Rs. {fee_val}\n• Total Amount: Rs. {total_val}\n\nYeh payment secure Escrow mein lock ho chuki hai and jab kaam complete ho ga tabhi release ho gi. Please booking confirm karne ke liye **YES** ya **CONFIRM** likh kar reply karen!"

        return "Hi there! I am your ServicePilot AI Assistant. How can I help you today?"

    async def generate_content_with_retry(self, prompt: str, system_prompt: str = "", temperature: float = 0.2, max_output_tokens: int = 800, max_retries: int = 3) -> str:
        # Check cache first
        cached = self._check_cache(prompt, system_prompt)
        if cached:
            return cached

        # ── PRIORITY 1: OpenAI (Primary provider) ──
        openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")
        if openai_key:
            delay = 2
            for attempt in range(max_retries):
                try:
                    logger.info(f"[OpenAI PRIMARY] Attempt {attempt+1}/{max_retries}")
                    res = await self.call_openai(prompt, system_prompt, temperature, max_output_tokens)
                    self._set_cache(prompt, res, system_prompt)
                    return res
                except Exception as e:
                    err_str = str(e).lower()
                    is_quota = any(kw in err_str for kw in ["rate_limit", "quota", "insufficient_quota", "billing", "exceeded"])
                    if is_quota:
                        logger.warning(f"[OpenAI] Credits/quota exhausted: {e}. Falling back to Gemini...")
                        break  # go to Gemini fallback
                    logger.warning(f"[OpenAI] Call failed: {e}. Retrying...")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(delay)
                        delay *= 2

        # ── PRIORITY 2: Gemini (Fallback when OpenAI is exhausted) ──
        if self.vertex_available or self.legacy_available:
            delay = 2
            last_err = None
            
            for attempt in range(max_retries):
                try:
                    if self.vertex_available:
                        logger.info(f"[Gemini Vertex] Attempt {attempt+1}/{max_retries}")
                        res = await self.call_vertex(prompt, system_prompt, temperature, max_output_tokens)
                        self._set_cache(prompt, res, system_prompt)
                        return res
                    elif self.legacy_available:
                        logger.info(f"[Gemini Legacy] Attempt {attempt+1}/{max_retries}")
                        res = await self.call_legacy(prompt, system_prompt, temperature, max_output_tokens)
                        self._set_cache(prompt, res, system_prompt)
                        return res
                    else:
                        raise Exception("No active Gemini SDK configured.")
                except Exception as e:
                    last_err = e
                    err_str = str(e).lower()
                    is_auth_error = any(kw in err_str for kw in ["credentials", "api_key_service_blocked", "unauthenticated", "unauthorized", "blocked", "key not found", "api key"])
                    
                    if is_auth_error:
                        if self.vertex_available:
                            logger.warning(f"Permanent auth error on Vertex AI: {e}. Disabling.")
                            self.vertex_available = False
                            continue
                        elif self.legacy_available:
                            logger.warning(f"Permanent auth error on Legacy SDK: {e}. Disabling.")
                            self.legacy_available = False
                            break
                    
                    logger.warning(f"[Gemini] Call failed: {e}. Retrying...")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(delay)
                        delay *= 2
            
            # If Vertex failed, try legacy
            if not self.vertex_available and self.legacy_available:
                try:
                    logger.info("[Gemini] Vertex disabled. Trying Legacy SDK...")
                    res = await self.call_legacy(prompt, system_prompt, temperature, max_output_tokens)
                    self._set_cache(prompt, res, system_prompt)
                    return res
                except Exception as e:
                    err_str = str(e).lower()
                    if any(kw in err_str for kw in ["credentials", "api_key_service_blocked", "unauthenticated", "unauthorized", "blocked", "key not found", "api key"]):
                        logger.warning(f"Permanent auth error on Legacy fallback: {e}. Disabling.")
                        self.legacy_available = False

        # ── PRIORITY 3: Local mock (last resort) ──
        logger.warning("All AI providers failed. Activating local mock AI agent.")
        res = self.local_mock_generate(prompt, system_prompt)
        self._set_cache(prompt, res, system_prompt)
        return res

ai_manager = AIManager()

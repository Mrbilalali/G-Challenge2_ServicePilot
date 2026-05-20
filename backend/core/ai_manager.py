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
        
        # 1. Greetings
        if msg in ["hi", "hello", "salam", "aoa", "hey", "assalam", "assalamualaikum"]:
            return {
                "reply": "Assalamualaikum 😊 Welcome to ServicePilot AI. Main aapki AI operations concierge hoon. Aapko kis type ki service (AC Repair, Plumbing, ya Electrician) chahiye today?",
                "action": "NONE",
                "service_type": None,
                "location": None,
                "timing": None,
                "urgency": None,
                "details": None,
                "booking_id": None,
                "provider_name": None
            }
            
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

    async def generate_content_with_retry(self, prompt: str, system_prompt: str = "", temperature: float = 0.2, max_output_tokens: int = 800, max_retries: int = 3) -> str:
        # Check cache first
        cached = self._check_cache(prompt, system_prompt)
        if cached:
            return cached

        if not self.vertex_available and not self.legacy_available:
            raise Exception("No active AI SDK configured.")

        delay = 2
        last_err = None
        
        for attempt in range(max_retries):
            try:
                if self.vertex_available:
                    logger.info(f"Attempting Vertex AI request (Attempt {attempt+1}/{max_retries})")
                    res = await self.call_vertex(prompt, system_prompt, temperature, max_output_tokens)
                    self._set_cache(prompt, res, system_prompt)
                    return res
                elif self.legacy_available:
                    logger.info(f"Attempting Legacy Gemini request (Attempt {attempt+1}/{max_retries})")
                    res = await self.call_legacy(prompt, system_prompt, temperature, max_output_tokens)
                    self._set_cache(prompt, res, system_prompt)
                    return res
                else:
                    raise Exception("No active AI SDK configured.")
            except Exception as e:
                last_err = e
                err_str = str(e).lower()
                is_auth_error = any(kw in err_str for kw in ["credentials", "api_key_service_blocked", "unauthenticated", "unauthorized", "blocked", "key not found", "api key"])
                
                if is_auth_error:
                    if self.vertex_available:
                        logger.warning(f"Permanent authentication or service block error on Vertex AI: {e}. Disabling Vertex AI immediately.")
                        self.vertex_available = False
                        continue
                    elif self.legacy_available:
                        logger.warning(f"Permanent authentication or service block error on Legacy SDK: {e}. Disabling Legacy SDK immediately.")
                        self.legacy_available = False
                        break
                
                logger.warning(f"AI Call failed: {e}. Retrying with exponential backoff...")
                if attempt < max_retries - 1:
                    await asyncio.sleep(delay)
                    delay *= 2
        
        # If Vertex failed or was disabled, try legacy SDK if it's available
        if not self.vertex_available and self.legacy_available:
            try:
                logger.info("Vertex AI is disabled/failed. Trying Legacy Gemini SDK...")
                res = await self.call_legacy(prompt, system_prompt, temperature, max_output_tokens)
                self._set_cache(prompt, res, system_prompt)
                return res
            except Exception as e:
                last_err = e
                err_str = str(e).lower()
                if any(kw in err_str for kw in ["credentials", "api_key_service_blocked", "unauthenticated", "unauthorized", "blocked", "key not found", "api key"]):
                    logger.warning(f"Permanent auth error on Legacy SDK fallback: {e}. Disabling Legacy SDK immediately.")
                    self.legacy_available = False

        raise last_err

ai_manager = AIManager()

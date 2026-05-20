import os
import sys
import asyncio

# Ensure python finds backend folder
sys.path.append(os.path.dirname(__file__))

from google.oauth2.credentials import Credentials
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from core import settings

async def main():
    print("Testing Vertex AI authentication using token...")
    token = settings.GOOGLE_API_KEY or settings.GEMINI_API_KEY
    print("Token prefix:", token[:10] if token else "None")
    
    try:
        credentials = Credentials(token=token)
        vertexai.init(
            project=settings.GOOGLE_CLOUD_PROJECT,
            location=settings.GOOGLE_CLOUD_LOCATION,
            credentials=credentials
        )
        print("[OK] Vertex AI initialized successfully with Credentials object.")
        
        print("Sending request to Vertex AI gemini-2.0-flash...")
        model = GenerativeModel("gemini-2.0-flash")
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content("Say exactly: Vertex AI Token is working!")
        )
        print("SUCCESS! Vertex AI Responded:")
        print("Response text:", response.text.strip())
        
    except Exception as e:
        print("ERROR! Vertex AI Call failed.")
        print("Error Details:", str(e))

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    asyncio.run(main())

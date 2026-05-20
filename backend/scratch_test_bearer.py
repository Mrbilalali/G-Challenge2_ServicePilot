import os
import urllib.request
import urllib.error
import json

env_path = r"C:\Users\Bilal.Ali\Documents\Google_Task\backend\.env"

api_key = None
with open(env_path, "r") as f:
    for line in f:
        if line.startswith("GEMINI_API_KEY="):
            api_key = line.split("=", 1)[1].strip()
            break

if not api_key:
    print("❌ API Key not found in .env")
    exit(1)

print("Testing OAuth2 Bearer token against Generative Language API...")
print("Token prefix:", api_key[:10], "...", flush=True)

# Using Generative Language API with Bearer token
url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
data = {
    "contents": [{"parts": [{"text": "Say exactly: Bearer Token is working!"}]}]
}
req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode("utf-8"), 
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
)

try:
    with urllib.request.urlopen(req, timeout=5) as response:
        result = json.loads(response.read().decode())
        print("SUCCESS! API Responded:")
        print("Response text:", result["candidates"][0]["content"]["parts"][0]["text"])
except urllib.error.HTTPError as e:
    print(f"ERROR! HTTP Error: {e.code}")
    print("Error Details:", e.read().decode())
except Exception as e:
    print("ERROR! Connection failed.")
    print("Error Details:", str(e))

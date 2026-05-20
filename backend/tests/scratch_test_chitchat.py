import urllib.request
import json
import sys

# Reconfigure stdout to support unicode emojis in Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

def send_request(msg, step=0, tech=None, rate=None, slot=None, history=None):
    url = "http://localhost:8000/api/request"
    payload = {
        "message": msg,
        "booking_step": step,
        "selected_tech_name": tech,
        "selected_tech_rate": rate,
        "selected_time_slot": slot,
        "chat_history": history or []
    }
    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode("utf-8"), 
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            print(f"==> Msg: \"{msg}\"")
            print("Action returned:", res_data.get("action"))
            print("Message returned:", res_data.get("message").replace("\n", " "))
            print("-" * 60)
            return res_data
    except Exception as e:
        print("Error on request:", e)
        return None

if __name__ == "__main__":
    print("--- Running Out of Context / Chit-chat Diagnostics ---\n")
    
    send_request("Mausam kaisa hai aaj Lahore ka?")
    send_request("Aapka naam kya hai?")
    send_request("Who created you?")
    send_request("AC repair chahiye Lahore me") # Should NOT be chit-chat

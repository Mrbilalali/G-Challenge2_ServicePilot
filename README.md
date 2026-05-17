# ServicePilot AI - Agentic Service Orchestrator

ServicePilot AI is a production-style, AI-powered service operations platform that automates the full lifecycle of home services (AC repair, plumbing, electricians) for the informal economy.

## 🚀 Vision
To bridge the gap between informal service providers and users through **Autonomous Agentic Workflows**. Unlike simple booking apps, ServicePilot AI handles the "messy" reality of scheduling, cancellations, and multilingual communication.

## 🧠 Core Architecture (Antigravity Orchestration)
The system uses a multi-agent orchestration pattern where **Google Antigravity** acts as the central brain.

### 1. The Agent Fleet
*   **Intent Understanding Agent**: Parses Multilingual (Urdu, Roman Urdu, English) requests.
*   **Provider Matching Agent**: Ranks providers based on 6+ factors (Reliability, Distance, Rating, etc.).
*   **Pricing Agent**: Generates dynamic quotes with transparent reasoning.
*   **Scheduling Agent**: Manages time-slots and travel buffers.
*   **Recovery Agent**: Automatically re-books if a provider cancels.
*   **Feedback & Dispute Agent**: Updates reputation and resolves issues.

### 2. Reasoning Traces
Every decision is logged and visualized.
- **Why a provider was selected?**
- **How was the price calculated?**
- **Why did re-booking occur?**

## 🛠️ Tech Stack
- **Frontend**: Next.js, Tailwind CSS, shadcn/ui
- **Mobile**: Expo (React Native)
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Orchestration**: Google Antigravity

## 📂 Project Structure
```text
backend/            # FastAPI & AI Agents
frontend/           # Next.js Web Dashboard
mobile/             # Expo React Native App
docs/               # Reasoning diagrams & flowcharts
```

## 📈 Key Logic
### Matching Score
`Score = (Reliability * 0.3) + (Distance_Inv * 0.2) + (Rating * 0.15) + (Price_Fit * 0.15) + (Recent_Reviews * 0.1) + (Capacity * 0.1)`

### Pricing Engine
`Total = Base + (Distance * Rate) + (Urgency_Factor) + (Complexity_Factor) - Loyalty_Discount`

## 🎯 Demo Flow
1. **User Request**: "AC thanda nahi kar raha, kal morning DHA mein technician chahiye."
2. **Analysis**: Intent extraction & Provider ranking.
3. **Booking**: Confirmation & Scheduling.
4. **Recovery**: Simulate provider cancellation -> Auto-rebooking of secondary technician.
5. **Resolution**: Feedback loop & Reputation update.

---
*Developed for Challenge 2: AI Service Orchestrator for Informal Economy*

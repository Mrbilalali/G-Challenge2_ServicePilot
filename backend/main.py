"""
ServicePilot AI — FastAPI Backend
Agentic Service Orchestrator for the Informal Economy
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from core import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered service orchestrator with multi-agent reasoning",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "agents": [
            "IntentAgent",
            "MatchingAgent",
            "PricingAgent",
            "SchedulingAgent",
            "RecoveryAgent",
            "FeedbackAgent",
        ],
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}

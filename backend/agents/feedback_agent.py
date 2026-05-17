"""
Feedback & Dispute Agent
Processes user feedback and updates provider reputation scores.
"""
from core.database import db_get_provider, db_update_provider


async def process_feedback(booking_id: str, provider_id: str, rating: int, comment: str = "") -> dict:
    trace = {
        "agent": "FeedbackAgent",
        "input": {"booking_id": booking_id, "provider_id": provider_id, "rating": rating},
        "reasoning": [],
    }
    
    provider = db_get_provider(provider_id)
    if not provider:
        trace["reasoning"].append(f"Provider {provider_id} not found")
        trace["status"] = "error"
        return {"feedback": None, "trace": trace}
    
    old_rating = provider.get("rating", 4.0)
    old_reviews = provider.get("total_reviews", 0)
    old_reliability = provider.get("reliability_score", 0.8)
    
    # Calculate new rating (weighted moving average)
    new_total_reviews = old_reviews + 1
    new_rating = round(((old_rating * old_reviews) + rating) / new_total_reviews, 2)
    
    trace["reasoning"].append(f"Previous rating: {old_rating}/5 ({old_reviews} reviews)")
    trace["reasoning"].append(f"New review: {rating}/5")
    trace["reasoning"].append(f"Updated rating: {new_rating}/5 ({new_total_reviews} reviews)")
    
    # Adjust reliability based on rating
    if rating >= 4:
        new_reliability = min(1.0, old_reliability + 0.01)
        trace["reasoning"].append(f"Positive review: Reliability {old_reliability:.2f} → {new_reliability:.2f} (+0.01)")
    elif rating <= 2:
        new_reliability = max(0.3, old_reliability - 0.03)
        trace["reasoning"].append(f"Negative review: Reliability {old_reliability:.2f} → {new_reliability:.2f} (-0.03)")
    else:
        new_reliability = old_reliability
        trace["reasoning"].append("Neutral review: No reliability change")
    
    # Detect dispute keywords
    dispute = False
    dispute_keywords = ["scam", "fraud", "didn't come", "nahi aya", "fake", "dhoka", "overcharged"]
    if comment:
        for kw in dispute_keywords:
            if kw.lower() in comment.lower():
                dispute = True
                new_reliability = max(0.3, new_reliability - 0.05)
                trace["reasoning"].append(f"⚠ DISPUTE detected (keyword: '{kw}'). Extra reliability penalty applied.")
                break
    
    # Update provider
    updates = {
        "rating": new_rating,
        "total_reviews": new_total_reviews,
        "reliability_score": round(new_reliability, 3),
    }
    db_update_provider(provider_id, updates)
    
    trace["status"] = "success"
    trace["output"] = {
        "new_rating": new_rating,
        "new_reliability": round(new_reliability, 3),
        "dispute_flagged": dispute,
    }
    
    return {
        "feedback": {
            "booking_id": booking_id,
            "provider_id": provider_id,
            "rating_given": rating,
            "new_rating": new_rating,
            "new_reliability": round(new_reliability, 3),
            "dispute_flagged": dispute,
            "total_reviews": new_total_reviews,
        },
        "trace": trace,
    }

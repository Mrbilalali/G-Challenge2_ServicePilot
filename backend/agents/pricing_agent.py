"""
Dynamic Pricing Agent
Generates transparent price quotes with full reasoning breakdown.
Total = Base + (Distance × Rate) + Urgency_Factor + Complexity_Factor - Loyalty_Discount
"""

URGENCY_MULTIPLIERS = {
    "same_day": 1.30,
    "emergency": 1.30,
    "next_day": 1.00,
    "tomorrow": 1.00,
    "this_week": 0.90,
    "flexible": 0.90,
}

COMPLEXITY_KEYWORDS = {
    "complex": ["installation", "wiring overhaul", "central ac", "major repair"],
    "intermediate": ["multi-unit", "gas refill", "minor parts", "inverter", "short circuit"],
    "basic": ["maintenance", "single unit", "no parts needed", "service"],
}


async def calculate_price(provider: dict, intent: dict, is_returning_customer: bool = False) -> dict:
    """Generate a dynamic price quote with transparent reasoning."""
    
    trace = {
        "agent": "PricingAgent",
        "input": {
            "provider": provider.get("name"),
            "base_price": provider.get("base_price"),
            "urgency": intent.get("urgency"),
        },
        "reasoning": [],
    }
    
    base = provider.get("base_rate", 600)
    distance = provider.get("distance_km", 5)
    urgency = intent.get("urgency", "flexible")
    description = intent.get("issue_description", "").lower()
    
    # 1. Base price
    trace["reasoning"].append(f"Base service charge: Rs.{base}")
    
    # 2. Distance cost
    distance_cost = min(round(distance * 15), 200)
    trace["reasoning"].append(f"Distance cost: {distance}km × Rs.15/km (capped at 200) = Rs.{distance_cost}")
    
    # 3. Urgency factor
    urgency_mult = URGENCY_MULTIPLIERS.get(urgency, 1.0)
    trace["reasoning"].append(f"Urgency multiplier ({urgency}): ×{urgency_mult}")
    
    # 4. Complexity factor
    complexity_mult = 1.0
    complexity_level = "basic"
    for kw in COMPLEXITY_KEYWORDS["complex"]:
        if kw in description:
            complexity_mult = 1.50
            complexity_level = "complex"
            break
    if complexity_mult == 1.0:
        for kw in COMPLEXITY_KEYWORDS["intermediate"]:
            if kw in description:
                complexity_mult = 1.20
                complexity_level = "intermediate"
                break
                
    trace["reasoning"].append(f"Complexity multiplier ({complexity_level}): ×{complexity_mult}")
    
    # 5. Loyalty discount
    loyalty_discount_pct = 0.0
    if is_returning_customer: # mock user with 5 bookings
        loyalty_discount_pct = 0.05
    trace["reasoning"].append(f"Loyalty discount: -{loyalty_discount_pct*100}%")
    
    # 6. Total Formula
    subtotal = (base + distance_cost) * urgency_mult * complexity_mult
    loyalty_discount_amount = round(subtotal * loyalty_discount_pct)
    total_before_fee = subtotal - loyalty_discount_amount
    
    platform_fee = round(total_before_fee * 0.025)
    total = round(total_before_fee + platform_fee)
    
    trace["reasoning"].append(f"═══════════════════════════════════")
    trace["reasoning"].append(f"TOTAL ESTIMATED: Rs.{total}")
    
    pricing = {
        "base_price": base,
        "distance_cost": distance_cost,
        "urgency_surcharge": round((base + distance_cost) * (urgency_mult - 1)),
        "complexity_cost": round((base + distance_cost) * urgency_mult * (complexity_mult - 1)),
        "loyalty_discount": loyalty_discount_amount,
        "platform_fee": platform_fee,
        "total": total,
        "currency": "PKR",
        "urgency_level": urgency,
        "distance_km": distance,
    }
    
    trace["output"] = pricing
    trace["status"] = "success"
    
    return {"pricing": pricing, "trace": trace}

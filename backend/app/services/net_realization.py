"""
Net-Realization Engine — SIH26132 core module.

Calculates expected net realization:
  NET REALIZATION = Selling Price - Transport Cost - Storage Cost - Platform/Transaction Fees - Other Costs

Never ranks buyers strictly by gross quoted price. Provides explicit comparisons and recommendations.
"""
from __future__ import annotations


def calculate_net_realization(
    selling_price_per_kg: float,
    transport_cost_per_kg: float = 0.0,
    storage_cost_per_kg: float = 0.0,
    other_costs_per_kg: float = 0.0,
    platform_fee_percent: float = 1.0,
) -> float:
    platform_fee_per_kg = selling_price_per_kg * (platform_fee_percent / 100.0)
    net = selling_price_per_kg - transport_cost_per_kg - storage_cost_per_kg - other_costs_per_kg - platform_fee_per_kg
    return round(max(net, 0.0), 2)


def compare_buyer_offers(offers: list[dict], quantity_kg: float = 1000.0) -> dict:
    """Ranks buyer offers by net realization, producing clear comparison breakdowns
    and plain-language guidance for farmers.
    """
    enriched = []
    for o in offers:
        buyer_name = o.get("buyer_name", "Unknown Buyer")
        price = float(o.get("price_per_kg", 0.0))
        transport = float(o.get("transport_cost_per_kg", 0.0))
        storage = float(o.get("storage_cost_per_kg", 0.0))
        other = float(o.get("other_costs_per_kg", 0.0))
        platform_fee_pct = float(o.get("platform_fee_percent", 1.0))

        net_per_kg = calculate_net_realization(
            selling_price_per_kg=price,
            transport_cost_per_kg=transport,
            storage_cost_per_kg=storage,
            other_costs_per_kg=other,
            platform_fee_percent=platform_fee_pct,
        )
        total_gross = round(price * quantity_kg, 2)
        total_net = round(net_per_kg * quantity_kg, 2)

        enriched.append({
            "buyer_id": o.get("buyer_id", ""),
            "buyer_name": buyer_name,
            "quoted_price_per_kg": price,
            "transport_cost_per_kg": transport,
            "storage_cost_per_kg": storage,
            "other_costs_per_kg": other,
            "platform_fee_per_kg": round(price * (platform_fee_pct / 100.0), 2),
            "net_realization_per_kg": net_per_kg,
            "total_gross_realization": total_gross,
            "total_net_realization": total_net,
            "location": o.get("location", "Local Mandi"),
        })

    # Sort descending by net realization per kg
    sorted_offers = sorted(enriched, key=lambda x: x["net_realization_per_kg"], reverse=True)

    top_offer = sorted_offers[0] if sorted_offers else None
    explanation = ""

    if len(sorted_offers) > 1:
        best_by_price = max(sorted_offers, key=lambda x: x["quoted_price_per_kg"])
        best_by_net = sorted_offers[0]

        if best_by_net["buyer_id"] != best_by_price["buyer_id"]:
            explanation = (
                f"Note: {best_by_price['buyer_name']} offers a higher quoted price (₹{best_by_price['quoted_price_per_kg']}/kg), "
                f"but {best_by_net['buyer_name']} yields a HIGHER NET REALIZATION (₹{best_by_net['net_realization_per_kg']}/kg) "
                f"after accounting for transport and logistics costs."
            )
        else:
            explanation = f"{best_by_net['buyer_name']} offers the highest net realization of ₹{best_by_net['net_realization_per_kg']}/kg."

    return {
        "ranked_offers": sorted_offers,
        "best_option": top_offer,
        "explanation": explanation,
    }

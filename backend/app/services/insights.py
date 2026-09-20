"""Predictive insights generator.

Combines ML forecasting results with business rules to produce
actionable inventory recommendations.
"""

from datetime import datetime, timedelta, timezone
from app.extensions import db
from app.models.product import Product
from app.models.transaction import Transaction
from app.services.forecasting import get_product_demand_history


def generate_insights():
    """Generate AI-powered inventory insights across all products.

    Returns a list of insight dicts, each containing:
      - type: reorder | overstock | trending_up | trending_down | stockout_risk
      - severity: info | warning | critical
      - title / message: human-readable insight
      - product_id / product_name
      - metrics: supporting data
    """
    products = Product.query.filter(Product.is_active.is_(True)).all()
    insights = []

    for product in products:
        daily = get_product_demand_history(product.id, days=60)
        if daily.empty:
            continue

        avg_demand = daily["demand"].mean()
        recent_demand = daily.tail(7)["demand"].mean()
        older_demand = daily.head(7)["demand"].mean() if len(daily) >= 14 else avg_demand

        # --- Stockout Risk ---
        if avg_demand > 0:
            days_until_stockout = product.quantity / avg_demand
            if days_until_stockout < 7:
                insights.append({
                    "type": "stockout_risk",
                    "severity": "critical",
                    "title": f"Stockout Risk: {product.name}",
                    "message": (
                        f"At current demand ({avg_demand:.1f} units/day), "
                        f"{product.name} will run out in ~{days_until_stockout:.0f} days. "
                        f"Recommended reorder: {int(avg_demand * 30)} units."
                    ),
                    "product_id": product.id,
                    "product_name": product.name,
                    "metrics": {
                        "days_until_stockout": round(days_until_stockout, 1),
                        "current_stock": product.quantity,
                        "avg_daily_demand": round(avg_demand, 1),
                        "recommended_order": int(avg_demand * 30),
                    },
                })

        # --- Reorder Suggestion ---
        if product.quantity <= product.reorder_level and product.quantity > 0:
            order_qty = max(
                int(avg_demand * 30) - product.quantity,
                product.reorder_level * 2,
            )
            insights.append({
                "type": "reorder",
                "severity": "warning",
                "title": f"Reorder Needed: {product.name}",
                "message": (
                    f"Stock is at {product.quantity} units (reorder level: {product.reorder_level}). "
                    f"Suggested order quantity: {order_qty} units based on 30-day demand forecast."
                ),
                "product_id": product.id,
                "product_name": product.name,
                "metrics": {
                    "current_stock": product.quantity,
                    "reorder_level": product.reorder_level,
                    "suggested_order": order_qty,
                    "avg_daily_demand": round(avg_demand, 1),
                },
            })

        # --- Trending Up ---
        if older_demand > 0 and recent_demand > older_demand * 1.5:
            pct_increase = ((recent_demand - older_demand) / older_demand) * 100
            insights.append({
                "type": "trending_up",
                "severity": "info",
                "title": f"Trending Up: {product.name}",
                "message": (
                    f"Demand for {product.name} increased {pct_increase:.0f}% in the last 7 days "
                    f"({recent_demand:.1f} vs {older_demand:.1f} units/day). "
                    f"Consider increasing safety stock."
                ),
                "product_id": product.id,
                "product_name": product.name,
                "metrics": {
                    "recent_avg": round(recent_demand, 1),
                    "previous_avg": round(older_demand, 1),
                    "pct_change": round(pct_increase, 1),
                },
            })

        # --- Trending Down ---
        if older_demand > 0 and recent_demand < older_demand * 0.5:
            pct_decrease = ((older_demand - recent_demand) / older_demand) * 100
            insights.append({
                "type": "trending_down",
                "severity": "info",
                "title": f"Demand Declining: {product.name}",
                "message": (
                    f"Demand for {product.name} dropped {pct_decrease:.0f}% in the last 7 days. "
                    f"Consider reducing upcoming orders to avoid overstock."
                ),
                "product_id": product.id,
                "product_name": product.name,
                "metrics": {
                    "recent_avg": round(recent_demand, 1),
                    "previous_avg": round(older_demand, 1),
                    "pct_change": round(-pct_decrease, 1),
                },
            })

        # --- Overstock Warning ---
        if product.quantity > product.max_stock * 0.85:
            excess = product.quantity - int(product.max_stock * 0.7)
            insights.append({
                "type": "overstock",
                "severity": "warning",
                "title": f"Overstock Warning: {product.name}",
                "message": (
                    f"{product.name} is at {product.quantity}/{product.max_stock} capacity "
                    f"({product.quantity / product.max_stock * 100:.0f}%). "
                    f"Consider running a promotion or redistributing {excess} units."
                ),
                "product_id": product.id,
                "product_name": product.name,
                "metrics": {
                    "current_stock": product.quantity,
                    "max_stock": product.max_stock,
                    "utilization_pct": round(product.quantity / product.max_stock * 100, 1),
                    "excess_units": excess,
                },
            })

    # Sort: critical first, then warning, then info
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    insights.sort(key=lambda x: severity_order.get(x["severity"], 3))

    return insights

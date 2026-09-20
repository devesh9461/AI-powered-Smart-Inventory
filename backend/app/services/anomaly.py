"""Anomaly detection service using Isolation Forest.

Detects unusual stock movement patterns across products.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from sklearn.ensemble import IsolationForest

from app.extensions import db
from app.models.product import Product
from app.models.transaction import Transaction


def detect_anomalies(contamination=0.1):
    """Detect anomalous stock movement patterns across all products.

    Uses IsolationForest to identify products with unusual:
    - Transaction volumes
    - Demand spikes/drops
    - Stock level changes

    Returns a list of anomaly dicts with product info and anomaly scores.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    products = Product.query.filter(Product.is_active.is_(True)).all()
    if not products:
        return []

    features = []
    product_info = []

    for product in products:
        recent_txns = (
            Transaction.query
            .filter(
                Transaction.product_id == product.id,
                Transaction.created_at >= cutoff,
            )
            .all()
        )

        if not recent_txns:
            continue

        stock_outs = [t for t in recent_txns if t.type == "stock_out"]
        stock_ins = [t for t in recent_txns if t.type == "stock_in"]

        total_out = sum(t.quantity for t in stock_outs)
        total_in = sum(t.quantity for t in stock_ins)
        avg_daily_out = total_out / 30.0
        avg_daily_in = total_in / 30.0

        out_quantities = [t.quantity for t in stock_outs] if stock_outs else [0]
        in_quantities = [t.quantity for t in stock_ins] if stock_ins else [0]

        # Feature vector
        feature = [
            total_out,
            total_in,
            avg_daily_out,
            avg_daily_in,
            np.std(out_quantities),
            np.std(in_quantities),
            max(out_quantities),
            len(stock_outs),
            len(stock_ins),
            product.quantity / max(product.reorder_level, 1),  # stock ratio
            abs(total_out - total_in),  # flow imbalance
        ]

        features.append(feature)
        product_info.append({
            "product": product,
            "total_out": total_out,
            "total_in": total_in,
            "avg_daily_out": round(avg_daily_out, 2),
            "txn_count": len(recent_txns),
        })

    if len(features) < 3:
        return []

    X = np.array(features)

    model = IsolationForest(
        contamination=min(contamination, 0.5),
        random_state=42,
        n_estimators=100,
    )
    model.fit(X)

    scores = model.decision_function(X)
    labels = model.predict(X)  # -1 = anomaly, 1 = normal

    anomalies = []
    for i, (label, score) in enumerate(zip(labels, scores)):
        info = product_info[i]
        product = info["product"]
        anomalies.append({
            "product_id": product.id,
            "product_name": product.name,
            "product_sku": product.sku,
            "category": product.category.name if product.category else "Uncategorized",
            "is_anomaly": bool(label == -1),
            "anomaly_score": round(float(score), 4),
            "current_stock": product.quantity,
            "total_outflow": info["total_out"],
            "total_inflow": info["total_in"],
            "avg_daily_demand": info["avg_daily_out"],
            "transaction_count": info["txn_count"],
            "severity": _score_to_severity(score),
            "reason": _generate_reason(info, score, label),
        })

    # Sort by anomaly score (most anomalous first)
    anomalies.sort(key=lambda x: x["anomaly_score"])

    return anomalies


def _score_to_severity(score):
    """Convert anomaly score to human-readable severity."""
    if score < -0.3:
        return "critical"
    elif score < -0.1:
        return "warning"
    return "normal"


def _generate_reason(info, score, label):
    """Generate a human-readable explanation for the anomaly."""
    if label != -1:
        return "Normal stock movement pattern"

    product = info["product"]
    reasons = []

    if info["total_out"] > info["total_in"] * 2:
        reasons.append("Demand significantly exceeds supply")
    if info["total_in"] > info["total_out"] * 3:
        reasons.append("Excessive restocking relative to demand")
    if product.quantity <= 0:
        reasons.append("Product is out of stock")
    if product.quantity < product.reorder_level:
        reasons.append("Stock below reorder level")
    if info["avg_daily_out"] > 20:
        reasons.append("Unusually high daily demand")

    return "; ".join(reasons) if reasons else "Unusual pattern detected by AI model"

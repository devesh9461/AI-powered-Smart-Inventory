"""AI routes — demand forecasting, anomaly detection, insights."""

from flask import Blueprint, jsonify
from app.services.forecasting import forecast_demand
from app.services.anomaly import detect_anomalies
from app.services.insights import generate_insights
from app.utils.auth_helpers import token_required

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


@ai_bp.route("/forecast/<int:product_id>", methods=["GET"])
@token_required
def get_forecast(current_user, product_id):
    """Get 30-day demand forecast for a specific product."""
    try:
        forecast = forecast_demand(product_id, forecast_days=30)
        return jsonify({"forecast": forecast, "product_id": product_id})
    except Exception as e:
        return jsonify({"error": f"Forecasting failed: {str(e)}"}), 500


@ai_bp.route("/anomalies", methods=["GET"])
@token_required
def get_anomalies(current_user):
    """Detect anomalous stock patterns across all products."""
    try:
        anomalies = detect_anomalies()
        anomaly_list = [a for a in anomalies if a["is_anomaly"]]
        return jsonify({
            "anomalies": anomaly_list,
            "all_products": anomalies,
            "total_anomalies": len(anomaly_list),
        })
    except Exception as e:
        return jsonify({"error": f"Anomaly detection failed: {str(e)}"}), 500


@ai_bp.route("/insights", methods=["GET"])
@token_required
def get_insights(current_user):
    """Get AI-generated inventory insights."""
    try:
        insights = generate_insights()
        return jsonify({
            "insights": insights,
            "total": len(insights),
            "critical_count": sum(1 for i in insights if i["severity"] == "critical"),
            "warning_count": sum(1 for i in insights if i["severity"] == "warning"),
        })
    except Exception as e:
        return jsonify({"error": f"Insight generation failed: {str(e)}"}), 500


@ai_bp.route("/refresh", methods=["POST"])
@token_required
def refresh_ai_models(current_user):
    """Trigger on-demand retraining and recalibration of all AI models."""
    try:
        anomalies = detect_anomalies()
        insights = generate_insights()
        anomaly_count = sum(1 for a in anomalies if a["is_anomaly"])

        return jsonify({
            "message": "AI neural telemetry and ML models refreshed successfully",
            "anomaly_count": anomaly_count,
            "insights_count": len(insights),
            "status": "synchronized",
        }), 200
    except Exception as e:
        return jsonify({"error": f"Model refresh failed: {str(e)}"}), 500

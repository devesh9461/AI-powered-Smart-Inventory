"""Alert routes."""

from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.alert import Alert
from app.utils.auth_helpers import token_required

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")


@alerts_bp.route("", methods=["GET"])
@token_required
def get_alerts(current_user):
    severity = request.args.get("severity", "").strip().lower()
    status = request.args.get("status", "").strip().lower()

    query = Alert.query

    if severity:
        query = query.filter(Alert.severity == severity)
    if status == "unread":
        query = query.filter(Alert.is_read.is_(False))
    elif status == "read":
        query = query.filter(Alert.is_read.is_(True))

    alerts = (
        query.order_by(Alert.is_read.asc(), Alert.created_at.desc())
        .limit(100)
        .all()
    )
    unread_count = Alert.query.filter(Alert.is_read.is_(False)).count()

    return jsonify({
        "alerts": [a.to_dict() for a in alerts],
        "unread_count": unread_count,
        "total": len(alerts),
    })


@alerts_bp.route("/<int:alert_id>/read", methods=["PATCH"])
@token_required
def mark_read(current_user, alert_id):
    alert = Alert.query.get_or_404(alert_id)
    alert.is_read = True
    db.session.commit()
    return jsonify({"alert": alert.to_dict()})


@alerts_bp.route("/read-all", methods=["PATCH"])
@token_required
def mark_all_read(current_user):
    Alert.query.filter(Alert.is_read.is_(False)).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All alerts marked as read"})


@alerts_bp.route("/<int:alert_id>", methods=["DELETE"])
@token_required
def delete_alert(current_user, alert_id):
    """Dismiss or delete a specific alert."""
    alert = Alert.query.get_or_404(alert_id)
    db.session.delete(alert)
    db.session.commit()
    return jsonify({"message": "Alert dismissed"}), 200


@alerts_bp.route("/clear-read", methods=["DELETE"])
@token_required
def clear_read_alerts(current_user):
    """Clear all read alerts to keep telemetry clean."""
    deleted = Alert.query.filter(Alert.is_read.is_(True)).delete()
    db.session.commit()
    return jsonify({"message": f"{deleted} read alert(s) cleared"}), 200

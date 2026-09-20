from app.extensions import db
from datetime import datetime, timezone


class Alert(db.Model):
    """Inventory alert model for notifications and warnings."""
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id = db.Column(
        db.Integer, db.ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True
    )
    type = db.Column(
        db.String(30), nullable=False, index=True
    )  # low_stock, out_of_stock, overstock, anomaly, forecast
    severity = db.Column(
        db.String(10), nullable=False, default="warning", index=True
    )  # info, warning, critical
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships - joined loading eliminates N+1 queries when rendering notification badges
    product = db.relationship("Product", back_populates="alerts", lazy="joined")

    # High-performance composite indexes for real-time notification feeds
    __table_args__ = (
        db.Index("ix_alerts_read_created", "is_read", "created_at"),
        db.Index("ix_alerts_severity_read", "severity", "is_read"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "type": self.type,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

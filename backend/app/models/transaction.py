from app.extensions import db
from datetime import datetime, timezone


class Transaction(db.Model):
    """Inventory transaction model for stock movements."""
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id = db.Column(
        db.Integer, db.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type = db.Column(
        db.String(20), nullable=False, index=True
    )  # stock_in, stock_out, adjustment, return
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, default=0.0)
    total_value = db.Column(db.Float, default=0.0)
    reference = db.Column(db.String(100), default="")
    notes = db.Column(db.Text, default="")
    created_by = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships with eager joined loading to eliminate N+1 latency
    product = db.relationship("Product", back_populates="transactions", lazy="joined")
    user = db.relationship("User", back_populates="transactions", lazy="joined")

    # High-performance composite indexes for AI forecasting & reporting
    __table_args__ = (
        db.Index("ix_transactions_prod_type_date", "product_id", "type", "created_at"),
        db.Index("ix_transactions_date_type", "created_at", "type"),
        db.CheckConstraint("quantity > 0", name="ck_transactions_quantity_positive"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "product_sku": self.product.sku if self.product else None,
            "type": self.type,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "total_value": self.total_value,
            "reference": self.reference,
            "notes": self.notes,
            "created_by": self.user.name if self.user else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

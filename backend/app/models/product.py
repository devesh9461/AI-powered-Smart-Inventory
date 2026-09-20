from app.extensions import db
from datetime import datetime, timezone


class Product(db.Model):
    """Product model for inventory items."""
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    sku = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, default="")
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    price = db.Column(db.Float, nullable=False, default=0.0)
    cost_price = db.Column(db.Float, nullable=False, default=0.0)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    reorder_level = db.Column(db.Integer, nullable=False, default=10)
    max_stock = db.Column(db.Integer, nullable=False, default=500)
    supplier = db.Column(db.String(200), default="")
    location = db.Column(db.String(100), default="Warehouse A")
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships - joined loading on category eliminates N+1 query latency
    category = db.relationship("Category", back_populates="products", lazy="joined")
    transactions = db.relationship(
        "Transaction", back_populates="product", lazy="dynamic", cascade="all, delete-orphan"
    )
    alerts = db.relationship(
        "Alert", back_populates="product", lazy="dynamic", cascade="all, delete-orphan"
    )

    # Performance-engineered Composite Indexes & Integrity Check Constraints
    __table_args__ = (
        db.Index("ix_products_active_category", "is_active", "category_id"),
        db.Index("ix_products_active_name", "is_active", "name"),
        db.CheckConstraint("quantity >= 0", name="ck_products_quantity_positive"),
        db.CheckConstraint("price >= 0", name="ck_products_price_positive"),
        db.CheckConstraint("cost_price >= 0", name="ck_products_cost_price_positive"),
    )

    @property
    def stock_status(self):
        if self.quantity <= 0:
            return "out_of_stock"
        elif self.quantity <= self.reorder_level:
            return "low_stock"
        elif self.quantity >= self.max_stock * 0.9:
            return "overstock"
        return "in_stock"

    @property
    def stock_value(self):
        return round(self.quantity * self.cost_price, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "description": self.description,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "price": self.price,
            "cost_price": self.cost_price,
            "quantity": self.quantity,
            "reorder_level": self.reorder_level,
            "max_stock": self.max_stock,
            "supplier": self.supplier,
            "location": self.location,
            "is_active": self.is_active,
            "stock_status": self.stock_status,
            "stock_value": self.stock_value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

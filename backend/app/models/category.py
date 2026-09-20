from app.extensions import db
from datetime import datetime, timezone


class Category(db.Model):
    """Product category model."""
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(80), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255), default="")
    color = db.Column(db.String(7), default="#00d4ff")
    icon = db.Column(db.String(50), default="📦")
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    products = db.relationship(
        "Product",
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "icon": self.icon,
            "product_count": self.products.filter_by(is_active=True).count(),
        }

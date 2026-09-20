"""Dashboard route — aggregated stats and chart data."""

from flask import Blueprint, jsonify
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from app.extensions import db
from app.models.product import Product
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.alert import Alert
from app.utils.auth_helpers import token_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("", methods=["GET"])
@token_required
def get_dashboard(current_user):
    """Return aggregated dashboard data."""

    products = Product.query.filter(Product.is_active.is_(True)).all()
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # --- Summary Stats ---
    total_products = len(products)
    total_stock_value = sum(p.stock_value for p in products)
    low_stock_count = sum(1 for p in products if p.stock_status in ["low_stock", "out_of_stock"])
    out_of_stock_count = sum(1 for p in products if p.stock_status == "out_of_stock")

    # Revenue (last 30 days)
    revenue_result = (
        db.session.query(func.sum(Transaction.total_value))
        .filter(
            Transaction.type == "stock_out",
            Transaction.created_at >= thirty_days_ago,
        )
        .scalar()
    ) or 0

    # Expense (last 30 days: stock restock + repair costs)
    expense_result = (
        db.session.query(func.sum(Transaction.total_value))
        .filter(
            Transaction.type.in_(["stock_in", "repair"]),
            Transaction.created_at >= thirty_days_ago,
        )
        .scalar()
    ) or 0

    repair_expense_result = (
        db.session.query(func.sum(Transaction.total_value))
        .filter(
            Transaction.type == "repair",
            Transaction.created_at >= thirty_days_ago,
        )
        .scalar()
    ) or 0

    # Transaction count
    recent_tx_count = (
        Transaction.query
        .filter(Transaction.created_at >= thirty_days_ago)
        .count()
    )

    # Unread alerts
    unread_alerts = Alert.query.filter(Alert.is_read.is_(False)).count()

    # --- Category Distribution ---
    category_data = []
    categories = Category.query.all()
    for cat in categories:
        count = Product.query.filter(
            Product.category_id == cat.id, Product.is_active.is_(True)
        ).count()
        total_qty = (
            db.session.query(func.sum(Product.quantity))
            .filter(Product.category_id == cat.id, Product.is_active.is_(True))
            .scalar()
        ) or 0
        category_data.append({
            "name": cat.name,
            "icon": cat.icon,
            "color": cat.color,
            "product_count": count,
            "total_quantity": total_qty,
        })

    # --- Stock Trend (daily totals for last 30 days) ---
    stock_trend = []
    for day_offset in range(29, -1, -1):
        day = now - timedelta(days=day_offset)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        inflow = (
            db.session.query(func.sum(Transaction.quantity))
            .filter(
                Transaction.type.in_(["stock_in", "return"]),
                Transaction.created_at >= day_start,
                Transaction.created_at < day_end,
            )
            .scalar()
        ) or 0

        outflow = (
            db.session.query(func.sum(Transaction.quantity))
            .filter(
                Transaction.type == "stock_out",
                Transaction.created_at >= day_start,
                Transaction.created_at < day_end,
            )
            .scalar()
        ) or 0

        stock_trend.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "inflow": inflow,
            "outflow": outflow,
            "net": inflow - outflow,
        })

    # --- Recent Transactions ---
    recent_txns = (
        Transaction.query
        .order_by(Transaction.created_at.desc())
        .limit(10)
        .all()
    )

    # --- Top Products by demand ---
    top_products = sorted(products, key=lambda p: p.quantity, reverse=True)[:5]

    # --- Stock Status Distribution ---
    status_dist = {"in_stock": 0, "low_stock": 0, "out_of_stock": 0, "overstock": 0}
    for p in products:
        status_dist[p.stock_status] = status_dist.get(p.stock_status, 0) + 1

    return jsonify({
        "stats": {
            "total_products": total_products,
            "total_stock_value": round(total_stock_value, 2),
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "revenue_30d": round(revenue_result, 2),
            "expense_30d": round(expense_result, 2),
            "repair_expense_30d": round(repair_expense_result, 2),
            "transactions_30d": recent_tx_count,
            "unread_alerts": unread_alerts,
        },
        "category_distribution": category_data,
        "stock_trend": stock_trend,
        "recent_transactions": [t.to_dict() for t in recent_txns],
        "top_products": [p.to_dict() for p in top_products],
        "status_distribution": status_dist,
    })

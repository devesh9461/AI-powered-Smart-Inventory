"""Transaction routes — stock-in, stock-out, history."""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, timezone
from app.extensions import db
from app.models.transaction import Transaction
from app.models.product import Product
from app.models.alert import Alert
from app.utils.auth_helpers import token_required

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


@transactions_bp.route("", methods=["GET"])
@token_required
def get_transactions(current_user):
    """List transactions with optional filters."""
    product_id = request.args.get("product_id", type=int)
    tx_type = request.args.get("type", "")
    days = request.args.get("days", 30, type=int)
    limit = request.args.get("limit", 100, type=int)

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = Transaction.query.filter(Transaction.created_at >= cutoff)

    if product_id:
        query = query.filter(Transaction.product_id == product_id)
    if tx_type:
        query = query.filter(Transaction.type == tx_type)

    transactions = (
        query.order_by(Transaction.created_at.desc()).limit(min(limit, 500)).all()
    )

    return jsonify({
        "transactions": [t.to_dict() for t in transactions],
        "total": len(transactions),
    })


@transactions_bp.route("", methods=["POST"])
@token_required
def create_transaction(current_user):
    """Create a stock transaction and update product quantity."""
    data = request.get_json()
    product_id = data.get("product_id")
    tx_type = data.get("type", "").strip()
    quantity = data.get("quantity", 0)

    if not all([product_id, tx_type, quantity]):
        return jsonify({"error": "product_id, type, and quantity are required"}), 400

    if tx_type not in ["stock_in", "stock_out", "adjustment", "return", "repair"]:
        return jsonify({"error": "Invalid transaction type"}), 400

    if quantity <= 0:
        return jsonify({"error": "Quantity must be positive"}), 400

    product = Product.query.get_or_404(product_id)

    # Validate stock-out doesn't exceed available quantity
    if tx_type == "stock_out" and quantity > product.quantity:
        return jsonify({
            "error": f"Insufficient stock. Available: {product.quantity}, Requested: {quantity}"
        }), 400

    # Determine unit price
    if tx_type == "repair":
        unit_price = float(data.get("unit_price", 0.0))
    elif tx_type == "stock_in":
        unit_price = float(data.get("unit_price", product.cost_price))
    else:
        unit_price = float(data.get("unit_price", product.price))

    tx = Transaction(
        product_id=product_id,
        type=tx_type,
        quantity=quantity,
        unit_price=unit_price,
        total_value=round(quantity * unit_price, 2),
        reference=data.get("reference", f"REP-2026-{product_id}" if tx_type == "repair" else ""),
        notes=data.get("notes", ""),
        created_by=current_user.id,
    )

    # Update product quantity
    if tx_type in ["stock_in", "return"]:
        product.quantity += quantity
    elif tx_type == "stock_out":
        product.quantity -= quantity
    elif tx_type == "adjustment":
        product.quantity = quantity  # Absolute set

    db.session.add(tx)

    # Auto-generate alerts
    if product.quantity <= 0:
        alert = Alert(
            product_id=product.id,
            type="out_of_stock",
            severity="critical",
            title=f"Out of Stock: {product.name}",
            message=f"{product.name} is now out of stock after this transaction.",
        )
        db.session.add(alert)
    elif product.quantity <= product.reorder_level:
        alert = Alert(
            product_id=product.id,
            type="low_stock",
            severity="warning",
            title=f"Low Stock Alert: {product.name}",
            message=f"{product.name} is at {product.quantity} units (reorder level: {product.reorder_level}).",
        )
        db.session.add(alert)

    try:
        db.session.commit()
        return jsonify({"transaction": tx.to_dict(), "product": product.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to record transaction: {str(e)}"}), 500


@transactions_bp.route("/export", methods=["GET"])
@token_required
def export_transactions_csv(current_user):
    """Export transaction history as a downloadable CSV file."""
    import io
    import csv
    from flask import Response

    transactions = (
        Transaction.query.order_by(Transaction.created_at.desc()).limit(1000).all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction ID",
        "Date",
        "Product SKU",
        "Product Name",
        "Type",
        "Quantity",
        "Unit Price ($)",
        "Total Value ($)",
        "Reference",
        "Notes",
    ])

    for t in transactions:
        writer.writerow([
            t.id,
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            t.product.sku if t.product else "",
            t.product.name if t.product else "Unknown",
            t.type,
            t.quantity,
            t.unit_price,
            t.total_value,
            t.reference or "",
            t.notes or "",
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=inventory_transactions.csv"},
    )

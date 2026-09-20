"""Product CRUD routes."""

from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.product import Product
from app.models.category import Category
from app.utils.auth_helpers import token_required

products_bp = Blueprint("products", __name__, url_prefix="/api/products")


@products_bp.route("", methods=["GET"])
@token_required
def get_products(current_user):
    """List all products with optional filters."""
    category_id = request.args.get("category_id", type=int)
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "")
    sort_by = request.args.get("sort_by", "name")
    order = request.args.get("order", "asc")

    query = Product.query.filter(Product.is_active.is_(True))

    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search:
        query = query.filter(
            db.or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
                Product.supplier.ilike(f"%{search}%"),
            )
        )

    # Sorting
    sort_column = getattr(Product, sort_by, Product.name)
    if order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    all_matching = query.all()
    status_counts = {
        "all": len(all_matching),
        "in_stock": sum(1 for p in all_matching if p.stock_status == "in_stock"),
        "low_stock": sum(1 for p in all_matching if p.stock_status == "low_stock"),
        "out_of_stock": sum(1 for p in all_matching if p.stock_status == "out_of_stock"),
    }

    # Post-query filter for stock status (computed property)
    if status:
        products = [p for p in all_matching if p.stock_status == status]
    else:
        products = all_matching

    return jsonify({
        "products": [p.to_dict() for p in products],
        "total": len(products),
        "status_counts": status_counts,
    })


@products_bp.route("/<int:product_id>", methods=["GET"])
@token_required
def get_product(current_user, product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify({"product": product.to_dict()})


@products_bp.route("", methods=["POST"])
@token_required
def create_product(current_user):
    data = request.get_json()
    name = data.get("name", "").strip()
    sku = data.get("sku", "").strip()

    if not all([name, sku]):
        return jsonify({"error": "Name and SKU are required"}), 400

    if Product.query.filter_by(sku=sku).first():
        return jsonify({"error": f"SKU '{sku}' already exists"}), 409

    product = Product(
        name=name,
        sku=sku,
        description=data.get("description", ""),
        category_id=data.get("category_id"),
        price=data.get("price", 0.0),
        cost_price=data.get("cost_price", 0.0),
        quantity=data.get("quantity", 0),
        reorder_level=data.get("reorder_level", 10),
        max_stock=data.get("max_stock", 500),
        supplier=data.get("supplier", ""),
        location=data.get("location", "Warehouse A"),
    )
    db.session.add(product)
    db.session.commit()

    return jsonify({"product": product.to_dict()}), 201


@products_bp.route("/<int:product_id>", methods=["PUT"])
@token_required
def update_product(current_user, product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()

    updatable_fields = [
        "name", "sku", "description", "category_id", "price", "cost_price",
        "quantity", "reorder_level", "max_stock", "supplier", "location",
    ]
    for field in updatable_fields:
        if field in data:
            setattr(product, field, data[field])

    db.session.commit()
    return jsonify({"product": product.to_dict()})


@products_bp.route("/<int:product_id>", methods=["DELETE"])
@token_required
def delete_product(current_user, product_id):
    product = Product.query.get_or_404(product_id)
    product.is_active = False  # Soft delete
    db.session.commit()
    return jsonify({"message": f"Product '{product.name}' deactivated"})


@products_bp.route("/export", methods=["GET"])
@token_required
def export_products_csv(current_user):
    """Export complete product catalog as a downloadable CSV file."""
    import io
    import csv
    from flask import Response

    products = (
        Product.query.filter(Product.is_active.is_(True))
        .order_by(Product.name)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Product Name",
        "SKU",
        "Category",
        "Selling Price ($)",
        "Cost Price ($)",
        "Quantity in Stock",
        "Reorder Level",
        "Max Stock",
        "Stock Status",
        "Stock Value ($)",
        "Supplier",
        "Location",
    ])

    for p in products:
        writer.writerow([
            p.id,
            p.name,
            p.sku,
            p.category.name if p.category else "Unassigned",
            p.price,
            p.cost_price,
            p.quantity,
            p.reorder_level,
            p.max_stock,
            p.stock_status,
            p.stock_value,
            p.supplier or "",
            p.location or "",
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=inventory_catalog.csv"},
    )

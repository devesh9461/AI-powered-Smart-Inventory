"""Category routes."""

from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.category import Category
from app.utils.auth_helpers import token_required

categories_bp = Blueprint("categories", __name__, url_prefix="/api/categories")


@categories_bp.route("", methods=["GET"])
@token_required
def get_categories(current_user):
    categories = Category.query.order_by(Category.name).all()
    return jsonify({
        "categories": [c.to_dict() for c in categories],
    })


@categories_bp.route("", methods=["POST"])
@token_required
def create_category(current_user):
    data = request.get_json()
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Category name is required"}), 400

    if Category.query.filter_by(name=name).first():
        return jsonify({"error": f"Category '{name}' already exists"}), 409

    category = Category(
        name=name,
        description=data.get("description", ""),
        color=data.get("color", "#00d4ff"),
        icon=data.get("icon", "📦"),
    )
    db.session.add(category)
    db.session.commit()

    return jsonify({"category": category.to_dict()}), 201

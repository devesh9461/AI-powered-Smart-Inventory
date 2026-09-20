"""Authentication routes — login, register, profile."""

from flask import Blueprint, request, jsonify
from app.extensions import db, limiter
from app.models.user import User
from app.utils.auth_helpers import (
    hash_password,
    check_password,
    create_token,
    token_required,
    admin_required,
    is_valid_email,
    validate_password_strength,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("15 per minute")
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not all([name, email, password]):
        return jsonify({"error": "Name, email, and password are required"}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Please provide a valid email address"}), 400

    is_valid, msg = validate_password_strength(password)
    if not is_valid:
        return jsonify({"error": msg}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
    )
    db.session.add(user)
    db.session.commit()

    token = create_token(user.id)
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("20 per minute")
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not all([email, password]):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password(password, user.password_hash):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_token(user.id)
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
@token_required
def get_profile(current_user):
    return jsonify({"user": current_user.to_dict()}), 200


@auth_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile(current_user):
    """Update current user name or email with validation."""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()

    if name:
        current_user.name = name

    if email and email != current_user.email:
        if not is_valid_email(email):
            return jsonify({"error": "Invalid email address format"}), 400
        existing = User.query.filter(User.email == email, User.id != current_user.id).first()
        if existing:
            return jsonify({"error": "Email already in use by another account"}), 409
        current_user.email = email

    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "user": current_user.to_dict()}), 200


@auth_bp.route("/password", methods=["PUT"])
@token_required
def change_password(current_user):
    """Secure password change with verification of current password."""
    data = request.get_json() or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    if not current_password or not new_password:
        return jsonify({"error": "Current password and new password are required"}), 400

    if not check_password(current_password, current_user.password_hash):
        return jsonify({"error": "Current password is incorrect"}), 400

    if new_password != confirm_password:
        return jsonify({"error": "New password and confirmation do not match"}), 400

    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        return jsonify({"error": msg}), 400

    current_user.password_hash = hash_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password updated successfully"}), 200


@auth_bp.route("/reset-demo-data", methods=["POST"])
@token_required
def reset_demo_data(current_user):
    """Reset database to fresh seed data for demo / testing purposes."""
    try:
        from app.models.transaction import Transaction
        from app.models.alert import Alert
        from app.models.product import Product
        from app.models.category import Category
        from app.utils.seed_data import seed_database

        # Clear existing operational data
        Alert.query.delete()
        Transaction.query.delete()
        Product.query.delete()
        Category.query.delete()
        db.session.commit()

        # Re-run seed with force=True
        seed_database(force=True)

        return jsonify({"message": "Demo data successfully reset to pristine state."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to reset demo data: {str(e)}"}), 500

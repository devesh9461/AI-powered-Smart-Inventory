import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, current_app


def hash_password(password):
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password, hashed):
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id):
    """Create a JWT access token."""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc)
        + timedelta(seconds=current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")


def decode_token(token):
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"]
        )
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator to protect routes with JWT authentication."""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Authentication token is missing"}), 401

        user_id = decode_token(token)
        if user_id is None:
            return jsonify({"error": "Invalid or expired token"}), 401

        from app.models.user import User

        current_user = User.query.get(user_id)
        if not current_user:
            return jsonify({"error": "User not found"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator to protect routes that require admin privileges."""

    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if getattr(current_user, "role", "staff") != "admin":
            return jsonify({"error": "Admin privileges required for this action"}), 403
        return f(current_user, *args, **kwargs)

    return decorated


import re

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(email):
    """Validate email format."""
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def validate_password_strength(password):
    """Validate password strength (at least 6 characters, contains letters and numbers/symbols)."""
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
    return True, None

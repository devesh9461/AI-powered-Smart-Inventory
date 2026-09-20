"""Flask application factory."""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from app.config import config_by_name
from app.extensions import db, migrate, limiter


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    if os.getenv("TRUSTED_PROXIES"):
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # Security Headers Middleware
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "base-uri 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "img-src 'self' data: https:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline'; "
            "connect-src 'self' https: http:"
        )
        if os.getenv("FLASK_ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # Global rate limit error handler
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "error": "Rate limit exceeded. Too many requests, please try again in a few moments.",
            "status": 429,
        }), 429

    # CORS — allow frontend origin (supports comma-separated URLs or wildcard)
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ]
    env_frontend = os.getenv("FRONTEND_URL")
    if env_frontend:
        if env_frontend.strip() == "*":
            allowed_origins = "*"
        else:
            for url in env_frontend.split(","):
                u = url.strip()
                if u and u not in allowed_origins:
                    allowed_origins.append(u)

    CORS(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
        }
    })

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.products import products_bp
    from app.routes.transactions import transactions_bp
    from app.routes.categories import categories_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.alerts import alerts_bp
    from app.routes.ai import ai_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(ai_bp)

    # Health check endpoint
    @app.route("/api/health")
    def health():
        return {"status": "healthy", "service": "Smart Inventory AI Backend"}, 200

    # Create tables and seed data on first request
    with app.app_context():
        # Import all models to register them
        from app.models.user import User  # noqa: F401
        from app.models.category import Category  # noqa: F401
        from app.models.product import Product  # noqa: F401
        from app.models.transaction import Transaction  # noqa: F401
        from app.models.alert import Alert  # noqa: F401

        db.create_all()

        # Seed demo data if empty or AUTO_SEED_DEMO_DATA is enabled
        auto_seed = os.getenv("AUTO_SEED_DEMO_DATA", "true").lower() == "true"
        if auto_seed or User.query.first() is None:
            from app.utils.seed_data import seed_database
            force_seed = os.getenv("FORCE_RESEED", "false").lower() == "true"
            seed_database(force=force_seed)

    return app

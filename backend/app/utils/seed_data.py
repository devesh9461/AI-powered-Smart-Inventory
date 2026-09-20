"""Seed the database with demo data for showcasing the application."""

import random
from datetime import datetime, timedelta, timezone
from app.extensions import db
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.transaction import Transaction
from app.models.alert import Alert
from app.utils.auth_helpers import hash_password


def seed_database(force=False):
    """Populate the database with realistic demo data."""

    # Check if data already exists. This is used as a safety guard, but allow
    # explicit forced reseeding when the app is intentionally reset or booted
    # with demo data enabled.
    if not force and User.query.first() is not None:
        return

    if force:
        Alert.query.delete()
        Transaction.query.delete()
        Product.query.delete()
        Category.query.delete()
        User.query.delete()
        db.session.commit()

    print("[SEED] Seeding database with demo data...")

    # --- Users ---
    admin = User(
        name="Devesh Jangid",
        email="admin@inventory.ai",
        password_hash=hash_password("admin123"),
        role="admin",
        avatar_color="#00d4ff",
    )
    manager = User(
        name="Priya Sharma",
        email="manager@inventory.ai",
        password_hash=hash_password("manager123"),
        role="manager",
        avatar_color="#7c3aed",
    )
    db.session.add_all([admin, manager])
    db.session.flush()

    # --- Categories ---
    categories_data = [
        ("Electronics", "Gadgets, devices, and electronic components", "#00d4ff", "💻"),
        ("Accessories", "Phone cases, cables, chargers, peripherals", "#7c3aed", "🎧"),
        ("Networking", "Routers, switches, cables, adapters", "#10b981", "🌐"),
        ("Storage", "Hard drives, SSDs, USB drives, memory cards", "#f59e0b", "💾"),
        ("Components", "Processors, RAM, motherboards, GPUs", "#ef4444", "🔧"),
        ("Software", "Licenses, subscriptions, digital products", "#06b6d4", "📀"),
    ]

    categories = []
    for name, desc, color, icon in categories_data:
        cat = Category(name=name, description=desc, color=color, icon=icon)
        categories.append(cat)
    db.session.add_all(categories)
    db.session.flush()

    # --- Products ---
    products_data = [
        # Electronics
        ("Wireless Bluetooth Headphones", "SKU-EL-001", categories[0].id, 79.99, 45.00, 156, 20, 400, "Sony Audio Inc."),
        ("USB-C Docking Station", "SKU-EL-002", categories[0].id, 129.99, 72.00, 43, 15, 200, "Anker Technologies"),
        ("4K Webcam Pro", "SKU-EL-003", categories[0].id, 89.99, 38.00, 8, 10, 150, "Logitech"),
        ("Mechanical Keyboard RGB", "SKU-EL-004", categories[0].id, 149.99, 68.00, 92, 25, 300, "Corsair"),
        ("Portable Monitor 15.6\"", "SKU-EL-005", categories[0].id, 249.99, 135.00, 27, 10, 100, "ASUS Display"),
        # Accessories
        ("USB-C to HDMI Adapter", "SKU-AC-001", categories[1].id, 24.99, 8.50, 312, 50, 800, "Ugreen"),
        ("Wireless Mouse Ergonomic", "SKU-AC-002", categories[1].id, 39.99, 15.00, 187, 30, 500, "Logitech"),
        ("Laptop Stand Aluminum", "SKU-AC-003", categories[1].id, 49.99, 18.00, 64, 15, 250, "Rain Design"),
        ("Phone Charging Cable 3-Pack", "SKU-AC-004", categories[1].id, 14.99, 3.50, 5, 100, 1000, "Anker"),
        ("Screen Protector Ultra", "SKU-AC-005", categories[1].id, 9.99, 1.80, 423, 80, 1500, "Spigen"),
        # Networking
        ("Wi-Fi 6 Router AX3000", "SKU-NW-001", categories[2].id, 179.99, 92.00, 38, 10, 120, "TP-Link"),
        ("Cat6 Ethernet Cable 50ft", "SKU-NW-002", categories[2].id, 19.99, 5.50, 145, 40, 600, "Cable Matters"),
        ("Network Switch 8-Port", "SKU-NW-003", categories[2].id, 29.99, 14.00, 67, 20, 300, "Netgear"),
        ("USB Wi-Fi Adapter", "SKU-NW-004", categories[2].id, 34.99, 12.00, 0, 15, 200, "TP-Link"),
        # Storage
        ("NVMe SSD 1TB", "SKU-ST-001", categories[3].id, 89.99, 48.00, 73, 20, 250, "Samsung"),
        ("External HDD 2TB", "SKU-ST-002", categories[3].id, 64.99, 32.00, 91, 25, 300, "Seagate"),
        ("USB Flash Drive 128GB", "SKU-ST-003", categories[3].id, 12.99, 4.50, 234, 60, 800, "SanDisk"),
        ("MicroSD Card 256GB", "SKU-ST-004", categories[3].id, 29.99, 11.00, 178, 40, 600, "Samsung"),
        # Components
        ("DDR5 RAM 16GB", "SKU-CM-001", categories[4].id, 69.99, 35.00, 52, 15, 200, "Corsair"),
        ("CPU Thermal Paste", "SKU-CM-002", categories[4].id, 8.99, 2.20, 340, 50, 700, "Noctua"),
        ("120mm Case Fan RGB", "SKU-CM-003", categories[4].id, 14.99, 5.50, 128, 30, 400, "Cooler Master"),
        ("SATA Data Cable", "SKU-CM-004", categories[4].id, 5.99, 1.20, 412, 80, 1000, "StarTech"),
        # Software
        ("Antivirus 1-Year License", "SKU-SW-001", categories[5].id, 39.99, 12.00, 500, 50, 9999, "Norton"),
        ("Cloud Backup 500GB Plan", "SKU-SW-002", categories[5].id, 59.99, 20.00, 220, 30, 9999, "Backblaze"),
    ]

    products = []
    for name, sku, cat_id, price, cost, qty, reorder, max_s, supplier in products_data:
        p = Product(
            name=name,
            sku=sku,
            category_id=cat_id,
            price=price,
            cost_price=cost,
            quantity=qty,
            reorder_level=reorder,
            max_stock=max_s,
            supplier=supplier,
            description=f"High-quality {name.lower()} for professional and personal use.",
        )
        products.append(p)
    db.session.add_all(products)
    db.session.flush()

    # --- Transactions (90 days of history) ---
    now = datetime.now(timezone.utc)
    transaction_types = ["stock_in", "stock_out", "stock_out", "stock_out", "repair"]  # Outflows, inflows & repairs
    references = ["PO-2026-{:04d}", "SO-2026-{:04d}", "ADJ-{:04d}", "RET-{:04d}", "REP-2026-{:04d}"]

    repair_notes = [
        "Headphone headband & audio jack repair",
        "Docking station USB-C connector soldering",
        "4K Webcam lens recalibration & glass polish",
        "Mechanical keyboard PCB key-switch repair",
        "Portable monitor backlight circuit fix",
        "Wi-Fi router antenna port replacement",
        "Ethernet switch port repair",
        "External HDD controller card service",
    ]

    transactions = []
    ref_counter = 1

    for day_offset in range(90, 0, -1):
        day = now - timedelta(days=day_offset)
        # 3–8 transactions per day
        num_transactions = random.randint(3, 8)
        for _ in range(num_transactions):
            product = random.choice(products)
            tx_type = random.choice(transaction_types)
            qty = random.randint(1, 30)

            if tx_type == "repair":
                qty = random.randint(1, 3)
                unit_price = round(random.uniform(18.50, 75.00), 2)
                ref_template = references[4]
                note = random.choice(repair_notes)
            elif tx_type == "stock_in":
                unit_price = product.cost_price
                ref_template = references[0]
                note = "Restocked from supplier"
            else:
                unit_price = product.price
                ref_template = references[1]
                note = "Customer order fulfilled"

            # Add some seasonal variation
            month = day.month
            if month in [11, 12, 1]:  # Holiday season boost
                qty = int(qty * 1.5)
            elif month in [6, 7]:  # Summer slowdown
                qty = max(1, int(qty * 0.7))

            tx = Transaction(
                product_id=product.id,
                type=tx_type,
                quantity=qty,
                unit_price=unit_price,
                total_value=round(qty * unit_price, 2),
                reference=ref_template.format(ref_counter),
                notes=note,
                created_by=random.choice([admin.id, manager.id]),
                created_at=day + timedelta(hours=random.randint(8, 18), minutes=random.randint(0, 59)),
            )
            transactions.append(tx)
            ref_counter += 1

    db.session.add_all(transactions)

    # --- Alerts ---
    alerts = []
    for product in products:
        if product.stock_status == "low_stock":
            alerts.append(
                Alert(
                    product_id=product.id,
                    type="low_stock",
                    severity="warning",
                    title=f"Low Stock: {product.name}",
                    message=f"{product.name} has only {product.quantity} units left (reorder level: {product.reorder_level}). Consider restocking soon.",
                )
            )
        elif product.stock_status == "out_of_stock":
            alerts.append(
                Alert(
                    product_id=product.id,
                    type="out_of_stock",
                    severity="critical",
                    title=f"Out of Stock: {product.name}",
                    message=f"{product.name} is completely out of stock! Immediate restocking required.",
                )
            )

    # Add some AI-generated alerts
    alerts.append(
        Alert(
            type="anomaly",
            severity="warning",
            title="Unusual Demand Spike Detected",
            message="AI detected a 240% increase in USB-C adapter sales over the past 3 days. This may indicate a viral trend or bulk order pattern.",
            product_id=products[5].id,
        )
    )
    alerts.append(
        Alert(
            type="forecast",
            severity="info",
            title="Seasonal Demand Forecast",
            message="Based on historical data, expect a 45% increase in electronics accessories demand over the next 30 days due to approaching holiday season.",
        )
    )

    db.session.add_all(alerts)
    db.session.commit()

    print(f"[OK] Seeded: {len(products)} products, {len(transactions)} transactions, {len(alerts)} alerts")

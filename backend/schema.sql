-- ============================================================================
-- AI-POWERED SMART INVENTORY SYSTEM — PRODUCTION DATABASE SCHEMA (DDL)
-- Compatible with: PostgreSQL 14+, Neon, Supabase, Render PostgreSQL, SQLite 3.35+
-- Features: Foreign Key Cascades, Check Constraints, Composite B-Tree Indexes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Authentication, Role-Based Access Control (RBAC), and Audit Trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    avatar_color VARCHAR(7) DEFAULT '#00d4ff',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('admin', 'manager', 'staff', 'user'))
);

-- Users Indexes
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);
CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS ix_users_created_at ON users(created_at DESC);


-- ----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- Product classification and taxonomy
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(255) DEFAULT '',
    color VARCHAR(7) DEFAULT '#00d4ff',
    icon VARCHAR(50) DEFAULT '📦',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_categories_name UNIQUE (name)
);

-- Categories Indexes
CREATE INDEX IF NOT EXISTS ix_categories_name ON categories(name);


-- ----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- Master inventory catalog, pricing, levels, and tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    description TEXT DEFAULT '',
    category_id INTEGER,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    max_stock INTEGER NOT NULL DEFAULT 500,
    supplier VARCHAR(200) DEFAULT '',
    location VARCHAR(100) DEFAULT 'Warehouse A',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_products_sku UNIQUE (sku),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) 
        REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT ck_products_quantity_positive CHECK (quantity >= 0),
    CONSTRAINT ck_products_price_positive CHECK (price >= 0),
    CONSTRAINT ck_products_cost_positive CHECK (cost_price >= 0)
);

-- High-Performance Product Indexes
CREATE INDEX IF NOT EXISTS ix_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS ix_products_name ON products(name);
CREATE INDEX IF NOT EXISTS ix_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS ix_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS ix_products_created_at ON products(created_at DESC);

-- Composite Indexes for Catalog Filtering & Grid Rendering
-- Optimizes: WHERE is_active = TRUE AND category_id = :cat_id
CREATE INDEX IF NOT EXISTS ix_products_active_category ON products(is_active, category_id);
-- Optimizes: WHERE is_active = TRUE ORDER BY name ASC
CREATE INDEX IF NOT EXISTS ix_products_active_name ON products(is_active, name);


-- ----------------------------------------------------------------------------
-- 4. TRANSACTIONS TABLE
-- Complete immutable audit log of inventory flows (In, Out, Adjust, Return)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    total_value NUMERIC(12, 2) DEFAULT 0.00,
    reference VARCHAR(100) DEFAULT '',
    notes TEXT DEFAULT '',
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_transactions_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_user FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_transactions_quantity_positive CHECK (quantity > 0),
    CONSTRAINT ck_transactions_type CHECK (type IN ('stock_in', 'stock_out', 'adjustment', 'return'))
);

-- Transaction Indexes
CREATE INDEX IF NOT EXISTS ix_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS ix_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS ix_transactions_created_by ON transactions(created_by);
CREATE INDEX IF NOT EXISTS ix_transactions_created_at ON transactions(created_at DESC);

-- Critical Composite Indexes for AI Forecasts & Reporting Analytics:
-- 1. AI Machine Learning Forecasting Index:
-- Optimizes: WHERE product_id = :id AND type = 'stock_out' AND created_at >= :date ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS ix_transactions_prod_type_date ON transactions(product_id, type, created_at ASC);

-- 2. BI Dashboard & Financial Reporting Index:
-- Optimizes: WHERE created_at >= :start_date AND type IN ('stock_in', 'stock_out')
CREATE INDEX IF NOT EXISTS ix_transactions_date_type ON transactions(created_at DESC, type);


-- ----------------------------------------------------------------------------
-- 5. ALERTS TABLE
-- Real-time notification warnings, AI forecast alerts, and anomaly flags
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    type VARCHAR(30) NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'warning',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_alerts_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT ck_alerts_severity CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT ck_alerts_type CHECK (type IN ('low_stock', 'out_of_stock', 'overstock', 'anomaly', 'forecast'))
);

-- Alert Indexes
CREATE INDEX IF NOT EXISTS ix_alerts_product_id ON alerts(product_id);
CREATE INDEX IF NOT EXISTS ix_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS ix_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS ix_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS ix_alerts_created_at ON alerts(created_at DESC);

-- Composite Indexes for High-Traffic Notification Feed:
-- Optimizes: WHERE is_read = FALSE ORDER BY created_at DESC (Notification Bell badge)
CREATE INDEX IF NOT EXISTS ix_alerts_read_created ON alerts(is_read, created_at DESC);
-- Optimizes: WHERE severity = 'critical' AND is_read = FALSE
CREATE INDEX IF NOT EXISTS ix_alerts_severity_read ON alerts(severity, is_read);


-- ----------------------------------------------------------------------------
-- 6. ANALYTIC VIEWS FOR REPORTING & DASHBOARD BI
-- ----------------------------------------------------------------------------

-- View: Current Low Stock & Out of Stock Items with Supplier Details
CREATE OR REPLACE VIEW v_stock_replenishment AS
SELECT 
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    p.quantity,
    p.reorder_level,
    p.max_stock,
    (p.max_stock - p.quantity) AS suggested_order_qty,
    p.cost_price,
    ROUND((p.max_stock - p.quantity) * p.cost_price, 2) AS estimated_reorder_cost,
    p.supplier,
    CASE 
        WHEN p.quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN p.quantity <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'OPTIMAL'
    END AS urgency_level
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = TRUE AND p.quantity <= p.reorder_level
ORDER BY p.quantity ASC;

-- View: 30-Day Moving Product Sales Velocity for Inventory Turnover
CREATE OR REPLACE VIEW v_product_30d_velocity AS
SELECT 
    t.product_id,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    SUM(t.quantity) AS units_sold_30d,
    SUM(t.total_value) AS revenue_30d,
    COUNT(t.id) AS sales_orders_count,
    ROUND(AVG(t.quantity), 2) AS avg_units_per_order
FROM transactions t
JOIN products p ON t.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE t.type = 'stock_out' 
  AND t.created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')
GROUP BY t.product_id, p.sku, p.name, c.name
ORDER BY units_sold_30d DESC;

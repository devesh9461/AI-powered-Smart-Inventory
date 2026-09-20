import React from 'react';
import Modal from './Modal';
import {
  Package,
  Tag,
  DollarSign,
  TrendingUp,
  MapPin,
  Building,
  Layers,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  ShieldCheck,
  Zap,
  BarChart2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import { STOCK_STATUS_MAP } from '../utils/constants';

export default function ProductDetailModal({
  isOpen,
  onClose,
  product,
  categories = [],
  onEdit,
  onDelete,
}) {
  if (!product) return null;

  const statusInfo = STOCK_STATUS_MAP[product.stock_status] || {
    label: product.stock_status,
    color: 'neutral',
  };

  const categoryObj = categories.find(
    (c) => String(c.id) === String(product.category_id)
  );
  const categoryName = product.category_name || categoryObj?.name || 'General';
  const categoryColor = categoryObj?.color || '#00d4ff';

  const price = Number(product.price || 0);
  const costPrice = Number(product.cost_price || 0);
  const quantity = Number(product.quantity || 0);
  const maxStock = Number(product.max_stock || 500);
  const reorderLevel = Number(product.reorder_level || 10);

  const unitProfit = price - costPrice;
  const profitMarginPct = price > 0 ? Math.round((unitProfit / price) * 100) : 0;
  const totalCostValue = quantity * costPrice;
  const totalRetailValue = quantity * price;
  const stockPct = maxStock > 0 ? Math.min(100, Math.round((quantity / maxStock) * 100)) : 0;

  const isLowStock = quantity <= reorderLevel;
  const isOutOfStock = quantity <= 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Detailed Overview"
      maxWidth="780px"
      footer={
        <div className="product-detail-modal-footer">
          <div className="footer-left">
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              ID: #{product.id}
            </span>
          </div>
          <div className="footer-right">
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
            {onEdit && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                id="modal-edit-product-btn"
              >
                <Edit2 size={13} /> Edit Product
              </button>
            )}
            {onDelete && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  onClose();
                  onDelete(product.id, product.name);
                }}
                id="modal-delete-product-btn"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="product-detail-container">
        {/* Header Hero Banner */}
        <div className="product-detail-hero">
          <div className="product-detail-icon-box">
            <Package size={28} color="#00d4ff" />
          </div>
          <div className="product-detail-hero-content">
            <div className="hero-title-row">
              <h2 className="product-detail-title">{product.name}</h2>
              <span className={`badge badge-${statusInfo.color || 'neutral'} hero-status-badge`}>
                <span className={`status-dot ${product.stock_status}`} />
                {statusInfo.label || product.stock_status}
              </span>
            </div>

            <div className="product-detail-tags">
              <span className="sku-chip-detailed">
                <Tag size={12} /> SKU: {product.sku}
              </span>
              <span className="category-chip-detailed">
                <span
                  className="category-color-dot"
                  style={{ background: categoryColor }}
                />
                {categoryName}
              </span>
              <span className="active-chip-detailed">
                <ShieldCheck size={12} color="#10b981" />
                {product.is_active !== false ? 'Active Status' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Top KPI Quick Overview Cards Grid */}
        <div className="product-detail-kpi-grid">
          <div className="detail-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Selling Price</span>
              <DollarSign size={14} className="kpi-icon price-icon" />
            </div>
            <div className="kpi-value primary">{formatCurrency(price)}</div>
            <div className="kpi-subtext">Retail customer price</div>
          </div>

          <div className="detail-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Cost Price</span>
              <Building size={14} className="kpi-icon cost-icon" />
            </div>
            <div className="kpi-value">{formatCurrency(costPrice)}</div>
            <div className="kpi-subtext">Acquisition unit cost</div>
          </div>

          <div className="detail-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Unit Margin</span>
              <TrendingUp size={14} className="kpi-icon margin-icon" />
            </div>
            <div className={`kpi-value ${unitProfit >= 0 ? 'success' : 'danger'}`}>
              {formatCurrency(unitProfit)}
              <span className="kpi-badge-margin">{profitMarginPct}%</span>
            </div>
            <div className="kpi-subtext">Profit margin per unit</div>
          </div>

          <div className="detail-kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Inventory Value</span>
              <BarChart2 size={14} className="kpi-icon val-icon" />
            </div>
            <div className="kpi-value highlight">{formatCurrency(totalCostValue)}</div>
            <div className="kpi-subtext">{quantity} units @ cost</div>
          </div>
        </div>

        {/* Detailed Sections Grid */}
        <div className="product-detail-sections">
          {/* Section 1: Stock & Inventory Health */}
          <div className="detail-section-card">
            <div className="detail-section-title">
              <Layers size={16} className="section-title-icon" />
              <span>Stock & Inventory Health</span>
            </div>

            <div className="detail-field-list">
              <div className="detail-field-row">
                <span className="field-label">Available Stock:</span>
                <span className={`field-value bold ${isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'}`}>
                  {quantity} Units
                </span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Reorder Level:</span>
                <span className="field-value">
                  {reorderLevel} Units {isLowStock && <span className="inline-alert-chip"><AlertTriangle size={11} /> Reorder Triggered</span>}
                </span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Max Stock Capacity:</span>
                <span className="field-value">{maxStock} Units</span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Health & Capacity Usage:</span>
                <span className="field-value font-mono">{stockPct}% Capacity</span>
              </div>
            </div>

            {/* Health Meter Progress Bar */}
            <div className="detail-stock-meter">
              <div className="meter-header">
                <span>Warehouse Capacity Utilization</span>
                <span>{quantity} / {maxStock}</span>
              </div>
              <div className="meter-track">
                <div
                  className="meter-fill"
                  style={{
                    width: `${stockPct}%`,
                    background: isOutOfStock
                      ? '#ef4444'
                      : isLowStock
                      ? '#f59e0b'
                      : 'linear-gradient(90deg, #00d4ff 0%, #3b82f6 100%)',
                  }}
                />
              </div>
              <div className="meter-footer-note">
                {isOutOfStock ? (
                  <span className="meter-note danger"><AlertTriangle size={12} /> Out of stock - No units available!</span>
                ) : isLowStock ? (
                  <span className="meter-note warning"><AlertTriangle size={12} /> Low stock - Reorder soon</span>
                ) : (
                  <span className="meter-note success"><CheckCircle2 size={12} /> Stock levels healthy</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Financial & Valuation Breakdown */}
          <div className="detail-section-card">
            <div className="detail-section-title">
              <Zap size={16} className="section-title-icon" />
              <span>Financial & Unit Economics</span>
            </div>

            <div className="detail-field-list">
              <div className="detail-field-row">
                <span className="field-label">Retail Selling Price:</span>
                <span className="field-value highlight-val">{formatCurrency(price)}</span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Cost / Buy Price:</span>
                <span className="field-value">{formatCurrency(costPrice)}</span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Gross Profit / Unit:</span>
                <span className={`field-value ${unitProfit >= 0 ? 'success-text' : 'danger-text'}`}>
                  {formatCurrency(unitProfit)} ({profitMarginPct}%)
                </span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Gross Cost Inventory:</span>
                <span className="field-value">{formatCurrency(totalCostValue)}</span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Potential Retail Value:</span>
                <span className="field-value">{formatCurrency(totalRetailValue)}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Storage & Supplier Logistics */}
          <div className="detail-section-card">
            <div className="detail-section-title">
              <MapPin size={16} className="section-title-icon" />
              <span>Logistics & Warehouse Location</span>
            </div>

            <div className="detail-field-list">
              <div className="detail-field-row">
                <span className="field-label">Storage Location:</span>
                <span className="field-value icon-value">
                  <MapPin size={13} color="#00d4ff" />
                  {product.location || 'Warehouse A'}
                </span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Supplier / Brand:</span>
                <span className="field-value icon-value">
                  <Building size={13} color="#a855f7" />
                  {product.supplier || 'Not specified'}
                </span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Category Assignment:</span>
                <span className="field-value">
                  {categoryName}
                </span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Stock Status Identifier:</span>
                <span className="field-value font-mono">
                  {product.stock_status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: System Audit Timestamps */}
          <div className="detail-section-card">
            <div className="detail-section-title">
              <Clock size={16} className="section-title-icon" />
              <span>Audit & Activity Timestamps</span>
            </div>

            <div className="detail-field-list">
              <div className="detail-field-row">
                <span className="field-label">Registered Date:</span>
                <span className="field-value icon-value">
                  <Calendar size={13} />
                  {product.created_at ? formatDate(product.created_at) : 'N/A'}
                </span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Last Modified:</span>
                <span className="field-value icon-value">
                  <Clock size={13} />
                  {product.updated_at ? formatDate(product.updated_at) : 'N/A'}
                </span>
              </div>

              <div className="detail-field-row">
                <span className="field-label">Record Status:</span>
                <span className="field-value success-text">
                  Verified Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="detail-description-box">
          <div className="detail-section-title">
            <FileText size={15} className="section-title-icon" />
            <span>Description & Item Details</span>
          </div>
          <p className="description-text">
            {product.description && product.description.trim() !== ''
              ? product.description
              : 'No detailed description provided for this product item.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

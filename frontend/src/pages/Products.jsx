import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Edit2, Trash2, Package, LayoutGrid, List,
  Layers, ChevronDown, Check, X, Download, Eye,
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import ProductDetailModal from '../components/ProductDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/helpers';
import { STOCK_STATUS_MAP } from '../utils/constants';
import toast from 'react-hot-toast';

const emptyProduct = {
  name: '', sku: '', description: '', category_id: '', price: '',
  cost_price: '', quantity: '', max_stock: '500',
  supplier: '', location: 'Warehouse A',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusCounts, setStatusCounts] = useState({ all: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 });
  const [viewMode, setViewMode] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const openDetail = (p) => {
    setDetailProduct(p);
    setDetailModalOpen(true);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const updateViewMode = () => {
      if (window.innerWidth <= 768) {
        setViewMode('grid');
      }
    };

    updateViewMode();
    window.addEventListener('resize', updateViewMode);
    return () => window.removeEventListener('resize', updateViewMode);
  }, []);

  const handleViewModeChange = (nextMode) => {
    if (window.innerWidth <= 768) {
      setViewMode('grid');
      return;
    }
    setViewMode(nextMode);
  };

  const fetchData = () => {
    Promise.all([
      api.get('/api/products', { params: { search, status: statusFilter, category_id: categoryFilter || undefined } }),
      api.get('/api/categories'),
    ])
      .then(([pRes, cRes]) => {
        setProducts(pRes.data.products);
        if (pRes.data.status_counts) {
          setStatusCounts(pRes.data.status_counts);
        } else {
          const prods = pRes.data.products || [];
          setStatusCounts({
            all: prods.length,
            in_stock: prods.filter(p => p.stock_status === 'in_stock').length,
            low_stock: prods.filter(p => p.stock_status === 'low_stock').length,
            out_of_stock: prods.filter(p => p.stock_status === 'out_of_stock').length,
          });
        }
        setCategories(cRes.data.categories);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [search, statusFilter, categoryFilter]);

  if (loading) return <LoadingSpinner text="Loading products..." />;

  const statusChips = [
    { label: 'All Items', value: '', count: statusCounts.all },
    { label: 'In Stock', value: 'in_stock', count: statusCounts.in_stock },
    { label: 'Low Stock', value: 'low_stock', count: statusCounts.low_stock },
    { label: 'Out of Stock', value: 'out_of_stock', count: statusCounts.out_of_stock },
  ];

  const activeCategoryObj = categories.find((c) => String(c.id) === String(categoryFilter));
  const totalCategoryProducts = categories.reduce((sum, c) => sum + (c.product_count || 0), 0) || products.length;
  const inventoryValue = products.reduce((sum, p) => sum + ((Number(p.quantity || 0) * Number(p.cost_price || 0)) || 0), 0);
  const lowStockCount = products.filter((p) => ['low_stock', 'out_of_stock'].includes(p.stock_status)).length;
  const inStockCount = products.filter((p) => p.stock_status === 'in_stock').length;
  const utilizationRate = products.length
    ? Math.round((products.filter((p) => p.quantity > 0).length / products.length) * 100)
    : 0;

  const handleExportCSV = async () => {
    try {
      toast.loading('Preparing Products CSV export...', { id: 'prod-export' });
      const res = await api.get('/api/products/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_catalog.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Products CSV downloaded!', { id: 'prod-export' });
    } catch (err) {
      toast.error('Failed to export product list', { id: 'prod-export' });
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyProduct);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      description: p.description || '',
      category_id: p.category_id || '',
      price: p.price,
      cost_price: p.cost_price,
      quantity: p.quantity,
      max_stock: p.max_stock,
      supplier: p.supplier || '',
      location: p.location || 'Warehouse A',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        quantity: parseInt(form.quantity) || 0,
        max_stock: parseInt(form.max_stock) || 500,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      };

      if (editing) {
        await api.put(`/api/products/${editing.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/api/products', payload);
        toast.success('Product added successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate "${name}"?`)) return;
    try {
      await api.delete(`/api/products/${id}`);
      toast.success('Product removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleAddProduct = () => {
    openAdd();
  };

  return (
    <div className="compact-page">
      {/* Compact Header */}
      <div className="compact-header">
        <div className="compact-header-left">
          <div>
            <h1 className="compact-title">Products</h1>
            <div className="compact-subtitle">Live inventory overview</div>
          </div>
          <span className="compact-hud-badge">
            <Package size={12} style={{ color: 'var(--accent-primary)' }} />
            <span>{products.length} Items</span>
          </span>
        </div>

        <div className="compact-header-right">
          <button
            className="btn btn-secondary btn-xs"
            onClick={handleExportCSV}
            title="Download products as CSV"
            id="export-catalog-csv-btn"
          >
            <Download size={13} /> Export CSV
          </button>
          <button className="btn btn-primary btn-xs" onClick={handleAddProduct} id="add-product-btn">
            <Plus size={14} /> Add
          </button>
          <div className="view-toggle-group">
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('table')}
              title="Table view"
              aria-label="Table view"
            >
              <List size={14} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('grid')}
              title="Card grid view"
              aria-label="Card grid view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="product-insights-grid">
        <div className="product-insight-card">
          <div className="product-insight-label">Inventory value</div>
          <div className="product-insight-value">{formatCurrency(inventoryValue)}</div>
          <div className="product-insight-meta">Based on cost price</div>
        </div>
        <div className="product-insight-card">
          <div className="product-insight-label">In stock</div>
          <div className="product-insight-value">{inStockCount}</div>
          <div className="product-insight-meta">Healthy items</div>
        </div>
        <div className="product-insight-card warning">
          <div className="product-insight-label">At risk</div>
          <div className="product-insight-value">{lowStockCount}</div>
          <div className="product-insight-meta">Low / out of stock</div>
        </div>
        <div className="product-insight-card success">
          <div className="product-insight-label">Availability</div>
          <div className="product-insight-value">{utilizationRate}%</div>
          <div className="product-insight-meta">Stocked products</div>
        </div>
      </div>

      {/* Quick Filter Chips with Live Counts */}
      <div className="status-chips-bar" style={{ marginBottom: '8px' }}>
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            className={`status-chip ${statusFilter === chip.value ? 'active' : ''}`}
            onClick={() => setStatusFilter(chip.value)}
          >
            <span>{chip.label}</span>
            <span className="status-chip-count">{chip.count ?? 0}</span>
          </button>
        ))}

        {(search || statusFilter || categoryFilter) && (
          <button
            className="status-chip reset-filters-chip"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setCategoryFilter('');
            }}
            title="Reset all active filters"
          >
            <X size={11} /> Clear filters
          </button>
        )}
      </div>

      {/* Compact Filters Bar with Jet-Black Category Dropdown */}
      <div className="filters-bar" style={{ marginBottom: '10px' }}>
        <div className="search-container black-search-container">
          <Search size={14} className="search-icon" />
          <input
            ref={searchInputRef}
            className="input-field black-search-input"
            placeholder="Search products, SKU, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="product-search"
          />
          {search ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
              title="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className="search-kbd-badge" title="Press Ctrl+K to search">⌘K</kbd>
          )}
        </div>

        {/* Bespoke Jet-Black Category Dropdown */}
        <div className="black-dropdown-container" ref={dropdownRef}>
          <button
            type="button"
            className={`black-dropdown-btn ${isCategoryOpen ? 'open' : ''} ${categoryFilter ? 'has-value' : ''}`}
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            id="category-dropdown-btn"
            aria-haspopup="listbox"
            aria-expanded={isCategoryOpen}
          >
            <div className="black-dropdown-btn-left">
              <div className="black-dropdown-icon-box">
                <Layers size={13} className="black-dropdown-icon" />
              </div>
              <span
                className={`category-color-dot ${categoryFilter ? '' : 'all'}`}
                style={activeCategoryObj ? { background: activeCategoryObj.color || '#00d4ff' } : {}}
              />
              <span className="black-dropdown-label">
                {activeCategoryObj ? activeCategoryObj.name : 'All Categories'}
              </span>
            </div>
            <div className="black-dropdown-btn-right">
              <span className="black-dropdown-badge">
                {categoryFilter ? products.length : totalCategoryProducts}
              </span>
              <ChevronDown size={14} className={`black-dropdown-chevron ${isCategoryOpen ? 'rotated' : ''}`} />
            </div>
          </button>

          {isCategoryOpen && (
            <div className="black-dropdown-menu" role="listbox">
              <div className="black-dropdown-menu-header">
                <div className="black-dropdown-menu-title-wrap">
                  <span className="black-dropdown-menu-title">CATEGORY FILTER</span>
                  <span className="black-dropdown-menu-count">{categories.length + 1} total</span>
                </div>
                {categoryFilter && (
                  <button
                    type="button"
                    className="black-dropdown-reset-btn"
                    onClick={() => {
                      setCategoryFilter('');
                      setIsCategoryOpen(false);
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* All Categories Option */}
              <div
                className={`black-dropdown-item ${categoryFilter === '' ? 'active' : ''}`}
                onClick={() => {
                  setCategoryFilter('');
                  setIsCategoryOpen(false);
                }}
                role="option"
                aria-selected={categoryFilter === ''}
              >
                <div className="black-dropdown-item-left">
                  <span className="category-color-dot all" />
                  <span className="black-dropdown-item-name">All Categories</span>
                </div>
                <div className="black-dropdown-item-right">
                  <span className="black-dropdown-count-chip">{totalCategoryProducts} items</span>
                  {categoryFilter === '' && <Check size={13} className="black-dropdown-check" />}
                </div>
              </div>

              <div className="black-dropdown-divider" />

              {/* Specific Category Items */}
              {categories.map((c) => {
                const isSelected = String(categoryFilter) === String(c.id);
                return (
                  <div
                    key={c.id}
                    className={`black-dropdown-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setCategoryFilter(c.id);
                      setIsCategoryOpen(false);
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="black-dropdown-item-left">
                      <span className="category-color-dot" style={{ background: c.color || '#00d4ff' }} />
                      <span className="black-dropdown-item-name">{c.name}</span>
                    </div>
                    <div className="black-dropdown-item-right">
                      <span className="black-dropdown-count-chip">{c.product_count ?? 0} items</span>
                      {isSelected && <Check size={13} className="black-dropdown-check" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* View Mode: Card Grid View (Awesome on Mobile & Tablet) */}
      {viewMode === 'grid' ? (
        products.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">No products found</div>
            <div className="empty-state-message">Try adjusting your filters or search terms.</div>
          </div>
        ) : (
          <div className="product-card-grid">
            {products.map((p) => {
              const statusInfo = STOCK_STATUS_MAP[p.stock_status] || {};
              const stockPct = p.max_stock > 0 ? Math.min(100, Math.round((p.quantity / p.max_stock) * 100)) : 0;
              return (
                <div
                  key={p.id}
                  className="glass-card product-card product-card-clickable animate-slide-up"
                  onClick={() => openDetail(p)}
                >
                  <div className="product-card-header">
                    <div className="product-card-icon">
                      <Package size={16} color="#00d4ff" />
                    </div>
                    <span className={`badge badge-${statusInfo.color || 'neutral'} compact-badge`}>
                      <span className={`status-dot ${p.stock_status}`} />
                      {statusInfo.label || p.stock_status}
                    </span>
                  </div>

                  <div className="product-card-body">
                    <h3 className="product-card-name" title={p.name}>{p.name}</h3>

                    <div className="product-card-meta-row">
                      <span className="sku-chip-mini">{p.sku}</span>
                      <span className="product-card-category">
                        <span
                          className="category-color-dot mini"
                          style={{ background: categories.find((c) => String(c.id) === String(p.category_id))?.color || '#00d4ff' }}
                        />
                        {p.category_name || p.category?.name || 'General'}
                      </span>
                    </div>

                    <div className="product-card-supplier">
                      {p.supplier || 'Supplier not assigned'}
                    </div>

                    <div className="product-card-metrics">
                      <div>
                        <div className="metric-label">Sell price</div>
                        <div className="metric-val">{formatCurrency(p.price)}</div>
                      </div>
                      <div>
                        <div className="metric-label">Available</div>
                        <div className="metric-val" style={{ color: p.quantity <= p.reorder_level ? '#ef4444' : 'var(--text-primary)' }}>
                          {p.quantity} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>units</span>
                        </div>
                      </div>
                    </div>

                    <div className="product-stock-bar">
                      <div className="stock-bar-labels">
                        <span>Stock health</span>
                        <span>{stockPct}%</span>
                      </div>
                      <div className="stock-bar-track">
                        <div
                          className="stock-bar-fill"
                          style={{
                            width: `${stockPct}%`,
                            background: p.quantity <= p.reorder_level ? 'var(--color-danger)' : 'var(--accent-gradient)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="product-card-footer" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => openDetail(p)}
                      title="View Detailed Overview"
                    >
                      <Eye size={12} /> Overview
                    </button>
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => openEdit(p)}
                      title="Edit product"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      className="btn btn-danger btn-xs"
                      onClick={() => handleDelete(p.id, p.name)}
                      title="Delete product"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Table View */
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No products found</div>
              <div className="empty-state-message">Try adjusting your filters or add a new product.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const statusInfo = STOCK_STATUS_MAP[p.stock_status] || {};
                    return (
                      <tr key={p.id} className="clickable-row" onClick={() => openDetail(p)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              background: 'var(--bg-glass-strong)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Package size={16} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
                                {p.name}
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                {p.supplier}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="sku-chip">{p.sku}</span>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              className="category-color-dot mini"
                              style={{ background: categories.find((c) => String(c.id) === String(p.category_id))?.color || '#00d4ff' }}
                            />
                            {p.category_name || p.category?.name || 'General'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatCurrency(p.price)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700 }}>{p.quantity}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>/ {p.reorder_level}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${statusInfo.color || 'neutral'}`}>
                            <span className={`status-dot ${p.stock_status}`} />
                            {statusInfo.label || p.stock_status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatCurrency(p.quantity * p.price)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openDetail(p)}
                              title="View Detailed Overview"
                            >
                              <Eye size={15} style={{ color: 'var(--accent-primary)' }} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEdit(p)}
                              title="Edit product"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDelete(p.id, p.name)}
                              title="Delete product"
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Product' : 'Add New Product'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="save-product-btn">
              {saving ? 'Saving...' : editing ? 'Update Product' : 'Register Product'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="modal-form-grid">
            <div className="input-group">
              <label className="input-label">Product Name *</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Assigned by *</label>
              <input className="input-field" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Category</label>
              <select className="input-field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Model Name</label>
              <input className="input-field" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Buy Price (₹)</label>
              <input className="input-field" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Additional price (₹)</label>
              <input className="input-field" type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Initial Quantity</label>
              <input className="input-field" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Max Stock Capacity</label>
              <input className="input-field" type="number" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Storage Location</label>
              <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Description / Specs</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
        </form>
      </Modal>

      <ProductDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        product={detailProduct}
        categories={categories}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}


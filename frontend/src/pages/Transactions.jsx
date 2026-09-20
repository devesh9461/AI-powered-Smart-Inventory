import { useState, useEffect } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, RotateCcw, Package, Download } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatDateTime, formatNumber, timeAgo } from '../utils/helpers';
import { TX_TYPE_MAP } from '../utils/constants';
import toast from 'react-hot-toast';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(30);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ product_id: '', type: 'stock_in', quantity: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    Promise.all([
      api.get('/api/transactions', { params: { type: typeFilter || undefined, days: daysFilter } }),
      api.get('/api/products'),
    ])
      .then(([tRes, pRes]) => {
        setTransactions(tRes.data.transactions);
        setProducts(pRes.data.products);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [typeFilter, daysFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/transactions', {
        product_id: parseInt(form.product_id),
        type: form.type,
        quantity: parseInt(form.quantity),
        unit_price: form.unit_price ? parseFloat(form.unit_price) : undefined,
        notes: form.notes,
      });
      toast.success(form.type === 'repair' ? 'Repair expense logged & calculated!' : 'Transaction recorded');
      setModalOpen(false);
      setForm({ product_id: '', type: 'stock_in', quantity: '', unit_price: '', notes: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record transaction');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading transactions..." />;

  const typeChips = [
    { label: 'All', value: '' },
    { label: 'Inbound', value: 'stock_in' },
    { label: 'Outbound', value: 'stock_out' },
    { label: 'Repair / Expense', value: 'repair' },
    { label: 'Adjustment', value: 'adjustment' },
    { label: 'Return', value: 'return' },
  ];

  const handleExportCSV = async () => {
    try {
      toast.loading('Preparing CSV export...', { id: 'tx-export' });
      const res = await api.get('/api/transactions/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_transactions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Transactions CSV downloaded!', { id: 'tx-export' });
    } catch (err) {
      toast.error('Failed to export transactions', { id: 'tx-export' });
    }
  };

  return (
    <div className="compact-page">
      {/* Compact Header */}
      <div className="compact-header">
        <div className="compact-header-left">
          <h1 className="compact-title">Transactions</h1>
          <span className="compact-hud-badge">
            <ArrowLeftRight size={12} style={{ color: 'var(--accent-primary)' }} />
            <span>{formatNumber(transactions.length)} Recorded</span>
          </span>
        </div>

        <div className="compact-header-right">
          <button
            className="btn btn-secondary btn-xs"
            onClick={handleExportCSV}
            title="Export transactions history as CSV"
            id="export-tx-csv-btn"
          >
            <Download size={13} /> Export CSV
          </button>
          <button className="btn btn-primary btn-xs" onClick={() => setModalOpen(true)} id="new-transaction-btn">
            <Plus size={14} /> Record
          </button>
        </div>
      </div>

      {/* Quick Filter Chips & Time Range */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
        <div className="status-chips-bar" style={{ margin: 0, paddingBottom: 0 }}>
          {typeChips.map((chip) => (
            <button
              key={chip.value}
              className={`status-chip ${typeFilter === chip.value ? 'active' : ''}`}
              onClick={() => setTypeFilter(chip.value)}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: 120, padding: '4px 24px 4px 8px', fontSize: '11px', height: '28px' }}
          value={daysFilter}
          onChange={(e) => setDaysFilter(parseInt(e.target.value))}
          id="tx-days-filter"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Transactions Container */}
      <div className="glass-card compact-card" style={{ padding: '10px' }}>
        {transactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <div className="empty-state-icon" style={{ fontSize: '2rem' }}>📋</div>
            <div className="empty-state-title" style={{ fontSize: '14px' }}>No transactions found</div>
            <div className="empty-state-message" style={{ fontSize: '12px' }}>Adjust filters or create a new transaction.</div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-responsive desktop-only-table">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Value</th>
                    <th>Reference</th>
                    <th>By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const txInfo = TX_TYPE_MAP[tx.type] || {};
                    return (
                      <tr key={tx.id}>
                        <td>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tx.product_name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{tx.product_sku}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${txInfo.color || 'neutral'} compact-badge`}>
                            {txInfo.icon} {txInfo.label || tx.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: tx.type === 'stock_out' ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {tx.type === 'stock_out' ? '-' : '+'}{tx.quantity}
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(tx.total_value)}</td>
                        <td><code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.reference || '—'}</code></td>
                        <td style={{ fontSize: '11px' }}>{tx.created_by || '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{formatDateTime(tx.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Native Card Feed */}
            <div className="mobile-only-feed">
              {transactions.map((tx) => {
                const txInfo = TX_TYPE_MAP[tx.type] || {};
                const isIn = tx.type === 'stock_in' || tx.type === 'return';
                return (
                  <div key={tx.id} className="mobile-activity-item">
                    <div
                      className="mobile-activity-icon"
                      style={{
                        background: isIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isIn ? '#10b981' : '#ef4444',
                      }}
                    >
                      {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="mobile-activity-info">
                      <div className="mobile-activity-name">{tx.product_name}</div>
                      <div className="mobile-activity-meta">
                        <span className={`badge badge-${txInfo.color || 'neutral'} compact-badge`}>
                          {txInfo.label || tx.type}
                        </span>
                        <span>• {timeAgo(tx.created_at)}</span>
                        {tx.reference && <span>• {tx.reference}</span>}
                      </div>
                    </div>
                    <div className="mobile-activity-right">
                      <div className="mobile-activity-qty" style={{ color: isIn ? '#10b981' : '#ef4444' }}>
                        {isIn ? '+' : '-'}{tx.quantity}
                      </div>
                      <div className="mobile-activity-val">{formatCurrency(tx.total_value)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* New Transaction Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Transaction"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving} id="save-transaction-btn">
              {saving ? 'Saving...' : 'Record'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label className="input-label">Product *</label>
            <select
              className="input-field"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Transaction Type *</label>
            <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="stock_in">Stock In (Purchase/Restock)</option>
              <option value="stock_out">Stock Out (Sale/Dispatch)</option>
              <option value="repair">🔧 Repair / Stock Maintenance Cost</option>
              <option value="adjustment">Adjustment</option>
              <option value="return">Return</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">{form.type === 'repair' ? 'Repaired Quantity *' : 'Quantity *'}</label>
            <input className="input-field" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          </div>
          {(form.type === 'repair' || form.type === 'stock_in') && (
            <div className="input-group">
              <label className="input-label">
                {form.type === 'repair' ? 'Repair / Service Price per Unit ($) *' : 'Cost Price per Unit ($)'}
              </label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                min="0"
                placeholder={form.type === 'repair' ? 'e.g. 45.00' : 'e.g. 12.50'}
                value={form.unit_price || ''}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                required={form.type === 'repair'}
              />
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Notes / Repair Description</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder={form.type === 'repair' ? 'e.g. Replaced display cable, battery test passed' : 'Additional details'}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

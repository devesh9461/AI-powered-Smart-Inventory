import { useState, useEffect } from 'react';
import {
  Bell, CheckCheck, AlertTriangle, AlertCircle, Info, ShieldAlert,
  Trash2, X, Plus, Package, ArrowRight,
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { timeAgo } from '../utils/helpers';
import toast from 'react-hot-toast';

const severityConfig = {
  critical: { icon: ShieldAlert, bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  warning: { icon: AlertTriangle, bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  info: { icon: Info, bg: 'rgba(0,212,255,0.12)', color: '#00d4ff' },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Quick Restock modal state
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [restockQty, setRestockQty] = useState(25);
  const [savingRestock, setSavingRestock] = useState(false);

  const fetchAlerts = () => {
    api.get('/api/alerts', { params: { severity: severityFilter || undefined, status: statusFilter || undefined } })
      .then((res) => {
        setAlerts(res.data.alerts);
        setUnreadCount(res.data.unread_count);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [severityFilter, statusFilter]);

  const markRead = async (id) => {
    try {
      await api.patch(`/api/alerts/${id}/read`);
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to update alert');
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/api/alerts/read-all');
      toast.success('All alerts marked as read');
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to update alerts');
    }
  };

  const deleteAlert = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/alerts/${id}`);
      toast.success('Alert dismissed');
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to dismiss alert');
    }
  };

  const clearReadAlerts = async () => {
    try {
      const res = await api.delete('/api/alerts/clear-read');
      toast.success(res.data.message || 'Cleared read alerts');
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to clear read alerts');
    }
  };

  const openRestock = (e, alert) => {
    e.stopPropagation();
    setSelectedAlert(alert);
    setRestockQty(25);
    setRestockModalOpen(true);
  };

  const handleExecuteRestock = async (e) => {
    e.preventDefault();
    if (!selectedAlert?.product_id || restockQty <= 0) return;
    setSavingRestock(true);
    try {
      await api.post('/api/transactions', {
        product_id: selectedAlert.product_id,
        type: 'stock_in',
        quantity: parseInt(restockQty),
        notes: `Restock from Alert #${selectedAlert.id}`,
      });
      toast.success(`Successfully restocked ${restockQty} units!`);
      // Mark alert as read
      await api.patch(`/api/alerts/${selectedAlert.id}/read`);
      setRestockModalOpen(false);
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to execute restock');
    } finally {
      setSavingRestock(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading telemetry alerts..." />;

  return (
    <div className="compact-page">
      {/* Header */}
      <div className="compact-header">
        <div className="compact-header-left">
          <h1 className="compact-title">Security & Stock Alerts</h1>
          <span className="compact-hud-badge">
            <Bell size={12} style={{ color: 'var(--accent-primary)' }} />
            <span>{unreadCount > 0 ? `${unreadCount} Unread` : 'All Clear'}</span>
          </span>
        </div>

        <div className="compact-header-right">
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-xs" onClick={markAllRead} id="mark-all-read-btn">
              <CheckCheck size={13} /> Mark All Read
            </button>
          )}
          <button className="btn btn-secondary btn-xs" onClick={clearReadAlerts} title="Delete all read alerts">
            <Trash2 size={13} /> Clear Read
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="status-chips-bar" style={{ marginBottom: '10px' }}>
        <button
          className={`status-chip ${severityFilter === '' ? 'active' : ''}`}
          onClick={() => setSeverityFilter('')}
        >
          All Severities
        </button>
        <button
          className={`status-chip ${severityFilter === 'critical' ? 'active' : ''}`}
          onClick={() => setSeverityFilter('critical')}
        >
          🔴 Critical
        </button>
        <button
          className={`status-chip ${severityFilter === 'warning' ? 'active' : ''}`}
          onClick={() => setSeverityFilter('warning')}
        >
          🟡 Warning
        </button>
        <button
          className={`status-chip ${severityFilter === 'info' ? 'active' : ''}`}
          onClick={() => setSeverityFilter('info')}
        >
          🔵 Info
        </button>

        <span style={{ borderLeft: '1px solid var(--border-primary)', margin: '0 4px', height: '16px' }} />

        <button
          className={`status-chip ${statusFilter === 'unread' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'unread' ? '' : 'unread')}
        >
          Unread Only
        </button>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No alerts matching filters</div>
            <div className="empty-state-message">Your inventory telemetry is running within normal parameters.</div>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className={`alert-item ${!alert.is_read ? 'unread' : ''}`}
                onClick={() => !alert.is_read && markRead(alert.id)}
                style={{ cursor: !alert.is_read ? 'pointer' : 'default' }}
              >
                <div className="alert-severity-icon" style={{ background: config.bg, color: config.color }}>
                  <Icon size={18} />
                </div>
                <div className="alert-details">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-meta">
                    <span className={`badge badge-${alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}`}>
                      {alert.severity}
                    </span>
                    <span>{alert.type.replace(/_/g, ' ')}</span>
                    {alert.product_name && <span>• {alert.product_name}</span>}
                    <span>• {timeAgo(alert.created_at)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Quick Action: Restock Now */}
                  {(alert.type === 'low_stock' || alert.type === 'out_of_stock') && alert.product_id && (
                    <button
                      className="btn btn-primary btn-xs"
                      onClick={(e) => openRestock(e, alert)}
                      title="Quick Restock"
                    >
                      <Plus size={12} /> Restock
                    </button>
                  )}

                  {/* Dismiss / Delete */}
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={(e) => deleteAlert(e, alert.id)}
                    title="Dismiss alert"
                    style={{ padding: '4px 6px' }}
                  >
                    <X size={13} />
                  </button>

                  {!alert.is_read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)',
                      boxShadow: '0 0 8px rgba(0,212,255,0.6)',
                    }} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Restock Modal */}
      <Modal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        title={`Quick Restock: ${selectedAlert?.product_name || 'Product'}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setRestockModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExecuteRestock}
              disabled={savingRestock}
            >
              {savingRestock ? 'Restocking...' : 'Confirm Restock'}
            </button>
          </>
        }
      >
        <form onSubmit={handleExecuteRestock}>
          <div style={{ padding: '8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Record an immediate incoming shipment for <strong>{selectedAlert?.product_name}</strong> to resolve this alert.
          </div>
          <div className="input-group">
            <label className="input-label">Quantity to Add *</label>
            <input
              className="input-field"
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

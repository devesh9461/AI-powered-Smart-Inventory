import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Package, AlertTriangle, DollarSign, Activity, TrendingUp,
  Brain, ArrowRight, ShieldCheck, Zap, RefreshCw, Layers, CheckCircle2,
  ArrowDownLeft, ArrowUpRight, Wrench,
} from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatNumber, formatDateTime, timeAgo, formatCompactCurrency } from '../utils/helpers';
import { STOCK_STATUS_MAP, TX_TYPE_MAP } from '../utils/constants';

const CHART_COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10, 11, 26, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
      color: '#fff',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} style={{ color: entry.color, marginTop: '2px' }}>
          {entry.name}: {formatNumber(entry.value)} units
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState(30);
  const navigate = useNavigate();

  const fetchDashboardData = () => {
    setLoading(true);
    api.get('/api/dashboard')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner text="Analyzing inventory parameters..." />;
  if (!data) return null;

  const { stats, category_distribution, stock_trend, recent_transactions, top_products, status_distribution } = data;

  const totalItems = Object.values(status_distribution).reduce((a, b) => a + b, 0);
  const healthScore = totalItems > 0
    ? Math.round(((status_distribution.in_stock + status_distribution.overstock) / totalItems) * 100)
    : 100;

  const filteredTrend = stock_trend.slice(-trendRange);

  const pieData = Object.entries(status_distribution)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STOCK_STATUS_MAP[key]?.label || key,
      value,
    }));

  const PIE_COLORS = {
    'In Stock': '#10b981',
    'Low Stock': '#f59e0b',
    'Out of Stock': '#ef4444',
    'Overstock': '#06b6d4',
  };

  return (
    <div className="compact-dashboard">
      {/* Top Banner - SAP Business One Enterprise Header Style */}
      <div className="compact-dashboard-banner glass-card">
        <div className="compact-banner-left">
          <h1 className="compact-banner-title">Smart Inventory Control Center</h1>
          <p className="compact-banner-sub">
            Realtime monitoring • Expense calculation • Stock forecasting • Automated alert resolution
          </p>
        </div>

        <div className="compact-banner-right">
          <button className="btn btn-secondary btn-xs" onClick={fetchDashboardData} id="refresh-dashboard-btn">
            <RefreshCw size={12} /> Sync Data
          </button>
          <button className="btn btn-primary btn-xs" onClick={() => navigate('/ai-insights')} id="goto-ai-btn">
            <Brain size={13} /> View AI Insights
          </button>
        </div>
      </div>

      {/* Quick Summary Telemetry Strip (4 Key Stats) */}
      <div className="compact-stats-grid">
        <div className="glass-card compact-stat-card">
          <div className="compact-stat-top">
            <span className="compact-stat-label">Total Products</span>
            <div className="compact-stat-icon" style={{ background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff' }}>
              <Package size={15} />
            </div>
          </div>
          <div className="compact-stat-val">{formatNumber(stats.total_products)}</div>
          <div className="compact-stat-footer">
            <span className="compact-stat-sub">6 categories</span>
            <span className="compact-stat-badge success">100% active</span>
          </div>
        </div>

        <div className="glass-card compact-stat-card">
          <div className="compact-stat-top">
            <span className="compact-stat-label">Stock Health</span>
            <div className="compact-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="compact-stat-val" style={{ color: stats.low_stock_count > 0 ? '#f59e0b' : '#10b981' }}>
            {stats.low_stock_count} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>low</span>
          </div>
          <div className="compact-stat-footer">
            <span className="compact-stat-sub">{healthScore}% healthy</span>
            {stats.out_of_stock_count > 0 ? (
              <span className="compact-stat-badge danger">{stats.out_of_stock_count} out</span>
            ) : (
              <span className="compact-stat-badge success">All in stock</span>
            )}
          </div>
        </div>

        <div className="glass-card compact-stat-card">
          <div className="compact-stat-top">
            <span className="compact-stat-label">30D Expense</span>
            <div className="compact-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
              <Wrench size={15} />
            </div>
          </div>
          <div className="compact-stat-val" style={{ color: '#ef4444' }}>
            {formatCurrency(stats.expense_30d || stats.revenue_30d || 0)}
          </div>
          <div className="compact-stat-footer">
            <span className="compact-stat-sub" title={`Repairs: ${formatCurrency(stats.repair_expense_30d || 0)}`}>
              Repairs: {formatCompactCurrency(stats.repair_expense_30d || 0)}
            </span>
            <span className="compact-stat-badge danger">Restock & Repairs</span>
          </div>
        </div>

        <div className="glass-card compact-stat-card">
          <div className="compact-stat-top">
            <span className="compact-stat-label">Transactions</span>
            <div className="compact-stat-icon" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#8b5cf6' }}>
              <Activity size={15} />
            </div>
          </div>
          <div className="compact-stat-val">{formatNumber(stats.transactions_30d)}</div>
          <div className="compact-stat-footer">
            <span className="compact-stat-sub">{stats.unread_alerts} alerts</span>
            <span className="compact-stat-badge primary">Realtime</span>
          </div>
        </div>
      </div>

      {/* Charts Row: Stock Flow & Category Distribution (Glanceable Heights ~180px) */}
      <div className="compact-charts-grid">
        <div className="glass-card compact-card">
          <div className="compact-card-header">
            <div>
              <div className="compact-card-title">Stock Movement Flow</div>
              <div className="compact-card-sub">Inflow (restocks) vs. Outflow (orders)</div>
            </div>
            <div className="compact-pill-group">
              <button className={`compact-pill ${trendRange === 7 ? 'active' : ''}`} onClick={() => setTrendRange(7)}>7D</button>
              <button className={`compact-pill ${trendRange === 14 ? 'active' : ''}`} onClick={() => setTrendRange(14)}>14D</button>
              <button className={`compact-pill ${trendRange === 30 ? 'active' : ''}`} onClick={() => setTrendRange(30)}>30D</button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={filteredTrend} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="flowInGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="flowOutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#6b6b80"
                fontSize={10}
                tickLine={false}
                tickFormatter={(d) => d.slice(5)}
                interval={Math.max(1, Math.floor(filteredTrend.length / 5))}
              />
              <YAxis stroke="#6b6b80" fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fill="url(#flowInGrad)" name="Restock" />
              <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} fill="url(#flowOutGrad)" name="Orders" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card compact-card">
          <div className="compact-card-header">
            <div>
              <div className="compact-card-title">Category Stock Levels</div>
              <div className="compact-card-sub">Stock distribution by department</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={category_distribution} layout="vertical" margin={{ top: 2, right: 14, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="#6b6b80" fontSize={10} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="#a0a0b8" fontSize={11} tickLine={false} width={75} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_quantity" radius={[0, 4, 4, 0]} name="Units">
                {category_distribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Recent Activity & Stock Matrix */}
      <div className="compact-two-col-grid">
        <div className="glass-card compact-card">
          <div className="compact-card-header">
            <div>
              <div className="compact-card-title">Recent Activity</div>
              <div className="compact-card-sub">Latest inventory movements</div>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/transactions')}>
              All <ArrowRight size={11} />
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="table-responsive desktop-only-table">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Value</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recent_transactions.slice(0, 4).map((tx) => {
                  const txInfo = TX_TYPE_MAP[tx.type] || {};
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.product_name}</td>
                      <td>
                        <span className={`badge badge-${txInfo.color || 'neutral'} compact-badge`}>
                          {txInfo.icon} {txInfo.label || tx.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{tx.quantity}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(tx.total_value)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{formatDateTime(tx.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Native Activity Feed List */}
          <div className="mobile-only-feed">
            {recent_transactions.slice(0, 4).map((tx) => {
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
        </div>

        <div className="glass-card compact-card">
          <div className="compact-card-header">
            <div>
              <div className="compact-card-title">Inventory Health</div>
              <div className="compact-card-sub">Stock status proportions</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ width: '45%', height: 140 }}>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={36} outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[entry.name] || CHART_COLORS[i]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ width: '55%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pieData.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: PIE_COLORS[entry.name] || CHART_COLORS[i] }} />
                    {entry.name}
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{entry.value} items</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

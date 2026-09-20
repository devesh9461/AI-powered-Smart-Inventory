import { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Brain, TrendingUp, AlertTriangle, Lightbulb, Zap, ShieldAlert,
  HelpCircle, ArrowUpRight, Cpu, Layers, Activity, CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatNumber } from '../utils/helpers';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10, 11, 26, 0.95)',
      border: '1px solid rgba(0, 212, 255, 0.25)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 212, 255, 0.2)',
      borderRadius: '10px',
      padding: '12px 16px',
      backdropFilter: 'blur(16px)',
    }}>
      <p style={{ color: '#a0a0b8', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          {p.name}: {typeof p.value === 'number' ? formatNumber(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [anomalyTab, setAnomalyTab] = useState('flagged'); // 'flagged' or 'all'

  useEffect(() => {
    api.get('/api/products').then((res) => {
      setProducts(res.data.products);
      if (res.data.products.length > 0) {
        setSelectedProduct(res.data.products[0].id);
      }
    });

    api.get('/api/ai/anomalies')
      .then((res) => setAnomalies(res.data))
      .catch(console.error)
      .finally(() => setLoadingAnomalies(false));

    api.get('/api/ai/insights')
      .then((res) => setInsights(res.data))
      .catch(console.error)
      .finally(() => setLoadingInsights(false));
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    setLoadingForecast(true);
    api.get(`/api/ai/forecast/${selectedProduct}`)
      .then((res) => setForecast(res.data.forecast))
      .catch(console.error)
      .finally(() => setLoadingForecast(false));
  }, [selectedProduct]);

  // Transform forecast data for chart
  const forecastChartData = forecast?.dates?.map((date, i) => ({
    date: date.slice(5),
    predicted: forecast.predicted[i],
    lower: forecast.lower_bound[i],
    upper: forecast.upper_bound[i],
  })) || [];

  // Transform anomaly data for scatter
  const scatterData = anomalies?.all_products?.map((a) => ({
    x: a.avg_daily_demand,
    y: a.anomaly_score,
    name: a.product_name,
    isAnomaly: a.is_anomaly,
    z: a.transaction_count,
  })) || [];

  const insightIcons = {
    stockout_risk: <ShieldAlert size={20} />,
    reorder: <AlertTriangle size={20} />,
    trending_up: <TrendingUp size={20} />,
    trending_down: <TrendingUp size={20} style={{ transform: 'rotate(180deg)' }} />,
    overstock: <Zap size={20} />,
  };

  const insightColors = {
    critical: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
    info: { bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.2)', color: '#00d4ff' },
  };

  const displayedAnomalies = anomalyTab === 'flagged'
    ? (anomalies?.anomalies || [])
    : (anomalies?.all_products || []);

  const activeProductName = products.find((p) => p.id === Number(selectedProduct))?.name || 'Selected Item';

  const [refreshingAI, setRefreshingAI] = useState(false);

  const handleRefreshAI = async () => {
    setRefreshingAI(true);
    try {
      toast.loading('Recalibrating ML pipelines...', { id: 'ai-recalibrate' });
      const res = await api.post('/api/ai/refresh');
      toast.success(res.data.message || 'AI models synchronized!', { id: 'ai-recalibrate' });
      // Reload anomalies & insights
      const [aRes, iRes] = await Promise.all([
        api.get('/api/ai/anomalies'),
        api.get('/api/ai/insights'),
      ]);
      setAnomalies(aRes.data);
      setInsights(iRes.data);
      if (selectedProduct) {
        const fRes = await api.get(`/api/ai/forecast/${selectedProduct}`);
        setForecast(fRes.data.forecast);
      }
    } catch (err) {
      toast.error('Failed to recalibrate AI models', { id: 'ai-recalibrate' });
    } finally {
      setRefreshingAI(false);
    }
  };

  return (
    <div className="compact-page">
      {/* Compact Header */}
      <div className="compact-header">
        <div className="compact-header-left">
          <h1 className="compact-title">Neural Analytics</h1>
          <span className="compact-live-chip">
            <span className="live-dot" /> LIVE ML
          </span>
          <span className="compact-hud-badge">
            <Cpu size={12} style={{ color: '#c084fc' }} />
            <span>RandomForest + IsolationForest</span>
          </span>
        </div>

        <div className="compact-header-right">
          <button
            className="btn btn-primary btn-xs"
            onClick={handleRefreshAI}
            disabled={refreshingAI}
            id="recalibrate-ai-btn"
          >
            <RefreshCw size={12} className={refreshingAI ? 'spin' : ''} />
            <span>{refreshingAI ? 'Calibrating...' : 'Recalibrate ML'}</span>
          </button>
        </div>
      </div>

      {/* Model Specs Compact HUD */}
      <div className="glass-card compact-card animate-slide-up" style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #7c3aed, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Cpu size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Multi-Model Production Pipeline
                <span className="ai-model-tag" style={{ fontSize: '10px', padding: '1px 6px' }}>Ensemble</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Lag features (t-1, t-7, t-14), rolling windows & 10th-90th percentile bounds
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="compact-stat-badge primary" style={{ padding: '2px 8px', fontSize: '10px' }}>
              RandomForest (100 Trees)
            </span>
            <span className="compact-stat-badge success" style={{ padding: '2px 8px', fontSize: '10px' }}>
              R²: {forecast?.model_score ?? '0.85'}
            </span>
            <span className="compact-stat-badge danger" style={{ padding: '2px 8px', fontSize: '10px' }}>
              IsolationForest
            </span>
          </div>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="compact-stats-grid">
        <div className="compact-stat-card">
          <div className="compact-stat-top">
            <span className="compact-stat-label">Model Type</span>
            <div className="compact-stat-icon" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#8b5cf6' }}>
              <Brain size={14} />
            </div>
          </div>
          <div className="compact-stat-val" style={{ fontSize: '1.05rem' }}>RandomForest</div>
          <div className="compact-stat-footer">
            <span className="compact-stat-sub">100 estimators</span>
            <span className="compact-stat-badge primary">R² {forecast?.model_score ?? '0.85'}</span>
          </div>
        </div>

        <div className="compact-stat-card">
          <div className="compact-stat-top">
            <span className="compact-stat-label">Expected Demand</span>
            <div className="compact-stat-icon" style={{ background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="compact-stat-val" style={{ fontSize: '1.05rem' }}>{forecast ? `${forecast.avg_daily_demand}/day` : '—'}</div>
          <div className="compact-stat-footer">
            <span className="compact-stat-sub">30d: {forecast ? formatNumber(forecast.total_forecasted) : 0} units</span>
            <span className="compact-stat-badge success">Trending</span>
          </div>
        </div>

        <div className="compact-stat-card">
          <div className="compact-stat-top">
            <span className="compact-stat-label">Anomalies</span>
            <div className="compact-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="compact-stat-val" style={{ fontSize: '1.05rem' }}>{anomalies?.total_anomalies ?? '0'} Flagged</div>
          <div className="compact-stat-footer">
            <span className="compact-stat-sub">Contamination 10%</span>
            <span className="compact-stat-badge danger">Outliers</span>
          </div>
        </div>

        <div className="compact-stat-card">
          <div className="compact-stat-top">
            <span className="compact-stat-label">Cognitive Insights</span>
            <div className="compact-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Lightbulb size={14} />
            </div>
          </div>
          <div className="compact-stat-val" style={{ fontSize: '1.05rem' }}>{insights?.total ?? '0'} Actions</div>
          <div className="compact-stat-footer">
            <span className="compact-stat-sub">{insights?.critical_count || 0} critical</span>
            <span className="compact-stat-badge success">Active</span>
          </div>
        </div>
      </div>

      {/* Demand Forecast Chart */}
      <div className="glass-card compact-card">
        <div className="compact-card-header">
          <span className="compact-card-title">30-Day Demand Forecast & Confidence Bounds</span>
          {forecast && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
              <span className="compact-stat-badge primary">R² {forecast.model_score}</span>
              <span className="compact-stat-sub">30d Sum: <strong>{formatNumber(forecast.total_forecasted)}</strong></span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: 160, padding: '4px 24px 4px 8px', fontSize: '11px', height: '28px' }}
            value={selectedProduct || ''}
            onChange={(e) => setSelectedProduct(Number(e.target.value))}
            id="forecast-product-select"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (Qty: {p.quantity})</option>
            ))}
          </select>

          {/* Quick Product Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {products.slice(0, 5).map((p) => (
              <button
                key={p.id}
                className={`compact-pill ${selectedProduct === p.id ? 'active' : ''}`}
                onClick={() => setSelectedProduct(p.id)}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {loadingForecast ? (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={forecastChartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" stroke="#6b6b80" fontSize={10} tickLine={false} />
              <YAxis stroke="#6b6b80" fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="transparent"
                fill="url(#confidenceGrad)"
                name="90th %ile Bound"
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#00d4ff"
                strokeWidth={2}
                fill="url(#forecastGrad)"
                name="Predicted Demand"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="transparent"
                fill="#05060f"
                name="10th %ile Bound"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="compact-charts-grid">
        {/* Anomaly Scatter Plot */}
        <div className="glass-card compact-card">
          <div className="compact-card-header">
            <div>
              <div className="compact-card-title">Isolation Forest Risk Radar</div>
              <div className="compact-card-sub">Velocity vs outlier score</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
              <span style={{ color: '#10b981' }}>● Normal</span>
              <span style={{ color: '#ef4444' }}>● Anomaly</span>
            </div>
          </div>

          {loadingAnomalies ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" dataKey="x" name="Demand" stroke="#6b6b80" fontSize={10} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Score" stroke="#6b6b80" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={-0.1} stroke="#f59e0b" strokeDasharray="4 4" />
                <Scatter
                  data={scatterData.filter((d) => !d.isAnomaly)}
                  fill="#10b981"
                  fillOpacity={0.7}
                  name="Normal Velocity"
                />
                <Scatter
                  data={scatterData.filter((d) => d.isAnomaly)}
                  fill="#ef4444"
                  fillOpacity={0.9}
                  name="Detected Anomaly"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Anomaly List Table */}
        <div className="glass-card compact-card">
          <div className="compact-card-header">
            <div>
              <div className="compact-card-title">Outlier Ledger</div>
              <div className="compact-card-sub">Requires verification</div>
            </div>
            <div className="compact-pill-group">
              <button
                className={`compact-pill ${anomalyTab === 'flagged' ? 'active' : ''}`}
                onClick={() => setAnomalyTab('flagged')}
              >
                Flagged ({anomalies?.total_anomalies || 0})
              </button>
              <button
                className={`compact-pill ${anomalyTab === 'all' ? 'active' : ''}`}
                onClick={() => setAnomalyTab('all')}
              >
                All ({anomalies?.all_products?.length || 0})
              </button>
            </div>
          </div>

          {loadingAnomalies ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: 180, overflowY: 'auto' }}>
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Score</th>
                    <th>Severity</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAnomalies.map((a) => (
                    <tr key={a.product_id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div>{a.product_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Qty: {a.current_stock}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: a.anomaly_score < -0.1 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {a.anomaly_score}
                      </td>
                      <td>
                        <span className={`badge badge-${a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'success'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                          {a.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {a.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Predictive Insights Feed */}
      <div className="glass-card compact-card">
        <div className="compact-card-header">
          <span className="compact-card-title">Cognitive Action Recommendations</span>
          <span className="compact-card-sub">{insights?.total || 0} alerts active</span>
        </div>

        {loadingInsights ? (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {insights?.insights?.map((ins, i) => {
              const theme = insightColors[ins.severity] || insightColors.info;
              return (
                <div
                  key={i}
                  style={{
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ color: theme.color, flexShrink: 0, marginTop: '2px' }}>
                    {insightIcons[ins.type] || <HelpCircle size={16} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
                      <div style={{ color: theme.color, fontWeight: 600, fontSize: '12px' }}>
                        {ins.title}
                      </div>
                      <span className={`badge badge-${ins.severity === 'critical' ? 'danger' : ins.severity === 'warning' ? 'warning' : 'info'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                        {ins.severity}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      {ins.message}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

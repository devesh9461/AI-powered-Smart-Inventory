import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@inventory.ai');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(name, email, password);
        toast.success('Account created successfully!');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@inventory.ai');
    setPassword('admin123');
    setIsRegister(false);
  };

  return (
    <div className="login-page">
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div className="login-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="login-shell">
        <aside className="login-visual glass-card animate-slide-up">
          <div className="login-visual-badge indian-flag-badge">
            <span className="indian-flag-text-anim">GODWAL &amp; SOFTWARES (GS)</span>
          </div>
          <h2>Run inventory with less guesswork and more confidence.</h2>
          <p>
            Monitor stock health, demand forecast, and operational risk from one
            production-ready command center built for modern supply chains.
          </p>

          <div className="login-metrics-grid">
            <div className="login-metric-box">
              <strong>99.2%</strong>
              <span>stock accuracy</span>
            </div>
            <div className="login-metric-box">
              <strong>14 days</strong>
              <span>forecast horizon</span>
            </div>
            <div className="login-metric-box">
              <strong>2.4x</strong>
              <span>faster decisions</span>
            </div>
          </div>

          <ul className="login-feature-list">
            <li>AI demand forecasting and reorder intelligence</li>
            <li>Live stock alerts with risk prioritization</li>
            <li>Operational dashboards built for daily execution</li>
          </ul>
        </aside>

        <div className="glass-card login-card animate-slide-up">
          <div className="login-brand-lockup">
            <div className="login-brand-text">
              <div className="login-brand-name indian-flag-text-anim">GODWAL &amp; SOFTWARES (GS)</div>
            </div>
          </div>

          <h1 className="login-title">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="login-subtitle">
            {isRegister
              ? 'Manage your inventory with secure, intelligent workflows.'
              : 'Sign in to your GS inventory intelligence workspace'}
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="input-group">
                <label className="input-label" htmlFor="login-name">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={18}
                    style={{
                      position: 'absolute', left: '12px', top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    id="login-name"
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="login-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="admin@inventory.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-actions-row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={fillDemoCredentials}>
              Use Demo Access
            </button>
          </div>

          <div className="login-footer">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsRegister(!isRegister);
              }}
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </a>
          </div>

          <div className="login-demo-info">
            <strong>Demo Credentials:</strong> admin@inventory.ai / admin123
          </div>
        </div>
      </div>
    </div>
  );
}

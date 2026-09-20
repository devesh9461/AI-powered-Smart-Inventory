import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  User, Shield, Code2, ExternalLink, Sun, Moon, Waves, Trees, Palette,
  Lock, KeyRound, Download, RefreshCw, Check,
  AlertTriangle, Database, FileSpreadsheet, Eye, EyeOff,
  CheckCircle2, Sparkles,
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { getInitials, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const techStack = [
  'Python 3.13', 'Flask 3.1', 'scikit-learn', 'PostgreSQL', 'SQLAlchemy',
  'React 19', 'Vite', 'Recharts', 'PyJWT', 'bcrypt', 'Flask-Limiter',
  'RandomForest', 'IsolationForest', 'Pandas', 'NumPy',
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme, cycleTheme, isDark } = useTheme();

  // Active Tab
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'theme', 'security', 'data', 'about'

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Demo reset modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Handle profile update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put('/api/auth/profile', { name, email });
      // Update local storage user
      const updatedUser = { ...user, name: res.data.user.name, email: res.data.user.email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle password update
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setUpdatingPassword(true);
    try {
      await api.put('/api/auth/password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success('Password changed successfully! Keep it secure.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Handle demo data reset
  const handleResetData = async () => {
    setResetting(true);
    try {
      await api.post('/api/auth/reset-demo-data');
      toast.success('Demo data reset to pristine state!');
      setResetModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset demo data');
    } finally {
      setResetting(false);
    }
  };

  // Direct CSV Downloads with auth token
  const handleDownloadCSV = async (endpoint, filename) => {
    try {
      toast.loading(`Preparing ${filename}...`, { id: 'csv-download' });
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded!`, { id: 'csv-download' });
    } catch (err) {
      toast.error('Failed to download CSV', { id: 'csv-download' });
    }
  };

  // Password strength helper
  const getPasswordStrength = (pass) => {
    if (!pass) return { text: '', score: 0, color: 'transparent' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { text: 'Weak', score: 33, color: '#ef4444' };
    if (score <= 4) return { text: 'Good', score: 66, color: '#f59e0b' };
    return { text: 'Strong', score: 100, color: '#10b981' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="compact-page">
      {/* Header */}
      <div className="compact-header">
        <div className="compact-header-left">
          <h1 className="compact-title">System Settings</h1>
          <span className="compact-hud-badge">
            <Shield size={12} style={{ color: 'var(--accent-primary)' }} />
            <span>Security & Preferences</span>
          </span>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="status-chips-bar" style={{ marginBottom: '16px' }}>
        {[
          { id: 'profile', label: 'Profile & Account', icon: User },
          { id: 'theme', label: 'Appearance & Themes', icon: Palette },
          { id: 'security', label: 'Security & Password', icon: Lock },
          { id: 'data', label: 'Data & Backup', icon: Database },
          { id: 'about', label: 'Architecture & Tech', icon: Code2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`status-chip ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Profile & Account */}
      {activeTab === 'profile' && (
        <div className="glass-card settings-section animate-slide-up" style={{ maxWidth: 640 }}>
          <div className="settings-section-title">
            <User size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
            Personal Profile
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div
              className="sidebar-avatar"
              style={{
                width: 56, height: 56, fontSize: '1.25rem', borderRadius: '14px',
                background: user?.avatar_color || '#00d4ff',
                boxShadow: '0 0 16px rgba(0, 212, 255, 0.3)',
              }}
            >
              {user ? getInitials(user.name) : '?'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{user?.email}</p>
              <span className="badge badge-info" style={{ marginTop: '4px', fontSize: '10px' }}>
                <Shield size={11} /> {user?.role || 'Admin'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                className="input-field"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                className="input-field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="settings-row" style={{ borderTop: 'none', padding: '10px 0 0 0' }}>
              <div>
                <div className="settings-label">Account Created</div>
                <div className="settings-desc">{user?.created_at ? formatDate(user.created_at) : 'Active Session'}</div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingProfile}
                id="save-profile-btn"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          <div className="settings-row" style={{ marginTop: '20px' }}>
            <div>
              <div className="settings-label">Sign Out</div>
              <div className="settings-desc">End your authenticated session safely</div>
            </div>
            <button className="btn btn-danger btn-xs" onClick={logout} id="logout-btn">
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Appearance & Theme Modes (4 Themes) */}
      {activeTab === 'theme' && (
        <div className="glass-card settings-section animate-slide-up" style={{ maxWidth: 720 }}>
          <div className="settings-section-title">
            <Palette size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
            Appearance & Color Modes
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Choose from 4 professionally crafted color modes. Changes apply instantly across all pages and persist automatically.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {/* Dark Obsidian */}
            <div
              className={`theme-selection-card ${theme === 'dark' ? 'selected' : ''}`}
              onClick={() => setTheme('dark')}
              role="button"
              tabIndex={0}
            >
              <div className="theme-card-preview dark-preview">
                <div className="preview-topbar dark" />
                <div className="preview-content">
                  <div className="preview-pill" style={{ background: '#00d4ff' }} />
                  <div className="preview-rect" />
                </div>
              </div>
              <div className="theme-card-body">
                <div className="theme-card-title">
                  <Moon size={15} style={{ color: '#00d4ff' }} />
                  <span>Dark Obsidian</span>
                </div>
                <p className="theme-card-desc">Cyberpunk glassmorphism with neon cyan accents and pitch-black backdrops.</p>
                {theme === 'dark' && (
                  <div className="theme-active-tag"><Check size={12} /> Active</div>
                )}
              </div>
            </div>

            {/* White Clean */}
            <div
              className={`theme-selection-card ${theme === 'light' ? 'selected' : ''}`}
              onClick={() => setTheme('light')}
              role="button"
              tabIndex={0}
            >
              <div className="theme-card-preview light-preview">
                <div className="preview-topbar light" />
                <div className="preview-content">
                  <div className="preview-pill" style={{ background: '#0284c7' }} />
                  <div className="preview-rect light" />
                </div>
              </div>
              <div className="theme-card-body">
                <div className="theme-card-title">
                  <Sun size={15} style={{ color: '#f59e0b' }} />
                  <span>White Clean</span>
                </div>
                <p className="theme-card-desc">Crisp frosted glass, ultra-clean typography, and maximum readability.</p>
                {theme === 'light' && (
                  <div className="theme-active-tag"><Check size={12} /> Active</div>
                )}
              </div>
            </div>

            {/* Midnight Blue */}
            <div
              className={`theme-selection-card ${theme === 'midnight' ? 'selected' : ''}`}
              onClick={() => setTheme('midnight')}
              role="button"
              tabIndex={0}
            >
              <div className="theme-card-preview" style={{ background: '#080c1a', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                <div className="preview-topbar" style={{ height: 8, background: '#0d1226', borderRadius: 4, marginBottom: 6 }} />
                <div className="preview-content">
                  <div className="preview-pill" style={{ background: '#3b82f6' }} />
                  <div className="preview-rect" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }} />
                </div>
              </div>
              <div className="theme-card-body">
                <div className="theme-card-title">
                  <Waves size={15} style={{ color: '#3b82f6' }} />
                  <span>Midnight Blue</span>
                </div>
                <p className="theme-card-desc">Deep navy atmosphere with electric blue accents for focused, professional work.</p>
                {theme === 'midnight' && (
                  <div className="theme-active-tag"><Check size={12} /> Active</div>
                )}
              </div>
            </div>

            {/* Emerald Forest */}
            <div
              className={`theme-selection-card ${theme === 'emerald' ? 'selected' : ''}`}
              onClick={() => setTheme('emerald')}
              role="button"
              tabIndex={0}
            >
              <div className="theme-card-preview" style={{ background: '#071210', borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
                <div className="preview-topbar" style={{ height: 8, background: '#0c1f1a', borderRadius: 4, marginBottom: 6 }} />
                <div className="preview-content">
                  <div className="preview-pill" style={{ background: '#10b981' }} />
                  <div className="preview-rect" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }} />
                </div>
              </div>
              <div className="theme-card-body">
                <div className="theme-card-title">
                  <Trees size={15} style={{ color: '#10b981' }} />
                  <span>Emerald Forest</span>
                </div>
                <p className="theme-card-desc">Nature-inspired deep greens with jade accents — calming for extended work sessions.</p>
                {theme === 'emerald' && (
                  <div className="theme-active-tag"><Check size={12} /> Active</div>
                )}
              </div>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Quick Cycle</div>
              <div className="settings-desc">Cycle through all 4 themes with a single click</div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cycleTheme}
            >
              <Palette size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Next Theme</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Security & Password */}
      {activeTab === 'security' && (
        <div className="glass-card settings-section animate-slide-up" style={{ maxWidth: 640 }}>
          <div className="settings-section-title">
            <Lock size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#10b981' }} />
            Security & Authentication
          </div>

          <div className="security-badges-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span className="compact-stat-badge success">
              <CheckCircle2 size={12} /> BCrypt Hashing Active
            </span>
            <span className="compact-stat-badge primary">
              <KeyRound size={12} /> JWT Auth Guard
            </span>
            <span className="compact-stat-badge warning">
              <Shield size={12} /> Rate Limiting (Flask-Limiter)
            </span>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="input-group">
              <label className="input-label">Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">New Password</label>
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                required
              />
              {newPassword && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${strength.score}%`, height: '100%', background: strength.color, transition: 'width 0.3s ease' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: strength.color, marginTop: '2px', fontWeight: 600 }}>
                    Password strength: {strength.text}
                  </div>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updatingPassword}
                id="update-password-btn"
              >
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Data & Backup */}
      {activeTab === 'data' && (
        <div className="glass-card settings-section animate-slide-up" style={{ maxWidth: 640 }}>
          <div className="settings-section-title">
            <Database size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
            Data Management & Audit Logs
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Export operational records or manage demo databases for presentation and auditing.
          </p>

          <div className="settings-row">
            <div>
              <div className="settings-label">Export Products</div>
              <div className="settings-desc">Download complete CSV file of all inventory items, stock, and values</div>
            </div>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => handleDownloadCSV('/api/products/export', 'inventory_catalog.csv')}
              id="export-products-csv-btn"
            >
              <Download size={13} /> Export Products
            </button>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Export Transactions Audit Log</div>
              <div className="settings-desc">Download full CSV transaction history for accounting and audit compliance</div>
            </div>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => handleDownloadCSV('/api/transactions/export', 'inventory_transactions.csv')}
              id="export-transactions-csv-btn"
            >
              <Download size={13} /> Export Logs
            </button>
          </div>

          <div className="settings-row" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div>
              <div className="settings-label" style={{ color: '#ef4444' }}>Reset Demo Database</div>
              <div className="settings-desc">Re-populate database with pristine products, categories, transactions, and alerts</div>
            </div>
            <button
              className="btn btn-danger btn-xs"
              onClick={() => setResetModalOpen(true)}
              id="reset-demo-btn"
            >
              <RefreshCw size={13} /> Reset Demo Data
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Architecture & Tech */}
      {activeTab === 'about' && (
        <div className="glass-card settings-section animate-slide-up" style={{ maxWidth: 640 }}>
          <div className="settings-section-title">
            <Code2 size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
            System Architecture
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Godwal &amp; Software (GS) — Enterprise Smart Inventory Platform</div>
              <div className="settings-desc">
                Enterprise AI inventory intelligence suite built with Python, Flask, scikit-learn, React 19, and PostgreSQL.
                Features proprietary demand forecasting (Random Forest), anomaly detection
                (Isolation Forest), and predictive inventory insights.
              </div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Developer</div>
              <div className="settings-desc">Devesh Jangid</div>
            </div>
          </div>
          <div className="settings-row">
            <div style={{ width: '100%' }}>
              <div className="settings-label">Tech Stack</div>
              <div className="tech-badges">
                {techStack.map((tech) => (
                  <span key={tech} className="tech-badge">{tech}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Deployment Architecture</div>
              <div className="settings-desc">
                Frontend: Vercel (React + Vite SPA)
                <br />
                Backend: Render (Flask + Gunicorn WSGI with Rate Limiting)
                <br />
                Database: Render Managed PostgreSQL
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Demo Data Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Demo Database"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setResetModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleResetData}
              disabled={resetting}
              id="confirm-reset-btn"
            >
              {resetting ? 'Resetting...' : 'Yes, Reset Data'}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            Are you sure you want to reset demo data?
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This will reset all products, transaction logs, and alerts back to their original seed state.
            This action is great for testing and demonstrating features.
          </p>
        </div>
      </Modal>
    </div>
  );
}

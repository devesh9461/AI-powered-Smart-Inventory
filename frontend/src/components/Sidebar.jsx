import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/helpers';
import {
  LayoutDashboard, Package, ArrowLeftRight, Brain,
  Bell, Settings, LogOut,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/analytics', icon: Brain, label: 'AI Analytics' },
  { to: '/alerts', icon: Bell, label: 'Alerts', badgeKey: 'alerts' },
];

const secondaryItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ alertCount = 0, isOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand-lockup">
          <div className="brand-details">
            <div className="brand-name">Godwal &amp; Softwares (GS)</div>
          </div>
        </div>
        {onClose && (
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <LogOut size={16} style={{ display: 'none' }} />
            ✕
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => onClose && onClose()}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            end={item.to === '/'}
          >
            <item.icon size={20} className="sidebar-link-icon" />
            <span>{item.label}</span>
            {item.badgeKey === 'alerts' && alertCount > 0 && (
              <span className="sidebar-link-badge">{alertCount > 9 ? '9+' : alertCount}</span>
            )}
          </NavLink>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>System</div>
        {secondaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => onClose && onClose()}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} className="sidebar-link-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: '10px', padding: '0 4px' }}>
          <ThemeToggle showLabel={true} className="sidebar-theme-toggle" />
        </div>
        <div className="sidebar-user" onClick={logout} title="Click to logout">
          <div
            className="sidebar-avatar"
            style={{ background: user?.avatar_color || '#00d4ff' }}
          >
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{user?.role || 'user'}</div>
          </div>
          <LogOut size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGreeting } from '../utils/helpers';
import { Bell, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Topbar({ alertCount = 0, onToggleSidebar, isSidebarOpen = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
          id="mobile-menu-toggle-btn"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="topbar-mobile-brand">
          <div className="topbar-brand-details">
            <span className="topbar-brand-title">Godwal &amp; Softwares (GS)</span>
          </div>
        </div>

        <div className="topbar-greeting">
          {getGreeting()}, <strong>{user?.name?.split(' ')[0] || 'User'}</strong>
        </div>
      </div>

      <div className="topbar-right">
        {/* Satisfying White Mode / Dark Mode Toggle */}
        <ThemeToggle />

        <button
          className="notification-btn"
          onClick={() => navigate('/alerts')}
          title="View Alerts"
          id="topbar-alerts-btn"
        >
          <Bell size={18} />
          {alertCount > 0 && <span className="notification-dot" />}
        </button>
      </div>
    </header>
  );
}


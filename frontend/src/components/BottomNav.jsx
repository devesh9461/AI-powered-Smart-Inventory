import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, Brain, Bell } from 'lucide-react';

export default function BottomNav({ alertCount = 0 }) {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Orders' },
    { to: '/analytics', icon: Brain, label: 'AI Intel' },
    { to: '/alerts', icon: Bell, label: 'Alerts', badge: alertCount },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon-wrapper">
            <item.icon size={20} />
            {item.badge > 0 && (
              <span className="bottom-nav-badge">{item.badge > 9 ? '9+' : item.badge}</span>
            )}
          </div>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import api from '../api/client';

export default function Layout() {
  const [alertCount, setAlertCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    api.get('/api/alerts')
      .then((res) => setAlertCount(res.data.unread_count || 0))
      .catch(() => {});
  }, []);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {/* Mobile sidebar backdrop overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        alertCount={alertCount}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <Topbar
        alertCount={alertCount}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      <main className="main-content">
        <div className="page-content animate-fade-in">
          <Outlet context={{ setAlertCount }} />
        </div>
      </main>

      <BottomNav alertCount={alertCount} />
    </div>
  );
}



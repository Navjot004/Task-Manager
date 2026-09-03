import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Search, 
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './StaffLayout.css';
import UserProfileDropdown from './UserProfileDropdown';
import NotificationDropdown from './NotificationDropdown';
import { useSettings } from '../context/SettingsContext';
import PortalBrandLogo from './PortalBrandLogo';

const StaffLayout: React.FC = () => {
  const { currentUser: user } = useAuth();
  const { systemName } = useSettings();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const navLinks = [
    { to: "/staff", icon: <LayoutDashboard size={20} />, label: "Dashboard", end: true },
    { to: "/staff/tasks", icon: <CheckSquare size={20} />, label: "My Tasks" },
  ];

  return (
    <div className="staff-layout">
      {isMobileSidebarOpen && (
        <div 
          className="staff-sidebar-overlay" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}

      {/* Desktop & Mobile Sidebar */}
      <aside className={`staff-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="staff-sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <PortalBrandLogo />
          <div>
            <div>{systemName}</div>
            <div className="staff-brand-sub">PORTAL</div>
          </div>
        </div>

        <nav className="staff-sidebar-nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `staff-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="staff-sidebar-footer">
          Institutional Access &copy; 2024
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="staff-main">
        {/* Top Navbar */}
        <header className="staff-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <button 
              className="staff-mobile-menu-btn"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="staff-search">
              <Search className="staff-search-icon" size={20} />
            </div>
          </div>

          <div className="staff-topbar-right">
            <NotificationDropdown />

            <UserProfileDropdown 
              user={user}
              roleLabel="Staff"
              avatarBg="0f172a"
              avatarColor="fff"
              profilePath="/staff/profile"
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="staff-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default StaffLayout;


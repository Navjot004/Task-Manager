import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Search, 
  Bell, 
  Shield,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './StaffLayout.css';
import UserProfileDropdown from './UserProfileDropdown';

const StaffLayout: React.FC = () => {
  const { currentUser: user } = useAuth();
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
        <div className="staff-sidebar-brand">
          <div className="staff-brand-icon">
            <Shield size={20} />
          </div>
          <div>
            <div>CT University</div>
            <div className="staff-brand-sub">TMS PORTAL</div>
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
            <div className="staff-notification">
              <Bell size={20} />
              <div className="staff-notification-badge"></div>
            </div>

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

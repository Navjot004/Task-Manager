import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Settings, 
  Search, 
  Bell, 
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './StaffLayout.css';

const StaffLayout: React.FC = () => {
  const { currentUser: user } = useAuth();

  const navLinks = [
    { to: "/staff", icon: <LayoutDashboard size={20} />, label: "Dashboard", end: true },
    { to: "/staff/tasks", icon: <CheckSquare size={20} />, label: "My Tasks" },
    { to: "/staff/settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <div className="staff-layout">
      {/* Desktop Sidebar */}
      <aside className="staff-sidebar">
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
          <div className="staff-search">
            <Search className="staff-search-icon" size={20} />
          </div>

          <div className="staff-topbar-right">
            <div className="staff-notification">
              <Bell size={20} />
              <div className="staff-notification-badge"></div>
            </div>

            <div className="staff-user-profile">
              <div className="staff-user-info">
                <div className="staff-user-name">{user?.name}</div>
                <div className="staff-user-role">Faculty Admin</div>
              </div>
              <div 
                className="staff-user-avatar"
                style={{
                  backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Staff')}&background=0f172a&color=fff)`
                }}
              ></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="staff-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="staff-mobile-nav">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `staff-mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default StaffLayout;

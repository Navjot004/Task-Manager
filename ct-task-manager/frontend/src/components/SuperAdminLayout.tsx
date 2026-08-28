import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  LayoutDashboard, 
  FileText, 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Building, 
  Settings,
  Search,
  Bell,
  Menu,
  LogOut
} from 'lucide-react';
import './SuperAdminLayout.css';

const SuperAdminLayout: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (currentUser?.role !== 'super_admin') {
    return null; 
  }

  return (
    <div className="sa-layout-container">
      {/* Sidebar (Desktop) */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-header">
          <div className="sa-sidebar-logo">
            <Building2 size={20} />
          </div>
          <span className="sa-sidebar-title">CT UNI TMS</span>
        </div>
        
        <div className="sa-sidebar-section-title">Super Admin</div>
        
        <nav className="sa-sidebar-nav">
          <NavLink to="/super-admin" end className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/super-admin/tasks" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={18} /> Tasks
          </NavLink>
          <NavLink to="/super-admin/users" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`}>
            <Users size={18} /> Users
          </NavLink>

          <NavLink to="/super-admin/verified-users" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`}>
            <ShieldCheck size={18} /> Verified Users
          </NavLink>
          <NavLink to="/super-admin/staff-manage" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`}>
            <UserPlus size={18} /> Manage Staff
          </NavLink>
          <NavLink to="/super-admin/departments" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`}>
            <Building size={18} /> Departments
          </NavLink>
          <NavLink to="/super-admin/settings" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={18} /> Settings
          </NavLink>
        </nav>

        <div className="sa-sidebar-footer">
          <button className="sa-nav-item sa-logout-btn" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="sa-main-content">
        {/* Top Navbar */}
        <header className="sa-topbar">
          <div className="sa-search-wrapper">
            <Search size={16} className="sa-search-icon" />
            <input type="text" placeholder="Search tasks, staff, or departments..." className="sa-search-input" />
          </div>
          <div className="sa-topbar-right">
            <button className="sa-notification-btn">
              <Bell size={20} />
              <span className="sa-notification-badge"></span>
            </button>
            <div className="sa-user-profile">
              <div className="sa-user-info">
                <span className="sa-user-name">{currentUser.name || 'Dr. Admin'}</span>
                <span className="sa-user-role">Super Admin</span>
              </div>
              {/* Fallback avatar if no image */}
              <div className="sa-user-avatar" style={{
                backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Admin')}&background=e2e8f0&color=0f172a)`
              }}></div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="sa-content-scroll">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sa-mobile-nav">
        <NavLink to="/super-admin" end className={({ isActive }) => `sa-mobile-nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/super-admin/tasks" className={({ isActive }) => `sa-mobile-nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={20} />
          <span>Tasks</span>
        </NavLink>
        <NavLink to="/super-admin/alerts" className={({ isActive }) => `sa-mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Bell size={20} />
          <span>Alerts</span>
        </NavLink>
        <NavLink to="/super-admin/more" className={({ isActive }) => `sa-mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Menu size={20} />
          <span>More</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default SuperAdminLayout;

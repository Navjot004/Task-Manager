import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  LayoutDashboard, 
  FileText, 
  Users, 
  UserPlus, 
  Building, 
  BarChart2,
  Search,
  Menu,
  LogOut
} from 'lucide-react';
import './SuperAdminLayout.css';
import UserProfileDropdown from './UserProfileDropdown';
import NotificationDropdown from './NotificationDropdown';

const SuperAdminLayout: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (currentUser?.role !== 'super_admin') {
    return null; 
  }

  return (
    <div className="sa-layout-container">
      {isMobileSidebarOpen && (
        <div 
          className="sa-sidebar-overlay" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`sa-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sa-sidebar-header">
          <div className="sa-sidebar-logo">
            <Building2 size={20} />
          </div>
          <span className="sa-sidebar-title">CT UNI TMS</span>
        </div>
        
        <div className="sa-sidebar-section-title">Super Admin</div>
        
        <nav className="sa-sidebar-nav">
          <NavLink to="/super-admin" end className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/super-admin/tasks" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <FileText size={18} /> Tasks
          </NavLink>
          <NavLink to="/super-admin/users" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <Users size={18} /> Users
          </NavLink>
          <NavLink to="/super-admin/staff-manage" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <UserPlus size={18} /> Manage Staff
          </NavLink>
          <NavLink to="/super-admin/departments" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <Building size={18} /> Departments
          </NavLink>
          <NavLink to="/super-admin/naac" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <BarChart2 size={18} /> NAAC Dashboard
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
          <div className="sa-topbar-left">
            <button 
              className="sa-mobile-menu-btn" 
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="sa-search-wrapper">
              <Search size={16} className="sa-search-icon" />
              <input type="text" placeholder="Search tasks, staff, or departments..." className="sa-search-input" />
            </div>
          </div>
          <div className="sa-topbar-right">
            <NotificationDropdown />
            <UserProfileDropdown 
              user={currentUser}
              roleLabel="Super Admin"
              avatarBg="e2e8f0"
              avatarColor="0f172a"
              profilePath="/super-admin/profile"
            />
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="sa-content-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;


import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  UserPlus, 
  UserCheck, 
  Building, 
  BarChart2,
  Search,
  Menu
} from 'lucide-react';
import './SuperAdminLayout.css';
import UserProfileDropdown from './UserProfileDropdown';
import NotificationDropdown from './NotificationDropdown';
import { useSettings } from '../context/SettingsContext';
import PortalBrandLogo from './PortalBrandLogo';

const SuperAdminLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { systemName } = useSettings();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (currentUser?.role !== 'super_admin') {
    return null; 
  }

  return (
    <div className="sa-layout-container">
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="sa-sidebar-backdrop" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`sa-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sa-sidebar-header">
          <PortalBrandLogo />
          <span className="sa-sidebar-title">{systemName}</span>
        </div>
        
        <div className="sa-sidebar-section-title">Super Admin</div>
        
        <nav className="sa-sidebar-nav">
          <NavLink to="/super-admin" end className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/super-admin/tasks" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <FileText size={18} /> Tasks
          </NavLink>
          <NavLink to="/super-admin/team" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <Users size={18} /> Manage Team
          </NavLink>
          <NavLink to="/super-admin/users" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <UserCheck size={18} /> Users
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


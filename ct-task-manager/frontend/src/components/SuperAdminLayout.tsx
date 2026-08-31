import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Building2, 
  LayoutDashboard, 
  FileText, 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Building, 
  Settings,
  BarChart2,
  Search,
  Bell,
  Menu,
  LogOut,
  X
} from 'lucide-react';
import './SuperAdminLayout.css';

const SuperAdminLayout: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        // Simple logic for Super Admin: show dot if there are tasks awaiting review
        const res = await api.getTasks({ limit: 1, status: 'submitted_for_review' });
        if (res.data && res.data.pagination.total > 0) {
          setHasNotifications(true);
        } else {
          setHasNotifications(false);
        }
      } catch (error) {
        console.error("Error fetching notifications", error);
      }
    };

    if (currentUser?.role === 'super_admin') {
      checkNotifications();
      // Optional: Poll every 60 seconds
      const intervalId = setInterval(checkNotifications, 60000);
      return () => clearInterval(intervalId);
    }
  }, [currentUser]);

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

          <NavLink to="/super-admin/verified-users" className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}>
            <ShieldCheck size={18} /> Verified Users
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
            <button className="sa-notification-btn" onClick={() => navigate('/super-admin/tasks')}>
              <Bell size={20} />
              {hasNotifications && <span className="sa-notification-badge"></span>}
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
    </div>
  );
};

export default SuperAdminLayout;

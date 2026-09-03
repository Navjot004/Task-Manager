import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Search, 
  LogOut, 
  Menu, 
  ShieldHalf,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './DeptAdminLayout.css';
import UserProfileDropdown from './UserProfileDropdown';
import NotificationDropdown from './NotificationDropdown';

const DeptAdminLayout: React.FC = () => {
  const { currentUser: user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canAccessVerified, setCanAccessVerified] = useState(false);

  useEffect(() => {
    api.getMyDepartmentPermissions()
      .then(res => {
        if (res.success && res.data.verifiedUserAccess && res.data.verifiedUserAccess !== 'none') {
          setCanAccessVerified(true);
        }
      })
      .catch(err => console.error('Failed to fetch dept permissions', err));
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: "/admin", icon: <LayoutDashboard size={20} />, label: "Dashboard", end: true },
    { to: "/admin/tasks", icon: <CheckSquare size={20} />, label: "Team Tasks" },
    { to: "/admin/staff", icon: <Users size={20} />, label: "Manage Team" },
    ...(canAccessVerified ? [{ to: "/admin/verified-users", icon: <ShieldCheck size={20} />, label: "Verified Users" }] : []),
  ];

  return (
    <div className="dept-admin-layout">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="dept-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dept-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="dept-sidebar-header">
          <div className="dept-sidebar-brand">
            <div className="dept-brand-icon">
              <ShieldHalf size={20} />
            </div>
            CT UNI DEPT
          </div>
        </div>

        <div className="dept-sidebar-content">
          <div className="dept-sidebar-title">Department Admin</div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `dept-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                {link.icon}
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="dept-sidebar-footer">
          <button 
            className="dept-nav-item logout" 
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dept-main">
        {/* Top Navbar */}
        <header className="dept-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            
            <div className="dept-search">
              <Search className="dept-search-icon" size={18} />
              <input type="text" placeholder="Search department tasks or staff..." />
            </div>
          </div>

          <div className="dept-topbar-right">
            <NotificationDropdown />

            <UserProfileDropdown 
              user={user}
              roleLabel="Department Admin"
              avatarBg="1e3a8a"
              avatarColor="fff"
              profilePath="/admin/profile"
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="dept-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DeptAdminLayout;


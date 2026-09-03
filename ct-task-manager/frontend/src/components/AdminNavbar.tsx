import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminNavbar.css';

const AdminNavbar: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (currentUser?.role !== 'super_admin') {
    return null; // For now, only Super Admin uses this specific layout pattern
  }

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <strong>CTU</strong> Super Admin
      </div>
      <div className="admin-navbar-links">
        <NavLink 
          to="/super-admin" 
          end 
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/super-admin/users" 
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Users
        </NavLink>
        <NavLink 
          to="/super-admin/staff-assignments" 
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Staff Assignments
        </NavLink>
        <NavLink 
          to="/super-admin/tasks" 
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Tasks
        </NavLink>
      </div>
      <div className="admin-navbar-actions">
        <span className="admin-user-name">{currentUser.name}</span>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default AdminNavbar;

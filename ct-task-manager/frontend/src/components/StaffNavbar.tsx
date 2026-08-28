import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminNavbar.css';

const StaffNavbar: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (currentUser?.role !== 'staff') {
    return null;
  }

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <strong>CTU</strong> Staff
      </div>
      <div className="admin-navbar-links">
        <NavLink 
          to="/staff" 
          end 
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/staff/tasks" 
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          My Tasks
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

export default StaffNavbar;

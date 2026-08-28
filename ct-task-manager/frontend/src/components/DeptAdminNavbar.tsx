import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminNavbar.css'; // We can reuse the CSS from AdminNavbar

const DeptAdminNavbar: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (currentUser?.role !== 'department_admin') {
    return null;
  }

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <strong>CTU</strong> Department Admin
      </div>
      <div className="admin-navbar-links">
        <NavLink 
          to="/admin" 
          end 
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/admin/staff" 
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          My Staff
        </NavLink>
        <NavLink 
          to="/admin/tasks" 
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

export default DeptAdminNavbar;

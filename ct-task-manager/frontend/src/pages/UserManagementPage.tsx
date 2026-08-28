import React, { useState, useEffect, useRef } from 'react';
import { api, User } from '../services/api';
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Mail, 
  Phone, 
  Building, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import './UserManagementPage.css';

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  
  // Status confirm State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState<boolean>(true); // true = activate

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers({
        page,
        limit: 10,
        search,
        role: roleFilter,
        status: statusFilter,
      });
      if (res.success) {
        setUsers(res.data.users);
        setTotalPages(res.data.pagination.totalPages);
        setTotalUsers(res.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [page, roleFilter, statusFilter, search]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRoleChangeSubmit = async () => {
    if (!selectedUser) return;
    try {
      await api.updateUserRole(selectedUser.id, newRole);
      setShowRoleModal(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChangeSubmit = async () => {
    if (!selectedUser) return;
    try {
      await api.updateUserStatus(selectedUser.id, statusAction);
      setShowStatusModal(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'super_admin') return <ShieldAlert size={14} />;
    if (role === 'department_admin') return <ShieldCheck size={14} />;
    return <UserIcon size={14} />;
  };

  const formatRoleText = (role: string) => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'department_admin') return 'Dept Admin';
    return 'Staff';
  };

  const toggleDropdown = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeDropdown === userId) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(userId);
    }
  };

  return (
    <div className="um-container">
      <div className="um-header">
        <h1 className="um-title">User Management</h1>
        <p className="um-subtitle">Manage system access, roles, and status for all university personnel.</p>
      </div>

      <div className="um-filters">
        <div className="um-filters-left">
          <div className="um-search-wrapper">
            <Search className="um-search-icon" size={18} />
            <input
              type="text"
              className="um-search-input"
              placeholder="Search users by ID, Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select
            className="um-role-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="department_admin">Department Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        
        <button className="btn-add-user" onClick={() => alert('Add User functionality coming soon!')}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="um-table-container">
        <table className="um-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name & Email</th>
              <th>Phone</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-4" style={{ padding: '2rem', color: '#6b7280' }}>Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4" style={{ padding: '2rem', color: '#6b7280' }}>No users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td><span className="user-id">{user.universityId}</span></td>
                  <td>
                    <div className="user-info-cell">
                      <div className="user-avatar" style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e2e8f0&color=1e293b)` }}></div>
                      <div>
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="user-phone">{user.phone ? user.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : '-'}</div>
                  </td>
                  <td>
                    <div className="user-dept">{user.department || '-'}</div>
                  </td>
                  <td>
                    <span className={`badge-role badge-role-${user.role}`}>
                      {getRoleIcon(user.role)} {formatRoleText(user.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-status ${user.isActive ? 'active' : 'inactive'}`}>
                      <span className="status-dot"></span>
                      {user.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={(e) => toggleDropdown(user.id, e)}>
                      <MoreVertical size={18} />
                    </button>
                    {activeDropdown === user.id && (
                      <div className="action-dropdown" ref={dropdownRef}>
                        <button className="dropdown-item" onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                          setShowRoleModal(true);
                          setActiveDropdown(null);
                        }}>
                          Change Role
                        </button>
                        <button className={`dropdown-item ${user.isActive ? 'danger' : ''}`} onClick={() => {
                          setSelectedUser(user);
                          setStatusAction(!user.isActive);
                          setShowStatusModal(true);
                          setActiveDropdown(null);
                        }}>
                          {user.isActive ? 'Deactivate User' : 'Activate User'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="um-pagination-footer">
          <div className="um-pagination-text">
            Showing {users.length > 0 ? (page - 1) * 10 + 1 : 0}-{Math.min(page * 10, totalUsers)} of {totalUsers} users
          </div>
          <div className="um-pagination-controls">
            <button className="btn-paginate" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn-paginate" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="um-mobile-cards">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No users found.</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className={`um-mobile-card ${user.isActive ? 'status-active' : 'status-inactive'}`}>
              <div className="um-card-header">
                <div className="user-info-cell">
                  <div className="user-avatar" style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e2e8f0&color=1e293b)` }}></div>
                  <div>
                    <div className="user-name">{user.name}</div>
                    <div className="user-dept" style={{ fontSize: '0.8rem' }}>{formatRoleText(user.role)}, {user.department || 'N/A'}</div>
                  </div>
                </div>
                <span className={`um-card-status ${user.isActive ? 'active' : 'inactive'}`}>
                  {user.isActive ? 'Active' : 'Deactivated'}
                </span>
              </div>
              
              <div className="um-card-info-row">
                <ShieldAlert size={14} className="um-card-info-icon" />
                <span>{user.universityId}</span>
              </div>
              
              <div className="um-card-info-row">
                <Mail size={14} className="um-card-info-icon" />
                <span>{user.email}</span>
              </div>

              <div className="actions-cell" style={{ position: 'relative' }}>
                <button className="um-card-actions-btn" onClick={(e) => toggleDropdown(`mobile-${user.id}`, e)}>
                  Options <MoreVertical size={16} />
                </button>
                {activeDropdown === `mobile-${user.id}` && (
                  <div className="action-dropdown" ref={dropdownRef} style={{ top: '100%', right: '0', width: '100%' }}>
                    <button className="dropdown-item" onClick={() => {
                      setSelectedUser(user);
                      setNewRole(user.role);
                      setShowRoleModal(true);
                      setActiveDropdown(null);
                    }}>
                      Change Role
                    </button>
                    <button className={`dropdown-item ${user.isActive ? 'danger' : ''}`} onClick={() => {
                      setSelectedUser(user);
                      setStatusAction(!user.isActive);
                      setShowStatusModal(true);
                      setActiveDropdown(null);
                    }}>
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="um-pagination-controls" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn-paginate" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={16} /> Prev
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
              {page} / {totalPages}
            </span>
            <button className="btn-paginate" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem' }}>Change Role</h3>
            <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>
              Change <strong>{selectedUser.name}</strong>'s role from {formatRoleText(selectedUser.role)}?
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Select New Role</label>
              <select
                className="um-role-select"
                style={{ width: '100%' }}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="staff">Staff</option>
                <option value="department_admin">Department Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button className="btn-paginate" onClick={() => setShowRoleModal(false)}>
                Cancel
              </button>
              <button className="btn-add-user" onClick={handleRoleChangeSubmit} disabled={newRole === selectedUser.role}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem' }}>{statusAction ? 'Activate' : 'Deactivate'} User?</h3>
            <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>
              Are you sure you want to {statusAction ? 'activate' : 'deactivate'} <strong>{selectedUser.name}</strong>?
            </p>
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button className="btn-paginate" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-add-user" 
                style={{ backgroundColor: statusAction ? '#10b981' : '#ef4444' }} 
                onClick={handleStatusChangeSubmit}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;

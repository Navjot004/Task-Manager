import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  api, 
  VerifiedUser, 
  Pagination, 
  ImportResult, 
  VerifiedUserStats, 
  Department 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  X, 
  UploadCloud, 
  AlertCircle,
  Check
} from 'lucide-react';
import './VerifiedUsersPage.css';

const VerifiedUsersPage = () => {
  const { currentUser } = useAuth();
  const isDeptAdmin = currentUser?.role === 'department_admin';

  // ─── Department Admin Permissions ───────────────────
  const [deptPermissions, setDeptPermissions] = useState<{
    department: string | null;
    verifiedUserAccess: 'none' | 'staff' | 'student' | 'both';
    canAddVerifiedUsers: boolean;
    canUploadVerifiedUsers: boolean;
  } | null>(null);

  // ─── Data State ─────────────────────────────────────
  const [users, setUsers] = useState<VerifiedUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<VerifiedUserStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  // ─── Upload State ───────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Inline Add State ───────────────────────────────
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [inlineForm, setInlineForm] = useState({
    universityId: '',
    name: '',
    email: '',
    phone: '',
    department: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const idInputRef = useRef<HTMLInputElement>(null);

  // Debounce timer for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch Department Permissions (For Dept Admin) ──
  useEffect(() => {
    if (isDeptAdmin) {
      api.getMyDepartmentPermissions()
        .then(res => {
          if (res.success) {
            setDeptPermissions(res.data);
          }
        })
        .catch(err => console.error('Failed to fetch dept permissions', err));
    } else if (currentUser?.role === 'super_admin') {
      api.getDepartments()
        .then(res => {
          if (res.success) setDepartments(res.data.departments || []);
        })
        .catch(err => console.error('Failed to load departments', err));
    }
  }, [isDeptAdmin, currentUser]);

  // ─── Fetch Users ────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const deptParam = isDeptAdmin
        ? currentUser?.department || undefined
        : (departmentFilter !== 'All' ? departmentFilter : undefined);

      const result = await api.getVerifiedUsers({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        department: deptParam,
      });
      setUsers(result.data.users);
      setPagination(result.data.pagination);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, departmentFilter, isDeptAdmin, currentUser]);

  // ─── Fetch Stats ────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const result = await api.getVerifiedUserStats();
      setStats(result.data);
    } catch {
      console.error('Failed to fetch stats');
    }
  }, []);

  useEffect(() => {
    fetchUsers(1);
    fetchStats();
  }, [fetchUsers, fetchStats]);

  // ─── Debounced Search ───────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      // triggers fetchUsers via useEffect dependency
    }, 300);
  };

  // ─── File Selection & Upload ────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
      setUploadError('');
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImportResult(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError('');
    setImportResult(null);

    try {
      const result = await api.importVerifiedUsers(selectedFile);
      setImportResult(result.data);
      fetchUsers(1);
      fetchStats();
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ─── Toggle Inline Add Row ──────────────────────────
  const handleToggleInlineAdd = () => {
    if (isInlineAdding) {
      setIsInlineAdding(false);
      setInlineError('');
      return;
    }
    const defaultDept = isDeptAdmin 
      ? (currentUser?.department || '') 
      : (departments[0]?.name || '');

    setInlineForm({
      universityId: '',
      name: '',
      email: '',
      phone: '',
      department: defaultDept,
    });
    setInlineError('');
    setIsInlineAdding(true);
    setTimeout(() => {
      idInputRef.current?.focus();
    }, 50);
  };

  const handleCancelInline = () => {
    setIsInlineAdding(false);
    setInlineError('');
    setInlineForm({
      universityId: '',
      name: '',
      email: '',
      phone: '',
      department: '',
    });
  };

  // ─── Handle Inline Submit ───────────────────────────
  const handleInlineSubmit = async () => {
    if (!inlineForm.universityId.trim() || !inlineForm.name.trim() || !inlineForm.email.trim() || !inlineForm.phone.trim()) {
      setInlineError('All fields (University ID, Name, Email, Phone, Department) are required.');
      return;
    }

    if (!/^\d{5}$/.test(inlineForm.universityId.trim())) {
      setInlineError('University ID must be exactly 5 digits.');
      return;
    }

    if (!/^\d{10}$/.test(inlineForm.phone.trim())) {
      setInlineError('Phone number must be exactly 10 digits.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inlineForm.email.trim())) {
      setInlineError('Please enter a valid email address.');
      return;
    }

    const dept = isDeptAdmin ? currentUser?.department : (inlineForm.department || departments[0]?.name);
    if (!dept) {
      setInlineError('Please select a valid department.');
      return;
    }

    try {
      setIsAdding(true);
      setInlineError('');
      await api.createVerifiedUser({
        universityId: inlineForm.universityId.trim(),
        name: inlineForm.name.trim(),
        email: inlineForm.email.trim(),
        phone: inlineForm.phone.trim(),
        userType: 'staff',
        department: dept,
      });

      setIsInlineAdding(false);
      setInlineForm({
        universityId: '',
        name: '',
        email: '',
        phone: '',
        department: '',
      });
      fetchUsers(1);
      fetchStats();
    } catch (err: any) {
      setInlineError(err.message || 'Failed to add verified staff member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInlineSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelInline();
    }
  };

  // ─── Delete Single Verified User ────────────────────
  const handleDeleteUser = async (id: string, name: string, isRegistered?: boolean) => {
    const confirmMsg = isRegistered
      ? `User "${name}" has already registered an account. Are you sure you want to remove them from verified users?`
      : `Are you sure you want to delete verified user "${name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteVerifiedUser(id);
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  // ─── Pagination ─────────────────────────────────────
  const goToPage = (p: number) => {
    if (p < 1 || p > pagination.totalPages) return;
    fetchUsers(p);
  };

  // Access checks for Department Admin
  const canAdd = isDeptAdmin ? (deptPermissions?.canAddVerifiedUsers ?? false) : true;
  const canUpload = isDeptAdmin ? (deptPermissions?.canUploadVerifiedUsers ?? false) : true;

  return (
    <div className="vu-page">
      {/* Header */}
      <div className="vu-header">
        <div>
          <h1 className="vu-title">
            Verified Users {isDeptAdmin && currentUser?.department ? `• ${currentUser.department}` : ''}
          </h1>
          <p className="vu-description">
            {isDeptAdmin 
              ? `Manage authorized staff for ${currentUser?.department || 'your department'}.`
              : 'Manage university staff members authorized to register accounts.'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="vu-stats-row">
          <div className="vu-stat-card">
            <div className="vu-stat-value">{stats.total}</div>
            <div className="vu-stat-label">Total Staff</div>
          </div>
          <div className="vu-stat-card">
            <div className="vu-stat-value">{stats.registered}</div>
            <div className="vu-stat-label">Registered Accounts</div>
          </div>
          <div className="vu-stat-card">
            <div className="vu-stat-value">{Math.max(0, stats.total - stats.registered)}</div>
            <div className="vu-stat-label">Pending Registration</div>
          </div>
        </div>
      )}

      {/* Excel / CSV Upload Section */}
      {canUpload && (
        <div className="vu-card">
          <h2 className="vu-card-title">
            <UploadCloud size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Bulk Import Staff (Excel / CSV)
          </h2>
          <p className="vu-card-description">
            Upload an Excel (.xlsx) or CSV file containing verified staff records (columns: ID, Name, Email, Phone No, Department).
          </p>

          <div className="vu-upload-area">
            <div className="vu-upload-actions">
              <label className="btn btn-primary vu-file-label" style={{ cursor: 'pointer' }}>
                Select File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
              <a href={api.downloadTemplate()} className="btn btn-secondary" download>
                Download Sample Template
              </a>
            </div>

            {selectedFile && (
              <div className="vu-selected-file">
                <div className="vu-file-info">
                  <span className="vu-file-icon">📄</span>
                  <div>
                    <div className="vu-file-name">{selectedFile.name}</div>
                    <div className="vu-file-size">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <div className="vu-file-actions">
                  <button className="btn btn-secondary btn-sm" onClick={clearFile} disabled={uploading}>
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload & Import'}
                  </button>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="vu-alert vu-alert-error">
                <strong>Error:</strong> {uploadError}
              </div>
            )}

            {importResult && (
              <div className="vu-alert vu-alert-success">
                <strong>Import completed successfully.</strong>
                <div className="vu-import-summary">
                  <span>{importResult.totalRows} rows processed</span>
                  <span>{importResult.inserted} new staff added</span>
                  <span>{importResult.updated} updated</span>
                  <span>{importResult.skipped} skipped</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="vu-import-errors">
                    <strong>Row Errors:</strong>
                    <ul>
                      {importResult.errors.map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Table Section */}
      <div className="vu-card">
        <div className="vu-table-header">
          <h2 className="vu-card-title">Verified Users Directory</h2>
          <div className="vu-table-controls">
            <input
              type="text"
              className="vu-search-input"
              placeholder="Search by name, email, ID..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />

            {!isDeptAdmin && departments.length > 0 && (
              <select
                className="vu-filter-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d._id} value={d.name}>{d.name}</option>
                ))}
              </select>
            )}

            <select
              className="vu-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="registered">Registered</option>
              <option value="not-registered">Not Registered</option>
            </select>

            {canAdd && (
              <button
                type="button"
                className="btn btn-primary vu-add-user-btn"
                onClick={handleToggleInlineAdd}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                title="Add staff member directly in the table"
              >
                <Plus size={16} /> Add User
              </button>
            )}
          </div>
        </div>

        {inlineError && (
          <div className="vu-inline-error-banner">
            <AlertCircle size={16} />
            <span>{inlineError}</span>
            <button 
              className="vu-inline-error-close" 
              onClick={() => setInlineError('')}
              type="button"
              title="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="vu-loading">Loading users...</div>
        ) : users.length === 0 && !isInlineAdding ? (
          <div className="vu-empty">
            No verified staff users found. {canAdd ? 'Click "+ Add User" above to add one directly.' : ''}
          </div>
        ) : (
          <>
            <div className="vu-table-wrapper">
              <table className="vu-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>University ID</th>
                    <th style={{ minWidth: '160px' }}>Name</th>
                    <th style={{ minWidth: '200px' }}>Email</th>
                    <th style={{ width: '140px' }}>Phone</th>
                    <th style={{ minWidth: '150px' }}>Department</th>
                    <th style={{ width: '130px' }}>Status</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Inline Add Row */}
                  {isInlineAdding && (
                    <tr className="vu-inline-add-row">
                      <td>
                        <input
                          ref={idInputRef}
                          type="text"
                          className="vu-inline-input"
                          placeholder="5-digit ID"
                          maxLength={5}
                          value={inlineForm.universityId}
                          onChange={(e) => setInlineForm(prev => ({ ...prev, universityId: e.target.value.replace(/\D/g, '') }))}
                          onKeyDown={handleInlineKeyDown}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="vu-inline-input"
                          placeholder="Full Name"
                          value={inlineForm.name}
                          onChange={(e) => setInlineForm(prev => ({ ...prev, name: e.target.value }))}
                          onKeyDown={handleInlineKeyDown}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          className="vu-inline-input"
                          placeholder="user@ctuniversity.in"
                          value={inlineForm.email}
                          onChange={(e) => setInlineForm(prev => ({ ...prev, email: e.target.value }))}
                          onKeyDown={handleInlineKeyDown}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="vu-inline-input"
                          placeholder="10-digit Phone"
                          maxLength={10}
                          value={inlineForm.phone}
                          onChange={(e) => setInlineForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                          onKeyDown={handleInlineKeyDown}
                        />
                      </td>
                      <td>
                        {isDeptAdmin ? (
                          <span className="vu-inline-dept-badge">{currentUser?.department || '—'}</span>
                        ) : (
                          <select
                            className="vu-inline-select"
                            value={inlineForm.department}
                            onChange={(e) => setInlineForm(prev => ({ ...prev, department: e.target.value }))}
                            onKeyDown={handleInlineKeyDown}
                          >
                            <option value="">Select Dept</option>
                            {departments.map((d) => (
                              <option key={d._id} value={d.name}>{d.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span className="vu-status-badge vu-status-new">New</span>
                      </td>
                      <td>
                        <div className="vu-inline-actions">
                          <button
                            type="button"
                            className="vu-inline-save-btn"
                            onClick={handleInlineSubmit}
                            disabled={isAdding}
                            title="Save User (Enter)"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            className="vu-inline-cancel-btn"
                            onClick={handleCancelInline}
                            disabled={isAdding}
                            title="Cancel / Remove Row (Esc)"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Existing Users Rows */}
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="vu-id-cell">{user.universityId}</td>
                      <td style={{ fontWeight: 600 }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{user.department || '—'}</td>
                      <td>
                        <span
                          className={`vu-status-badge ${
                            user.isRegistered ? 'vu-status-registered' : 'vu-status-not-registered'
                          }`}
                        >
                          {user.isRegistered ? 'Registered' : 'Not Registered'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="vu-delete-btn"
                          onClick={() => handleDeleteUser(user._id, user.name, user.isRegistered)}
                          title="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="vu-pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  ← Previous
                </button>
                <span className="vu-pagination-info">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VerifiedUsersPage;

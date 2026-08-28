import { useState, useEffect, useCallback, useRef } from 'react';
import { api, VerifiedUser, Pagination, ImportResult, VerifiedUserStats } from '../services/api';

const VerifiedUsersPage = () => {
  // ─── State ──────────────────────────────────────────
  const [users, setUsers] = useState<VerifiedUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<VerifiedUserStats | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce timer
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch Users ────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await api.getVerifiedUsers({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setUsers(result.data.users);
      setPagination(result.data.pagination);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

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
      // fetchUsers will be triggered by the useEffect dependency on `search`
    }, 300);
  };

  // ─── File Selection ─────────────────────────────────
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

  // ─── Upload ─────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError('');
    setImportResult(null);

    try {
      const result = await api.importVerifiedUsers(selectedFile);
      setImportResult(result.data);
      // Refresh the table and stats
      fetchUsers(1);
      fetchStats();
      // Clear file input
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ─── Pagination ─────────────────────────────────────
  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchUsers(page);
  };

  // ─── Render ─────────────────────────────────────────
  return (
    <div className="vu-page">
      {/* Header */}
      <div className="vu-header">
        <div>
          <h1 className="vu-title">Verified Users</h1>
          <p className="vu-description">
            Manage the list of university users who are authorized to create an account.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="vu-stats-row">
          <div className="vu-stat-card">
            <div className="vu-stat-value">{stats.total}</div>
            <div className="vu-stat-label">Total Users</div>
          </div>
          <div className="vu-stat-card">
            <div className="vu-stat-value">{stats.registered}</div>
            <div className="vu-stat-label">Registered</div>
          </div>
          <div className="vu-stat-card">
            <div className="vu-stat-value">{stats.notRegistered}</div>
            <div className="vu-stat-label">Not Registered</div>
          </div>
          <div className="vu-stat-card">
            <div className="vu-stat-value">{stats.departments}</div>
            <div className="vu-stat-label">Departments</div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="vu-card">
        <h2 className="vu-card-title">Import Verified Users</h2>
        <p className="vu-card-description">
          Upload an Excel (.xlsx) or CSV file containing the verified user list.
        </p>

        <div className="vu-upload-area">
          <div className="vu-upload-actions">
            <label className="btn btn-primary vu-file-label">
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
              Download Template
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
                  {uploading ? 'Uploading...' : 'Upload'}
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
                <span>{importResult.inserted} new users</span>
                <span>{importResult.updated} updated</span>
                <span>{importResult.skipped} skipped</span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="vu-import-errors">
                  <strong>Errors:</strong>
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

      {/* Table Section */}
      <div className="vu-card">
        <div className="vu-table-header">
          <h2 className="vu-card-title">User List</h2>
          <div className="vu-table-controls">
            <input
              type="text"
              className="vu-search-input"
              placeholder="Search by name, email, ID..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <select
              className="vu-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="registered">Registered</option>
              <option value="not-registered">Not Registered</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="vu-loading">Loading...</div>
        ) : users.length === 0 ? (
          <div className="vu-empty">
            No verified users found. Upload a file to get started.
          </div>
        ) : (
          <>
            <div className="vu-table-wrapper">
              <table className="vu-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="vu-id-cell">{user.universityId}</td>
                      <td>{user.name}</td>
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

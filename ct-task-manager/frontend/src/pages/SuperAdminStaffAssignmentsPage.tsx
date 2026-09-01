import React, { useState, useEffect } from 'react';
import { api, User, Department } from '../services/api';
import './SuperAdminStaffAssignmentsPage.css';
import { Building, ShieldCheck, Mail, Phone } from 'lucide-react';

const SuperAdminStaffAssignmentsPage: React.FC = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch logic
  const fetchStaff = async () => {
    try {
      setLoading(true);
      // Fetch active staff and department admins
      const staffRes = await api.getUsers({ role: 'staff,department_admin', status: 'Active', limit: 1000 });
      if (staffRes.success) {
        setStaff(staffRes.data.users);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    const fetchDepartments = async () => {
      try {
        const res = await api.getDepartments();
        if (res.success) {
          setDepartments(res.data.departments);
        }
      } catch (err) {
        console.error('Failed to load departments');
      }
    };
    fetchDepartments();
  }, []);

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !departmentName.trim()) return;

    try {
      setIsSubmitting(true);
      await api.updateUserRole(selectedStaff.id, 'department_admin', departmentName.trim());
      setShowPromoteModal(false);
      setDepartmentName('');
      setSelectedStaff(null);
      fetchStaff(); // refresh data
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemote = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove Department Admin privileges from ${name}?`)) return;

    try {
      setLoading(true);
      await api.updateUserRole(id, 'staff', '');
      fetchStaff();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sa-assignments-container">
        <div className="saa-header">
          <div>
            <h1 className="saa-title">Manage Staff</h1>
            <p className="saa-subtitle">View active staff members and promote them to Department Admins.</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="saa-layout" style={{ display: 'block' }}>
          <div className="saa-section">
            <div className="saa-card-list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {loading ? (
                <p>Loading staff...</p>
              ) : staff.length === 0 ? (
                <p className="text-muted">No active staff members found.</p>
              ) : (
                staff.map((st) => (
                  <div key={st.id} className="saa-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="saa-card-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="user-avatar" style={{ 
                          width: '40px', 
                          height: '40px',
                          borderRadius: '50%',
                          backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(st.name)}&background=e2e8f0&color=1e293b)`,
                          backgroundSize: 'cover'
                        }}></div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ display: 'block', fontSize: '1rem' }}>{st.name}</strong>
                            {st.role === 'department_admin' && (
                              <span style={{ backgroundColor: '#fef08a', color: '#854d0e', fontSize: '0.7rem', padding: '0.125rem 0.4rem', borderRadius: '9999px', fontWeight: 600 }}>Admin</span>
                            )}
                          </div>
                          <span className="badge badge-secondary" style={{ marginTop: '0.25rem', display: 'inline-block' }}>{st.universityId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="saa-card-body" style={{ flexGrow: 1, paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4b5563', fontSize: '0.875rem' }}>
                        <Mail size={14} /> {st.email}
                      </div>
                      {st.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4b5563', fontSize: '0.875rem' }}>
                          <Phone size={14} /> {st.phone}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563', fontSize: '0.875rem' }}>
                        <Building size={14} /> {st.department || 'No Department Assigned'}
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      {st.role === 'department_admin' ? (
                        <button 
                          className="btn" 
                          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }}
                          onClick={() => handleDemote(st.id, st.name)}
                        >
                          <ShieldCheck size={16} /> Remove Dept Admin
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                          onClick={() => {
                            setSelectedStaff(st);
                            setShowPromoteModal(true);
                          }}
                        >
                          <ShieldCheck size={16} /> Promote to Dept Admin
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Promote Staff Modal */}
      {showPromoteModal && selectedStaff && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Promote to Admin</h3>
            <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              You are promoting <strong>{selectedStaff.name}</strong> to a Department Admin role. Please specify which department they will manage.
            </p>
            <form onSubmit={handlePromoteSubmit}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                  Department Name
                </label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', outline: 'none' }}
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  required
                >
                  <option value="">Select a Department...</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowPromoteModal(false);
                    setDepartmentName('');
                  }}
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!departmentName.trim() || isSubmitting}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 600 }}
                >
                  {isSubmitting ? 'Promoting...' : 'Confirm Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SuperAdminStaffAssignmentsPage;

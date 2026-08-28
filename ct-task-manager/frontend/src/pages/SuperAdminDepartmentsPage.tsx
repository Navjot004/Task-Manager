import React, { useState, useEffect } from 'react';
import { api, Department } from '../services/api';
import './SuperAdminDepartmentsPage.css';
import { Building, Trash2, Plus } from 'lucide-react';

const SuperAdminDepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.getDepartments();
      if (res.success) {
        setDepartments(res.data.departments);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      setIsSubmitting(true);
      await api.createDepartment(newDeptName.trim());
      setShowAddModal(false);
      setNewDeptName('');
      fetchDepartments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the department "${name}"?`)) return;

    try {
      await api.deleteDepartment(id);
      fetchDepartments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="dept-container">
        <div className="dept-header">
          <div>
            <h1 className="dept-title">Departments</h1>
            <p className="dept-subtitle">Manage university departments available for registration and staff assignments.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Department
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="dept-grid">
          {loading ? (
            <p>Loading departments...</p>
          ) : departments.length === 0 ? (
            <p className="text-muted" style={{ gridColumn: '1 / -1' }}>No departments found. Add one to get started.</p>
          ) : (
            departments.map((dept) => (
              <div key={dept._id} className="dept-card">
                <div className="dept-card-content">
                  <div className="dept-icon-wrapper">
                    <Building size={24} className="dept-icon" />
                  </div>
                  <h3 className="dept-card-title">{dept.name}</h3>
                </div>
                <div className="dept-card-actions">
                  <button 
                    className="dept-delete-btn"
                    onClick={() => handleDelete(dept._id, dept.name)}
                    title="Delete Department"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Add Department</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                  Department Name
                </label>
                <input 
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                  placeholder="e.g., Computer Science"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddModal(false);
                    setNewDeptName('');
                  }}
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!newDeptName.trim() || isSubmitting}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 600 }}
                >
                  {isSubmitting ? 'Adding...' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SuperAdminDepartmentsPage;

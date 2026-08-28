import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { calculateUrgency, getUrgencyBadgeClass } from '../utils/taskUrgency';

interface TaskModalProps {
  task: any | null;
  onClose: () => void;
  onRefresh: () => void;
  currentUser: any;
  availableAssignees: any[];
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onRefresh, currentUser, availableAssignees }) => {
  if (!task) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subtasks, setSubtasks] = useState<any[]>([]);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description,
    deadline: new Date(task.deadline).toISOString().slice(0, 16)
  });

  // Assign mode
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignTarget, setAssignTarget] = useState(task.assignedTo ? task.assignedTo._id : '');

  // Review mode
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Reset local state when task changes
  useEffect(() => {
    setIsEditing(false);
    setIsAssigning(false);
    setIsRejecting(false);
    setRejectionReason('');
    setEditData({
      title: task.title,
      description: task.description,
      deadline: new Date(task.deadline).toISOString().slice(0, 16)
    });
    setAssignTarget(task.assignedTo ? task.assignedTo._id : '');
    setError('');
    
    if (task && !task.isSubtask) {
      fetchSubtasks();
    }
  }, [task]);

  const fetchSubtasks = async () => {
    try {
      const res = await api.getSubtasks(task._id);
      setSubtasks(res.data.subtasks);
    } catch (err) {
      console.error('Failed to fetch subtasks', err);
    }
  };

  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [newSubtaskData, setNewSubtaskData] = useState({
    title: '',
    description: '',
    deadline: '',
    assignedTo: ''
  });

  const handleCreateSubtask = async () => {
    try {
      setLoading(true);
      setError('');
      await api.createSubtask(task._id, newSubtaskData);
      setIsCreatingSubtask(false);
      setNewSubtaskData({ title: '', description: '', deadline: '', assignedTo: '' });
      fetchSubtasks();
      onRefresh(); // To update main task progress if needed
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canEdit = (currentUser.role === 'super_admin' || 
    (currentUser.role === 'department_admin' && task.createdBy._id === currentUser.id)) && 
    task.status !== 'submitted_for_review' && task.status !== 'approved';

  const canAssign = (currentUser.role === 'super_admin' || currentUser.role === 'department_admin') && 
    task.status !== 'submitted_for_review' && task.status !== 'approved';
  
  const canPerformStaffActions = (currentUser.role === 'staff' && task.assignedTo && task.assignedTo._id === currentUser.id) ||
    (currentUser.role === 'department_admin' && task.assignedTo && task.assignedTo._id === currentUser.id);

  const canReview = 
    task.status === 'submitted_for_review' && (
      currentUser.role === 'super_admin' ||
      (task.reviewStage === 'department_admin' && currentUser.role === 'department_admin' && task.currentReviewer && 
       (task.currentReviewer === currentUser.id || task.currentReviewer._id === currentUser.id))
    );

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setError('');
      await api.updateTask(task._id, {
        title: editData.title,
        description: editData.description,
        deadline: editData.deadline
      });
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    try {
      setLoading(true);
      setError('');
      await api.assignTask(task._id, assignTarget || null);
      setIsAssigning(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      setLoading(true);
      setError('');
      await api.updateTaskStatus(task._id, status);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setLoading(true);
      setError('');
      await api.submitTaskForReview(task._id);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (decision: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      setError('');
      if (decision === 'rejected' && !rejectionReason.trim()) {
        setError('Rejection reason is required.');
        setLoading(false);
        return;
      }
      await api.reviewTask(task._id, decision, decision === 'rejected' ? rejectionReason : undefined);
      setIsRejecting(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const urgency = calculateUrgency(task.deadline);
  const badgeClass = getUrgencyBadgeClass(urgency);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return { bg: '#fef3c7', color: '#92400e', text: 'PENDING' };
      case 'in_progress': return { bg: '#dbeafe', color: '#1e40af', text: 'IN PROGRESS' };
      case 'completed': return { bg: '#d1fae5', color: '#065f46', text: 'COMPLETED' };
      case 'submitted_for_review': return { bg: '#e0e7ff', color: '#3730a3', text: 'SUBMITTED FOR REVIEW' };
      case 'approved': return { bg: '#d1fae5', color: '#065f46', text: 'APPROVED' };
      case 'rejected': return { bg: '#fee2e2', color: '#991b1b', text: 'REJECTED' };
      default: return { bg: '#f1f5f9', color: '#475569', text: status.replace(/_/g, ' ').toUpperCase() };
    }
  };

  const statusStyle = getStatusColor(task.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {!isEditing ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', paddingRight: '2rem' }}>
                {task.title}
                {task.isSubtask && <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', marginLeft: '0.5rem', verticalAlign: 'middle' }}>SUBTASK</span>}
              </h2>
              <span className={`badge ${badgeClass}`} style={{ flexShrink: 0 }}>{urgency}</span>
            </div>
            
            <p style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', margin: '1rem 0', color: '#334155', lineHeight: '1.6', border: '1px solid #e2e8f0' }}>
              {task.description}
            </p>

            {task.rejectionReason && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', margin: '1rem 0', borderLeft: '4px solid #ef4444' }}>
                <strong>Rejection Reason:</strong> {task.rejectionReason}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Status</div>
                <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: statusStyle.bg, color: statusStyle.color }}>{statusStyle.text}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Deadline</div>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{new Date(task.deadline).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Created By</div>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{task.createdBy.name} <span style={{ color: '#64748b', fontSize: '0.85rem' }}>({task.createdBy.role})</span></div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Assigned To</div>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{task.assignedTo ? <>{task.assignedTo.name} <span style={{ color: '#64748b', fontSize: '0.85rem' }}>({task.assignedTo.role})</span></> : <span style={{ color: '#94a3b8' }}>Unassigned</span>}</div>
              </div>
              
              {task.workflowType && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Workflow</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{task.workflowType.replace(/_/g, ' ').toUpperCase()}</div>
                </div>
              )}
              {task.reviewStage && task.reviewStage !== 'none' && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Review Stage</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{task.reviewStage.replace(/_/g, ' ').toUpperCase()}</div>
                </div>
              )}
              
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
              {canEdit && <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>Edit Details</button>}
              
              {canAssign && (
                isAssigning ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      className="form-control" 
                      value={assignTarget} 
                      onChange={(e) => setAssignTarget(e.target.value)}
                    >
                      <option value="">-- Unassigned --</option>
                      {availableAssignees.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                      ))}
                    </select>
                    <button className="btn btn-primary" onClick={handleAssign} disabled={loading}>Save Assignment</button>
                    <button className="btn btn-secondary" onClick={() => setIsAssigning(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setIsAssigning(true)}>Assign Staff</button>
                )
              )}

              {/* Performer Actions */}
              {canPerformStaffActions && !isAssigning && (
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  {task.status === 'pending' && <button className="btn btn-primary" onClick={() => handleStatusChange('in_progress')} disabled={loading}>Start Task</button>}
                  {task.status === 'rejected' && <button className="btn btn-primary" onClick={() => handleStatusChange('in_progress')} disabled={loading}>Start Again</button>}
                  {task.status === 'in_progress' && <button className="btn btn-success" onClick={() => handleStatusChange('completed')} disabled={loading} style={{ backgroundColor: '#10b981', color: 'white' }}>Mark Completed</button>}
                  {task.status === 'completed' && <button className="btn btn-success" onClick={handleSubmitReview} disabled={loading} style={{ backgroundColor: '#3b82f6', color: 'white' }}>Submit for Review</button>}
                  {task.status === 'submitted_for_review' && <span style={{ color: '#d97706', fontWeight: 'bold' }}>Waiting for Review</span>}
                  {task.status === 'approved' && <span style={{ color: '#059669', fontWeight: 'bold' }}>Approved</span>}
                </div>
              )}

              {/* Review Actions */}
              {canReview && !isRejecting && (
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  <button className="btn btn-success" style={{ backgroundColor: '#10b981', color: 'white' }} onClick={() => handleReviewAction('approved')} disabled={loading}>
                    {currentUser.role === 'department_admin' && task.reviewStage === 'department_admin' ? 'Approve & Send to Super Admin' : 'Approve'}
                  </button>
                  <button className="btn btn-danger" onClick={() => setIsRejecting(true)} disabled={loading}>Reject</button>
                </div>
              )}

              {isRejecting && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: 'auto', width: '100%', marginTop: '1rem' }}>
                  <textarea 
                    className="form-control" 
                    placeholder="Reason for rejection..." 
                    value={rejectionReason} 
                    onChange={e => setRejectionReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger" onClick={() => handleReviewAction('rejected')} disabled={loading || !rejectionReason.trim()}>Submit Rejection</button>
                    <button className="btn btn-secondary" onClick={() => setIsRejecting(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtasks Section */}
            {!task.isSubtask && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>Subtasks</h3>
                  {canAssign && task.status !== 'approved' && !isCreatingSubtask && (
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }} onClick={() => setIsCreatingSubtask(true)}>+ Add Subtask</button>
                  )}
                </div>
                
                {isCreatingSubtask && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>New Subtask</h4>
                    <input 
                      type="text" 
                      placeholder="Title" 
                      className="form-control" 
                      style={{ marginBottom: '0.5rem' }}
                      value={newSubtaskData.title}
                      onChange={e => setNewSubtaskData({...newSubtaskData, title: e.target.value})}
                    />
                    <textarea 
                      placeholder="Description" 
                      className="form-control" 
                      style={{ marginBottom: '0.5rem' }}
                      value={newSubtaskData.description}
                      onChange={e => setNewSubtaskData({...newSubtaskData, description: e.target.value})}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input 
                        type="datetime-local" 
                        className="form-control" 
                        value={newSubtaskData.deadline}
                        onChange={e => setNewSubtaskData({...newSubtaskData, deadline: e.target.value})}
                      />
                      <select 
                        className="form-control"
                        value={newSubtaskData.assignedTo}
                        onChange={e => setNewSubtaskData({...newSubtaskData, assignedTo: e.target.value})}
                      >
                        <option value="">-- Assign To --</option>
                        {availableAssignees.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary" onClick={handleCreateSubtask} disabled={loading}>Create</button>
                      <button className="btn btn-secondary" onClick={() => setIsCreatingSubtask(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                {subtasks.length === 0 ? (
                  <p style={{ color: '#888', fontStyle: 'italic' }}>No subtasks created yet.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {subtasks.map(st => (
                      <div key={st._id} style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '6px', borderLeft: `3px solid ${st.status === 'approved' ? '#10b981' : st.status === 'rejected' ? '#ef4444' : '#3b82f6'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{st.title}</strong>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{st.status.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Assigned: {st.assignedTo ? st.assignedTo.name : 'Unassigned'}</span>
                          <span>Due: {new Date(st.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="form-group">
            <h3>Edit Task</h3>
            <label>Title</label>
            <input 
              type="text" 
              className="form-control"
              value={editData.title}
              onChange={e => setEditData({...editData, title: e.target.value})}
            />
            
            <label style={{ marginTop: '1rem', display: 'block' }}>Description</label>
            <textarea 
              className="form-control"
              rows={5}
              value={editData.description}
              onChange={e => setEditData({...editData, description: e.target.value})}
            />

            <label style={{ marginTop: '1rem', display: 'block' }}>Deadline</label>
            <input 
              type="datetime-local" 
              className="form-control"
              value={editData.deadline}
              onChange={e => setEditData({...editData, deadline: e.target.value})}
            />

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>Save Changes</button>
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskModal;

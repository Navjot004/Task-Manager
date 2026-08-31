import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { calculateUrgency, getUrgencyBadgeClass, getUrgencyColor, getUrgencyLabel } from '../utils/taskUrgency';
import './TaskModal.css';

interface TaskModalProps {
  task: any | null;
  onClose: () => void;
  onRefresh: () => void;
  currentUser: any;
  availableAssignees: any[];
  onCreateSubtask?: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task: initialTask, onClose, onRefresh, currentUser, availableAssignees = [], onCreateSubtask }) => {
  const [task, setTask] = useState<any>(initialTask);
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
  const [assignTarget, setAssignTarget] = useState(task.delegatedTo ? task.delegatedTo._id : (task.assignedTo ? task.assignedTo._id : ''));
  
  // Custom Assign Dropdown State (Main Task)
  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignRoleFilter, setAssignRoleFilter] = useState<'all' | 'staff' | 'department_admin'>('all');
  const assignDropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target as Node)) {
        setIsAssignDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFilteredAssignees = (query: string, role: string) => {
    return availableAssignees.filter(a => {
      if (role !== 'all' && a.role !== role) return false;
      if (query) {
        const q = query.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
      }
      return true;
    });
  };

  // Review mode
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const formatName = (userObj: any) => {
    if (!userObj) return <span style={{ color: '#94a3b8' }}>Unassigned</span>;
    const isMe = userObj._id === currentUser.id || userObj.id === currentUser.id;
    const name = isMe ? 'me' : userObj.name;
    const staffId = userObj.universityId || 'N/A';
    return <>{name} <span style={{ color: '#64748b', fontSize: '0.85rem' }}>(ID: {staffId})</span></>;
  };

  const formatNameString = (userObj: any) => {
    if (!userObj) return 'Unassigned';
    const isMe = userObj._id === currentUser.id || userObj.id === currentUser.id;
    const name = isMe ? 'me' : userObj.name;
    const staffId = userObj.universityId || 'N/A';
    return `${name} (ID: ${staffId})`;
  };

  // Submit Review mode
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  const refreshTaskData = async () => {
    try {
      const res = await api.getTaskById(task._id);
      if (res.success) {
        setTask(res.data.task);
      }
    } catch (err) {
      console.error("Failed to refresh task data:", err);
    }
    if (onRefresh) {
      onRefresh();
    }
  };

  // Reset local state when task changes
  useEffect(() => {
    setTask(initialTask);
    setIsEditing(false);
    setIsAssigning(false);
    setIsRejecting(false);
    setRejectionReason('');
    setIsSubmittingReview(false);
    setReviewFiles([]);
    setFileError('');
    setEditData({
      title: initialTask.title,
      description: initialTask.description,
      deadline: new Date(initialTask.deadline).toISOString().slice(0, 16)
    });
    setAssignTarget(initialTask.delegatedTo ? initialTask.delegatedTo._id : (initialTask.assignedTo ? initialTask.assignedTo._id : ''));
    setError('');
    
    if (initialTask && !initialTask.isSubtask) {
      fetchSubtasks();
    }
  }, [initialTask]);

  const fetchSubtasks = async () => {
    try {
      const res = await api.getSubtasks(task._id);
      setSubtasks(res.data.subtasks);
    } catch (err) {
      console.error('Failed to fetch subtasks', err);
    }
  };


  const canEdit = (currentUser.role === 'super_admin' || currentUser.role === 'department_admin') && 
    task.status !== 'submitted_for_review' && task.status !== 'approved';
  
  const canAssign = (currentUser.role === 'super_admin' || currentUser.role === 'department_admin') && 
    task.status !== 'submitted_for_review' && task.status !== 'approved';
  
  const AttachmentList = ({ fileIds, title }: { fileIds: string[], title: string }) => {
    const [files, setFiles] = useState<any[]>([]);

    useEffect(() => {
      const fetchFiles = async () => {
        try {
          const fetchedFiles = await Promise.all(
            fileIds.map(async (id) => {
              try {
                const res = await api.getFileMetadata(id);
                return res.data.file;
              } catch (e) {
                return null;
              }
            })
          );
          setFiles(fetchedFiles.filter(Boolean));
        } catch (err) {
          console.error(err);
        }
      };
      if (fileIds && fileIds.length > 0) {
        fetchFiles();
      }
    }, [fileIds]);

    if (!fileIds || fileIds.length === 0) return null;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    return (
      <div style={{ marginTop: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {files.length === 0 ? (
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading files...</span>
          ) : (
            files.map((file, i) => (
              <a
                key={i}
                href={`${apiUrl}/api/files/${file._id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', textDecoration: 'none', fontSize: '0.9rem', backgroundColor: '#f0f9ff', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #bae6fd' }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                <span style={{ fontWeight: 500 }}>{file.filename}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({Math.round(file.length / 1024)} KB)</span>
              </a>
            ))
          )}
        </div>
      </div>
    );
  };
  
  const canPerformStaffActions = (currentUser.role === 'staff' && ((task.assignedTo && task.assignedTo._id === currentUser.id) || (task.delegatedTo && task.delegatedTo._id === currentUser.id))) ||
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
      refreshTaskData();
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
      refreshTaskData();
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
      refreshTaskData();
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setLoading(true);
      setError('');

      if (task.requiredCompletionExtensions && task.requiredCompletionExtensions.length > 0) {
        if (reviewFiles.length === 0) {
          setFileError(`Please upload required documents. Formats allowed: ${task.requiredCompletionExtensions.join(', ')}`);
          setLoading(false);
          return;
        }

        const invalidFiles = reviewFiles.filter(f => {
          const parts = f.name.split('.');
          if (parts.length < 2) return true;
          const ext = '.' + parts.pop()?.toLowerCase();
          return !task.requiredCompletionExtensions.includes(ext);
        });

        if (invalidFiles.length > 0) {
          setFileError(`Invalid file format: ${invalidFiles.map(f=>f.name).join(', ')}. Allowed: ${task.requiredCompletionExtensions.join(', ')}`);
          setLoading(false);
          return;
        }
      }

      let formData: FormData | undefined = undefined;
      if (reviewFiles.length > 0) {
        formData = new FormData();
        reviewFiles.forEach(f => formData!.append('attachments', f));
      }
      await api.submitTaskForReview(task._id, formData);
      setIsSubmittingReview(false);
      setReviewFiles([]);
      refreshTaskData();
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
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
      refreshTaskData();
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
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
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', paddingRight: '2rem', flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ color: '#64748b', marginRight: '0.5rem' }}>#{task.taskId}</span>
                  {task.title}
                </div>
                <span style={{ 
                  background: getUrgencyColor(urgency) + '20', 
                  color: getUrgencyColor(urgency), 
                  border: `1px solid ${getUrgencyColor(urgency)}40`, 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '4px', 
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  {getUrgencyLabel(urgency)}
                </span>
                {task.isSubtask && <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', verticalAlign: 'middle' }}>SUBTASK</span>}
              </h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              </div>
            </div>

            {task.isSubtask && task.parentTaskId && (
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontWeight: 600 }}>Subtask of:</span> #{task.parentTaskId.taskId} - {task.parentTaskId.title}
              </div>
            )}
            
            <p style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', margin: '1rem 0', color: '#334155', lineHeight: '1.6', border: '1px solid #e2e8f0' }}>
              {task.description}
            </p>

            {task.attachments && task.attachments.length > 0 && (
                <AttachmentList fileIds={task.attachments} title="Initial Attachments" />
            )}

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
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{formatName(task.createdBy)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Assigned To</div>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{formatName(task.assignedTo)}</div>
              </div>
              
              {task.delegatedTo && currentUser.role !== 'super_admin' && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Delegated To</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{formatName(task.delegatedTo)}</div>
                </div>
              )}
              
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
              
              {task.requiredCompletionExtensions && task.requiredCompletionExtensions.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Required Completion Formats</div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {task.requiredCompletionExtensions.map((ext: string) => (
                      <span key={ext} style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#475569' }}>{ext}</span>
                    ))}
                  </div>
                </div>
              )}
              
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
              {canEdit && <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>Edit Details</button>}
              
              {canAssign && (
                isAssigning ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div className="tm-assign-wrapper" ref={assignDropdownRef}>
                      <div 
                        className={`tm-custom-select ${isAssignDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsAssignDropdownOpen(!isAssignDropdownOpen)}
                      >
                        {assignTarget ? (
                          <span>{formatNameString(availableAssignees.find(a => a.id === assignTarget))}</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-- Unassigned --</span>
                        )}
                        <ChevronDown size={16} color="#64748b" />
                      </div>
                      
                      {isAssignDropdownOpen && (
                        <div className="tm-dropdown-menu">
                          <div className="tm-dropdown-header">
                            <div className="tm-dropdown-search">
                              <Search size={14} className="tm-search-icon" />
                              <input 
                                type="text" 
                                placeholder="Search users..." 
                                value={assignSearchQuery}
                                onChange={e => setAssignSearchQuery(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                            {currentUser.role === 'super_admin' && (
                              <div className="tm-role-filters">
                                <button 
                                  className={`tm-role-filter-btn ${assignRoleFilter === 'all' ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); setAssignRoleFilter('all'); }}
                                >All</button>
                                <button 
                                  className={`tm-role-filter-btn ${assignRoleFilter === 'department_admin' ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); setAssignRoleFilter('department_admin'); }}
                                >Admins</button>
                                <button 
                                  className={`tm-role-filter-btn ${assignRoleFilter === 'staff' ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); setAssignRoleFilter('staff'); }}
                                >Staff</button>
                              </div>
                            )}
                          </div>
                          
                          <ul className="tm-dropdown-list">
                            <li 
                              className={`tm-dropdown-item ${!assignTarget ? 'selected' : ''}`}
                              onClick={() => {
                                setAssignTarget('');
                                setIsAssignDropdownOpen(false);
                              }}
                            >
                              <span>-- Unassigned --</span>
                            </li>
                            {getFilteredAssignees(assignSearchQuery, assignRoleFilter).length === 0 && (
                              <li className="tm-dropdown-item empty">No users found</li>
                            )}
                            {getFilteredAssignees(assignSearchQuery, assignRoleFilter).map(a => (
                              <li 
                                key={a.id}
                                className={`tm-dropdown-item ${assignTarget === a.id ? 'selected' : ''}`}
                                onClick={() => {
                                  setAssignTarget(a.id);
                                  setIsAssignDropdownOpen(false);
                                  setAssignSearchQuery('');
                                }}
                              >
                                <span>{a.id === currentUser.id ? 'me' : a.name}</span>
                                <span className="tm-assignee-role">(ID: {a.universityId || 'N/A'})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button className="btn btn-primary" onClick={handleAssign} disabled={loading} style={{ whiteSpace: 'nowrap' }}>Save Assignment</button>
                    <button className="btn btn-secondary" onClick={() => setIsAssigning(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setIsAssigning(true)}>Assign Staff</button>
                )
              )}

              {/* Performer Actions */}
              {canPerformStaffActions && !isAssigning && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: 'auto', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {task.status === 'pending' && <button className="btn btn-primary" onClick={() => handleStatusChange('in_progress')} disabled={loading}>Start Task</button>}
                    {task.status === 'rejected' && <button className="btn btn-primary" onClick={() => handleStatusChange('in_progress')} disabled={loading}>Start Again</button>}
                    {task.status === 'in_progress' && !isSubmittingReview && <button className="btn btn-success" onClick={() => setIsSubmittingReview(true)} disabled={loading} style={{ backgroundColor: '#10b981', color: 'white' }}>Submit Task</button>}
                    {task.status === 'completed' && !isSubmittingReview && <button className="btn btn-success" onClick={() => setIsSubmittingReview(true)} disabled={loading} style={{ backgroundColor: '#3b82f6', color: 'white' }}>Submit for Review</button>}
                    {task.status === 'submitted_for_review' && <span style={{ color: '#d97706', fontWeight: 'bold' }}>Waiting for Review</span>}
                    {task.status === 'approved' && <span style={{ color: '#059669', fontWeight: 'bold' }}>Approved</span>}
                  </div>
                  
                  {isSubmittingReview && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', marginTop: '0.5rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>Upload Completion Documents</h4>
                      {task.requiredCompletionExtensions && task.requiredCompletionExtensions.length > 0 && (
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Required formats: {task.requiredCompletionExtensions.join(', ')}</p>
                      )}
                      
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="file" 
                            multiple 
                            ref={reviewFileInputRef}
                            style={{ display: 'none' }}
                            accept={task.requiredCompletionExtensions?.length ? task.requiredCompletionExtensions.join(',') : undefined}
                            onChange={(e) => {
                              if (e.target.files) {
                                const selected = Array.from(e.target.files);
                                if (task.requiredCompletionExtensions?.length) {
                                  const invalid = selected.filter(f => {
                                    const parts = f.name.split('.');
                                    if (parts.length < 2) return true;
                                    const ext = '.' + parts.pop()?.toLowerCase();
                                    return !task.requiredCompletionExtensions.includes(ext);
                                  });
                                  if (invalid.length > 0) {
                                    setFileError(`Invalid file format: ${invalid.map(f=>f.name).join(', ')}. Allowed: ${task.requiredCompletionExtensions.join(', ')}`);
                                    if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
                                    return;
                                  }
                                }
                                setFileError('');
                                setReviewFiles(selected);
                              }
                            }}
                          />
                          <button className="btn btn-secondary" onClick={() => reviewFileInputRef.current?.click()} style={{ width: '100%' }}>
                            Choose Files
                          </button>
                          
                          {/* File Error Popup */}
                          {fileError && (
                            <div style={{
                              marginTop: '0.75rem',
                              padding: '0.5rem 0.75rem',
                              backgroundColor: '#fee2e2',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              color: '#991b1b',
                              fontSize: '0.8rem',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span>{fileError}</span>
                              <button 
                                onClick={() => setFileError('')} 
                                style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}
                              >&times;</button>
                            </div>
                          )}
                          {reviewFiles.length > 0 && (
                            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1rem', fontSize: '0.8rem' }}>
                              {reviewFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                            </ul>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button className="btn btn-primary" onClick={handleSubmitReview} disabled={loading}>Submit</button>
                          <button className="btn btn-secondary" onClick={() => { setIsSubmittingReview(false); setReviewFiles([]); }}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Review Actions */}
              {canReview && !isRejecting && (
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  <button className="btn btn-success" style={{ backgroundColor: '#10b981', color: 'white' }} onClick={() => handleReviewAction('approved')} disabled={loading}>
                    {currentUser.role === 'department_admin' && task.reviewStage === 'department_admin' && (task.createdBy?._id !== currentUser.id && task.createdBy?.id !== currentUser.id) ? 'Approve & Send to Super Admin' : 'Approve'}
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

              {task.completionAttachments && task.completionAttachments.length > 0 && (
                <AttachmentList fileIds={task.completionAttachments} title="Submitted Documents" />
              )}
            </div>

            {/* Subtasks Section */}
            {!task.isSubtask && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>Subtasks</h3>
                  {canAssign && task.status !== 'approved' && onCreateSubtask && (
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }} onClick={() => onCreateSubtask()}>+ Add Subtask</button>
                  )}
                </div>
                


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
                          <span>Assigned: {formatNameString(st.delegatedTo || st.assignedTo)}</span>
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

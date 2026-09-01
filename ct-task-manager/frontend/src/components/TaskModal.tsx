import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Paperclip, FileText, Star } from 'lucide-react';
import { api } from '../services/api';
import { calculateUrgency, getUrgencyColor, getUrgencyLabel } from '../utils/taskUrgency';
import './TaskModal.css';

// Auto-compress image files to ~500KB max
const compressImage = (file: File, maxSizeKB: number = 500): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    if (file.size <= maxSizeKB * 1024) { resolve(file); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size > maxSizeKB * 1024 && quality > 0.1) {
              quality -= 0.1;
              tryCompress();
            } else {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            }
          }, 'image/jpeg', quality);
        };
        tryCompress();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const compressFiles = async (files: File[]): Promise<File[]> => {
  return Promise.all(files.map(f => compressImage(f)));
};

// Date format helper
const formatDateTimeDDMMYYYY = (dateString: string) => {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${mins}`;
};

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

  // Approval Rating mode
  const [isApproving, setIsApproving] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');

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
    setIsApproving(false);
    setReviewRating(5);
    setHoverRating(0);
    setReviewFeedback('');
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
    task.status === 'pending';
  
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
      <div style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Paperclip size={14} />
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
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.6rem', 
                  color: '#2563eb', 
                  textDecoration: 'none', 
                  fontSize: '0.875rem', 
                  backgroundColor: '#ffffff', 
                  padding: '0.6rem 0.85rem', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <FileText size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{file.filename}</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 'auto', flexShrink: 0, paddingLeft: '0.5rem' }}>({Math.round(file.length / 1024)} KB)</span>
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
      await api.reviewTask(
        task._id, 
        decision, 
        decision === 'rejected' ? rejectionReason : undefined,
        decision === 'approved' && reviewRating ? reviewRating : undefined,
        decision === 'approved' && reviewFeedback ? reviewFeedback : undefined
      );
      setIsRejecting(false);
      setIsApproving(false);
      refreshTaskData();
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const urgency = calculateUrgency(task.deadline);

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
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{formatDateTimeDDMMYYYY(task.deadline)}</div>
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
              
              {/* Completion Date */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Completion Date</div>
                <div style={{ fontWeight: 500, color: task.completedAt || task.status === 'completed' || task.status === 'approved' ? '#0f172a' : '#64748b' }}>
                  {task.completedAt 
                    ? formatDateTimeDDMMYYYY(task.completedAt) 
                    : (task.status === 'completed' || task.status === 'approved' ? 'Completed' : 'Not completed yet')}
                </div>
              </div>
              
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
              
              {/* Completion Timeline Delta Info */}
              {(task.status === 'completed' || task.status === 'approved') && task.completedAt && (() => {
                const completedDate = new Date(task.completedAt);
                const deadlineDate = new Date(task.deadline);
                const diffTime = deadlineDate.getTime() - completedDate.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                let timelineText = '';
                let timelineColor = '';
                let timelineIcon = '';
                if (diffDays > 0) {
                  timelineText = `Completed ${diffDays} day${diffDays !== 1 ? 's' : ''} before deadline`;
                  timelineColor = '#10b981';
                  timelineIcon = '✅';
                } else if (diffDays < 0) {
                  timelineText = `Completed ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} after deadline (overdue)`;
                  timelineColor = '#ef4444';
                  timelineIcon = '⚠️';
                } else {
                  timelineText = 'Completed exactly on deadline';
                  timelineColor = '#f59e0b';
                  timelineIcon = '✅';
                }
                return (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.4rem',
                      padding: '0.4rem 0.75rem', 
                      borderRadius: '6px', 
                      fontSize: '0.85rem', 
                      fontWeight: 600,
                      backgroundColor: timelineColor + '15',
                      color: timelineColor,
                      border: `1px solid ${timelineColor}30`
                    }}>
                      {timelineIcon} {timelineText}
                    </div>
                  </div>
                );
              })()}
              
            </div>

            {/* Performance Rating & Feedback Banner on Rated Task */}
            {task.rating && (
              <div style={{ margin: '1.25rem 0', padding: '1rem 1.25rem', backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Performance Rating
                    </span>
                    <span style={{ display: 'inline-flex', gap: '2px', color: '#eab308' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={16} fill={s <= (task.rating || 0) ? '#eab308' : 'none'} color="#eab308" />
                      ))}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a16207' }}>
                      ({task.rating}/5)
                    </span>
                  </div>
                  {task.ratedBy && (
                    <span style={{ fontSize: '0.75rem', color: '#a16207', fontWeight: 500 }}>
                      Rated by {task.ratedBy.name}
                    </span>
                  )}
                </div>
                {task.feedback && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem', color: '#713f12', fontStyle: 'italic' }}>
                    "{task.feedback}"
                  </p>
                )}
                {task.ratedUser && (
                  <span style={{ fontSize: '0.75rem', color: '#a16207', display: 'block', marginTop: '0.35rem' }}>
                    Awarded to: <strong>{task.ratedUser.name || 'Performer'}</strong> (ID: {task.ratedUser.universityId || 'N/A'})
                  </span>
                )}
              </div>
            )}

            {/* Submitted Completion Documents (Proof of Work) */}
            {task.completionAttachments && task.completionAttachments.length > 0 && (
              <AttachmentList fileIds={task.completionAttachments} title="Submitted Documents" />
            )}

            {/* Rejection Feedback Box */}
            {isRejecting && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '1.25rem', borderRadius: '8px', margin: '1rem 0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '0.95rem', fontWeight: 600 }}>Reject Task & Request Changes</h4>
                <textarea 
                  className="form-control" 
                  placeholder="Provide reason or feedback for rejection..." 
                  value={rejectionReason} 
                  onChange={e => setRejectionReason(e.target.value)}
                  style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.75rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-danger" onClick={() => handleReviewAction('rejected')} disabled={loading || !rejectionReason.trim()}>
                    Submit Rejection
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsRejecting(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Super Admin Approval & Performance Rating Prompt */}
            {isApproving && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.25rem', borderRadius: '8px', margin: '1rem 0' }}>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#166534', fontSize: '1rem', fontWeight: 700 }}>
                  Approve Task & Rate Performance
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#15803d' }}>
                  Rate the quality of work for the completer. This rating will be added to their profile.
                </p>

                {/* Interactive Star Rating */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Star Rating (1 to 5 Stars)
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (hoverRating || reviewRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            color: isFilled ? '#eab308' : '#cbd5e1',
                            transition: 'transform 0.15s ease',
                            transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                          }}
                        >
                          <Star size={28} fill={isFilled ? '#eab308' : 'none'} />
                        </button>
                      );
                    })}
                    <span style={{ marginLeft: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: '#854d0e' }}>
                      {reviewRating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Feedback comment */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Feedback & Commendations (Optional)
                  </label>
                  <textarea 
                    className="form-control" 
                    placeholder="e.g. Excellent work, delivered ahead of schedule with high quality..." 
                    value={reviewFeedback} 
                    onChange={e => setReviewFeedback(e.target.value)}
                    style={{ width: '100%', minHeight: '75px', padding: '0.75rem', borderRadius: '6px', border: '1px solid #86efac', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-success" 
                    style={{ backgroundColor: '#16a34a', color: 'white', fontWeight: 600, padding: '0.6rem 1.25rem' }}
                    onClick={() => handleReviewAction('approved')} 
                    disabled={loading}
                  >
                    Confirm & Approve Task
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setIsApproving(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Modal Bottom Action Bar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '1.5rem', 
              paddingTop: '1.25rem', 
              borderTop: '1px solid #e2e8f0', 
              flexWrap: 'wrap', 
              gap: '0.75rem' 
            }}>
              
              {/* Left Actions: Edit Details / Assign Staff */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {canEdit && (
                  <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                    Edit Details
                  </button>
                )}

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
                    <button className="btn btn-secondary" onClick={() => setIsAssigning(true)}>
                      Assign Staff
                    </button>
                  )
                )}
              </div>

              {/* Right Actions: Review / Staff Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                
                {/* Review Actions (Approve / Reject) */}
                {canReview && !isRejecting && !isApproving && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-success" 
                      style={{ backgroundColor: '#10b981', color: 'white', fontWeight: 600, padding: '0.6rem 1.25rem' }} 
                      onClick={() => {
                        if (currentUser.role === 'super_admin' || (currentUser.role === 'department_admin' && (task.createdBy?._id === currentUser.id || task.createdBy?.id === currentUser.id))) {
                          setIsApproving(true);
                        } else {
                          handleReviewAction('approved');
                        }
                      }} 
                      disabled={loading}
                    >
                      {currentUser.role === 'department_admin' && task.reviewStage === 'department_admin' && (task.createdBy?._id !== currentUser.id && task.createdBy?.id !== currentUser.id) ? 'Approve & Send to Super Admin' : 'Approve'}
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontWeight: 600, padding: '0.6rem 1.25rem' }}
                      onClick={() => setIsRejecting(true)} 
                      disabled={loading}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {/* Performer Staff Actions */}
                {canPerformStaffActions && !isAssigning && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {task.status === 'pending' && <button className="btn btn-primary" onClick={() => handleStatusChange('in_progress')} disabled={loading}>Start Task</button>}
                      {task.status === 'rejected' && <button className="btn btn-primary" onClick={() => handleStatusChange('in_progress')} disabled={loading}>Start Again</button>}
                      {task.status === 'in_progress' && !isSubmittingReview && <button className="btn btn-success" onClick={() => setIsSubmittingReview(true)} disabled={loading} style={{ backgroundColor: '#10b981', color: 'white' }}>Submit Task</button>}
                      {task.status === 'completed' && !isSubmittingReview && <button className="btn btn-success" onClick={() => setIsSubmittingReview(true)} disabled={loading} style={{ backgroundColor: '#3b82f6', color: 'white' }}>Submit for Review</button>}
                      {task.status === 'submitted_for_review' && !canReview && <span style={{ color: '#d97706', fontWeight: 'bold' }}>Waiting for Review</span>}
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
                              onChange={async (e) => {
                                if (e.target.files) {
                                  const selected = Array.from(e.target.files);
                                  // Auto-compress images
                                  const compressed = await compressFiles(selected);
                                  if (task.requiredCompletionExtensions?.length) {
                                    const invalid = compressed.filter(f => {
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
                                  setReviewFiles(compressed);
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
              </div>

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
                          <span>Due: {formatDateTimeDDMMYYYY(st.deadline)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="tm-edit-form">
            <div className="tm-edit-header">
              <h3 className="tm-edit-title">Edit Task</h3>
              <p className="tm-edit-subtitle">Modify task details while it is in pending status.</p>
            </div>

            <div className="tm-edit-group">
              <label className="tm-edit-label">Title</label>
              <input 
                type="text" 
                className="tm-edit-input"
                placeholder="Enter task title..."
                value={editData.title}
                onChange={e => setEditData({...editData, title: e.target.value})}
              />
            </div>
            
            <div className="tm-edit-group">
              <label className="tm-edit-label">Description</label>
              <textarea 
                className="tm-edit-textarea"
                rows={4}
                placeholder="Enter task description..."
                value={editData.description}
                onChange={e => setEditData({...editData, description: e.target.value})}
              />
            </div>

            <div className="tm-edit-group">
              <label className="tm-edit-label">Deadline</label>
              <input 
                type="datetime-local" 
                className="tm-edit-input"
                value={editData.deadline}
                onChange={e => setEditData({...editData, deadline: e.target.value})}
              />
            </div>

            <div className="tm-edit-actions">
              <button className="tm-btn-save" onClick={handleUpdate} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="tm-btn-cancel" onClick={() => setIsEditing(false)} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskModal;

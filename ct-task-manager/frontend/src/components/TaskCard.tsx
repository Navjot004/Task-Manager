import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, CornerDownRight } from 'lucide-react';
import { api } from '../services/api';
import { calculateUrgency, getUrgencyCardStyle, getUrgencyLabel, getUrgencyColor } from '../utils/taskUrgency';
import './TaskCard.css';

interface TaskCardProps {
  task: any;
  currentUser: any;
  onClick: (task: any) => void;
  onCreateSubtask?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, currentUser, onClick, onCreateSubtask }) => {
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    if (!task.isSubtask) {
      api.getTaskProgress(task._id).then(res => setProgress(res.data)).catch(console.error);
    }
  }, [task._id, task.isSubtask]);

  const isCompleted = task.status === 'completed' || task.status === 'approved';
  
  // Very simplistic overdue check just for visual effect in mockup
  const isOverdue = !isCompleted && new Date(task.deadline).getTime() < new Date().getTime();

  // Calculate urgency from deadline
  const urgency = calculateUrgency(task.deadline);
  const cardStyle = getUrgencyCardStyle(urgency);
  const urgencyLabel = getUrgencyLabel(urgency);
  const urgencyColor = getUrgencyColor(urgency);

  // Status pill styling
  let pillClass = 'tc-pill-gray';
  let statusText = 'Pending';

  if (isCompleted) {
    pillClass = 'tc-pill-green';
    statusText = task.status === 'approved' ? 'Approved' : 'Completed';
  } else if (isOverdue) {
    pillClass = 'tc-pill-red';
    statusText = 'Overdue';
  } else if (task.status === 'in_progress' || task.status === 'submitted_for_review') {
    pillClass = 'tc-pill-blue';
    statusText = task.status === 'submitted_for_review' ? 'In Review' : 'In Progress';
  } else if (task.status === 'rejected') {
    pillClass = 'tc-pill-red';
    statusText = 'Rejected';
  }

  // Format deadline for UI
  const formatDeadline = (dateString: string) => {
    if (isCompleted) {
       // Ideally we'd have a completedAt date, fallback to deadline or just 'Completed'
       const date = new Date(dateString);
       return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    const deadline = new Date(dateString);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      return 'Today';
    } else {
      return `In ${diffDays} days`;
    }
  };

  return (
    <div className="tc-card" style={cardStyle} onClick={() => onClick(task)}>
      <div className="tc-header">
        <div className="tc-type">
          {task.isSubtask ? (
            <><CornerDownRight size={14} /> SUBTASK</>
          ) : (
            <span style={{ fontWeight: 800 }}>#{task.taskId}</span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span className="tc-priority-dot" style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            backgroundColor: urgencyColor, display: 'inline-block',
            boxShadow: `0 0 6px ${urgencyColor}40`
          }}></span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: urgencyColor, textTransform: 'uppercase' }}>{urgencyLabel}</span>
        </div>
      </div>
      
      <h3 className={`tc-title ${isCompleted ? 'completed' : ''}`}>
        {task.isSubtask && <span style={{ color: '#64748b', marginRight: '0.4rem' }}>#{task.taskId}</span>}
        {task.title}
      </h3>

      {task.isSubtask && task.parentTaskId && (
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <CornerDownRight size={12} />
          Subtask of #{task.parentTaskId.taskId} - {task.parentTaskId.title}
        </div>
      )}
      
      <div className="tc-desc">
        {task.description}
      </div>

      {/* Status Pill */}
      <div style={{ marginBottom: '1rem' }}>
        <div className={`tc-status-pill ${pillClass}`} style={{ display: 'inline-block' }}>{statusText}</div>
      </div>
      
      {/* Optional Progress Bar for main tasks */}
      {!task.isSubtask && progress && progress.total > 0 && !isCompleted && (
        <div className="tc-progress-container" style={{ marginBottom: '1rem' }}>
          <div className="tc-progress-label">
            <span>Subtasks</span>
            <span>{progress.approved} / {progress.total}</span>
          </div>
          <div className="tc-progress-bar">
            <div className="tc-progress-fill" style={{ width: `${progress.percentage}%` }}></div>
          </div>
        </div>
      )}

      {/* Add Subtask Button for Main Tasks */}
      {!task.isSubtask && onCreateSubtask && !isCompleted && (
        <div style={{ marginBottom: '1rem' }}>
          <button 
            className="tc-add-subtask-btn" 
            onClick={(e) => {
              e.stopPropagation(); // prevent opening the card
              onCreateSubtask();
            }}
          >
            + Add Subtask
          </button>
        </div>
      )}

      <div className="tc-footer">
        <div className="tc-footer-section">
          <span className="tc-footer-label">Assignee</span>
          <div className="tc-assignee">
            <div className="tc-avatar">
              {(task.delegatedTo && currentUser?.role !== 'super_admin') ? (
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(task.delegatedTo.name)}&background=e2e8f0&color=0f172a`} alt="avatar" title={`Delegated to ${task.delegatedTo.name}`} />
              ) : task.assignedTo?.name ? (
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignedTo.name)}&background=e2e8f0&color=0f172a`} alt="avatar" title={`Assigned to ${task.assignedTo.name}`} />
              ) : '?'}
            </div>
            <span className="tc-assignee-id">
              {(task.delegatedTo && currentUser?.role !== 'super_admin') ? 
                (task.delegatedTo.employeeId || task.delegatedTo.name.substring(0, 8)) : 
                (task.assignedTo ? task.assignedTo.employeeId || task.assignedTo.name.substring(0, 8) : 'Unassigned')}
            </span>
          </div>
        </div>
        
        <div className="tc-footer-section" style={{ alignItems: 'flex-end' }}>
          <span className="tc-footer-label">{isCompleted ? 'Completed' : 'Deadline'}</span>
          <div className={`tc-deadline ${isOverdue ? 'overdue' : ''}`} style={{ color: isOverdue ? '#dc2626' : urgencyColor }}>
            {isCompleted ? <CheckCircle2 size={14} /> : <Calendar size={14} className={isOverdue ? "text-red-500" : ""} />}
            {formatDeadline(task.deadline)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;

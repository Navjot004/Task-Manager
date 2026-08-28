import React, { useState } from 'react';
import { History, Clock, UploadCloud, Plus, ArrowRight, ChevronDown } from 'lucide-react';
import './CreateTaskView.css';

interface CreateTaskViewProps {
  onSubmit: (taskData: any) => Promise<void>;
  onCancel: () => void;
  availableAssignees: any[];
}

const CreateTaskView: React.FC<CreateTaskViewProps> = ({ onSubmit, onCancel, availableAssignees }) => {
  const [loading, setLoading] = useState(false);
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    deadline: '',
    assignedTo: '',
    isSubtask: false // using this to mimic the toggle in UI (though backend might just need parentId for subtasks, we'll keep it as UI state for now)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(taskData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-task-view">
      <div className="ct-header">
        <div className="ct-title-area">
          <h1>Create Task</h1>
          <p>Deploy new administrative or faculty assignments.</p>
        </div>
        <button className="ct-recent-btn">
          <History size={16} /> RECENT ACTIVITY
        </button>
      </div>

      <form className="ct-content-grid" onSubmit={handleSubmit}>
        
        {/* Left Form Section */}
        <div className="ct-form-section">
          
          <label className="ct-label">TASK CLASSIFICATION</label>
          <div className="ct-classification">
            <button 
              type="button"
              className={`ct-class-btn ${!taskData.isSubtask ? 'active' : ''}`}
              onClick={() => setTaskData({...taskData, isSubtask: false})}
            >
              Main Task
            </button>
            <button 
              type="button"
              className={`ct-class-btn ${taskData.isSubtask ? 'active' : ''}`}
              onClick={() => setTaskData({...taskData, isSubtask: true})}
            >
              Subtask
            </button>
          </div>

          <div className="ct-input-group">
            <label className="ct-label">TASK TITLE</label>
            <input 
              type="text" 
              className="ct-title-input" 
              placeholder="e.g., Finalize Q3 Departmental Budget" 
              required
              value={taskData.title}
              onChange={e => setTaskData({...taskData, title: e.target.value})}
            />
          </div>

          <div className="ct-input-group">
            <label className="ct-label">DESCRIPTION</label>
            <textarea 
              className="ct-desc-input" 
              placeholder="Detailed requirements and context for the assignee..."
              required
              value={taskData.description}
              onChange={e => setTaskData({...taskData, description: e.target.value})}
            />
          </div>

          <div className="ct-row">
            <div className="ct-input-group">
              <label className="ct-label">ASSIGN TO</label>
              <div className="ct-select-container">
                <select 
                  className="ct-select"
                  value={taskData.assignedTo}
                  onChange={e => setTaskData({...taskData, assignedTo: e.target.value})}
                >
                  <option value="">Unassigned (Open Pool)</option>
                  {availableAssignees.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                  ))}
                </select>
                <ChevronDown className="ct-select-icon" size={16} />
              </div>
            </div>

            <div className="ct-input-group">
              <label className="ct-label">DEADLINE</label>
              <input 
                type="date" 
                className="ct-date" 
                required
                value={taskData.deadline}
                onChange={e => setTaskData({...taskData, deadline: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar Section */}
        <div className="ct-sidebar">
          
          <label className="ct-label" style={{ marginBottom: '1rem' }}>PRIORITY PREVIEW</label>
          <div className="ct-info-card">
            <div className="ct-info-icon">
              <Clock size={20} />
            </div>
            <div className="ct-info-text">
              <h4>Set deadline</h4>
              <p>Priority is automatically calculated based on the due date.</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <label className="ct-label" style={{ margin: 0 }}>SUPPORTING MATERIALS</label>
            <Plus size={16} color="#64748b" />
          </div>
          
          <div className="ct-upload-area">
            <UploadCloud size={24} />
            <p>Drag and drop files or click<br/>to browse</p>
          </div>
          
        </div>

        {/* Footer Actions */}
        <div className="ct-actions">
          <button type="button" className="ct-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="ct-btn-submit" disabled={loading}>
            Create Task <ArrowRight size={16} />
          </button>
        </div>

      </form>
    </div>
  );
};

export default CreateTaskView;

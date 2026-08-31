import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskView from '../components/CreateTaskView';
import { Search, Plus } from 'lucide-react';
import './TasksPage.css';

const TasksPage: React.FC = () => {
  const { currentUser: user } = useAuth();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortByFilter, setSortByFilter] = useState('default');
  const [workflowFilter, setWorkflowFilter] = useState('All');
  const [reviewStageFilter, setReviewStageFilter] = useState('All');
  const [taskTypeFilter, setTaskTypeFilter] = useState('All'); // Changed default to 'All' to match mockups
  
  // Available Assignees (for Dept Admin & Super Admin)
  const [availableAssignees, setAvailableAssignees] = useState<any[]>([]);

  // Modals & Views
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [creatingSubtaskFor, setCreatingSubtaskFor] = useState<string | null>(null);
  
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getTasks({
        page,
        limit: 12,
        search,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        sortBy: sortByFilter !== 'default' ? sortByFilter : undefined,
        workflow: workflowFilter !== 'All' ? workflowFilter : undefined,
        reviewStage: reviewStageFilter !== 'All' ? reviewStageFilter : undefined,
        taskType: taskTypeFilter !== 'All' ? taskTypeFilter : undefined,
      });
      setTasks(res.data.tasks);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    if (!user) return;
    try {
      if (user.role === 'staff') {
        const res = await api.getTasks({ limit: 1, status: 'submitted_for_review' });
        setPendingReviewsCount(res.data.pagination.total);
      } else {
        const res = await api.getTasks({ limit: 1, status: 'submitted_for_review', reviewStage: user.role });
        setPendingReviewsCount(res.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load pending reviews count', err);
    }
  };

  const loadAssignees = async () => {
    if (user?.role === 'staff') return; // Staff cannot assign
    
    try {
      if (user?.role === 'super_admin') {
        const res = await api.getUsers({ limit: 1000, status: 'Active' });
        setAvailableAssignees(res.data.users.filter((u: any) => u._id !== user.id && u.id !== user.id));
      } else if (user?.role === 'department_admin') {
        const res = await api.getAdminAssignments(user.id);
        const myStaff = res.data.assignments.map(a => a.staffId);
        setAvailableAssignees([...myStaff]);
      }
    } catch (err) {
      console.error('Failed to load assignees', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadAssignees();
      loadPendingCount();
    }
  }, [user]);

  useEffect(() => {
    if (user && !isCreatingTask) {
      loadTasks();
    }
  }, [page, statusFilter, sortByFilter, workflowFilter, reviewStageFilter, taskTypeFilter, user, search, isCreatingTask]);

  const handleCreateTaskSubmit = async (taskData: FormData | FormData[]) => {
    setError('');
    try {
      if (Array.isArray(taskData)) {
        await Promise.all(taskData.map(data => api.createTask(data)));
      } else {
        await api.createTask(taskData);
      }
      loadTasks();
      setIsCreatingTask(false);
      setCreatingSubtaskFor(null);
    } catch (err: any) {
      setError(err.message);
      throw err; // rethrow for the CreateTaskView to catch and stop loading
    }
  };

  const handleCreateSubtaskForTask = (taskId: string) => {
    setCreatingSubtaskFor(taskId);
    setIsCreatingTask(true);
    setSelectedTask(null);
  };

  if (isCreatingTask) {
    return (
      <CreateTaskView 
        onSubmit={handleCreateTaskSubmit}
        onCancel={() => {
          setIsCreatingTask(false);
          setCreatingSubtaskFor(null);
        }}
        availableAssignees={availableAssignees}
        preselectedParentTask={creatingSubtaskFor}
        currentUser={user}
      />
    );
  }

  return (
    <>
      
      <div className="tasks-page-container" style={{ maxWidth: '1200px' }}>
        
        {/* Desktop Header */}
        <div className="tasks-page-header">
          <div className="tasks-page-title">
            <h1>Task Management</h1>
            <p>Monitor and assign tasks across the university network. Track urgency, manage workloads, and ensure timely completion of critical institutional objectives.</p>
          </div>
          
          {user?.role !== 'staff' && (
            <button className="tasks-create-btn" onClick={() => setIsCreatingTask(true)}>
              <Plus size={18} /> CREATE TASK
            </button>
          )}
        </div>

        {/* Mobile Filter Pills (Only visible on mobile via media queries ideally, but we'll show them inline for now) */}
        <div className="mobile-filter-pills d-md-none">
          <button className={`mobile-pill ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>All Tasks</button>
          <button className={`mobile-pill ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setStatusFilter('pending')}>Pending Action</button>
          <button className={`mobile-pill ${statusFilter === 'submitted_for_review' ? 'active' : ''}`} onClick={() => setStatusFilter('submitted_for_review')}>In Review</button>
        </div>

        {/* Mobile Action Required Section */}
        {pendingReviewsCount !== null && pendingReviewsCount > 0 && (
          <div className="mobile-action-header d-md-none">
            <div className="mobile-action-title">
              Action Required <span className="mobile-badge">{pendingReviewsCount}</span>
            </div>
            <a href="#" className="mobile-mark-read" onClick={(e) => { e.preventDefault(); setStatusFilter('submitted_for_review'); }}>
              View all
            </a>
          </div>
        )}

        {/* Desktop Filters Bar */}
        <div className="tasks-filters-bar">
          <div className="tasks-search-wrapper">
            <Search className="tasks-search-icon" size={18} />
            <input 
              type="text" 
              className="tasks-search-input" 
              placeholder="Search by title, ID, or content..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          
          <select className="tasks-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="All">Status: All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="submitted_for_review">Submitted for Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Using reviewStageFilter as a proxy for "Urgency" for now in UI */}
          <select className="tasks-filter-select" value={reviewStageFilter} onChange={e => { setReviewStageFilter(e.target.value); setPage(1); }}>
            <option value="All">Urgency: All</option>
            <option value="Pending Review">Needs Review</option>
          </select>

          <select className="tasks-filter-select" value={taskTypeFilter} onChange={e => { setTaskTypeFilter(e.target.value); setPage(1); }}>
            <option value="All">Type: All</option>
            <option value="main">Main Task</option>
            <option value="subtask">Subtask</option>
          </select>

          <select className="tasks-filter-select" value={sortByFilter} onChange={e => { setSortByFilter(e.target.value); setPage(1); }}>
            <option value="default">Sort: Default</option>
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
          </select>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <p>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <h3 style={{ color: '#666' }}>No tasks found</h3>
            <p>Try adjusting your filters or create a new task.</p>
          </div>
        ) : (
          <>
            {/* Action Required Header for Desktop (Optional, but good if we have pending reviews) */}
            {pendingReviewsCount !== null && pendingReviewsCount > 0 && statusFilter === 'All' && (
               <div style={{ marginBottom: '1rem', color: '#1e40af', fontWeight: 'bold' }}>
                  {pendingReviewsCount} tasks require your attention.
               </div>
            )}
            
            <div className="tasks-grid">
              {tasks.map(task => (
                <TaskCard 
                  key={task._id} 
                  task={task} 
                  currentUser={user}
                  onClick={() => setSelectedTask(task)} 
                  onCreateSubtask={() => handleCreateSubtaskForTask(task._id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Page {page} of {totalPages}
                </span>
                <button 
                  className="btn btn-secondary" 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          currentUser={user}
          availableAssignees={availableAssignees}
          onClose={() => setSelectedTask(null)}
          onRefresh={() => {
            loadTasks();
            loadPendingCount();
            api.getTaskById(selectedTask._id).then(res => setSelectedTask(res.data.task)).catch(() => setSelectedTask(null));
          }}
          onCreateSubtask={() => handleCreateSubtaskForTask(selectedTask._id)}
        />
      )}
    </>
  );
};

export default TasksPage;

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskView from '../components/CreateTaskView';
import { Search, Plus } from 'lucide-react';
import { calculateUrgency } from '../utils/taskUrgency';
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
  const [priorityFilter, setPriorityFilter] = useState('All'); // Color/Priority filter
  const [schoolFilter, setSchoolFilter] = useState('All');     // Department/School filter
  const [taskTypeFilter, setTaskTypeFilter] = useState('All');
  
  // Departments list for school filter
  const [departments, setDepartments] = useState<any[]>([]);
  
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
        limit: 50, // Fetch a larger batch to support client-side priority/sorting
        search,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        taskType: taskTypeFilter !== 'All' ? taskTypeFilter : undefined,
        department: schoolFilter !== 'All' ? schoolFilter : undefined,
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
    if (user?.role === 'staff') return;
    
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

  const loadDepartments = async () => {
    if (user?.role !== 'super_admin') return;
    try {
      const res = await api.getDepartments();
      if (res.success) {
        setDepartments(res.data.departments || []);
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadAssignees();
      loadPendingCount();
      loadDepartments();
    }
  }, [user]);

  useEffect(() => {
    if (user && !isCreatingTask) {
      loadTasks();
    }
  }, [page, statusFilter, schoolFilter, taskTypeFilter, user, search, isCreatingTask]);

  // Client-side filtering & sorting
  const getFilteredAndSortedTasks = () => {
    let filtered = [...tasks];

    // Priority/Color filter (client-side based on urgency calculation)
    if (priorityFilter !== 'All') {
      filtered = filtered.filter(t => {
        const urgency = calculateUrgency(t.deadline);
        return urgency === priorityFilter;
      });
    }

    // School/Department filter fallback
    if (schoolFilter !== 'All') {
      filtered = filtered.filter(t => {
        const dept = t.assignedTo?.department || t.delegatedTo?.department;
        return dept === schoolFilter;
      });
    }

    // Default sort: New + Incomplete first (newest createdAt first), then completed (latest completed first)
    const completedStatuses = ['completed', 'approved'];
    
    filtered.sort((a, b) => {
      const aCompleted = completedStatuses.includes(a.status);
      const bCompleted = completedStatuses.includes(b.status);

      // Incomplete tasks come before completed
      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;

      // If both are completed: sort by completedAt or updatedAt/createdAt descending (latest completed first)
      if (aCompleted && bCompleted) {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      }

      // If both are incomplete: sort by createdAt descending (newest tasks first)
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      return bCreated - aCreated;
    });

    return filtered;
  };

  const displayTasks = getFilteredAndSortedTasks();

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
      throw err;
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

        {/* Mobile Filter Pills */}
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

        {/* Desktop Filters Bar: Search | Color/Priority | School | Status | Type */}
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
          
          {/* 1. Color / Priority Filter */}
          <select 
            className="tasks-filter-select" 
            value={priorityFilter} 
            onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
          >
            <option value="All">Priority: All</option>
            <option value="RED">🔴 High Priority</option>
            <option value="YELLOW">🟡 Medium Priority</option>
            <option value="GREEN">🟢 Low Priority</option>
            <option value="OVERDUE">⚫ Overdue</option>
          </select>

          {/* 2. School / Department Filter (Only for Super Admin) */}
          {user?.role === 'super_admin' && (
            <select 
              className="tasks-filter-select" 
              value={schoolFilter} 
              onChange={e => { setSchoolFilter(e.target.value); setPage(1); }}
            >
              <option value="All">School: All</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          )}

          {/* 3. Status Filter */}
          <select className="tasks-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="All">Status: All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted_for_review">In Review</option>
            <option value="completed">Completed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* 4. Type Filter: Main / Subtask */}
          <select className="tasks-filter-select" value={taskTypeFilter} onChange={e => { setTaskTypeFilter(e.target.value); setPage(1); }}>
            <option value="All">Type: All</option>
            <option value="main">Main Task</option>
            <option value="subtask">Subtask</option>
          </select>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <p>Loading tasks...</p>
        ) : displayTasks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <h3 style={{ color: '#666' }}>No tasks found</h3>
            <p>Try adjusting your filters or create a new task.</p>
          </div>
        ) : (
          <>
            {/* Action Required Header for Desktop */}
            {pendingReviewsCount !== null && pendingReviewsCount > 0 && statusFilter === 'All' && (
               <div style={{ marginBottom: '1rem', color: '#1e40af', fontWeight: 'bold' }}>
                  {pendingReviewsCount} tasks require your attention.
               </div>
            )}
            
            <div className="tasks-grid">
              {displayTasks.map(task => (
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

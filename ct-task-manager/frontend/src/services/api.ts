const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Token Management ─────────────────────────────────────
export const tokenStorage = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token: string) => localStorage.setItem('token', token),
  clearToken: () => localStorage.removeItem('token'),
};

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = tokenStorage.getToken();
  const headers: any = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'API request failed');
  }
  return json;
};

// ─── Shared Types ─────────────────────────────────────────

interface HealthResponse {
  success: boolean;
  message: string;
  database: string;
}

export interface VerifiedUser {
  _id: string;
  universityId: string;
  name: string;
  email: string;
  phone: string;
  department: string | null;
  isRegistered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  _id?: string;
  universityId: string;
  name: string;
  email: string;
  phone: string;
  department: string | null;
  role: string;
  isActive?: boolean;
}

export interface Department {
  _id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: ImportRowError[];
}

export interface VerifiedUserStats {
  total: number;
  registered: number;
  notRegistered: number;
  departments: number;
}

// ─── API Methods ──────────────────────────────────────────

export const api = {
  /**
   * Check backend health status.
   */
  checkHealth: async (): Promise<HealthResponse> => {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  },

  // ─── Verified Users ───────────────────────────────────

  /**
   * Upload an Excel/CSV file to import verified users.
   */
  importVerifiedUsers: async (file: File): Promise<{ success: boolean; message: string; data: ImportResult }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = tokenStorage.getToken();
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/api/verified-users/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'Import failed');
    }
    return json;
  },

  /**
   * Fetch verified users with pagination, search, and status filter.
   */
  getVerifiedUsers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ success: boolean; data: { users: VerifiedUser[]; pagination: Pagination } }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    return fetchWithAuth(`/api/verified-users?${query.toString()}`);
  },

  /**
   * Get verified user statistics.
   */
  getVerifiedUserStats: async (): Promise<{ success: boolean; data: VerifiedUserStats }> => {
    return fetchWithAuth(`/api/verified-users/stats`);
  },

  /**
   * Download the verified users Excel template.
   */
  downloadTemplate: (): string => {
    return `${API_URL}/api/verified-users/template`;
  },

  // ─── Departments ──────────────────────────────────────

  getDepartments: async (): Promise<{ success: boolean; data: { departments: Department[] } }> => {
    // Public endpoint for registration form
    const response = await fetch(`${API_URL}/api/departments`);
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to fetch departments');
    return json;
  },

  createDepartment: async (name: string): Promise<{ success: boolean; message: string; data: { department: Department } }> => {
    return fetchWithAuth('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },

  deleteDepartment: async (id: string): Promise<{ success: boolean; message: string }> => {
    return fetchWithAuth(`/api/departments/${id}`, {
      method: 'DELETE',
    });
  },

  // ─── Authentication ───────────────────────────────────

  /**
   * Register a new user.
   */
  register: async (userData: any): Promise<{ success: boolean; message: string; data?: { user: User } }> => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'Registration failed');
    }
    return json;
  },

  /**
   * Login user and return token + user info.
   */
  login: async (credentials: any): Promise<{ success: boolean; message: string; data: { token: string; user: User } }> => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'Invalid University ID or password.');
    }
    return json;
  },

  /**
   * Get the current authenticated user's profile from the database.
   */
  getCurrentUser: async (): Promise<{ success: boolean; data: { user: User } }> => {
    return fetchWithAuth('/api/auth/me');
  },

  // ─── User Management (Super Admin) ────────────────────

  /**
   * Fetch users with pagination and filtering.
   */
  getUsers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    unassignedOnly?: boolean;
  }): Promise<{ success: boolean; data: { users: User[]; pagination: Pagination } }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);
    if (params.unassignedOnly) query.set('unassignedOnly', 'true');

    return fetchWithAuth(`/api/users?${query.toString()}`);
  },

  /**
   * Get user statistics.
   */
  getUserStats: async (): Promise<{
    success: boolean;
    data: {
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
      superAdmins: number;
      departmentAdmins: number;
      staff: number;
    };
  }> => {
    return fetchWithAuth(`/api/users/stats`);
  },

  /**
   * Get user by ID.
   */
  getUserById: async (id: string): Promise<{ success: boolean; data: { user: User } }> => {
    return fetchWithAuth(`/api/users/${id}`);
  },

  /**
   * Update user role.
   */
  updateUserRole: async (id: string, role: string, department?: string): Promise<{ success: boolean; message: string; data: { user: User } }> => {
    const response = await fetch(`${API_URL}/api/users/${id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: JSON.stringify({ role, department }),
    });
    
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'Failed to update user role');
    }
    return json;
  },

  /**
   * Update user status (activate/deactivate).
   */
  updateUserStatus: async (id: string, isActive: boolean): Promise<{ success: boolean; message: string; data: { user: User } }> => {
    const response = await fetch(`${API_URL}/api/users/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: JSON.stringify({ isActive }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || 'Failed to update user status');
    }
    return json;
  },

  // ─── Staff Assignments ────────────────────────────────
  
  getAssignments: async (): Promise<{ success: boolean; data: { assignments: any[] } }> => {
    return fetchWithAuth('/api/staff-assignments');
  },
  
  createAssignment: async (adminId: string, staffId: string): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await fetch(`${API_URL}/api/staff-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: JSON.stringify({ adminId, staffId }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to create assignment');
    return json;
  },

  updateAssignmentStatus: async (assignmentId: string, isActive: boolean): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await fetch(`${API_URL}/api/staff-assignments/${assignmentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: JSON.stringify({ isActive }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to update assignment status');
    return json;
  },

  getAdminAssignments: async (adminId: string): Promise<{ success: boolean; data: { assignments: any[] } }> => {
    return fetchWithAuth(`/api/staff-assignments/admin/${adminId}`);
  },

  getStaffAssignment: async (staffId: string): Promise<{ success: boolean; data: { assignment: any } }> => {
    return fetchWithAuth(`/api/staff-assignments/staff/${staffId}`);
  },

  // ─── Tasks ────────────────────────────────────────────

  createTask: async (taskData: FormData): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: taskData,
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to create task');
    return json;
  },

  getTasks: async (params: { page?: number; limit?: number; search?: string; status?: string; assignee?: string; sortBy?: string; workflow?: string; reviewStage?: string; taskType?: string }): Promise<{ success: boolean; data: { tasks: any[]; pagination: Pagination } }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.assignee) query.set('assignee', params.assignee);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.workflow) query.set('workflow', params.workflow);
    if (params.reviewStage) query.set('reviewStage', params.reviewStage);
    if (params.taskType) query.set('taskType', params.taskType);

    return fetchWithAuth(`/api/tasks?${query.toString()}`);
  },

  getTaskById: async (id: string): Promise<{ success: boolean; data: { task: any } }> => {
    return fetchWithAuth(`/api/tasks/${id}`);
  },

  updateTask: async (id: string, updates: { title?: string; description?: string; deadline?: string }): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: JSON.stringify(updates),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to update task');
    return json;
  },

  assignTask: async (id: string, assignedTo: string | null): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await fetch(`${API_URL}/api/tasks/${id}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: JSON.stringify({ assignedTo }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to assign task');
    return json;
  },

  updateTaskStatus: async (id: string, status: string): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await fetch(`${API_URL}/api/tasks/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: JSON.stringify({ status }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to update task status');
    return json;
  },

  submitTaskForReview: async (id: string, formData?: FormData): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await fetch(`${API_URL}/api/tasks/${id}/submit-review`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenStorage.getToken()}`
      },
      body: formData || new FormData(),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to submit for review');
    return json;
  },

  getNaacReport: async (): Promise<{ success: boolean; data: any }> => {
    return fetchWithAuth(`/api/tasks/naac-report`);
  },
  reviewTask: async (taskId: string, decision: 'approved' | 'rejected', reason?: string): Promise<{ success: boolean; data: { task: any } }> => {
    return fetchWithAuth(`/api/tasks/${taskId}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    });
  },

  createSubtask: async (taskId: string, data: { title: string; description: string; deadline: string; assignedTo: string }): Promise<{ success: boolean; data: { task: any } }> => {
    return fetchWithAuth(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getSubtasks: async (taskId: string): Promise<{ success: boolean; data: { subtasks: any[] } }> => {
    return fetchWithAuth(`/api/tasks/${taskId}/subtasks`);
  },

  getTaskProgress: async (taskId: string): Promise<{ success: boolean; data: any }> => {
    return fetchWithAuth(`/api/tasks/${taskId}/progress`);
  },

  getFileMetadata: async (fileId: string): Promise<{ success: boolean; data: { file: any } }> => {
    const response = await fetch(`${API_URL}/api/files/${fileId}/metadata`);
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to fetch file metadata');
    return json;
  }
};

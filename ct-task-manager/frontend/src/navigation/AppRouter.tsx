import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import SuperAdminPage from '../pages/SuperAdminPage';
import AdminPage from '../pages/AdminPage';
import StaffPage from '../pages/StaffPage';
import VerifiedUsersPage from '../pages/VerifiedUsersPage';
import UserManagementPage from '../pages/UserManagementPage';

import SuperAdminStaffAssignmentsPage from '../pages/SuperAdminStaffAssignmentsPage';
import SuperAdminDepartmentsPage from '../pages/SuperAdminDepartmentsPage';
import DeptAdminStaffPage from '../pages/DeptAdminStaffPage';
import TasksPage from '../pages/TasksPage';
import NaacDashboardPage from '../pages/NaacDashboardPage';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import SuperAdminLayout from '../components/SuperAdminLayout';
import DeptAdminLayout from '../components/DeptAdminLayout';
import StaffLayout from '../components/StaffLayout';

const AppRouter = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Super Admin Routes */}
          <Route path="/super-admin" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<SuperAdminPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="verified-users" element={<VerifiedUsersPage />} />
            <Route path="staff-manage" element={<SuperAdminStaffAssignmentsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="departments" element={<SuperAdminDepartmentsPage />} />
            <Route path="naac" element={<NaacDashboardPage />} />
            <Route path="alerts" element={<div>Alerts Work In Progress</div>} />
            <Route path="more" element={<div>More Options</div>} />
          </Route>

          {/* Department Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['department_admin']}>
              <DeptAdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminPage />} />
            <Route path="staff" element={<DeptAdminStaffPage />} />
            <Route path="tasks" element={<TasksPage />} />
          </Route>

          {/* Staff Routes */}
          <Route path="/staff" element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffLayout />
            </ProtectedRoute>
          }>
            <Route index element={<StaffPage />} />
            <Route path="tasks" element={<TasksPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppRouter;

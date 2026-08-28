import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<string>('checking...');
  const { isAuthenticated, currentUser, logout } = useAuth();

  useEffect(() => {
    api
      .checkHealth()
      .then((data) => {
        setBackendStatus(data.database === 'connected' ? '🟢 Online' : '🟡 Degraded');
      })
      .catch(() => {
        setBackendStatus('🔴 Offline');
      });
  }, []);

  const handleDashboardRedirect = () => {
    if (currentUser?.role === 'super_admin') navigate('/super-admin');
    else if (currentUser?.role === 'department_admin') navigate('/admin');
    else navigate('/staff');
  };

  return (
    <div className="page-container">
      <div className="home-card">
        <div className="home-header">
          <div className="university-badge">CTU</div>
          <h1 className="home-title">CT University</h1>
          <h2 className="home-subtitle">Task Manager</h2>
          <p className="home-description">
            Manage university tasks, assignments and reviews in one place.
          </p>
        </div>

        <div className="home-actions">
          {!isAuthenticated ? (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/login')}>
                Login
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/register')}>
                Register
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={handleDashboardRedirect}>
                Go to Dashboard
              </button>
              <button className="btn btn-secondary" onClick={() => {
                logout();
                navigate('/login');
              }}>
                Logout
              </button>
            </>
          )}
        </div>

        <div className="backend-status">
          Backend: {backendStatus}
        </div>
      </div>
    </div>
  );
};

export default HomePage;


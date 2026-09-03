import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IdCard, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import PortalBrandLogo from '../components/PortalBrandLogo';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { systemName } = useSettings();

  const [formData, setFormData] = useState({
    universityId: '',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.universityId || !formData.password) {
      setError('Please enter University ID and password.');
      return;
    }

    try {
      setLoading(true);
      await login(formData);
      navigate(from === '/' ? '/staff' : from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid University ID or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        
        {/* Left Panel (Desktop only) */}
        <div className="login-left-panel">
          <div className="login-left-header">
            <PortalBrandLogo />
            <div className="login-university-title">
              <span className="uni-name">{systemName}</span>
              <span className="portal-label">Portal Access</span>
            </div>
          </div>
          <div className="login-left-body">
            <h2>Internal System Access</h2>
            <p>Welcome to the centralized portal for faculty, administration, and verified staff.</p>
          </div>
          <div className="login-left-footer">
            <ShieldCheck size={16} className="login-shield-icon" />
            <span>Secure access is restricted to individuals with an active University ID. Registration requests are matched against verified institutional records.</span>
          </div>
        </div>

        {/* Right Panel (Form) */}
        <div className="login-right-panel">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="login-mobile-header">
            <div className="login-mobile-logo-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <PortalBrandLogo />
            </div>
            <h1>{systemName}</h1>
            <p>Faculty & Administration Portal</p>
          </div>

          <h1>Sign In</h1>
          <p className="subtitle">Enter your credentials to access your dashboard.</p>

          {error && <div className="login-error-alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <div className="login-label-row">
                <label htmlFor="universityId">University ID (5 Digits)</label>
              </div>
              <div className="login-input-wrapper">
                <IdCard size={18} className="input-icon-left" />
                <input
                  type="text"
                  id="universityId"
                  name="universityId"
                  value={formData.universityId}
                  onChange={handleChange}
                  placeholder="e.g. 12345"
                  maxLength={5}
                  required
                />
              </div>
            </div>

            <div className="login-form-group">
              <div className="login-label-row">
                <label htmlFor="password">Password</label>
                <Link to="#" className="login-forgot-link">Forgot Password?</Link>
              </div>
              <div className="login-input-wrapper">
                <Lock size={18} className="input-icon-left" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                />
                <button 
                  type="button" 
                  className="input-icon-right" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="login-register-link">
            Don't have an account? <Link to="/register">Register</Link>
          </div>
          
          {/* Mobile Footer (Hidden on Desktop) */}
          <div className="login-mobile-footer">
            <ShieldCheck size={14} />
            <span>Secure Institutional Connection</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, Department } from '../services/api';
import { Eye, EyeOff, Building2, Info } from 'lucide-react';
import { useEffect } from 'react';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    universityId: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; role: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.getDepartments();
        if (res.success) {
          setDepartments(res.data.departments);
        }
      } catch (err) {
        console.error('Failed to load departments');
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic frontend validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.universityId.length !== 5 || !/^\d+$/.test(formData.universityId)) {
      setError('University ID must contain exactly 5 digits.');
      return;
    }

    if (formData.phone.length !== 10 || !/^\d+$/.test(formData.phone)) {
      setError('Phone number must contain exactly 10 digits.');
      return;
    }

    try {
      setLoading(true);
      
      const payload = { ...formData };
      if (!payload.department.trim()) {
        payload.department = '';
      }

      const response = await api.register(payload);
      
      if (response.success) {
        let displayRole = 'Staff';
        if (response.data?.user?.role === 'super_admin') {
          displayRole = 'Super Admin';
        } else if (response.data?.user?.role === 'department_admin') {
          displayRole = 'Department Admin';
        }

        setSuccess({
          message: 'Registration successful.',
          role: `Your account has been created as ${displayRole}.`,
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-container">
      <div className="register-card">
        
        {/* Left Panel (Desktop only) */}
        <div className="register-left-panel">
          <div className="register-left-header">
            <Building2 size={32} />
            <div className="register-university-title">CT University</div>
          </div>
          <div className="register-left-body">
            <h2>Secure Portal Registration</h2>
            <p>Join the administrative network. Access institutional resources, manage departmental tasks, and collaborate across the university ecosystem.</p>
          </div>
          <div className="register-left-footer">
            <div className="register-left-footer-title">
              <Info size={16} /> Authorization Required
            </div>
            <p>Registration is only allowed for users in the Super Admin's verified list. Please ensure your details match university records exactly to avoid automated rejection.</p>
          </div>
        </div>

        {/* Right Panel (Form) */}
        <div className="register-right-panel">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="register-mobile-header">
            <h1>Create an Account</h1>
            <p>Register to access CT University's centralized task management system.</p>
          </div>
          
          {/* Mobile Info Box (Hidden on Desktop) */}
          <div className="register-info-box-mobile">
            <Info size={18} />
            <p>Your details must match the university's verified records to successfully create an account.</p>
          </div>

          {error && <div className="register-error-alert">{error}</div>}
          
          {success ? (
            <div className="register-success-alert">
              <h3>{success.message}</h3>
              <p>{success.role}</p>
              <button className="register-btn" onClick={() => navigate('/login')} style={{ marginTop: '1.5rem' }}>
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              
              <div className="register-form-group">
                <label htmlFor="universityId">University ID *</label>
                <div className="register-input-wrapper">
                  <input
                    type="text"
                    id="universityId"
                    name="universityId"
                    value={formData.universityId}
                    onChange={handleChange}
                    placeholder="e.g. 12345"
                    required
                  />
                </div>
              </div>

              <div className="register-row">
                <div className="register-form-group">
                  <label htmlFor="name">Full Name *</label>
                  <div className="register-input-wrapper">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                </div>

                <div className="register-form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <div className="register-input-wrapper">
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 555-012-3456"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="register-form-group">
                <label htmlFor="email">Institutional Email *</label>
                <div className="register-input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@ctuniversity.edu"
                    required
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label htmlFor="department">Department (Optional)</label>
                <div className="register-input-wrapper">
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="form-control"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', fontFamily: 'var(--font-family)', fontSize: '0.938rem', outline: 'none' }}
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="register-row">
                <div className="register-form-group">
                  <label htmlFor="password">Password *</label>
                  <div className="register-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
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

                <div className="register-form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <div className="register-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-type password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? 'Processing...' : 'REGISTER ACCOUNT'}
              </button>
            </form>
          )}

          {!success && (
            <div className="register-login-link">
              Already have an account? <Link to="/login">Login</Link>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

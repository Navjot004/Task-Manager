import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { CheckCircle, ClipboardList, Building2, BarChart3, ChevronRight, ChevronUp } from 'lucide-react';
import './NaacDashboardPage.css';

interface UserReport {
  _id: string;
  name: string;
  role: string;
  tasksGiven: number;
  tasksPending: number;
  tasksInReview: number;
  tasksCompleted: number;
}

interface DepartmentReport {
  department: string;
  totalTasksGiven: number;
  totalTasksPending: number;
  totalTasksInReview: number;
  totalTasksCompleted: number;
  users: UserReport[];
  completionRate?: number;
}

const NaacDashboardPage: React.FC = () => {
  const [data, setData] = useState<DepartmentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const toggleExpand = (dept: string) => {
    setExpandedDept(expandedDept === dept ? null : dept);
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await api.getNaacReport();
        const processedData = res.data.map((d: DepartmentReport) => ({
          ...d,
          completionRate: d.totalTasksGiven > 0 ? Math.round((d.totalTasksCompleted / d.totalTasksGiven) * 100) : 0
        }));
        setData(processedData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch NAAC report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const totalDepts = data.length;
  const activeDeptsCount = data.filter(d => d.totalTasksGiven > 0).length;
  const totalGiven = data.reduce((sum, d) => sum + d.totalTasksGiven, 0);
  const totalCompleted = data.reduce((sum, d) => sum + d.totalTasksCompleted, 0);
  const totalPending = data.reduce((sum, d) => sum + d.totalTasksPending, 0);
  const totalReview = data.reduce((sum, d) => sum + d.totalTasksInReview, 0);
  const overallRate = totalGiven > 0 ? ((totalCompleted / totalGiven) * 100).toFixed(1) : '0.0';

  const totalUsers = data.reduce((sum, d) => sum + d.users.length, 0);
  const activeUsers = data.reduce((sum, d) => sum + d.users.filter(u => u.tasksGiven > 0).length, 0);
  const resourceUtilization = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0.0';

  if (loading) return <div className="naac-loading">Loading NAAC Report...</div>;
  if (error) return <div className="naac-error">{error}</div>;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="naac-dashboard-wrapper">
      <div className="naac-dashboard">
        
        {/* Header Section */}
        <div className="naac-header">
          <h1>NAAC Reports Dashboard</h1>
          <p>Comprehensive university-wide performance & compliance.</p>
        </div>

        {/* KPI Grid Section */}
        <div className="naac-kpi-grid">
          <div className="naac-kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon-box"><CheckCircle size={20} /></div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">Overall Completion</span>
              <span className="kpi-value">{overallRate}%</span>
            </div>
          </div>
          
          <div className="naac-kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon-box orange"><ClipboardList size={20} /></div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">Pending Tasks</span>
              <span className="kpi-value">{totalPending + totalReview}</span>
            </div>
          </div>

          <div className="naac-kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon-box gray"><Building2 size={20} /></div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">Active Departments</span>
              <span className="kpi-value">{activeDeptsCount}/{totalDepts}</span>
            </div>
          </div>

          <div className="naac-kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon-box blue"><BarChart3 size={20} /></div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">Resource Utilization</span>
              <span className="kpi-value">{resourceUtilization}%</span>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="naac-section-card">
          <div className="section-header-flex">
            <div>
              <h3 className="section-title">Task Progression & Completion Rate</h3>
              <p className="section-subtitle">Comparison across major university schools</p>
            </div>
            {/* Legend handled by Recharts, but we can customize the position */}
          </div>
          
          <div style={{ width: '100%', height: 350, marginTop: '20px' }}>
            <ResponsiveContainer>
              <BarChart
                data={data}
                margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                barGap={4}
                barSize={16}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                <XAxis 
                  dataKey="department" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => {
                    // Shorten names for the X axis like the screenshot
                    if(val.includes('Engineering')) return 'ENGINEERING';
                    if(val.includes('Management')) return 'MANAGEMENT';
                    if(val.includes('Sciences')) return 'SCIENCES';
                    if(val.includes('Arts')) return 'ARTS & HUM.';
                    if(val.includes('Medicine') || val.includes('Health')) return 'MEDICINE';
                    return val.substring(0, 10).toUpperCase();
                  }}
                  tick={{ fontSize: 10, fill: '#6c757d', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#6c757d' }}
                />
                <Tooltip 
                  cursor={{fill: '#f8f9fa'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="square" 
                  wrapperStyle={{ top: -45, fontSize: '12px', color: '#495057' }}
                />
                <Bar dataKey="totalTasksCompleted" name="Completed" fill="#021c3b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalTasksInReview" name="In Progress" fill="#5c728a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalTasksPending" name="Pending" fill="#dadddf" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Departmental Breakdown List */}
        <div className="naac-section-card">
          <div className="section-header-flex">
            <div>
              <h3 className="section-title">Departmental Breakdown</h3>
              <p className="section-subtitle">Detailed task status and progress per department.</p>
            </div>
            <button className="filter-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Filter
            </button>
          </div>

          <div className="breakdown-table-container">
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>DEPARTMENT & ADMIN</th>
                  <th className="text-center">TOTAL TASKS</th>
                  <th>STATUS DISTRIBUTION</th>
                  <th className="text-center">OVERALL PROGRESS</th>
                  <th className="text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {data.map((dept, index) => {
                  // Find admin or fallback
                  const admin = dept.users.find(u => u.role === 'department_admin') || dept.users[0];
                  const adminName = admin ? admin.name : 'Unassigned';
                  const initials = admin ? getInitials(adminName) : dept.department.substring(0, 2).toUpperCase();

                  // Determine progress bar color
                  const progress = dept.completionRate || 0;
                  let progressColor = '#021c3b'; // dark blue
                  if (progress < 40) progressColor = '#ef4444'; // red
                  else if (progress < 75) progressColor = '#f59e0b'; // yellow
                  else if (progress > 90) progressColor = '#10b981'; // green

                  return (
                    <React.Fragment key={dept.department}>
                      <tr 
                        className="breakdown-row"
                        onClick={() => toggleExpand(dept.department)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Department & Admin */}
                        <td>
                        <div className="dept-admin-cell">
                          <div className={`avatar bg-color-${index % 5}`}>{initials}</div>
                          <div className="dept-admin-info">
                            <span className="dept-name-full">{dept.department}</span>
                            <span className="admin-name">{adminName} &bull; {admin?.role === 'department_admin' ? 'Admin' : 'Staff'}</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Total Tasks */}
                      <td className="text-center">
                        <span className="total-tasks-val">{dept.totalTasksGiven}</span>
                      </td>

                      {/* Status Distribution */}
                      <td>
                        <div className="status-pills">
                          <span className="status-pill comp">{dept.totalTasksCompleted} Comp</span>
                          <span className="status-pill rev">{dept.totalTasksInReview} Rev</span>
                          <span className="status-pill pend">{dept.totalTasksPending} Pend</span>
                        </div>
                      </td>

                      {/* Overall Progress */}
                      <td className="text-center">
                        <div className="progress-cell">
                          <div className="progress-bar-flat-bg">
                            <div 
                              className="progress-bar-flat-fill" 
                              style={{ width: `${progress}%`, backgroundColor: progressColor }}
                            ></div>
                          </div>
                          <span className="progress-val">{progress}%</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="text-center">
                        <button className="action-arrow">
                          {expandedDept === dept.department ? <ChevronUp size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </td>
                    </tr>
                    
                    {expandedDept === dept.department && (
                      <tr className="expanded-row-container">
                        <td colSpan={5} className="expanded-cell">
                          <table className="user-table">
                            <thead>
                              <tr>
                                <th>NAME</th>
                                <th>ROLE</th>
                                <th className="text-center">TOTAL</th>
                                <th className="text-center">PENDING</th>
                                <th className="text-center">IN REVIEW</th>
                                <th className="text-center">COMPLETED</th>
                                <th className="text-center">PROGRESS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dept.users.map(user => {
                                const userCompletion = user.tasksGiven > 0 ? Math.round((user.tasksCompleted / user.tasksGiven) * 100) : 0;
                                return (
                                  <tr key={user._id}>
                                    <td>
                                      <div className="user-name-cell">
                                        <div className="user-avatar">{getInitials(user.name)}</div>
                                        <span>{user.name}</span>
                                      </div>
                                    </td>
                                    <td><span className="user-role">{user.role === 'department_admin' ? 'Admin' : 'Staff'}</span></td>
                                    <td className="text-center font-semibold">{user.tasksGiven}</td>
                                    <td className="text-center"><span className="status-dot pending"></span>{user.tasksPending}</td>
                                    <td className="text-center"><span className="status-dot review"></span>{user.tasksInReview}</td>
                                    <td className="text-center"><span className="status-dot completed"></span>{user.tasksCompleted}</td>
                                    <td>
                                      <div className="user-progress-bar">
                                        <div className="progress-bar-fill" style={{ width: `${userCompletion}%`, backgroundColor: userCompletion === 100 ? '#10b981' : '#6366f1' }}></div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">No department data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NaacDashboardPage;

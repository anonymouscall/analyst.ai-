import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, LogOut, Database, Zap, Clock, AlertTriangle } from 'lucide-react';

interface AuditLog {
  id: number;
  question: string;
  sql_query: string;
  latency_ms: number;
  results_count: number;
  status: string;
  created_at: string;
}

interface User {
  id: number;
  email: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, cacheHits: 0, avgLatency: 0 });
  const navigate = useNavigate();

  // Tabs state
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'connection'>('logs');
  
  // Config state
  const [config, setConfig] = useState({ type: 'sqlite', sqlitePath: 'database.sqlite', host: '', port: '', database: 'database.sqlite', username: '' });
  const [dbType, setDbType] = useState('sqlite');
  const [sqlitePath, setSqlitePath] = useState('database.sqlite');
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('');
  const [dbName, setDbName] = useState('');
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSignOut = async () => {
    const token = localStorage.getItem('admin-auth-token');
    if (token) {
      try {
        await fetch('http://localhost:5000/api/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    localStorage.removeItem('admin-auth-token');
    localStorage.removeItem('admin-auth-email');
    window.dispatchEvent(new Event('db-status-changed'));
    navigate('/login');
  };

  const handleDisconnectDb = async () => {
    if (!window.confirm('Are you sure you want to disconnect and delete the active database configuration and any uploaded files?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('admin-auth-token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch('http://localhost:5000/api/admin/delete-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(data.message || 'Database disconnected successfully.');
        fetchConfig();
        window.dispatchEvent(new Event('db-status-changed'));
      } else {
        alert(data.error || 'Failed to disconnect database.');
      }
    } catch (err: any) {
      alert(err.message || 'Error disconnecting database.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('admin-auth-token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        if (response.status === 401) {
          handleSignOut();
        } else {
          setError(data.error || 'Failed to fetch audit logs.');
        }
      } else {
        setLogs(data.logs);
        calculateStats(data.logs);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to database logging API.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    const token = localStorage.getItem('admin-auth-token');
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await response.json();
      if (response.ok && d.success) {
        setUsers(d.users);
      } else if (response.status === 401) {
        handleSignOut();
      }
    } catch (err) {
      console.error('Error fetching registered users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchConfig = async () => {
    const token = localStorage.getItem('admin-auth-token');
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await response.json();
      if (response.ok && d.success) {
        if (d.config) {
          setConfig(d.config);
          setDbType(d.config.type);
          setSqlitePath(d.config.sqlitePath || 'database.sqlite');
          setDbHost(d.config.host || '');
          setDbPort(d.config.port || '');
          setDbName(d.config.database || '');
          setDbUser(d.config.username || '');
        } else {
          setConfig({ type: 'NONE', sqlitePath: '', host: '', port: '', database: 'No Database Configured', username: '' });
          setDbType('sqlite');
          setSqlitePath('database.sqlite');
          setDbHost('');
          setDbPort('');
          setDbName('');
          setDbUser('');
        }
      }
    } catch (err) {
      console.error('Error fetching connection config:', err);
    }
  };

  const calculateStats = (logData: AuditLog[]) => {
    const total = logData.length;
    const cacheHits = logData.filter(log => log.status.includes('cached')).length;
    const successful = logData.filter(log => log.status === 'success' && log.latency_ms > 0);
    const sumLatency = successful.reduce((sum, log) => sum + log.latency_ms, 0);
    setStats({
      total,
      cacheHits,
      avgLatency: successful.length > 0 ? parseFloat((sumLatency / successful.length).toFixed(1)) : 0,
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('admin-auth-token');
    try {
      const response = await fetch('http://localhost:5000/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: dbType,
          sqlitePath,
          host: dbHost,
          port: dbPort,
          database: dbName,
          username: dbUser,
          password: dbPassword
        })
      });
      const d = await response.json();
      if (response.ok && d.success) {
        alert('Database connection config saved successfully!');
        fetchConfig();
      } else {
        alert(d.error || 'Failed to save database config.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving database connection settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (!base64) return;
      try {
        const token = localStorage.getItem('admin-auth-token');
        const res = await fetch('http://localhost:5000/api/admin/upload-db', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ fileName: file.name, fileContent: base64 })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          alert('Database file uploaded and connected successfully!');
          fetchConfig();
        } else {
          alert(d.error || 'Failed to upload database file.');
        }
      } catch (err: any) {
        alert(err.message || 'Error uploading file.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchLogs();
    fetchConfig();
    fetchUsers();
  }, []);

  return (
    <div className="admin-container container animate-fade-in">
      <div className="admin-header-row">
        <div className="section-header">
          <span className="section-label">[ Database Security Audits ]</span>
          <h2>Administrator Portal</h2>
          <p>Review database query compilations, database connection profiles, and cache state controls.</p>
        </div>
        <div className="admin-controls">
          <button
            className="btn-secondary"
            onClick={async () => {
              const token = localStorage.getItem('admin-auth-token');
              try {
                const response = await fetch('http://localhost:5000/api/admin/clear-cache', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                });
                const data = await response.json();
                if (response.ok && data.success) {
                  alert('RAM Query Cache flushed successfully!');
                } else {
                  alert(data.error || 'Failed to flush cache.');
                }
              } catch (err: any) {
                alert('Error flushing cache: ' + err.message);
              }
            }}
          >
            <span>Flush Cache</span>
          </button>
          <button
            className="btn-secondary danger"
            onClick={async () => {
              if (!window.confirm('Are you sure you want to permanently delete all SQL execution audit logs?')) return;
              const token = localStorage.getItem('admin-auth-token');
              try {
                const response = await fetch('http://localhost:5000/api/admin/clear-logs', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                });
                const data = await response.json();
                if (response.ok && data.success) {
                  setLogs([]);
                  setStats({ total: 0, cacheHits: 0, avgLatency: 0 });
                } else {
                  alert(data.error || 'Failed to clear logs.');
                }
              } catch (err: any) {
                alert('Error clearing audit logs: ' + err.message);
              }
            }}
          >
            <Trash2 size={13} />
            <span>Clear Logs</span>
          </button>
          <button className="btn-primary logout" onClick={handleSignOut}>
            <LogOut size={13} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
      
      <div className="admin-stats-grid">
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon-wrapper blue">
            <Database size={18} />
          </div>
          <div className="stat-data">
            <span className="stat-lbl">Active Database Profile</span>
            <span className="stat-val" style={{ fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div>
                {config.type.toUpperCase()}
                {config.type !== 'NONE' && (
                  <span className="sub-val" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}> ({config.database || config.sqlitePath})</span>
                )}
              </div>
              {config.type !== 'NONE' && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={handleDisconnectDb}
                  style={{
                    color: 'oklch(60% 0.15 20)',
                    border: '1px solid oklch(60% 0.15 20 / 0.2)',
                    background: 'oklch(60% 0.15 20 / 0.05)',
                    marginTop: '8px',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Disconnect & delete active database"
                  disabled={loading}
                >
                  <Trash2 size={11} />
                  <span>Disconnect</span>
                </button>
              )}
            </span>
          </div>
        </div>
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon-wrapper green">
            <Zap size={18} />
          </div>
          <div className="stat-data">
            <span className="stat-lbl">Cache Efficiency (Hits)</span>
            <span className="stat-val">
              {stats.total > 0 ? `${((stats.cacheHits / stats.total) * 100).toFixed(0)}%` : '0%'}
              <span className="sub-val"> ({stats.cacheHits} runs)</span>
            </span>
          </div>
        </div>
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon-wrapper purple">
            <Clock size={18} />
          </div>
          <div className="stat-data">
            <span className="stat-lbl">Mean Compile Latency</span>
            <span className="stat-val">{stats.avgLatency}ms</span>
          </div>
        </div>
      </div>

      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          Security Audit Logs ({logs.length})
        </button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          Registered Users ({users.length})
        </button>
        <button className={`tab-btn ${activeTab === 'connection' ? 'active' : ''}`} onClick={() => setActiveTab('connection')}>
          Database Connection Manager
        </button>
      </div>

      {activeTab === 'logs' && (
        <div className="admin-logs-panel glass-panel animate-fade-in">
          <div className="panel-header">
            <h4>Compiled Query Audit Logs</h4>
            <button className="btn-secondary btn-sm" onClick={fetchLogs} disabled={loading}>
              Refresh Logs
            </button>
          </div>
          {loading ? (
            <div className="panel-loading">
              <div className="spinner" />
              <span>Fetching secure SQLite audits...</span>
            </div>
          ) : error ? (
            <div className="panel-error">
              <AlertTriangle size={20} className="err-icon" />
              <span>{error}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="panel-empty">
              <span>No query audit logs found in database. Ask queries from the home page to populate logs.</span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>NL Question</th>
                    <th>Compiled SQL Query</th>
                    <th>Latency</th>
                    <th>Rows</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="col-time">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="date-sub">
                          {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="col-question" title={log.question}>
                        {log.question}
                      </td>
                      <td className="col-sql">
                        <code>{log.sql_query || 'N/A (Compilation Fail)'}</code>
                      </td>
                      <td>{log.latency_ms === 0 ? '-' : `${log.latency_ms}ms`}</td>
                      <td>{log.results_count}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            log.status.includes('cached') ? 'cached' : log.status === 'success' ? 'success' : 'error'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-logs-panel glass-panel animate-fade-in">
          <div className="panel-header">
            <h4>Registered Database Users</h4>
            <button className="btn-secondary btn-sm" onClick={fetchUsers} disabled={usersLoading}>
              Refresh Users
            </button>
          </div>
          {usersLoading ? (
            <div className="panel-loading">
              <div className="spinner" />
              <span>Fetching registered users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="panel-empty">
              <span>No registered users found in the database.</span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email Address</th>
                    <th>Sign Up Date</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="col-time" style={{ fontFamily: 'var(--font-mono)' }}>#{user.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{user.email}</td>
                      <td className="col-time">
                        {new Date(user.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                        <span className="date-sub">
                          {new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'connection' && (
        <div className="connection-panel glass-panel animate-fade-in" style={{ padding: '32px' }}>
          <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '24px' }}>
            <h4 style={{ margin: 0 }}>Configure Database Connection</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.6 }}>Set active connection profiles. Swaps real-time schemas instantly.</p>
          </div>

          <div className="connection-layout">
            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.6 }}>Database Engine Type</label>
                <select
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value)}
                  style={{
                    background: 'oklch(0% 0 0 / 0.15)',
                    color: 'var(--text-heading)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    outline: 'none',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="sqlite" style={{ background: 'var(--bg)' }}>SQLite (Local database file)</option>
                  <option value="postgres" style={{ background: 'var(--bg)' }}>PostgreSQL Database Connection</option>
                  <option value="mysql" style={{ background: 'var(--bg)' }}>MySQL Database Connection</option>
                  <option value="snowflake" style={{ background: 'var(--bg)' }}>Snowflake Data Warehouse</option>
                </select>
              </div>

              {dbType === 'sqlite' ? (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.6 }}>SQLite File Path</label>
                  <input
                    type="text"
                    value={sqlitePath}
                    onChange={(e) => setSqlitePath(e.target.value)}
                    placeholder="e.g. database.sqlite"
                    className="form-input"
                    required
                  />
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.6 }}>Database Host Endpoint</label>
                      <input
                        type="text"
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        placeholder="e.g. host.internal.vpc or db.example.com"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.6 }}>Port</label>
                      <input
                        type="text"
                        value={dbPort}
                        onChange={(e) => setDbPort(e.target.value)}
                        placeholder={dbType === 'postgres' ? '5432' : '3306'}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.6 }}>Database Name</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      placeholder="e.g. prod_sales_analytics"
                      className="form-input"
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.6 }}>Username</label>
                      <input
                        type="text"
                        value={dbUser}
                        onChange={(e) => setDbUser(e.target.value)}
                        placeholder="db_read_user"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.6 }}>Password</label>
                      <input
                        type="password"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', marginTop: '14px' }}>
                {saving ? 'Testing & Loading Profile...' : 'Save & Connect'}
              </button>
            </form>

            <div className="connection-info-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '1px solid var(--border)', paddingLeft: '32px' }}>
              <div>
                <h5 style={{ color: 'var(--text-heading)', margin: '0 0 8px 0', fontSize: '0.9rem' }}>SQLite Database File Upload</h5>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.5, margin: '0 0 14px 0' }}>
                  Business owners without technical backend configurations can directly drag or choose a database file (`.sqlite` or `.db`) here. It will immediately mount and switch the active RAG compile context to your schema.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="file"
                    accept=".sqlite,.db"
                    onChange={handleFileUpload}
                    id="db-upload"
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  <label htmlFor="db-upload" className="btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={13} />
                    {uploading ? 'Processing File...' : 'Choose SQLite Database'}
                  </label>
                </div>
              </div>

              <div style={{ background: 'oklch(72% 0.16 195 / 0.03)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px' }}>
                <h6 style={{ color: 'var(--text-heading)', fontSize: '0.8rem', margin: '0 0 8px 0' }}>Connection Telemetry</h6>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <div>Engine Profile: {config.type.toUpperCase()}</div>
                  {config.type !== 'NONE' && (
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Database: {config.database || config.sqlitePath}</div>
                  )}
                  {config.type !== 'sqlite' && config.type !== 'NONE' && (
                    <>
                      <div>Host Endpoint: {config.host || 'N/A'}</div>
                      <div>Active User: {config.username || 'N/A'}</div>
                    </>
                  )}
                  {config.type !== 'NONE' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', marginTop: '4px' }}>
                      <span className="pulse-indicator glow" style={{ background: 'var(--accent)' }} />
                      <span>Secure MCP Tunnel active</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'oklch(60% 0.15 20)', marginTop: '4px' }}>
                      <span className="pulse-indicator" style={{ background: 'oklch(60% 0.15 20)' }} />
                      <span>No active database</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          margin-bottom: 40px;
          gap: 20px;
        }
        .admin-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .admin-controls .danger:hover {
          border-color: oklch(65% 0.18 20);
          color: oklch(65% 0.18 20);
        }
        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        @media (max-width: 900px) {
          .admin-stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .admin-stat-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
        }
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon-wrapper.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .stat-icon-wrapper.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        
        .stat-data {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .stat-lbl {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.6;
        }
        .stat-val {
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--text-heading);
          display: flex;
          align-items: baseline;
          gap: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sub-val {
          font-size: 0.8rem;
          font-weight: normal;
          opacity: 0.5;
        }
        .admin-logs-panel {
          padding: 24px;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .panel-loading, .panel-error, .panel-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          gap: 12px;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .table-responsive {
          overflow-x: auto;
          width: 100%;
        }
        .logs-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }
        .logs-table th {
          padding: 12px 16px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          font-size: 0.75rem;
          opacity: 0.5;
          border-bottom: 1px solid var(--border);
        }
        .logs-table td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .col-time {
          font-family: var(--font-mono);
          white-space: nowrap;
        }
        .date-sub {
          display: block;
          font-size: 0.65rem;
          opacity: 0.4;
          margin-top: 2px;
        }
        .col-question {
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .col-sql {
          font-family: var(--font-mono);
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        .status-badge.success { background: oklch(70% 0.15 140 / 0.1); color: oklch(70% 0.15 140); }
        .status-badge.cached { background: oklch(72% 0.16 195 / 0.1); color: oklch(72% 0.16 195); }
        .status-badge.error { background: oklch(65% 0.18 20 / 0.1); color: oklch(65% 0.18 20); }

        /* Tabs styling */
        .tabs-header {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }
        .tab-btn {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          opacity: 0.6;
          font-family: var(--font-sans);
          font-size: 0.88rem;
          font-weight: 600;
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.3s;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }
        .tab-btn:hover {
          opacity: 0.9;
          color: var(--text-heading);
        }
        .tab-btn.active {
          opacity: 1;
          color: var(--accent);
          border-bottom-color: var(--accent);
        }

        /* Connection manager panel */
        .connection-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 40px;
        }
        @media (max-width: 900px) {
          .connection-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .connection-info-panel {
            border-left: none !important;
            padding-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
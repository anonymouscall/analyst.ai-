import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import { useQuery } from '../context/QueryContext';
import { Database, ArrowRight, RefreshCw, Settings, Trash2, MessageSquare } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const {
    question,
    setQuestion,
    loading,
    status,
    messages,
    submitQuery,
    clearMessages,
  } = useQuery();

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('admin-auth-token');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  // Connection state
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    type: string;
    database: string;
    summary?: {
      tables: { name: string; rows: number; fields: string[] }[];
      totalRows: number;
      totalTables: number;
    };
  }>({ connected: false, type: 'sqlite', database: '' });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Ingestion states
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const fetchDbStatus = async () => {
    try {
      const token = localStorage.getItem('admin-auth-token');
      const response = await fetch('http://localhost:5000/api/db-status', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      let d;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        d = await response.json();
      } else {
        throw new Error('Server returned HTML or invalid response format.');
      }
      if (response.ok && d.success) {
        setDbStatus({
          connected: d.connected,
          type: d.type,
          database: d.database,
          summary: d.summary,
        });
      }
    } catch (err) {
      console.error('Error fetching db status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    const handleDbChange = () => fetchDbStatus();
    window.addEventListener('db-status-changed', handleDbChange);
    return () => window.removeEventListener('db-status-changed', handleDbChange);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFileProcess = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'sqlite' && ext !== 'db' && ext !== 'json') {
      alert('Only .sqlite, .db, and .json files are supported.');
      return;
    }

    setUploading(true);
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (!base64) return;
      try {
        const token = localStorage.getItem('admin-auth-token') || 'mock-admin-token-jwt';
        const res = await fetch('http://localhost:5000/api/admin/upload-db', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fileName: file.name, fileContent: base64 }),
        });
        let d;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          d = await res.json();
        } else {
          const text = await res.text();
          throw new Error(text || `Server returned HTML error status ${res.status}`);
        }
        if (res.ok && d.success) {
          alert(d.message || 'Database connected successfully!');
          setShowSettings(false);
          fetchDbStatus();
        } else {
          alert(d.error || 'Failed to upload database.');
        }
      } catch (err: any) {
        alert(err.message || 'Error uploading database.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  /* ════════════════════════════
     LOADING STATE
  ════════════════════════════ */
  if (checkingStatus) {
    return (
      <div className="content-page container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text)' }} />
          <span style={{ fontSize: '0.88rem', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>Verifying secure database status...</span>
        </div>
      </div>
    );
  }

  /* ════════════════════════════
     CONNECTION SETUP PANEL
  ════════════════════════════ */
  if (!dbStatus.connected || showSettings) {
    return (
      <div className="content-page container animate-fade-in" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="section-header" style={{ maxWidth: '640px', margin: '0 auto 40px auto', textAlign: 'center' }}>
          <span className="section-label">[ Connection Required ]</span>
          <h2>Setup Workspace Database</h2>
          <p>Please upload a database file or dataset export to begin querying analytics in natural language.</p>
        </div>

        <div className="connection-panel glass-panel" style={{ padding: '40px 32px', maxWidth: '600px', margin: '0 auto' }}>
          <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Configure Connection</h4>
            {dbStatus.connected && (
              <button className="btn-secondary btn-sm" onClick={() => setShowSettings(false)}>
                Back to Workspace
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '0.82rem', opacity: 0.7, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                Drag and drop a database file (<code>.sqlite</code>, <code>.db</code>) or a dataset export (<code>.json</code>) into the zone below.
              </p>

              <div
                className={`upload-drag-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileProcess(file);
                }}
                onClick={() => document.getElementById('db-upload')?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? 'var(--accent-glow)' : 'transparent',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <Database size={32} style={{ opacity: 0.8, color: 'var(--text-heading)' }} />
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-heading)', display: 'block' }}>
                      {uploading ? 'Processing file...' : 'Drag & drop file here'}
                    </span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                      or click to browse local files
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".sqlite,.db,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileProcess(file);
                  }}
                  id="db-upload"
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </div>

              {uploadedFileName && (
                <p style={{ fontSize: '0.78rem', opacity: 0.7, fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
                  📄 {uploadedFileName}
                </p>
              )}
            </div>

            {dbStatus.connected && (
              <div style={{ background: 'oklch(100% 0 0 / 0.02)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px' }}>
                <h6 style={{ color: 'var(--text-heading)', fontSize: '0.82rem', margin: '0 0 10px 0', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Connection Info</h6>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ opacity: 0.6 }}>Active File Name:</span>
                    <span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{dbStatus.database}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ opacity: 0.6 }}>Engine Type:</span>
                    <span style={{ textTransform: 'uppercase' }}>{dbStatus.type}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-heading)', marginTop: '6px', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                    <span className="pulse-indicator" style={{ background: '#ffffff', boxShadow: '0 0 8px #ffffff' }} />
                    <span>Secure MCP Tunnel Active</span>
                  </div>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to disconnect and delete the active database configuration?')) return;
                      try {
                        const token = localStorage.getItem('admin-auth-token') || 'mock-admin-token-jwt';
                        const res = await fetch('http://localhost:5000/api/admin/delete-db', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        const d = await res.json().catch(() => null);
                        if (res.ok && d?.success) {
                          alert(d.message || 'Database disconnected successfully!');
                          fetchDbStatus();
                          window.dispatchEvent(new Event('db-status-changed'));
                        } else {
                          alert(d?.error || 'Failed to disconnect database.');
                        }
                      } catch (err: any) {
                        alert(err.message || 'Error disconnecting database.');
                      }
                    }}
                    style={{
                      marginTop: '12px',
                      width: '100%',
                      justifyContent: 'center',
                      color: 'oklch(60% 0.15 20)',
                      border: '1px solid oklch(60% 0.15 20 / 0.2)',
                      background: 'oklch(60% 0.15 20 / 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Disconnect Database</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════
     MAIN CHAT INTERFACE
  ════════════════════════════ */
  const hasSummary = !!dbStatus.summary && dbStatus.summary.totalTables > 0;
  const hasMessages = messages.length > 0;

  return (
    <section id="dashboard" className="chat-layout animate-fade-in">
      {/* ── Top Bar ── */}
      <div className="chat-topbar">
        <div className="chat-topbar__left">
          <MessageSquare size={18} style={{ opacity: 0.6 }} />
          <h3>Data Analytics Console</h3>
        </div>
        <div className="chat-topbar__right">
          {hasMessages && (
            <button className="btn-ghost" onClick={clearMessages} title="Clear chat">
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          )}
          <button className="btn-ghost" onClick={() => setShowSettings(true)}>
            <Settings size={14} />
            <span>Connection</span>
          </button>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="chat-area" ref={chatAreaRef}>
        {/* Schema Explorer (shown only when no messages) */}
        {!hasMessages && hasSummary && (
          <div className="chat-welcome animate-fade-in">
            <div className="chat-welcome__icon">
              <Database size={28} />
            </div>
            <h2>Ready to Analyze</h2>
            <p className="chat-welcome__sub">
              Your database <strong>{dbStatus.database}</strong> is connected with {dbStatus.summary!.totalTables} table{dbStatus.summary!.totalTables > 1 ? 's' : ''} and {dbStatus.summary!.totalRows.toLocaleString()} records.
            </p>

            <div className="chat-schema-grid">
              {dbStatus.summary!.tables.map((table) => (
                <div key={table.name} className="chat-schema-card glass-panel">
                  <div className="chat-schema-card__header">
                    <span className="chat-schema-card__name">{table.name}</span>
                    <span className="chat-schema-card__badge">{table.rows} rows</span>
                  </div>
                  <div className="chat-schema-card__fields">
                    {table.fields.map((f) => (
                      <span key={f} className="chat-schema-field">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-suggestions">
              <span className="chat-suggestions__label">Try asking:</span>
              <div className="chat-suggestions__list">
                <button className="chat-suggestion-chip" onClick={() => setQuestion(`Show all data in ${dbStatus.summary!.tables[0].name}`)}>
                  Show all data in {dbStatus.summary!.tables[0].name}
                </button>
                {dbStatus.summary!.tables[0].fields.length > 1 && (
                  <button className="chat-suggestion-chip" onClick={() => setQuestion(`Plot ${dbStatus.summary!.tables[0].fields[0]} vs ${dbStatus.summary!.tables[0].fields[1]} as a bar chart`)}>
                    Plot {dbStatus.summary!.tables[0].fields[0]} vs {dbStatus.summary!.tables[0].fields[1]} as bar chart
                  </button>
                )}
                <button className="chat-suggestion-chip" onClick={() => setQuestion(`How many rows are in ${dbStatus.summary!.tables[0].name}?`)}>
                  How many rows in {dbStatus.summary!.tables[0].name}?
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no db summary and no messages */}
        {!hasMessages && !hasSummary && (
          <div className="chat-welcome animate-fade-in">
            <div className="chat-welcome__icon">
              <Database size={28} />
            </div>
            <h2>Database Connected</h2>
            <p className="chat-welcome__sub">Start asking questions about your data in plain English.</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        <div ref={chatEndRef} />
      </div>

      {/* ── Bottom Input Bar ── */}
      <div className="chat-input-bar">
        {loading && status && (
          <div className="chat-status-strip">
            <span className="pulse-indicator glow" style={{ background: '#ffffff', boxShadow: '0 0 8px #ffffff' }} />
            <span>{status}</span>
          </div>
        )}
        <form onSubmit={submitQuery} className="chat-input-form">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about your data..."
            className="chat-input"
            disabled={loading}
          />
          <button type="submit" className="chat-send-btn" disabled={loading || !question.trim()}>
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </section>
  );
};

export default DashboardPage;
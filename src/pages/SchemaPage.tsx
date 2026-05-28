import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Columns,
  Hash,
  RefreshCw,
  UploadCloud,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface TableInfo {
  name: string;
  rows: number;
  fields: string[];
}

interface DbSummary {
  tables: TableInfo[];
  totalRows: number;
  totalTables: number;
}

const TableCard: React.FC<{ table: TableInfo; maxRows: number }> = ({ table, maxRows }) => {
  const [open, setOpen] = useState(true);
  const fillPct = Math.max(4, (table.rows / Math.max(1, maxRows)) * 100);

  return (
    <div
      className="glass-panel schema-table-card"
      style={{ overflow: 'hidden', transition: 'all 0.25s' }}
    >
      {/* Card header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-heading)',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {open ? <ChevronDown size={14} style={{ opacity: 0.6 }} /> : <ChevronRight size={14} style={{ opacity: 0.6 }} />}
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>
            {table.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--primary)',
            borderRadius: '4px',
            padding: '2px 8px',
            color: 'var(--primary)',
            background: 'oklch(55% 0.2 270 / 0.1)',
          }}>
            {table.rows.toLocaleString()} rows
          </span>
          <span style={{
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '2px 8px',
            color: 'var(--text)',
            opacity: 0.7,
          }}>
            {table.fields.length} cols
          </span>
        </div>
      </button>

      {/* Row volume bar */}
      <div style={{ height: '3px', background: 'var(--border)' }}>
        <div style={{
          height: '100%',
          width: `${fillPct}%`,
          background: 'linear-gradient(90deg, var(--primary), var(--accent))',
          transition: 'width 0.6s ease',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>

      {/* Fields list */}
      {open && (
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
          {table.fields.map((field) => (
            <div key={field} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text)',
              padding: '6px 10px',
              borderRadius: '5px',
              background: 'oklch(100% 0 0 / 0.03)',
              border: '1px solid var(--border)',
            }}>
              <Columns size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{field}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SchemaPage: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('admin-auth-token');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin-auth-token');
      const response = await fetch('http://localhost:5000/api/db-status', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const d = await response.json();
        if (d.success) setDbStatus(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    const handleDbChange = () => fetchDbStatus();
    window.addEventListener('db-status-changed', handleDbChange);
    return () => window.removeEventListener('db-status-changed', handleDbChange);
  }, []);

  const summary: DbSummary | undefined = dbStatus?.summary;
  const maxRows = summary ? Math.max(...summary.tables.map((t) => t.rows), 1) : 1;

  return (
    <section id="schema" className="container animate-fade-in" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '40px' }}>
        <div className="section-header" style={{ margin: 0 }}>
          <span className="section-label">[ Schema Explorer ]</span>
          <h2>Data Dictionary</h2>
          <p>Complete overview of all tables, columns, and record volumes in your active database.</p>
        </div>
        <button className="btn-secondary" onClick={fetchDbStatus} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', opacity: 0.5, padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={24} className="animate-spin" />
          <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>Fetching schema...</span>
        </div>
      )}

      {/* No DB connected */}
      {!loading && (!dbStatus?.connected || !summary) && (
        <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
            <Database size={28} />
          </div>
          <h3>No Database Connected</h3>
          <p style={{ opacity: 0.6, maxWidth: '400px', lineHeight: 1.6 }}>
            Use the <UploadCloud size={14} style={{ verticalAlign: 'middle' }} /> button in the top navigation to upload a{' '}
            <code>.sqlite</code>, <code>.db</code>, or <code>.json</code> file to explore its schema here.
          </p>
        </div>
      )}

      {/* Schema content */}
      {!loading && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Summary bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                <Layers size={13} /> Tables
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-heading)', fontFamily: 'var(--font-mono)' }}>
                {summary.totalTables}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                <Hash size={13} /> Total Rows
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-heading)', fontFamily: 'var(--font-mono)' }}>
                {summary.totalRows.toLocaleString()}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                <Columns size={13} /> Largest Table
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {summary.tables.sort((a, b) => b.rows - a.rows)[0]?.name || '—'}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                <Database size={13} /> Engine
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {dbStatus?.type || 'SQLite'}
              </div>
            </div>
          </div>

          {/* Table cards */}
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text-heading)', fontSize: '1.1rem' }}>
              <Layers size={18} style={{ color: 'var(--primary)' }} />
              Table Definitions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[...summary.tables]
                .sort((a, b) => b.rows - a.rows)
                .map((table) => (
                  <TableCard key={table.name} table={table} maxRows={maxRows} />
                ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          #schema h2 { font-size: 1.6rem !important; }
          .schema-table-card { font-size: 0.8rem; }
        }
      `}</style>
    </section>
  );
};

export default SchemaPage;

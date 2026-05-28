import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Download, Check, Clipboard, RefreshCw, ChevronDown, ChevronRight, AlertCircle, Trash2, ArrowUpRight } from 'lucide-react';
import { useQuery } from '../context/QueryContext';
import SQLVisualizer from '../components/SQLVisualizer';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface HistoryItem {
  id: number;
  email: string;
  question: string;
  explanation: string;
  chart_config: string;
  results_data: string;
  sql_code: string;
  created_at: string;
}

const CollapsibleResults: React.FC<{ chartConfig: any; data: any }> = ({ chartConfig, data }) => {
  const [open, setOpen] = useState(false);
  const [copiedData, setCopiedData] = useState(false);

  const handleCopyData = () => {
    if (!data || data.length === 0) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 2000);
  };

  const hasChart = chartConfig && chartConfig.type !== 'none' && !!chartConfig.xAxisKey && !!chartConfig.yAxisKeys && chartConfig.yAxisKeys.length > 0;
  const xAxisKey = chartConfig?.xAxisKey;
  const yAxisKeys = chartConfig?.yAxisKeys || [];
  const chartType = chartConfig?.type;

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)' }}>
      <button 
        type="button"
        className="btn-secondary btn-sm"
        style={{ marginTop: '16px', width: '100%', justifyContent: 'center', gap: '6px' }}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{open ? 'Hide Charts & Results' : 'View Saved Charts & Results'}</span>
      </button>
      
      {open && (
        <div className="animate-fade-in" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {hasChart ? (
            <div className="chart-panel glass-panel" style={{ padding: '16px 20px', background: 'oklch(100% 0 0 / 0.01)' }}>
              <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-heading)' }}>Saved Chart Visualization</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.6 }}>
                    Dynamic plot mapping {yAxisKeys.join(', ')} over {xAxisKey}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {yAxisKeys.map((key: string, idx: number) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: idx === 0 ? 'var(--primary)' : 'var(--accent)' }} />
                      <span>{key}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                      <XAxis dataKey={xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                      <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'rgba(10, 11, 15, 0.9)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)' }} />
                      {yAxisKeys.map((key: string, idx: number) => (
                        <Bar key={key} dataKey={key} fill={idx === 0 ? 'var(--primary)' : 'var(--accent)'} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                      <XAxis dataKey={xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                      <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'rgba(10, 11, 15, 0.9)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)' }} />
                      {yAxisKeys.map((key: string, idx: number) => (
                        <Line key={key} type="monotone" dataKey={key} stroke={idx === 0 ? 'var(--primary)' : 'var(--accent)'} strokeWidth={2.5} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  ) : (
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorQueriesHist" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLatencyHist" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                      <XAxis dataKey={xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                      <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'rgba(10, 11, 15, 0.9)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)' }} />
                      {yAxisKeys.map((key: string, idx: number) => (
                        <Area key={key} type="monotone" dataKey={key} stroke={idx === 0 ? 'var(--primary)' : 'var(--accent)'} strokeWidth={2} fillOpacity={1} fill={idx === 0 ? 'url(#colorQueriesHist)' : 'url(#colorLatencyHist)'} />
                      ))}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          ) : data && data.length > 0 ? (
            <div style={{ background: 'oklch(100% 0 0 / 0.01)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px', fontSize: '0.8rem', opacity: 0.8 }}>
              Tabular Dataset Loaded: The compiler resolved this query to a list-only database view. No numeric timeseries trends were identified for charting. See the results table below.
            </div>
          ) : null}

          {data && data.length > 0 && (
            <div className="chart-panel glass-panel" style={{ padding: '16px 20px', background: 'oklch(100% 0 0 / 0.01)' }}>
              <div className="chart-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-heading)' }}>Results Data Table</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleCopyData}
                    className="btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    <span>{copiedData ? 'Copied!' : 'Copy Data'}</span>
                  </button>
                  <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                    {data.length} Rows
                  </span>
                </div>
              </div>
              <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="results-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      {Object.keys(data[0]).map((key) => (
                        <th key={key} className="mono" style={{ padding: '8px 10px', fontSize: '0.7rem' }}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row: any, idx: number) => (
                      <tr key={idx}>
                        {Object.keys(data[0]).map((key) => (
                          <td key={key} style={{ padding: '8px 10px' }} className={typeof row[key] === 'number' ? 'mono' : ''}>
                            {row[key] !== null && row[key] !== undefined ? String(row[key]) : 'NULL'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('admin-auth-token');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  const { restoreSavedQuery } = useQuery();
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('admin-auth-token');
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHistoryList(data.history || []);
      } else {
        setError(data.error || 'Failed to fetch history.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failure to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to delete your entire persistent query history?')) return;
    const token = localStorage.getItem('admin-auth-token');
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/clear-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHistoryList([]);
      } else {
        alert(data.error || 'Failed to clear history.');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred clearing history.');
    }
  };

  const handleCopy = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (code: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'query.sql';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (item: HistoryItem) => {
    try {
      const config = JSON.parse(item.chart_config || '{}');
      const data = JSON.parse(item.results_data || '[]');
      restoreSavedQuery(item.question, item.explanation, config, data, item.sql_code);
      navigate('/dashboard');
    } catch (e) {
      console.error('Failed to parse and restore saved query config:', e);
      alert('Failed to restore this query. Data might be corrupted.');
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchHistory();
    }
  }, [isLoggedIn]);

  return (
    <section id="history" className="container animate-fade-in" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '40px' }}>
        <div className="section-header" style={{ margin: 0 }}>
          <span className="section-label">[ 03 / Query History ]</span>
          <h2>Saved Queries Log</h2>
          <p>Review and reuse previously executed SQLite queries, charts, and datasets stored in your persistent profile.</p>
        </div>
        
        {historyList.length > 0 && (
          <button 
            className="btn-secondary danger" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}
            onClick={handleClearHistory}
          >
            <Trash2 size={13} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', opacity: 0.5, padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={24} className="animate-spin" />
          <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>Loading your history catalog...</span>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'oklch(65% 0.18 20)' }}>
          <AlertCircle size={32} style={{ marginBottom: '12px' }} />
          <h3>Error Loading History</h3>
          <p>{error}</p>
        </div>
      ) : historyList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Clock size={48} style={{ opacity: 0.3, marginBottom: '24px' }} />
          <h3>No Query History</h3>
          <p style={{ opacity: 0.7, maxWidth: '400px' }}>
            Run English queries on the Dashboard page to build your persistent log. All generated SQL code, explanations, and visual charts will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {historyList.map((item, idx) => {
            let parsedChartConfig = {};
            let parsedResultsData = [];
            try {
              parsedChartConfig = JSON.parse(item.chart_config || '{}');
              parsedResultsData = JSON.parse(item.results_data || '[]');
            } catch (err) {
              console.error('Error parsing inline item data:', err);
            }

            return (
              <div key={item.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="badge badge-accent" style={{ fontFamily: 'var(--font-mono)' }}>Query #{historyList.length - idx}</span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
                        {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-heading)', margin: '4px 0 0 0', fontWeight: 600 }}>
                      "{item.question}"
                    </h3>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn-primary btn-sm" 
                      onClick={() => handleRestore(item)}
                      style={{ padding: '6px 12px', gap: '6px' }}
                    >
                      <ArrowUpRight size={14} />
                      <span>Restore to Dashboard</span>
                    </button>
                    <button className="btn-secondary btn-sm" onClick={() => handleCopy(item.id, item.sql_code)} style={{ padding: '6px 12px' }}>
                      {copiedId === item.id ? <Check size={14} className="accent-icon" style={{ color: 'var(--accent)' }} /> : <Clipboard size={14} />}
                      <span>{copiedId === item.id ? 'Copied' : 'Copy SQL'}</span>
                    </button>
                    <button className="btn-secondary btn-sm" onClick={() => handleDownload(item.sql_code)} style={{ padding: '6px 12px' }} title="Download SQL">
                      <Download size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'start' }} className="history-details-layout">
                  <div>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.5, display: 'block', marginBottom: '8px' }}>Analysis Explanation</span>
                    <div style={{ fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text)', opacity: 0.9 }}>
                      {item.explanation || 'No explanation provided.'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', opacity: 0.5, display: 'block', marginBottom: '8px' }}>Compiled SQL</span>
                    <SQLVisualizer sql={item.sql_code} />
                  </div>
                </div>

                <CollapsibleResults chartConfig={parsedChartConfig} data={parsedResultsData} />
              </div>
            );
          })}
        </div>
      )}
      
      <style>{`
        .history-details-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
        }
        @media (max-width: 820px) {
          .history-details-layout {
            grid-template-columns: 1fr;
          }
        }
        .table-responsive {
          overflow-x: auto;
          width: 100%;
        }
        .results-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.82rem;
        }
        .results-table th {
          padding: 8px 10px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          font-size: 0.72rem;
          opacity: 0.5;
          border-bottom: 1px solid var(--border);
          color: var(--text-heading);
        }
        .results-table td {
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
          color: var(--text);
          opacity: 0.9;
        }
        .results-table tr:hover td {
          background: oklch(100% 0 0 / 0.02);
          color: var(--text-heading);
        }
        .results-table tr:last-child td {
          border-bottom: none;
        }
        .mono {
          font-family: var(--font-mono);
        }
      `}</style>
    </section>
  );
};

export default HistoryPage;

import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Database, Clock, Activity, Copy } from 'lucide-react';
import SQLVisualizer from './SQLVisualizer';
import Schema3DVisualizer from './Schema3DVisualizer';

interface MetricsDashboardProps {
  data?: any[];
  chartConfig?: {
    type: 'area' | 'bar' | 'line' | 'none';
    xAxisKey: string;
    yAxisKeys: string[];
  };
  sqlCode?: string;
  question?: string;
  dbStatus?: {
    connected: boolean;
    type: string;
    database: string;
    summary?: {
      tables: { name: string; rows: number; fields: string[] }[];
      totalRows: number;
      totalTables: number;
    };
  };
}

const DEFAULT_CHART_DATA = [
  { date: 'May 20', queries: 45000, latency: 120 },
  { date: 'May 21', queries: 48000, latency: 115 },
  { date: 'May 22', queries: 42000, latency: 140 },
  { date: 'May 23', queries: 51000, latency: 98 },
  { date: 'May 24', queries: 58000, latency: 102 },
  { date: 'May 25', queries: 54000, latency: 110 },
  { date: 'May 26', queries: 62000, latency: 94 }
];

const getSourceTable = (sql?: string) => {
  if (!sql) return 'Mixed';
  const match = sql.match(/from\s+([a-zA-Z0-9_]+)/i);
  return match ? match[1] : 'Mixed';
};

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ data, chartConfig, sqlCode, question, dbStatus }) => {
  const [copiedData, setCopiedData] = useState(false);

  const handleCopyData = () => {
    if (!data || data.length === 0) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 2000);
  };

  const isQueryActive = !!question && !!data && data.length > 0;
  const hasChart = isQueryActive && chartConfig && chartConfig.type !== 'none' && !!chartConfig.xAxisKey && !!chartConfig.yAxisKeys && chartConfig.yAxisKeys.length > 0;

  const chartData = hasChart ? data : DEFAULT_CHART_DATA;
  const chartType = hasChart ? chartConfig.type : 'area';
  const xAxisKey = hasChart ? chartConfig.xAxisKey : 'date';
  const yAxisKeys = hasChart ? chartConfig.yAxisKeys : ['queries', 'latency'];

  const hasSummary = !!dbStatus?.summary && dbStatus.summary.totalTables > 0;

  // Rows KPI Card
  let rowsVal = '62,000';
  let rowsLabel = 'Active Queries';
  let rowsSub = 'Live telemetry snapshot volume';
  if (isQueryActive) {
    rowsVal = String(data.length);
    rowsLabel = 'Dataset Rows';
    rowsSub = 'Compiled query result rows';
  } else if (hasSummary) {
    rowsVal = String(dbStatus.summary!.totalTables);
    rowsLabel = 'Database Tables';
    rowsSub = 'Registered schema tables';
  }

  // Fields/Latency KPI Card
  let latencyVal = '94ms';
  let latencyLabel = 'Mean Latency';
  let latencySub = 'Optimal system latency SLA';
  if (isQueryActive) {
    latencyVal = `${Object.keys(data[0]).length} Fields`;
    latencyLabel = 'Dimensions';
    latencySub = 'Chart visualization';
  } else if (hasSummary) {
    latencyVal = `${dbStatus.summary!.totalRows.toLocaleString()}`;
    latencyLabel = 'Total Records';
    latencySub = 'Ingested database rows';
  }

  // Load/Connection KPI Card
  let loadVal = '42.8%';
  let loadLabel = 'Cluster Load';
  let loadSub = 'Optimal 16 Nodes active';
  if (isQueryActive) {
    loadVal = getSourceTable(sqlCode);
    loadLabel = 'Source Table';
    loadSub = 'SQLite schema matched';
  } else if (hasSummary) {
    loadVal = dbStatus.type.toUpperCase();
    loadLabel = 'Active Engine';
    loadSub = dbStatus.database;
  }

  return (
    <div className="dashboard-wrapper">
      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-title">{rowsLabel}</span>
            <Database size={16} className="metric-icon primary" />
          </div>
          <div className="metric-value">{rowsVal}</div>
          <div className="metric-sub">{rowsSub}</div>
        </div>
        
        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-title">{latencyLabel}</span>
            <Clock size={16} className="metric-icon accent" />
          </div>
          <div className="metric-value">{latencyVal}</div>
          <div className="metric-sub">{latencySub}</div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-title">{loadLabel}</span>
            <Activity size={16} className="metric-icon primary" />
          </div>
          <div className="metric-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {loadVal}
          </div>
          <div className="metric-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loadSub}
          </div>
        </div>
      </div>
      
      <div className="chart-panel glass-panel">
        {!isQueryActive && hasSummary ? (
          <div style={{ padding: '28px 24px' }} className="animate-fade-in">
            <h3 style={{ marginBottom: '4px', color: 'var(--text-heading)', fontSize: '1.25rem' }}>Database Schema Explorer</h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '24px' }}>
              Explore structural tables, columns, and records loaded in your active workspace environment.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {dbStatus.summary!.tables.map((table) => (
                <div key={table.name} className="glass-panel" style={{ padding: '18px', background: 'oklch(100% 0 0 / 0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{table.name}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.6, fontFamily: 'var(--font-mono)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px', background: 'var(--accent-glow)' }}>
                      {table.rows} rows
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {table.fields.map((f) => (
                      <span key={f} style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: 'oklch(100% 0 0 / 0.01)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'oklch(100% 0 0 / 0.01)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px', fontSize: '0.82rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)', display: 'block' }}>Suggested Query Prompts:</span>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                <li>"Show all columns and data in <code>{dbStatus.summary!.tables[0].name}</code>"</li>
                {dbStatus.summary!.tables[0].fields.length > 1 && (
                  <li>"Analyze <code>{dbStatus.summary!.tables[0].fields[0]}</code> and count records grouped by <code>{dbStatus.summary!.tables[0].fields[1]}</code>"</li>
                )}
              </ul>
            </div>
          </div>
        ) : isQueryActive && !hasChart ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', padding: '24px', textAlign: 'center', gap: '12px' }}>
            <div style={{ background: 'oklch(72% .16 195 / .05)', border: '1px solid var(--border)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <Database size={20} />
            </div>
            <h4 style={{ color: 'var(--text-heading)', margin: 0 }}>Tabular Dataset Loaded</h4>
            <p style={{ color: 'var(--text)', opacity: 0.7, fontSize: '0.85rem', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
              The compiler resolved this query to a list-only database view. No numeric timeseries trends were identified for charting. See the results table below.
            </p>
          </div>
        ) : (
          <>
            <div className="chart-header">
              <div>
                <h3>{isQueryActive ? 'Agent Execution Result' : 'Database Execution Log'}</h3>
                <p className="chart-subtitle">
                  {isQueryActive
                    ? `Dynamic plot mapping ${yAxisKeys.join(', ')} over ${xAxisKey}`
                    : 'Orchestrated Query Volumes & Daily Run-Time Metrics'}
                </p>
              </div>
              <div className="chart-legend">
                {yAxisKeys.map((key, idx) => (
                  <div className="legend-item" key={key}>
                    <span className={`legend-color ${idx === 0 ? 'primary' : 'accent'}`} />
                    <span>{key}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={230}>
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                    <XAxis dataKey={xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                    <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(10, 11, 15, 0.9)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)' }} />
                    {yAxisKeys.map((key, idx) => (
                      <Bar key={key} dataKey={key} fill={idx === 0 ? 'var(--primary)' : 'var(--accent)'} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                    <XAxis dataKey={xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                    <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(10, 11, 15, 0.9)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)' }} />
                    {yAxisKeys.map((key, idx) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={idx === 0 ? 'var(--primary)' : 'var(--accent)'} strokeWidth={2.5} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                    <XAxis dataKey={xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                    <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(10, 11, 15, 0.9)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)' }} />
                    {yAxisKeys.map((key, idx) => (
                      <Area key={key} type="monotone" dataKey={key} stroke={idx === 0 ? 'var(--primary)' : 'var(--accent)'} strokeWidth={2} fillOpacity={1} fill={idx === 0 ? 'url(#colorQueries)' : 'url(#colorLatency)'} />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {isQueryActive && sqlCode && (
        <div style={{ marginTop: '20px' }}>
          <SQLVisualizer sql={sqlCode} />
        </div>
      )}

      {isQueryActive ? (
        <div className="chart-panel glass-panel" style={{ marginTop: '20px', padding: '24px' }}>
          <div className="chart-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Query Results Table</h3>
              <p className="chart-subtitle">Raw records retrieved via SQLite database execute_query tool</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleCopyData}
                className="btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
              >
                <Copy size={12} />
                <span>{copiedData ? 'Copied!' : 'Copy Data'}</span>
              </button>
              <span className="badge badge-accent" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent-ring)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600 }}>
                {data.length} Rows
              </span>
            </div>
          </div>
          <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="results-table">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="mono">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(data[0]).map((key) => (
                      <td key={key} className={typeof row[key] === 'number' ? 'mono' : ''}>
                        {row[key] !== null && row[key] !== undefined ? String(row[key]) : 'NULL'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="chart-panel glass-panel" style={{ marginTop: '20px', padding: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'oklch(72% .16 195 / .05)', border: '1px solid var(--border)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Database size={18} />
          </div>
          <h4 style={{ color: 'var(--text-heading)', margin: 0 }}>No Query Results Loaded</h4>
          <p style={{ color: 'var(--text)', opacity: 0.7, fontSize: '0.85rem', maxWidth: '400px', margin: 0, lineHeight: 1.5 }}>
            Run a natural language database query on the Home page to load real-time SQLite records and schema structures into this table panel.
          </p>
        </div>
      )}

      <div className="nodes-panel glass-panel" style={{ padding: '24px', position: 'relative' }}>
        <div className="nodes-header" style={{ marginBottom: '16px' }}>
          <div className="title-area">
            <Database size={14} className="node-title-icon" />
            <h4>Data Constellation</h4>
          </div>
          <span className="node-count">
            {dbStatus?.summary?.totalTables
              ? `${dbStatus.summary.totalTables} Tables · ${dbStatus.summary.totalRows.toLocaleString()} Rows`
              : 'No DB Connected'}
          </span>
        </div>
        <Schema3DVisualizer summary={dbStatus?.summary} />
      </div>
      <style>{`
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
          padding: 10px 14px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          font-size: 0.72rem;
          opacity: 0.5;
          border-bottom: 1px solid var(--border);
          color: var(--text-heading);
        }
        .results-table td {
          padding: 12px 14px;
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
    </div>
  );
};

export default MetricsDashboard;
import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Copy, Check, ChevronDown, ChevronUp, AlertTriangle, Zap, User, Bot, Download, FileText, Database, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Message } from '../context/QueryContext';


interface ChatMessageProps {
  message: Message;
}

/* ── Inline SQL mini-highlighter ── */
const highlightSQL = (sql: string) => {
  const keywords =
    /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|GROUP BY|ORDER BY|LIMIT|INSERT|INTO|UPDATE|DELETE|SET|VALUES|CREATE|TABLE|DROP|ALTER|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|HAVING|UNION|BETWEEN|LIKE|IN|NOT|NULL|IS|CASE|WHEN|THEN|ELSE|END|ASC|DESC|OFFSET)\b/gi;
  return sql.replace(keywords, (m) => `<span class="cm-sql-kw">${m.toUpperCase()}</span>`);
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copiedData, setCopiedData] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const [tableExpanded, setTableExpanded] = useState(true);
  const [exportingDB, setExportingDB] = useState(false);
  const [exportingError, setExportingError] = useState('');

  const isUser = message.role === 'user';
  const hasData = message.data && message.data.length > 0;
  const hasChart =
    message.chartConfig &&
    message.chartConfig.type !== 'none' &&
    message.chartConfig.xAxisKey &&
    message.chartConfig.yAxisKeys &&
    message.chartConfig.yAxisKeys.length > 0;

  const handleCopyData = () => {
    if (!hasData) return;
    navigator.clipboard.writeText(JSON.stringify(message.data, null, 2));
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 2000);
  };

  const handleCopySQL = () => {
    if (!message.sqlCode) return;
    navigator.clipboard.writeText(message.sqlCode);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const handleDownloadSQL = () => {
    if (!message.data || message.data.length === 0) return;
    const tableName = 'query_results';
    const columns = Object.keys(message.data[0]);
    
    const colDefs = columns.map(col => {
      let type = 'TEXT';
      for (const row of message.data!) {
        const val = row[col];
        if (val !== null && val !== undefined) {
          if (typeof val === 'number') {
            type = Number.isInteger(val) ? 'INTEGER' : 'REAL';
          } else if (typeof val === 'boolean') {
            type = 'INTEGER';
          }
          break;
        }
      }
      return `\`${col}\` ${type}`;
    });

    const createTableSql = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n  ${colDefs.join(',\n  ')}\n);\n\n`;

    const insertSqls = message.data!.map(row => {
      const vals = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val;
        if (typeof val === 'boolean') return val ? 1 : 0;
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      return `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${vals.join(', ')});`;
    });

    const fullSql = `-- Compiled query:\n-- ${message.sqlCode || 'N/A'}\n\n${createTableSql}${insertSqls.join('\n')}\n`;

    const blob = new Blob([fullSql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exported_query_data.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!message.data || message.data.length === 0) return;
    const doc = new jsPDF();
    const columns = Object.keys(message.data[0]);
    
    const headers = [columns];
    const rows = message.data.map(row => 
      columns.map(col => {
        const val = row[col];
        return val !== null && val !== undefined ? String(val) : 'NULL';
      })
    );

    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text('Analyst.AI — Query Results Export', 14, 15);
    
    if (message.sqlCode) {
      doc.setFontSize(7.5);
      doc.setFont('courier', 'normal');
      doc.setTextColor(110, 110, 110);
      const splitSql = doc.splitTextToSize(`SQL Code:\n${message.sqlCode.trim()}`, 180);
      doc.text(splitSql, 14, 22);
    }

    const startY = message.sqlCode ? 22 + (doc.splitTextToSize(`SQL Code:\n${message.sqlCode.trim()}`, 180).length * 3.5) + 5 : 22;

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: startY < 30 ? 30 : startY,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      margin: { top: 20 },
    });

    doc.save('exported_query_results.pdf');
  };

  const handleDownloadDB = async () => {
    if (!message.data || message.data.length === 0) return;
    setExportingDB(true);
    setExportingError('');

    try {
      const response = await fetch('http://localhost:5000/api/export-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: 'query_results',
          data: message.data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate database file on the server');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `query_results.db`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setExportingError(err.message || 'Error exporting database.');
    } finally {
      setExportingDB(false);
    }
  };


  /* ── Loading dots animation ── */
  if (message.isLoading) {
    return (
      <div className="chat-msg chat-msg--ai animate-fade-in">
        <div className="chat-msg__avatar chat-msg__avatar--ai">
          <Bot size={16} />
        </div>
        <div className="chat-msg__bubble chat-msg__bubble--ai">
          <div className="chat-loading-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  /* ── User message ── */
  if (isUser) {
    return (
      <div className="chat-msg chat-msg--user animate-fade-in">
        <div className="chat-msg__bubble chat-msg__bubble--user">
          <p>{message.content}</p>
        </div>
        <div className="chat-msg__avatar chat-msg__avatar--user">
          <User size={16} />
        </div>
      </div>
    );
  }

  /* ── AI message ── */
  return (
    <div className="chat-msg chat-msg--ai animate-fade-in">
      <div className="chat-msg__avatar chat-msg__avatar--ai">
        <Bot size={16} />
      </div>
      <div className="chat-msg__bubble chat-msg__bubble--ai">
        {/* Cached badge */}
        {message.cached && (
          <div className="chat-cached-badge">
            <Zap size={12} />
            <span>Cached</span>
          </div>
        )}

        {/* Error state */}
        {message.isError && (
          <div className="chat-error-badge">
            <AlertTriangle size={14} />
            <span>{message.content || 'server busy'}</span>
          </div>
        )}

        {/* Text explanation */}
        {!message.isError && message.content && (
          <p className="chat-msg__text">{message.content}</p>
        )}

        {/* Chart */}
        {hasChart && (
          <div className="chat-chart-panel">
            <div className="chat-chart-header">
              <span className="chat-chart-title">
                {message.chartConfig!.type.charAt(0).toUpperCase() + message.chartConfig!.type.slice(1)} Chart
              </span>
              <div className="chat-chart-legend">
                {message.chartConfig!.yAxisKeys.map((key, idx) => (
                  <div key={key} className="chat-legend-item">
                    <span className={`chat-legend-color ${idx === 0 ? 'primary' : 'accent'}`} />
                    <span>{key}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="chat-chart-body">
              <ResponsiveContainer width="100%" height={200}>
                {message.chartConfig!.type === 'bar' ? (
                  <BarChart data={message.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                    <XAxis dataKey={message.chartConfig!.xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                    <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(10,11,15,0.92)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)', fontSize: '12px' }} />
                    {message.chartConfig!.yAxisKeys.map((key, idx) => (
                      <Bar key={key} dataKey={key} fill={idx === 0 ? 'var(--primary)' : 'var(--accent)'} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : message.chartConfig!.type === 'line' ? (
                  <LineChart data={message.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                    <XAxis dataKey={message.chartConfig!.xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                    <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(10,11,15,0.92)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)', fontSize: '12px' }} />
                    {message.chartConfig!.yAxisKeys.map((key, idx) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={idx === 0 ? 'var(--primary)' : 'var(--accent)'} strokeWidth={2.5} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={message.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`cg-p-${message.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`cg-a-${message.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                    <XAxis dataKey={message.chartConfig!.xAxisKey} stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                    <YAxis stroke="var(--text)" opacity={0.5} fontSize={10} fontFamily="var(--font-mono)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(10,11,15,0.92)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-heading)', fontSize: '12px' }} />
                    {message.chartConfig!.yAxisKeys.map((key, idx) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={idx === 0 ? 'var(--primary)' : 'var(--accent)'}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#cg-${idx === 0 ? 'p' : 'a'}-${message.id})`}
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* SQL Code (collapsible) */}
        {message.sqlCode && message.sqlCode.trim() && (
          <div className="chat-sql-section">
            <button className="chat-sql-toggle" onClick={() => setSqlExpanded(!sqlExpanded)}>
              <span>SQL Query</span>
              {sqlExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {sqlExpanded && (
              <div className="chat-sql-block">
                <div className="chat-sql-actions">
                  <button className="chat-copy-btn" onClick={handleCopySQL}>
                    {copiedSQL ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSQL ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre>
                  <code dangerouslySetInnerHTML={{ __html: highlightSQL(message.sqlCode) }} />
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Data Table */}
        {hasData && (
          <div className="chat-table-section">
            <div className="chat-table-header">
              <button className="chat-sql-toggle" onClick={() => setTableExpanded(!tableExpanded)}>
                <span>Results — {message.data!.length} row{message.data!.length !== 1 ? 's' : ''}</span>
                {tableExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <div className="chat-export-btn-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button className="chat-copy-btn" onClick={handleCopyData} title="Copy JSON data">
                  {copiedData ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedData ? 'Copied!' : 'Copy'}</span>
                </button>
                <button className="chat-copy-btn" onClick={handleDownloadSQL} title="Export as SQL inserts file">
                  <FileText size={12} />
                  <span>SQL</span>
                </button>
                <button className="chat-copy-btn" onClick={handleDownloadPDF} title="Export as PDF document">
                  <Download size={12} />
                  <span>PDF</span>
                </button>
                <button className="chat-copy-btn" onClick={handleDownloadDB} title="Export as SQLite .db database" disabled={exportingDB}>
                  {exportingDB ? <Loader2 size={12} className="spin" /> : <Database size={12} />}
                  <span>{exportingDB ? 'Exporting...' : 'SQLite'}</span>
                </button>
              </div>
            </div>
            {exportingError && (
              <div className="chat-export-error" style={{ color: 'var(--red)', fontSize: '0.75rem', padding: '6px 12px', borderTop: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)' }}>
                Error: {exportingError}
              </div>
            )}
            {tableExpanded && (
              <div className="chat-table-scroll">
                <table className="chat-results-table">
                  <thead>
                    <tr>
                      {Object.keys(message.data![0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {message.data!.map((row, idx) => (
                      <tr key={idx}>
                        {Object.keys(message.data![0]).map((key) => (
                          <td key={key} className={typeof row[key] === 'number' ? 'mono' : ''}>
                            {row[key] !== null && row[key] !== undefined ? String(row[key]) : 'NULL'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

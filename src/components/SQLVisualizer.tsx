import React from 'react';

interface SQLVisualizerProps {
  sql: string;
}

const SQLVisualizer: React.FC<SQLVisualizerProps> = ({ sql }) => {
  const [copiedSQL, setCopiedSQL] = React.useState(false);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sql);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  // Simple token parser for syntax highlighting SQL dynamically
  const parseSQL = (query: string) => {
    const lines = query.split('\n');
    const keywords = ['SELECT', 'FROM', 'JOIN', 'ON', 'WHERE', 'AND', 'GROUP BY', 'ORDER BY', 'LIMIT', 'LEFT JOIN', 'INNER JOIN', 'OVER', 'PARTITION BY', 'AS', 'INSERT', 'UPDATE', 'DELETE', 'INTO', 'SET', 'VALUES', 'CREATE', 'TABLE', 'DROP'];
    const functions = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'DATE_TRUNC', 'NOW', 'INTERVAL', 'DISTINCT'];

    return lines.map((line) => {
      // Split line into tokens preserving spaces and symbols
      const tokens = line.split(/(\s+|,|\(|\)|=|<|>|;)/);
      const highlightedTokens = tokens.map((token, idx) => {
        const upperToken = token.toUpperCase().trim();
        let type = 'text';

        if (keywords.includes(upperToken)) {
          type = 'keyword';
        } else if (functions.includes(upperToken)) {
          type = 'function';
        } else if (token.startsWith("'") || token.startsWith('"') || (token.trim() && !isNaN(Number(token)))) {
          type = 'string';
        }

        return (
          <span key={idx} className={`token ${type}`}>
            {token}
          </span>
        );
      });

      return highlightedTokens;
    });
  };

  const highlightedLines = parseSQL(sql || 'SELECT * FROM query_logs LIMIT 10;');

  return (
    <div className="sql-terminal glass-panel">
      {/* Terminal Title Bar */}
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <div className="terminal-title">active_query_orchestrator.sql</div>
        <div className="terminal-status" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={handleCopySQL}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '10px',
              color: 'var(--text)',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--text-heading)';
              e.currentTarget.style.color = 'var(--text-heading)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text)';
            }}
          >
            {copiedSQL ? 'Copied!' : 'Copy SQL'}
          </button>
          <span className="pulse-dot"></span> Ready
        </div>
      </div>
      
      {/* Terminal Content */}
      <div className="terminal-content">
        <pre className="code-block">
          <code>
            {highlightedLines.map((lineTokens, idx) => (
              <div key={idx} className="code-line">
                <span className="line-number">{(idx + 1).toString().padStart(2, '0')}</span>
                <span className="line-text">{lineTokens}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      <style>{`
        .sql-terminal {
          width: 100%;
          font-family: var(--font-mono);
          font-size: 13px;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(10, 11, 15, 0.65);
        }
        .terminal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid var(--glass-border);
        }
        .terminal-dots {
          display: flex;
          gap: 6px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot.red { background: oklch(65% 0.18 20); }
        .dot.yellow { background: oklch(75% 0.15 80); }
        .dot.green { background: oklch(70% 0.15 140); }
        
        .terminal-title {
          color: var(--text);
          font-size: 11px;
          letter-spacing: 0.05em;
          opacity: 0.8;
        }
        .terminal-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: var(--accent);
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
          animation: pulse 1.8s infinite;
        }
        .terminal-content {
          padding: 16px;
          overflow-x: auto;
        }
        .code-block {
          margin: 0;
        }
        .code-line {
          display: flex;
          line-height: 1.6;
          white-space: pre;
        }
        .line-number {
          width: 24px;
          color: var(--text);
          opacity: 0.3;
          margin-right: 16px;
          user-select: none;
          text-align: right;
        }
        .line-text {
          color: oklch(85% 0.01 250);
        }
        
        /* Syntax highlighting classes */
        .token.keyword {
          color: var(--primary);
          font-weight: 500;
        }
        .token.function {
          color: var(--accent);
        }
        .token.string {
          color: oklch(78% 0.08 140);
        }
        .token.text {
          color: oklch(90% 0.01 250);
        }
        
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default SQLVisualizer;

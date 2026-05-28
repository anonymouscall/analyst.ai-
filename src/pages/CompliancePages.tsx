import React, { useState, useEffect } from 'react';
import { Cookie, Shield, Scale } from 'lucide-react';

export const CookiesPage: React.FC = () => {
  const [preferences, setPreferences] = useState({ essential: true, analytics: true, marketing: false });

  useEffect(() => {
    const saved = localStorage.getItem('cookie-consent-settings');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const togglePreference = (key: 'analytics' | 'marketing') => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    localStorage.setItem('cookie-consent-settings', JSON.stringify(updated));
    localStorage.setItem('cookie-consent-given', 'accepted');
  };

  return (
    <div className="compliance-container container animate-fade-in">
      <div className="section-header">
        <span className="section-label">[ Cookie Settings & Compliance ]</span>
        <h2>Cookie Policy</h2>
        <p>This policy details how ANALYST.AI uses cookies, tracking pixels, and local storage to provide secure database orchestration.</p>
      </div>
      <div className="compliance-layout">
        <div className="compliance-content glass-panel">
          <h3>1. What are cookies?</h3>
          <p>Cookies are small text files stored on your local workstation by your web browser. They help us maintain your query sessions, preserve interface settings, and track backend query compilation metrics.</p>
          <h3>2. How we use cookies</h3>
          <p>We use cookies to maintain administrative log-in sessions, store layout preferences (such as code highlighting schemes), and cache natural language questions locally for quicker compilation. No database rows or private analytical outputs are ever transmitted or stored in tracking cookies.</p>
          <h3>3. Cookie categories in use</h3>
          <p>We classify our cookies into three functional blocks: Essential (necessary to run the sandbox and auth systems), Performance & Analytics (to measure compilation latency averages), and Marketing/Preferences (to save user options).</p>
        </div>
        <div className="compliance-sidebar glass-panel">
          <div className="sidebar-header">
            <Cookie size={18} className="logo-icon" />
            <h4>Manage Preferences</h4>
          </div>
          <p className="sidebar-desc">Enable or disable non-essential cookies. Essential session cookies cannot be deactivated.</p>
          <div className="pref-row">
            <div className="pref-info">
              <span className="pref-title">Strictly Necessary Cookies</span>
              <span className="pref-desc">Preserves auth sessions and prevents cross-site request forgery.</span>
            </div>
            <span className="badge badge-required">Required</span>
          </div>
          <div className="pref-row">
            <div className="pref-info">
              <span className="pref-title">Performance & Analytics</span>
              <span className="pref-desc">Measures query compile speed and memory utilization.</span>
            </div>
            <button
              className={`toggle-btn ${preferences.analytics ? 'active' : ''}`}
              onClick={() => togglePreference('analytics')}
            >
              {preferences.analytics ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="pref-row">
            <div className="pref-info">
              <span className="pref-title">Marketing & Targeting</span>
              <span className="pref-desc">Saves UI settings and custom themes preferences.</span>
            </div>
            <button
              className={`toggle-btn ${preferences.marketing ? 'active' : ''}`}
              onClick={() => togglePreference('marketing')}
            >
              {preferences.marketing ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .compliance-layout {
          display: grid;
          grid-template-columns: 1.4fr 0.6fr;
          gap: 40px;
          margin-top: 40px;
        }
        @media (max-width: 900px) {
          .compliance-layout {
            grid-template-columns: 1fr;
          }
        }
        .compliance-content {
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .compliance-content h3 {
          font-size: 1.25rem;
          color: var(--text-heading);
        }
        .compliance-sidebar {
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: fit-content;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .sidebar-desc {
          font-size: 0.8rem;
          opacity: 0.7;
          line-height: 1.5;
        }
        .pref-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
        }
        .pref-row:last-child {
          border-bottom: none;
        }
        .pref-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .pref-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-heading);
        }
        .pref-desc {
          font-size: 0.75rem;
          opacity: 0.6;
          line-height: 1.4;
        }
        .badge-required {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
          font-size: 0.7rem;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: var(--font-mono);
          text-transform: uppercase;
        }
        .toggle-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .toggle-btn.active {
          border-color: var(--accent);
          color: var(--accent);
          background: oklch(72% 0.16 195 / 0.05);
        }
      `}</style>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  return (
    <div className="compliance-container container animate-fade-in">
      <div className="section-header">
        <span className="section-label">[ Terms of Service ]</span>
        <h2>User Agreement</h2>
        <p>Please read these Terms of Service carefully before connecting your enterprise database clusters to ANALYST.AI.</p>
      </div>
      <div className="compliance-layout single-col">
        <div className="compliance-content glass-panel">
          <div className="section-header-inline" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <Scale size={18} className="logo-icon" />
            <h4>General Terms & Sandbox Operations</h4>
          </div>
          <h3>1. Connection Agreement</h3>
          <p>By connecting databases to the ANALYST.AI Model Context Protocol (MCP) server, you authorize the platform to inspect table schemas, read structure definitions, and run compiler-validated SQL queries.</p>
          <h3>2. Read-Only Enforcement</h3>
          <p>All MCP connection pools are sandboxed to read-only queries by default. Under these terms, users are prohibited from executing, or attempting to execute, modification statements (<code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code>, <code>DROP</code>). The compiler will automatically flag and block any write queries, and repeated attempts will trigger automatic account lockouts and log auditing.</p>
          <h3>3. Acceptable Use Policy</h3>
          <p>You agree not to upload natural language queries containing malicious code, SQL injection payloads, or request queries aimed at extracting sensitive system databases (e.g., <code>sqlite_master</code> metadata hijacking).</p>
          <h3>4. Service SLA & Latency</h3>
          <p>ANALYST.AI compiles natural language queries via third-party AI models. While compilation average latencies are maintained below 150ms, processing speeds depend on upstream network availabilities. We provide no uptime guarantee for custom telemetry clusters configured outside of enterprise SLA contracts.</p>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  return (
    <div className="compliance-container container animate-fade-in">
      <div className="section-header">
        <span className="section-label">[ Privacy & Data Policy ]</span>
        <h2>Privacy Policy</h2>
        <p>This document details our strict zero-egress data standards and customer privacy protection measures.</p>
      </div>
      <div className="compliance-layout single-col">
        <div className="compliance-content glass-panel">
          <div className="section-header-inline" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <Shield size={18} className="logo-icon" />
            <h4>Zero Egress Security Core</h4>
          </div>
          <h3>1. Data Isolation & Security</h3>
          <p>ANALYST.AI operates under a strict <strong>Zero Local Data Egress</strong> model. <br />- When you submit a natural language question, the AI backend only reads metadata tables and column schema headers to build RAG context. <br />- The actual contents of database tables are never uploaded to the AI orchestrator or external servers. <br />- SQL execution is performed completely inside your local environment on the SQLite database via standard I/O streams. The returned data rows are formatted in memory and drawn directly in your local web browser.</p>
          <h3>2. Information We Log</h3>
          <p>For auditing purposes, the Express server logs natural language questions, the generated SQL code, execution latencies, and counts of rows returned to the <code>audit_logs</code> database table. These audit trails are stored in your private local SQLite instance and are only accessible by users authenticated through your Admin Portal.</p>
          <h3>3. Artificial Intelligence API Sharing</h3>
          <p>To compile English questions into SQL commands, schema structures (tables, columns, types) are transmitted to the Google Gemini API. According to our enterprise terms with Google Cloud, data sent to these endpoints is not used to train generative AI models and is discarded immediately after processing.</p>
          <h3>4. Compliance Frameworks</h3>
          <p>This portal is engineered to conform with general GDPR and CCPA privacy standards. You retain the right to flush local query histories, disable tracking cookies via our Preferences menu, and purge audit logs at any time from the Admin Dashboard.</p>
        </div>
      </div>
    </div>
  );
};
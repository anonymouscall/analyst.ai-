import React from 'react';
import { Database, Key, Table } from 'lucide-react';

const DocsPage: React.FC = () => {
  return (
    <section id="docs" className="docs-section container animate-fade-in">
      <div className="section-header">
        <span className="section-label">[ 04 / Catalog Schema Docs ]</span>
        <h2>Database Index</h2>
        <p>Explore the connected SQLite database schema catalog available to the RAG vector storage index.</p>
      </div>
      <div className="section-body docs-grid">
        <div className="doc-card glass-panel">
          <div className="doc-card-header">
            <Database size={16} className="logo-icon" />
            <h5>query_logs</h5>
          </div>
          <ul className="doc-columns">
            <li>
              <code>id</code> (INTEGER) - Primary Key
            </li>
            <li>
              <code>log_date</code> (TEXT) - Date of entry
            </li>
            <li>
              <code>queries_executed</code> (INTEGER) - Total query volume
            </li>
            <li>
              <code>avg_latency_ms</code> (REAL) - Cluster response latency
            </li>
            <li>
              <code>cpu_load</code> (REAL) - CPU utilization
            </li>
          </ul>
        </div>
        <div className="doc-card glass-panel">
          <div className="doc-card-header">
            <Table size={16} className="logo-icon" />
            <h5>connection_pools</h5>
          </div>
          <ul className="doc-columns">
            <li>
              <code>id</code> (INTEGER) - Primary Key
            </li>
            <li>
              <code>name</code> (TEXT) - Unique pool identifier
            </li>
            <li>
              <code>technology</code> (TEXT) - DB dialect (PostgreSQL, Snowflake)
            </li>
            <li>
              <code>iops</code> (INTEGER) - Active read/write speed
            </li>
            <li>
              <code>uptime_percent</code> (REAL) - SLA percentage
            </li>
            <li>
              <code>active_queries</code> (INTEGER) - Pool load
            </li>
          </ul>
        </div>
        <div className="doc-card glass-panel">
          <div className="doc-card-header">
            <Key size={16} className="logo-icon" />
            <h5>sales_data</h5>
          </div>
          <ul className="doc-columns">
            <li>
              <code>id</code> (INTEGER) - Primary Key
            </li>
            <li>
              <code>product_category</code> (TEXT) - Category name
            </li>
            <li>
              <code>revenue</code> (REAL) - Total dollars earned
            </li>
            <li>
              <code>units_sold</code> (INTEGER) - Count of items
            </li>
            <li>
              <code>region</code> (TEXT) - Sales geo-region
            </li>
            <li>
              <code>sale_date</code> (TEXT) - Transaction date
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default DocsPage;
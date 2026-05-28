import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('Initializing SQLite database at:', dbPath);

// Delete old db if exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. Create query_logs table (Telemetry data)
  db.run(`
    CREATE TABLE IF NOT EXISTS query_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_date TEXT UNIQUE,
      queries_executed INTEGER,
      avg_latency_ms REAL,
      cpu_load REAL
    )
  `);

  // 2. Create connection_pools table
  db.run(`
    CREATE TABLE IF NOT EXISTS connection_pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      technology TEXT,
      iops INTEGER,
      uptime_percent REAL,
      active_queries INTEGER,
      status TEXT
    )
  `);

  // 3. Create sales_data table
  db.run(`
    CREATE TABLE IF NOT EXISTS sales_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_category TEXT,
      revenue REAL,
      units_sold INTEGER,
      region TEXT,
      sale_date TEXT
    )
  `);

  console.log('Tables created. Populating mock data...');

  // Populate connection_pools
  const pools = [
    ['production_replica_east', 'PostgreSQL 16.2 · Aurora', 3120, 99.98, 4, 'online'],
    ['analytics_warehouse_olap', 'Snowflake · aws-us-east-1', 12400, 100.0, 12, 'online'],
    ['cache_redis_cluster', 'Redis 7.2 · Elasticache', 48500, 99.99, 0, 'online'],
    ['staging_db_replica', 'PostgreSQL 15.4 · RDS', 420, 99.5, 1, 'maintenance']
  ];

  const stmtPools = db.prepare('INSERT INTO connection_pools (name, technology, iops, uptime_percent, active_queries, status) VALUES (?, ?, ?, ?, ?, ?)');
  pools.forEach(pool => stmtPools.run(pool));
  stmtPools.finalize();

  // Populate query_logs (last 10 days)
  const logStmt = db.prepare('INSERT INTO query_logs (log_date, queries_executed, avg_latency_ms, cpu_load) VALUES (?, ?, ?, ?)');
  const days = 10;
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Add realistic query volume variance
    const queries = Math.floor(40000 + Math.random() * 25000);
    const latency = parseFloat((90 + Math.random() * 55).toFixed(2));
    const cpu = parseFloat((30 + Math.random() * 35).toFixed(2));
    
    logStmt.run(dateStr, queries, latency, cpu);
  }
  logStmt.finalize();

  // Populate sales_data
  const salesStmt = db.prepare('INSERT INTO sales_data (product_category, revenue, units_sold, region, sale_date) VALUES (?, ?, ?, ?, ?)');
  const categories = ['Cloud Infrastructure', 'AI Integrations', 'Data Pipelines', 'Enterprise Support'];
  const regions = ['US-East', 'US-West', 'EU-West', 'AP-South'];
  
  for (let i = 45; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // 3 sales records per day
    for (let s = 0; s < 3; s++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const reg = regions[Math.floor(Math.random() * regions.length)];
      const units = Math.floor(1 + Math.random() * 10);
      let unitPrice = 1200;
      if (cat === 'AI Integrations') unitPrice = 4500;
      if (cat === 'Cloud Infrastructure') unitPrice = 2800;
      if (cat === 'Enterprise Support') unitPrice = 7500;
      
      const revenue = units * unitPrice;
      salesStmt.run(cat, revenue, units, reg, dateStr);
    }
  }
  salesStmt.finalize();

  console.log('Database populated successfully.');
});

db.close();

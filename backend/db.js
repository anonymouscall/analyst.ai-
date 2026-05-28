import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../mcp_server/database.sqlite');

let db = null;

export function getDB() {
  if (db) return db;
  
  // Ensure the directory for the database file exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to audit logs database:', err);
    } else {
      console.log('Connected to SQLite database for audit logging.');
    }
  });
  return db;
}

export function initAuditLogs() {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.serialize(() => {
      connection.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT,
          question TEXT,
          sql_query TEXT,
          status TEXT,
          results_count INTEGER,
          latency_ms REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Failed to create audit_logs table:', err);
          reject(err);
        } else {
          // Gracefully add email column in case table already exists from previous runs without it
          connection.run("ALTER TABLE audit_logs ADD COLUMN email TEXT", () => {
            resolve();
          });
        }
      });
    });
  });
}

export function logQuery(email, question, sql, status, resultsCount, latency) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    const stmt = connection.prepare(`
      INSERT INTO audit_logs (email, question, sql_query, status, results_count, latency_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(email, question, sql, status, resultsCount, latency, function(err) {
      if (err) {
        console.error('Failed to write audit log:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
    stmt.finalize();
  });
}

export function getAuditLogs(email) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.all('SELECT * FROM audit_logs WHERE email = ? ORDER BY created_at DESC', [email], (err, rows) => {
      if (err) {
        console.error('Failed to retrieve audit logs:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export function clearAuditLogs(email) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.run('DELETE FROM audit_logs WHERE email = ?', [email], (err) => {
      if (err) {
        console.error('Failed to clear audit logs:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function initAuthDb() {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.serialize(() => {
      // Create users table
      connection.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Failed to create users table:', err);
      });

      // Create otps table
      connection.run(`
        CREATE TABLE IF NOT EXISTS otps (
          email TEXT PRIMARY KEY,
          otp_code TEXT,
          expires_at DATETIME
        )
      `, (err) => {
        if (err) console.error('Failed to create otps table:', err);
      });

      // Create sessions table
      connection.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          email TEXT,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Failed to create sessions table:', err);
      });

      // Create query_history table
      connection.run(`
        CREATE TABLE IF NOT EXISTS query_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT,
          question TEXT,
          explanation TEXT,
          chart_config TEXT,
          results_data TEXT,
          sql_code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Failed to create query_history table:', err);
          reject(err);
        } else {
          console.log('Auth and Query History database tables verified/created.');
          resolve();
        }
      });
    });
  });
}

export function saveOtp(email, otp_code, expires_at) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.run(
      `INSERT OR REPLACE INTO otps (email, otp_code, expires_at) VALUES (?, ?, ?)`,
      [email, otp_code, expires_at],
      function (err) {
        if (err) {
          console.error('Failed to save OTP:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

export function getOtp(email) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.get(
      `SELECT * FROM otps WHERE email = ?`,
      [email],
      (err, row) => {
        if (err) {
          console.error('Failed to get OTP:', err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

export function deleteOtp(email) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.run(
      `DELETE FROM otps WHERE email = ?`,
      [email],
      function (err) {
        if (err) {
          console.error('Failed to delete OTP:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

export function getOrCreateUser(email) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.run(
      `INSERT OR IGNORE INTO users (email) VALUES (?)`,
      [email],
      function (err) {
        if (err) {
          console.error('Failed to create user:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

export function createSession(token, email, expires_at) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.run(
      `INSERT INTO sessions (token, email, expires_at) VALUES (?, ?, ?)`,
      [token, email, expires_at],
      function (err) {
        if (err) {
          console.error('Failed to create session:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

export function getSession(token) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.get(
      `SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
      [token],
      (err, row) => {
        if (err) {
          console.error('Failed to get session:', err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

export function deleteSession(token) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.run(
      `DELETE FROM sessions WHERE token = ?`,
      [token],
      function (err) {
        if (err) {
          console.error('Failed to delete session:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

export function getAllUsers() {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.all(`SELECT * FROM users ORDER BY created_at DESC`, [], (err, rows) => {
      if (err) {
        console.error('Failed to get all users:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export function saveQueryHistory(email, question, explanation, chart_config, results_data, sql_code) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.run(
      `INSERT INTO query_history (email, question, explanation, chart_config, results_data, sql_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, question, explanation, chart_config, results_data, sql_code],
      function (err) {
        if (err) {
          console.error('Failed to save query history:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

export function getQueryHistory(email) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.all(
      `SELECT * FROM query_history WHERE email = ? ORDER BY created_at DESC`,
      [email],
      (err, rows) => {
        if (err) {
          console.error('Failed to get query history:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

export function clearQueryHistory(email) {
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.run(
      `DELETE FROM query_history WHERE email = ?`,
      [email],
      function (err) {
        if (err) {
          console.error('Failed to clear query history:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

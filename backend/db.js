import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../mcp_server/database.sqlite');

let db = null;

// Ensure local SQLite database connection
export function getDB() {
  if (db) return db;
  
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to local audit logs database:', err);
    } else {
      console.log('Connected to local SQLite database.');
    }
  });
  return db;
}

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const useSupabase = !!(supabaseUrl && supabaseKey);

if (useSupabase) {
  console.log(`[Database Adapter] Supabase credentials detected. Routing to: ${supabaseUrl}`);
} else {
  console.log('[Database Adapter] Supabase credentials missing. Using local SQLite database.');
}

// Helper to call Supabase PostgREST API
async function callSupabase(endpoint, method = 'GET', body = null, extraHeaders = {}) {
  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extraHeaders
  };
  const config = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }
  const response = await fetch(url, config);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase API error (${response.status}): ${errorText}`);
  }
  if (method === 'DELETE' || response.status === 204) {
    return null;
  }
  return response.json();
}

export function initAuditLogs() {
  if (useSupabase) {
    return Promise.resolve(); // Tables should be pre-created in Supabase SQL Editor
  }
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
          connection.run("ALTER TABLE audit_logs ADD COLUMN email TEXT", () => {
            resolve();
          });
        }
      });
    });
  });
}

export function initAuthDb() {
  if (useSupabase) {
    return Promise.resolve(); // Tables should be pre-created in Supabase SQL Editor
  }
  const connection = getDB();
  return new Promise((resolve, reject) => {
    connection.serialize(() => {
      connection.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Failed to create users table:', err);
      });

      connection.run(`
        CREATE TABLE IF NOT EXISTS otps (
          email TEXT PRIMARY KEY,
          otp_code TEXT,
          expires_at DATETIME
        )
      `, (err) => {
        if (err) console.error('Failed to create otps table:', err);
      });

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
          console.log('Local SQLite auth and query history tables verified.');
          resolve();
        }
      });
    });
  });
}

export function logQuery(email, question, sql, status, resultsCount, latency) {
  if (useSupabase) {
    return callSupabase('audit_logs', 'POST', {
      email,
      question,
      sql_query: sql,
      status,
      results_count: resultsCount,
      latency_ms: latency
    }).catch(err => {
      console.error('Failed to save audit log to Supabase:', err);
    });
  }

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
  if (useSupabase) {
    if (email) {
      return callSupabase(`audit_logs?select=*&email=eq.${encodeURIComponent(email)}&order=created_at.desc`);
    }
    return callSupabase('audit_logs?select=*&order=created_at.desc');
  }

  const connection = getDB();
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM audit_logs ORDER BY created_at DESC';
    let params = [];
    if (email) {
      sql = 'SELECT * FROM audit_logs WHERE email = ? ORDER BY created_at DESC';
      params = [email];
    }
    connection.all(sql, params, (err, rows) => {
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
  if (useSupabase) {
    if (email) {
      return callSupabase(`audit_logs?email=eq.${encodeURIComponent(email)}`, 'DELETE');
    }
    return callSupabase('audit_logs', 'DELETE');
  }

  const connection = getDB();
  return new Promise((resolve, reject) => {
    let sql = 'DELETE FROM audit_logs';
    let params = [];
    if (email) {
      sql = 'DELETE FROM audit_logs WHERE email = ?';
      params = [email];
    }
    connection.run(sql, params, (err) => {
      if (err) {
        console.error('Failed to clear audit logs:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function saveOtp(email, otp_code, expires_at) {
  if (useSupabase) {
    return callSupabase('otps', 'POST', { email, otp_code, expires_at }, {
      'Prefer': 'resolution=merge-duplicates'
    });
  }

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
  if (useSupabase) {
    return callSupabase(`otps?select=*&email=eq.${encodeURIComponent(email)}`).then(rows => {
      return rows && rows.length > 0 ? rows[0] : null;
    });
  }

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
  if (useSupabase) {
    return callSupabase(`otps?email=eq.${encodeURIComponent(email)}`, 'DELETE');
  }

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
  if (useSupabase) {
    return callSupabase(`users?select=*&email=eq.${encodeURIComponent(email)}`).then(async (users) => {
      if (users && users.length > 0) {
        return users[0];
      }
      const created = await callSupabase('users', 'POST', { email });
      return created && created.length > 0 ? created[0] : { email };
    }).catch(err => {
      console.warn('[Supabase getOrCreateUser] Warn/Fallback:', err.message);
      return { email };
    });
  }

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
  if (useSupabase) {
    return callSupabase('sessions', 'POST', { token, email, expires_at });
  }

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
  if (useSupabase) {
    return callSupabase(`sessions?select=*&token=eq.${encodeURIComponent(token)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`).then(rows => {
      return rows && rows.length > 0 ? rows[0] : null;
    });
  }

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
  if (useSupabase) {
    return callSupabase(`sessions?token=eq.${encodeURIComponent(token)}`, 'DELETE');
  }

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
  if (useSupabase) {
    return callSupabase('users?select=*&order=created_at.desc');
  }

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
  if (useSupabase) {
    return callSupabase('query_history', 'POST', {
      email,
      question,
      explanation,
      chart_config,
      results_data,
      sql_code
    });
  }

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
  if (useSupabase) {
    return callSupabase(`query_history?select=*&email=eq.${encodeURIComponent(email)}&order=created_at.desc`);
  }

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
  if (useSupabase) {
    return callSupabase(`query_history?email=eq.${encodeURIComponent(email)}`, 'DELETE');
  }

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

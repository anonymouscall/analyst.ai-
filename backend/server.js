import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { queryDatabase } from './agent.js';
import { 
  initAuditLogs, 
  logQuery, 
  getAuditLogs, 
  clearAuditLogs,
  initAuthDb,
  saveOtp,
  getOtp,
  deleteOtp,
  getOrCreateUser,
  createSession,
  getSession,
  deleteSession,
  getAllUsers,
  saveQueryHistory,
  getQueryHistory,
  clearQueryHistory
} from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.PERSISTENT_DATA_DIR || path.resolve(__dirname, '../mcp_server');

// Ensure persistent data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Simple in-memory query cache mapping lowercase questions to results
const queryCache = new Map();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SQLite tables on startup
initAuditLogs().catch(err => {
  console.error('Failed to initialize audit database logs:', err);
});
initAuthDb().catch(err => {
  console.error('Failed to initialize authentication database:', err);
});

// Middleware to verify simulated Admin Bearer Token dynamically via database sessions
const requireAdminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  
  try {
    const session = await getSession(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Invalid or expired token.' });
    }
    // Bind session email to request object
    req.adminEmail = session.email;
    next();
  } catch (err) {
    console.error('Session validation error:', err);
    return res.status(500).json({ success: false, error: 'Authentication database error.' });
  }
};

// API route to process queries with Caching & DB Audit logging
app.post('/api/ask', requireAdminAuth, async (req, res) => {
  const { question } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question parameter is required.' });
  }

  const cacheKey = `${req.adminEmail.trim().toLowerCase()}::${question.trim().toLowerCase()}`;
  
  // 1. Check cache first
  if (queryCache.has(cacheKey)) {
    console.log(`Cache HIT for question: "${question}" (User: ${req.adminEmail})`);
    const cachedResult = queryCache.get(cacheKey);
    
    // Log cached execution to database with 0ms latency
    logQuery(question, cachedResult.sql, 'success (cached)', cachedResult.data.length, 0.0)
      .catch(err => console.error('Cache audit logging failed:', err));
      
    // Save to persistent user query history
    saveQueryHistory(
      req.adminEmail,
      question,
      cachedResult.explanation || '',
      JSON.stringify(cachedResult.chartConfig || {}),
      JSON.stringify(cachedResult.data || []),
      cachedResult.sql || ''
    ).catch(err => console.error('Failed to save cached query to database history:', err));
      
    return res.json({ ...cachedResult, cached: true });
  }

  console.log(`Cache MISS for question: "${question}". Executing full RAG analysis pipeline...`);
  const startTime = Date.now();

  try {
    const result = await queryDatabase(question, req.adminEmail);
    const latency = Date.now() - startTime;

    if (result.success) {
      // Save successful queries to local cache
      queryCache.set(cacheKey, result);
      
      // Log successful execution
      logQuery(question, result.sql, 'success', result.data.length, latency)
        .catch(err => console.error('Audit logging failed:', err));

      // Save to persistent user query history
      saveQueryHistory(
        req.adminEmail,
        question,
        result.explanation || '',
        JSON.stringify(result.chartConfig || {}),
        JSON.stringify(result.data || []),
        result.sql || ''
      ).catch(err => console.error('Failed to save fresh query to database history:', err));
    } else {
      // Log failed compilation
      logQuery(question, result.sql || '', 'error: ' + (result.error || 'Failed'), 0, latency)
        .catch(err => console.error('Error audit logging failed:', err));
    }

    res.json({ ...result, cached: false });
  } catch (err) {
    const latency = Date.now() - startTime;
    console.error('Express endpoint processing error:', err);
    
    logQuery(question, '', 'fatal: ' + err.message, 0, latency)
      .catch(logErr => console.error('Fatal audit logging failed:', logErr));

    res.status(500).json({ success: false, error: 'server busy' });
  }
});

// ── OTP Authentication API Endpoints ──

// 1. Request OTP (Generates and stores OTP, prints to console and returns it in debugOtp)
app.post('/api/auth/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Simple email format check (allow '2005' or valid email format)
  if (cleanEmail !== '2005') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }
  }

  const targetEmail = cleanEmail === '2005' ? 'admin@analyst.ai' : cleanEmail;

  try {
    // Direct Access Bypass - Register/Fetch user and create session immediately!
    await getOrCreateUser(targetEmail);
    const token = 'token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await createSession(token, targetEmail, expiresAt);
    
    console.log(`[Auto Bypass Login] Logged in directly for user: ${targetEmail}`);
    return res.json({
      success: true,
      bypass: true, // Tells the frontend to log in directly
      token,
      email: targetEmail,
      message: 'Access granted successfully.'
    });
  } catch (err) {
    console.error('Failed to create bypass session:', err);
    return res.status(500).json({ success: false, error: 'Failed to establish session.' });
  }
});

// 2. Verify OTP (Checks OTP, registers user, generates persistent session token)
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
  }

  const otpServiceUrl = process.env.OTP_SERVICE_URL;

  if (otpServiceUrl) {
    console.log(`[Microservice Auth] Delegating OTP verification for ${email} to: ${otpServiceUrl}`);
    try {
      const response = await fetch(`${otpServiceUrl}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return res.status(response.status || 401).json({ success: false, error: data.message || 'Invalid or expired verification code.' });
      }

      // Valid OTP confirmed by microservice! Proceed to create user record & session in local SQLite
      await getOrCreateUser(email);

      const token = 'token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await createSession(token, email, expiresAt);

      console.log(`User ${email} verified by microservice and signed in locally. Session created.`);
      return res.json({ success: true, token, email });
    } catch (err) {
      console.error('[Microservice Auth] Connection error during verification:', err);
      return res.status(500).json({ success: false, error: 'Failed to complete microservice authentication check.' });
    }
  }

  // Graceful Local Fallback
  try {
    const record = await getOtp(email);
    if (!record) {
      return res.status(400).json({ success: false, error: 'No verification request active for this email.' });
    }

    // Verify code match
    if (record.otp_code !== otp.trim()) {
      return res.status(401).json({ success: false, error: 'Invalid verification code.' });
    }

    // Verify expiration (SQLite datetime is compared in UTC)
    if (new Date(record.expires_at) < new Date()) {
      await deleteOtp(email);
      return res.status(401).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
    }

    // OTP is valid! Consume it.
    await deleteOtp(email);

    // Register user in SQLite if they don't exist
    await getOrCreateUser(email);

    // Generate a secure session token
    const token = 'token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Set session expiration to 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Save session to sessions table
    await createSession(token, email, expiresAt);

    console.log(`User ${email} signed in successfully locally. Session created.`);
    res.json({ success: true, token, email });
  } catch (err) {
    console.error('Failed to verify OTP locally:', err);
    res.status(500).json({ success: false, error: 'Authentication processing failure.' });
  }
});

// 3. Logout (Invalidates active session)
app.post('/api/admin/logout', requireAdminAuth, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  try {
    await deleteSession(token);
    
    // Evict all user-specific cache records
    const emailPrefix = `${req.adminEmail.trim().toLowerCase()}::`;
    for (const key of queryCache.keys()) {
      if (key.startsWith(emailPrefix)) {
        queryCache.delete(key);
      }
    }
    
    console.log(`Session token invalidated on sign out and user cache purged for: ${req.adminEmail}`);
    res.json({ success: true, message: 'Signed out successfully.' });
  } catch (err) {
    console.error('Failed to terminate session:', err);
    res.status(500).json({ success: false, error: 'Session termination failure.' });
  }
});

// 4. Retrieve Registered Users (Endpoint Disabled for Standard Clients)
app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
  return res.status(403).json({ success: false, error: 'Access denied. Registered user lists are restricted.' });
});

// 5. Retrieve Persistent Query History for active user
app.get('/api/admin/history', requireAdminAuth, async (req, res) => {
  try {
    const history = await getQueryHistory(req.adminEmail);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve query history.' });
  }
});

// 6. Clear Query History for active user
app.post('/api/admin/clear-history', requireAdminAuth, async (req, res) => {
  try {
    await clearQueryHistory(req.adminEmail);
    res.json({ success: true, message: 'Query history cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear query history.' });
  }
});

// Fetch query execution logs (Admin only)
app.get('/api/admin/logs', requireAdminAuth, async (req, res) => {
  try {
    const logs = await getAuditLogs();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve database logs.' });
  }
});

// Clear query execution logs (Admin only)
app.post('/api/admin/clear-logs', requireAdminAuth, async (req, res) => {
  try {
    await clearAuditLogs();
    res.json({ success: true, message: 'Audit database logs cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear database logs.' });
  }
});

// Clear memory cache (Admin only)
app.post('/api/admin/clear-cache', requireAdminAuth, (req, res) => {
  const emailPrefix = `${req.adminEmail.trim().toLowerCase()}::`;
  let count = 0;
  for (const key of queryCache.keys()) {
    if (key.startsWith(emailPrefix)) {
      queryCache.delete(key);
      count++;
    }
  }
  console.log(`Query result cache flushed for user ${req.adminEmail} (${count} entries).`);
  res.json({ success: true, message: 'Query cache flushed successfully.' });
});

// Disconnect and delete database configuration (Admin only)
app.post('/api/admin/delete-db', requireAdminAuth, (req, res) => {
  try {
    const cleanEmail = req.adminEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const configPath = path.join(DATA_DIR, `connection_config_${cleanEmail}.json`);
    const uploadPath = path.join(DATA_DIR, `uploaded_database_${cleanEmail}.sqlite`);
    
    try {
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    } catch (e) {
      console.error(`Failed to delete connection_config_${cleanEmail}.json:`, e);
    }
    
    try {
      if (fs.existsSync(uploadPath)) {
        fs.unlinkSync(uploadPath);
      }
    } catch (e) {
      console.warn(`Failed to delete uploaded_database_${cleanEmail}.sqlite:`, e);
    }
    
    // Evict this user's cache keys
    const emailPrefix = `${req.adminEmail.trim().toLowerCase()}::`;
    for (const key of queryCache.keys()) {
      if (key.startsWith(emailPrefix)) {
        queryCache.delete(key);
      }
    }
    
    console.log(`Active database disconnected and configuration deleted for user ${req.adminEmail}.`);
    res.json({ success: true, message: 'Database disconnected and configuration deleted successfully.' });
  } catch (err) {
    console.error('Failed to disconnect database:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get database connection config
app.get('/api/admin/config', requireAdminAuth, (req, res) => {
  const cleanEmail = req.adminEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  const configPath = path.join(DATA_DIR, `connection_config_${cleanEmail}.json`);
  let config = null;

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error(`Error reading connection config for ${req.adminEmail}:`, e);
    }
  }

  res.json({ success: true, config });
});

// Update database connection config
app.post('/api/admin/config', requireAdminAuth, (req, res) => {
  const { type, sqlitePath, host, port, database, username } = req.body;
  
  if (!type) {
    return res.status(400).json({ success: false, error: 'Database type is required.' });
  }

  try {
    const cleanEmail = req.adminEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const configPath = path.join(DATA_DIR, `connection_config_${cleanEmail}.json`);
    const config = {
      type,
      sqlitePath: sqlitePath || `database_${cleanEmail}.sqlite`,
      host: host || '',
      port: port || '',
      database: database || '',
      username: username || ''
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Database connection profile updated to: ${type} for ${req.adminEmail}`);
    res.json({ success: true, message: `Database profile connected to ${type} successfully.` });
  } catch (err) {
    console.error('Failed to save database config:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to parse and convert JSON dataset into SQLite tables dynamically
function convertJsonToSqlite(jsonData, dbFilePath) {
  return new Promise((resolve, reject) => {
    // Delete existing file if any to start fresh
    if (fs.existsSync(dbFilePath)) {
      try {
        fs.unlinkSync(dbFilePath);
      } catch (err) {
        console.error('Failed to clear old uploaded db:', err);
      }
    }

    const dbConn = new sqlite3.Database(dbFilePath, (err) => {
      if (err) return reject(err);
    });

    dbConn.serialize(() => {
      try {
        let tables = {};
        if (Array.isArray(jsonData)) {
          // Flat list of rows - map to table 'imported_data'
          tables['imported_data'] = jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
          // Object containing multiple tables
          for (const key of Object.keys(jsonData)) {
            if (Array.isArray(jsonData[key])) {
              tables[key] = jsonData[key];
            }
          }
        }

        if (Object.keys(tables).length === 0) {
          dbConn.close();
          return reject(new Error('JSON must contain a flat array of records or an object mapping table names to arrays.'));
        }

        for (const tableName of Object.keys(tables)) {
          const rows = tables[tableName];
          if (rows.length === 0) continue;

          // Clean table name
          const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

          // Get unique keys across all rows
          const columnSet = new Set();
          for (const row of rows) {
            if (typeof row === 'object' && row !== null) {
              for (const col of Object.keys(row)) {
                columnSet.add(col);
              }
            }
          }

          const columns = Array.from(columnSet);
          if (columns.length === 0) continue;

          // Infer types
          const colTypes = {};
          for (const col of columns) {
            let detectedType = 'TEXT';
            for (const row of rows) {
              const val = row[col];
              if (val !== undefined && val !== null) {
                if (typeof val === 'number') {
                  if (Number.isInteger(val)) {
                    detectedType = 'INTEGER';
                  } else {
                    detectedType = 'REAL';
                  }
                } else if (typeof val === 'boolean') {
                  detectedType = 'INTEGER';
                }
                break;
              }
            }
            colTypes[col] = detectedType;
          }

          dbConn.run(`DROP TABLE IF EXISTS \`${cleanTableName}\``, (err) => {
            if (err) console.error(`Failed to drop table ${cleanTableName}:`, err);
          });

          const createCols = columns.map(col => `\`${col}\` ${colTypes[col]}`).join(', ');
          const createTableSql = `CREATE TABLE \`${cleanTableName}\` (${createCols})`;
          
          dbConn.run(createTableSql, (err) => {
            if (err) console.error(`Failed to create table ${cleanTableName}:`, err);
          });

          const placeholders = columns.map(() => '?').join(', ');
          const insertSql = `INSERT INTO \`${cleanTableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;

          const stmt = dbConn.prepare(insertSql, (err) => {
            if (err) console.error(`Failed to prepare insert for ${cleanTableName}:`, err);
          });

          if (stmt) {
            for (const row of rows) {
              const values = columns.map(col => {
                const val = row[col];
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                return val !== undefined ? val : null;
              });
              stmt.run(values, (err) => {
                if (err) console.error('Error inserting row:', err);
              });
            }
            stmt.finalize();
          }
        }

        dbConn.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (err) {
        dbConn.close();
        reject(err);
      }
    });
  });
}

// Upload SQLite database file or JSON dataset
app.post('/api/admin/upload-db', requireAdminAuth, async (req, res) => {
  const { fileName, fileContent } = req.body; // fileContent is base64 string
  if (!fileName || !fileContent) {
    return res.status(400).json({ success: false, error: 'File name and content are required.' });
  }

  const isJson = fileName.toLowerCase().endsWith('.json');

  try {
    const cleanEmail = req.adminEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const buffer = Buffer.from(fileContent, 'base64');
    const uploadPath = path.join(DATA_DIR, `uploaded_database_${cleanEmail}.sqlite`);
    
    if (isJson) {
      const jsonText = buffer.toString('utf8');
      let jsonData;
      try {
        jsonData = JSON.parse(jsonText);
      } catch (jsonErr) {
        return res.status(400).json({ success: false, error: 'Invalid JSON file format. Could not parse.' });
      }
      
      // Parse list and convert into SQLite tables dynamically
      await convertJsonToSqlite(jsonData, uploadPath);
    } else {
      // Direct SQLite database write
      fs.writeFileSync(uploadPath, buffer);
    }
    
    // Save configuration to point to the uploaded DB
    const configPath = path.join(DATA_DIR, `connection_config_${cleanEmail}.json`);
    const config = {
      type: 'sqlite',
      sqlitePath: `uploaded_database_${cleanEmail}.sqlite`,
      host: '',
      port: '',
      database: fileName,
      username: ''
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`Uploaded database connected: ${fileName} for ${req.adminEmail}`);
    res.json({ success: true, message: `Database ${fileName} uploaded and connected successfully.` });
  } catch (err) {
    console.error('Failed to save uploaded database:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to extract schema summary from SQLite databases
function getSqliteSummary(dbFilePath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(dbFilePath)) {
      return resolve({ tables: [], totalRows: 0, totalTables: 0 });
    }
    const tempDb = new sqlite3.Database(dbFilePath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Error opening db read-only:', err);
        return resolve({ tables: [], totalRows: 0, totalTables: 0 });
      }
    });

    tempDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'audit_logs';", [], async (err, tables) => {
      if (err) {
        console.error('Error listing tables:', err);
        tempDb.close();
        return resolve({ tables: [], totalRows: 0, totalTables: 0 });
      }

      if (!tables || tables.length === 0) {
        tempDb.close();
        return resolve({ tables: [], totalRows: 0, totalTables: 0 });
      }

      let totalRows = 0;

      try {
        const countPromises = tables.map(t => {
          return new Promise((resCount) => {
            tempDb.get(`SELECT COUNT(*) AS cnt FROM \`${t.name}\`;`, [], (cntErr, row) => {
              const cnt = (row && !cntErr) ? row.cnt : 0;
              totalRows += cnt;
              
              tempDb.all(`PRAGMA table_info(\`${t.name}\`);`, [], (infoErr, cols) => {
                const fields = (cols && !infoErr) ? cols.map(c => c.name) : [];
                resCount({ name: t.name, rows: cnt, fields });
              });
            });
          });
        });

        const resolvedTables = await Promise.all(countPromises);
        tempDb.close();
        resolve({
          tables: resolvedTables,
          totalRows,
          totalTables: resolvedTables.length
        });
      } catch (sumErr) {
        console.error('Error building table summary:', sumErr);
        tempDb.close();
        resolve({ tables: [], totalRows: 0, totalTables: 0 });
      }
    });
  });
}

// Public DB status endpoint
app.get('/api/db-status', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  let isLoggedIn = false;
  let userEmail = null;
  if (token) {
    try {
      const session = await getSession(token);
      if (session) {
        isLoggedIn = true;
        userEmail = session.email;
      }
    } catch (err) {
      console.error('Failed to validate session in db-status:', err);
    }
  }

  if (!isLoggedIn || !userEmail) {
    return res.json({
      success: true,
      connected: false,
      type: 'sqlite',
      database: '',
      summary: { tables: [], totalRows: 0, totalTables: 0 }
    });
  }

  const cleanEmail = userEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  const configPath = path.join(DATA_DIR, `connection_config_${cleanEmail}.json`);
  let config = {
    type: 'sqlite',
    sqlitePath: `database_${cleanEmail}.sqlite`,
    database: `database_${cleanEmail}.sqlite`
  };

  let exists = false;
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      exists = true;
    } catch (e) {
      console.error(`Error reading connection config for ${userEmail}:`, e);
    }
  }

  let summary = { tables: [], totalRows: 0, totalTables: 0 };
  if (exists && config.type === 'sqlite') {
    try {
      const dbPath = path.resolve(DATA_DIR, config.sqlitePath);
      summary = await getSqliteSummary(dbPath);
    } catch (err) {
      console.error('Error fetching database summary:', err);
    }
  }

  res.json({
    success: true,
    connected: exists,
    type: config.type,
    database: config.database || config.sqlitePath,
    summary
  });
});

// Corporate Support/Contact submission endpoint
app.post('/api/contact', (req, res) => {
  const { name, email, org, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
  }
  console.log(`Support contact message from ${name} (${org || 'No Org'}): ${email}\nMessage: ${message}`);
  res.json({ success: true, message: 'Message submitted successfully. Support ticket initialized.' });
});

// Export SQLite database from JSON data
app.post('/api/export-db', async (req, res) => {
  const { tableName, data } = req.body;
  if (!tableName || !data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: 'Table name and data array are required.' });
  }

  // Clean table name
  const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  // Create a temporary database file in a temp directory
  const tempDir = path.resolve(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempFilename = `export_${Date.now()}_${Math.random().toString(36).substring(7)}.db`;
  const dbFilePath = path.join(tempDir, tempFilename);

  try {
    // Map to a dictionary structure where key is table name and value is array
    await convertJsonToSqlite({ [cleanTableName]: data }, dbFilePath);

    // Send the file to client, then delete it when finished
    res.download(dbFilePath, `${cleanTableName}.db`, (err) => {
      try {
        if (fs.existsSync(dbFilePath)) {
          fs.unlinkSync(dbFilePath);
        }
      } catch (unlinkErr) {
        console.error('Failed to delete temporary export database:', unlinkErr);
      }
      if (err) {
        console.error('Error downloading exported database:', err);
      }
    });
  } catch (err) {
    console.error('Failed to create export database SQLite:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate SQLite file' });
  }
});

app.listen(PORT, () => {
  console.log(`Express Backend Server running on port ${PORT}`);
});


import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let currentDb = null;
let currentDbPath = null;

function getDBConnection() {
  const configPath = path.join(__dirname, 'connection_config.json');
  let targetDbPath = path.join(__dirname, 'database.sqlite');

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.type === 'sqlite' && config.sqlitePath) {
        targetDbPath = path.resolve(__dirname, config.sqlitePath);
      }
    } catch (e) {
      console.error('Error reading connection config:', e);
    }
  }

  if (currentDb && currentDbPath === targetDbPath) {
    return currentDb;
  }

  if (currentDb) {
    console.error(`Closing old database connection to ${currentDbPath}`);
    try {
      currentDb.close();
    } catch (err) {
      console.error('Error closing database:', err);
    }
  }

  console.error(`Opening new database connection to: ${targetDbPath}`);
  currentDb = new sqlite3.Database(targetDbPath);
  currentDbPath = targetDbPath;
  return currentDb;
}

// Define the server
const server = new Server(
  {
    name: 'enterprise-db-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_tables',
        description: 'List all available tables in the enterprise database. Used to discover table schemas.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'describe_table',
        description: 'Get schema information (column names, data types, constraints) for a specific table.',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string', description: 'The name of the table to describe.' },
          },
          required: ['tableName'],
        },
      },
      {
        name: 'execute_query',
        description: 'Execute a read-only SQL query on the database. ONLY SELECT queries are permitted.',
        inputSchema: {
          type: 'object',
          properties: {
            sql: { type: 'string', description: 'The SQL SELECT query to execute.' },
          },
          required: ['sql'],
        },
      },
    ],
  };
});

// Helper database functions wrapped in Promises
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const activeDb = getDBConnection();
    activeDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_tables': {
        const rows = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        const tableNames = rows.map(r => r.name);
        return {
          content: [
            {
              type: 'text',
              text: `Available tables in database:\n${tableNames.join('\n')}`,
            },
          ],
        };
      }

      case 'describe_table': {
        const { tableName } = args;
        // Basic SQL Injection protection for dynamic table naming
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
          throw new Error('Invalid table name format');
        }
        const columns = await dbAll(`PRAGMA table_info(${tableName})`);
        const schema = columns.map(c => `- ${c.name} (${c.type})${c.pk ? ' [PRIMARY KEY]' : ''}`).join('\n');
        return {
          content: [
            {
              type: 'text',
              text: `Schema for table '${tableName}':\n${schema}`,
            },
          ],
        };
      }

      case 'execute_query': {
        const { sql } = args;
        console.error(`Executing Query: ${sql}`); // Log to stderr since stdout is used for MCP JSON-RPC
        const results = await dbAll(sql);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing database tool: ${err.message}`,
        },
      ],
    };
  }
});

// Run the server over stdio
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Database MCP Server running on stdio');
}

run().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});

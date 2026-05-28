import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: "application/json" }
});

// Initialize MCP Client
let mcpClient = null;

async function getMCPClient() {
  if (mcpClient) return mcpClient;

  console.log('Connecting to Database MCP Server...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, '../mcp_server/index.js')],
  });

  const client = new Client(
    {
      name: 'analyst-backend-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  mcpClient = client;
  console.log('MCP Server connection established.');
  return mcpClient;
}

// Groq query fallback helper
async function queryGroq(userQuestion, systemPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Groq API Key not configured in .env file.');
  }

  const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  console.log(`Executing fallback query via Groq using model: ${modelName}`);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API returned error status ${response.status}: ${errorBody}`);
  }

  const resJson = await response.json();
  const content = resJson.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq API returned empty completion response.');
  }

  return JSON.parse(content);
}

// Main query handler
export async function queryDatabase(userQuestion) {
  try {
    const client = await getMCPClient();

    // 1. RAG: Retrieve database schema details using MCP tools
    const listResponse = await client.callTool({
      name: 'list_tables',
      arguments: {},
    });

    const tablesText = listResponse.content[0].text;
    
    // Parse table names and get schema descriptions
    const tables = tablesText.split('\n').slice(1); // skip headers
    let schemaContext = 'DATABASE SCHEMA:\n';
    
    for (const table of tables) {
      if (table.trim()) {
        const descResponse = await client.callTool({
          name: 'describe_table',
          arguments: { tableName: table.trim() },
        });
        schemaContext += descResponse.content[0].text + '\n\n';
      }
    }

    // 2. Query Gemini to translate question to SQL + structure chart options
    const systemPrompt = `
      You are the exclusive, specialized AI assistant for this Data Analysis website.
      You are NOT a general-purpose AI. If the user asks you to write Python code, write essays, or perform tasks unrelated to the dataset or this website, you MUST politely REFUSE and state that you are the dedicated AI for this website and can only discuss the uploaded data, the charts, and the website's features.
      
      IMPORTANT: If the user requests to download, export, convert, or generate PDF, SQL, or SQLite DB files of the query results or data, you must politely inform them that you cannot generate files directly in the chat, but they can instantly export the data themselves by clicking the "SQL", "PDF", or "SQLite" buttons located in the toolbar at the top right of the Results table in the chat bubble.

      You will be given a user question and the schemas of the available tables in the database.
      
      Your tasks:
      1. Write a valid, optimized SQLite query that answers the question. If the user asks to modify, update, delete, or add data, you are fully authorized to write data-manipulation queries (e.g. INSERT, UPDATE, DELETE). Otherwise, write SELECT queries. If no query is needed, leave it blank.
      2. ONLY generate chart data if explicitly asked for a chart, plot, or visualization. Otherwise, set "chartType" to "none", "xAxisKey" to "", and "yAxisKeys" to [] to conserve tokens.
      3. Keep your text explanations EXTREMELY minimal and concise (1 short sentence maximum) when not explicitly asked to explain a chart or do detailed analysis. This is to save tokens.
      4. If the user asks what a chart is about or asks to analyze the data visually, explicitly provide details about the data from the chart and its contents.

      ${schemaContext}

      Respond strictly in JSON format matching this schema:
      {
        "thought": "extremely minimal thinking process (1 sentence max) or empty if simple",
        "sql": "a valid SQLite query, or empty string if no query is needed",
        "chartType": "one of: 'area', 'bar', 'line', or 'none' (only set if chart is requested)",
        "xAxisKey": "column name for X axis (empty if no chart)",
        "yAxisKeys": ["column names for Y axis (empty if no chart)"],
        "explanation": "concise answer/explanation, REFUSAL of general AI tasks, or detailed chart analysis if asked"
      }
    `;

    let parsedResponse = null;
    let fallbackToGroq = false;

    try {
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: "Introduce yourself and explain what you do." }] },
          { role: 'model', parts: [{ text: JSON.stringify({ 
              thought: "Explain system role", 
              sql: "SELECT 1;", 
              chartType: "none", 
              xAxisKey: "", 
              yAxisKeys: [], 
              explanation: "I am your enterprise data analyst. Connect your databases, and I will write optimized SQL queries, fetch real-time logs, and generate visualizations."
            }) }] }
        ]
      });

      console.log(`Analyzing query (Gemini): "${userQuestion}"`);
      const result = await chat.sendMessage(userQuestion + `\n\nContext:\n${systemPrompt}`);
      const responseText = result.response.text();
      parsedResponse = JSON.parse(responseText);
    } catch (geminiErr) {
      console.error('Gemini query processing failed:', geminiErr.message);
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
        fallbackToGroq = true;
      } else {
        throw geminiErr;
      }
    }

    if (fallbackToGroq) {
      try {
        parsedResponse = await queryGroq(userQuestion, systemPrompt);
      } catch (groqErr) {
        console.error('Groq query processing fallback failed:', groqErr.message);
        throw groqErr;
      }
    }

    console.log(`Generated SQL: ${parsedResponse.sql}`);

    // 3. Execute query via the MCP server tool
    let dataResults = [];
    let isError = false;
    let errorMessage = '';

    const trimmedSql = parsedResponse.sql ? parsedResponse.sql.trim().toLowerCase() : '';
    const isValidSql = trimmedSql && 
                       trimmedSql !== 'select 1;' && 
                       trimmedSql !== 'none' && 
                       (trimmedSql.startsWith('select') || 
                        trimmedSql.startsWith('insert') || 
                        trimmedSql.startsWith('update') || 
                        trimmedSql.startsWith('delete') || 
                        trimmedSql.startsWith('create') || 
                        trimmedSql.startsWith('drop') || 
                        trimmedSql.startsWith('alter'));

    if (isValidSql) {
      const queryResponse = await client.callTool({
        name: 'execute_query',
        arguments: { sql: parsedResponse.sql },
      });

      if (queryResponse.isError) {
        isError = true;
        errorMessage = 'server busy';
        console.error('Local MCP Query Execution Error:', queryResponse.content[0].text);
      } else {
        dataResults = JSON.parse(queryResponse.content[0].text);
      }
    }

    // For data-modification queries (INSERT/UPDATE/DELETE), if no rows returned,
    // provide a friendly success message rather than showing an empty table.
    const isModificationQuery = trimmedSql.startsWith('insert') || 
                                 trimmedSql.startsWith('update') || 
                                 trimmedSql.startsWith('delete') || 
                                 trimmedSql.startsWith('create') || 
                                 trimmedSql.startsWith('drop') || 
                                 trimmedSql.startsWith('alter');

    if (!isError && isModificationQuery && dataResults.length === 0) {
      parsedResponse.explanation = parsedResponse.explanation || 'Operation executed successfully. The database has been updated.';
    }

    return {
      success: !isError,
      thought: parsedResponse.thought,
      sql: parsedResponse.sql,
      chartConfig: {
        type: parsedResponse.chartType,
        xAxisKey: parsedResponse.xAxisKey,
        yAxisKeys: parsedResponse.yAxisKeys,
      },
      explanation: parsedResponse.explanation,
      data: dataResults,
      error: errorMessage
    };

  } catch (err) {
    console.error('Error in agent query loop:', err);
    return {
      success: false,
      error: 'server busy',
      data: [],
      sql: '',
      explanation: 'Failed to process the query.'
    };
  }
}

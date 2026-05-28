import React, { createContext, useContext, useState } from 'react';

interface ChartConfig {
  type: string;
  xAxisKey: string;
  yAxisKeys: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  data?: any[];
  chartConfig?: ChartConfig;
  sqlCode?: string;
  cached?: boolean;
  isError?: boolean;
  isLoading?: boolean;
}

interface QueryContextType {
  question: string;
  setQuestion: (q: string) => void;
  loading: boolean;
  status: string;
  messages: Message[];
  submitQuery: (e: React.FormEvent) => Promise<void>;
  clearMessages: () => void;
  restoreSavedQuery: (question: string, explanation: string, chartConfig: any, data: any, sqlCode: string) => void;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const submitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setLoading(true);

    // ── JSON paste detection ──
    const isPastedJson =
      (trimmedQuestion.startsWith('{') && trimmedQuestion.endsWith('}')) ||
      (trimmedQuestion.startsWith('[') && trimmedQuestion.endsWith(']'));

    if (isPastedJson) {
      try {
        const parsedJson = JSON.parse(trimmedQuestion);

        const label = Array.isArray(parsedJson)
          ? `${parsedJson.length} records`
          : `Object with keys: ${Object.keys(parsedJson).join(', ')}`;

        const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content: `📎 Uploaded JSON Dataset — ${label}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setQuestion('');
        setStatus('Valid JSON dataset detected. Ingesting...');

        const base64 = btoa(
          encodeURIComponent(JSON.stringify(parsedJson)).replace(
            /%([0-9A-F]{2})/g,
            (_, p1) => String.fromCharCode(parseInt(p1, 16))
          )
        );

        const token = localStorage.getItem('admin-auth-token') || 'mock-admin-token-jwt';

        const uploadRes = await fetch('http://localhost:5000/api/admin/upload-db', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fileName: 'pasted_dataset.json', fileContent: base64 }),
        });

        let uploadData;
        const contentType = uploadRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          uploadData = await uploadRes.json();
        } else {
          const text = await uploadRes.text();
          throw new Error(text || 'Ingestion failed on database server.');
        }

        if (uploadRes.ok && uploadData.success) {
          const aiMsg: Message = {
            id: generateId(),
            role: 'ai',
            content:
              'Pasted JSON dataset ingested and connected successfully. Table schemas have been updated — you can now query this dataset using plain English.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          window.dispatchEvent(new Event('db-status-changed'));
          setStatus('');
          setLoading(false);
          return;
        } else {
          throw new Error(uploadData.error || 'Failed to upload dataset.');
        }
      } catch (jsonErr: any) {
        console.warn('JSON parsing check failed, treating as standard query:', jsonErr);
      }
    }

    // ── Standard query flow ──
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedQuestion,
      timestamp: new Date(),
    };

    const loadingMsgId = generateId();
    const loadingMsg: Message = {
      id: loadingMsgId,
      role: 'ai',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setQuestion('');

    const statusLogs = [
      'Scanning local vector database for schema embeddings...',
      'Retrieving catalog schemas via list_tables & describe_table...',
      'Synthesizing schema relationships...',
      'Generating optimized SQLite query...',
      'Executing secure query on database via MCP stdio client...',
      'Mapping JSON results to layout chart tokens...',
    ];

    let logIdx = 0;
    setStatus(statusLogs[0]);
    const interval = setInterval(() => {
      logIdx++;
      if (logIdx < statusLogs.length) {
        setStatus(statusLogs[logIdx]);
      }
    }, 1200);

    try {
      const token = localStorage.getItem('admin-auth-token') || 'mock-admin-token-jwt';
      const response = await fetch('http://localhost:5000/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      const resData = await response.json();
      clearInterval(interval);

      if (!response.ok || !resData.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? { ...m, content: resData.error || 'Failed to execute query.', isLoading: false, isError: true }
              : m
          )
        );
        setStatus('');
        setLoading(false);
        return;
      }

      // Replace loading placeholder with actual AI response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsgId
            ? {
                ...m,
                content: resData.explanation || 'Query executed successfully.',
                data: resData.data,
                chartConfig: resData.chartConfig,
                sqlCode: resData.sql,
                cached: !!resData.cached,
                isLoading: false,
              }
            : m
        )
      );
      setStatus('');
    } catch (err: any) {
      clearInterval(interval);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsgId
            ? { ...m, content: err.message || 'Connection to backend failed.', isLoading: false, isError: true }
            : m
        )
      );
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => setMessages([]);

  const restoreSavedQuery = (
    questionText: string,
    explanationText: string,
    config: any,
    results: any,
    sql: string
  ) => {
    const userMsg: Message = {
      id: `msg-user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      role: 'user',
      content: questionText,
      timestamp: new Date(),
    };
    const aiMsg: Message = {
      id: `msg-ai-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      role: 'ai',
      content: explanationText,
      timestamp: new Date(),
      data: results,
      chartConfig: config,
      sqlCode: sql,
      cached: false,
    };
    setMessages([userMsg, aiMsg]);
  };

  return (
    <QueryContext.Provider
      value={{
        question,
        setQuestion,
        loading,
        status,
        messages,
        submitQuery,
        clearMessages,
        restoreSavedQuery,
      }}
    >
      {children}
    </QueryContext.Provider>
  );
};

export const useQuery = () => {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
};

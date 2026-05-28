# B.Tech CSE Capstone Project: Analyst.AI
### Developed by: Vaibhav Mishra (Final-Year B.Tech, Computer Science & Engineering)

Analyst.AI is a full-stack database intelligence platform designed to securely translate natural language English prompts into compiler-validated SQLite queries, execute them in an isolated sandbox, and present the results in real-time charts and data tables. 

This repository houses the final-year B.Tech Major Project, demonstrating my implementations of:
* Relational database schemas and dynamic SQL session controls.
* Microservices architecture (using a hybrid SMTP/verification proxy).
* Interactive 3D database schema visualization using Three.js and React Three Fiber (R3F).
* Sandboxed execution environments using the Model Context Protocol (MCP).

---

## 🚀 Key Feature Implementations

* **Natural Language SQL Compiler**: Integrates a RAG-based database schema parser that extracts table metadata and column types, compiles the prompt into an optimized SQLite SELECT statement, and handles runtime LLM fallbacks seamlessly.
* **Direct SMTP Verification Mailer**: A native `nodemailer` implementation. When a user logs in, the backend dynamically generates a secure 6-digit OTP code, stores it in SQLite, and sends a styled verification email to the user's inbox.
* **Decoupled Microservice Proxy**: Designed a hybrid API architecture. The backend checks your environment variables; if `OTP_SERVICE_URL` is set, it proxies OTP generations to an external `sauravhathi/otp-service` microservice, demonstrating decoupled RESTful system design.
* **Persistent Session Store & History**: Multi-user session mappings and user query logs are saved in a persistent SQLite database. The query history table caches previous compiled charts (Recharts) and raw data results, enabling users to view their charts offline even if the database is disconnected or deleted.
* **3D Schema Constellation**: An interactive Three.js node visualizer. It reads the database dictionary dynamically and renders your database tables as physically connected 3D nodes using `@react-three/fiber` and `@react-three/drei`.
* **Administrative Audit Console**: A secure control dashboard displaying average query execution latencies, RAM cache efficiency, execution logs, and a registry table of registered user emails.

---

## 🏗️ System Architecture

```
                      ┌──────────────────────────────┐
                      │    React 19 / Vite Client    │
                      │  - Three.js Node Constell    │
                      │  - Recharts Dashboard Views  │
                      └──────────────┬───────────────┘
                                     │
                             REST API (HTTPS)
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │    Express API Orchestrator  │
                      │  - Session Token Middleware  │
                      │  - Nodemailer SMTP Mailer    │
                      └──────────────┬───────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
    ┌──────────────────────────────┐  ┌──────────────────────────────┐
    │     Persistent SQLite DB     │  │    MCP standard-I/O Server   │
    │  - Users, Sessions, Hist DB  │  │  - Isolated SQL Compiler    │
    │  - 24-hr Expiry Session TTL  │  │  - Zero Direct DB Exposure   │
    └──────────────────────────────┘  └──────────────────────────────┘
```

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Vite, React Router v7, GSAP (staggers & custom kinetic outlines), Recharts, Three.js, `@react-three/fiber`, `@react-three/drei`.
* **Backend**: Node.js, Express, Nodemailer, Dotenv, Cors.
* **Database**: SQLite (`sqlite3` with Promise-based asynchronous wrappers), MCP stdio standard process sandboxing.

---

## ⚙️ How to Configure the `.env` Credentials

Create a `.env` file in your root backend folder:

```env
# Port
PORT=5000

# LLM API Keys
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile

# Automatic SMTP Configuration (Your Gmail Account)
SMTP_USER=your.own@gmail.com
SMTP_PASS=find in goole security settings
# Supabase Configurations
NEXT_PUBLIC_SUPABASE_URL=https://****.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_***********_kZi60nai

# Optional: Microservice Proxy URL
# OTP_SERVICE_URL=http://localhost:4000
```

---

## 🚀 Running the Project Locally

### 1. Backend API & SQLite Initializations
```bash
cd backend
npm install
node server.js
```
The server starts on `http://localhost:5000` and automatically builds/verifies all required SQLite database tables (`audit_logs`, `users`, `otps`, `sessions`, `query_history`).

### 2. Frontend React Client
```bash
npm install
npm run dev -- --port 5173
```
Visit `http://localhost:5173` to run the application.

### 3. Build for Production
To tree-shake and compile the app for hosting:
```bash
npm run build
```

---

## 🌐 How to Deploy this Full-Stack Project

### 1. Frontend SPA Deployment (Netlify)
1. Commit and push the project to GitHub.
2. In Netlify, click **Import from Git** and choose this repository.
3. **Build Settings**: Set Build Command to `npm run build` and Publish Directory to `dist`.
4. **Environment Variables**: Add `VITE_API_URL` pointing to your hosted Express backend service.
5. **React Router Redirect (Required)**: Create a file named `_redirects` in your `public/` directory containing `/* /index.html 200` to prevent page reload 404s.

### 2. Backend Deployment (Render / Railway)
1. Choose **Node Web Service** and hook your GitHub repository.
2. Set start command to `node backend/server.js`.
3. In the environment dashboard, add your `.env` variables.
4. **Persistent SQLite storage (Crucial)**: Add a **Persistent Volume Disk** in the Render settings mounted at `/var/data`, and ensure your local database path is configured to read/write inside `/var/data` so that users, sessions, and histories are permanently saved across server restarts.

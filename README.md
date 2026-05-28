# Analyst.AI — Enterprise Natural Language SQL Analytics Engine

Analyst.AI is a premium, high-fidelity data intelligence and relational analytics platform. It compiles standard natural language English prompts into compiler-validated SQLite statements using schema-semantic context parsing, securely executes them within isolated sandboxes, and renders interactive statistical charts and dynamic dataset tables.

Built as a high-end full-stack demonstration for major B.Tech project portfolios, the platform features dynamic, database-backed One-Time Password (OTP) authentication, session-level route guards, interactive offline query catalogs, and a reactive 3D database schema constellation engine.

---

## 🌟 Key Features

* **English-to-SQL Compiler**: Translates complex plain English prompts into optimized, syntactically verified SQLite SELECT statements using schema vectors.
* **Direct SMTP Verification Engine**: Integrated Nodemailer automation that generates secure 6-digit verification codes and dispatches beautifully designed HTML verification emails directly to client inboxes.
* **Decoupled Microservice OTP Handshake**: Built-in hybrid proxy routing. If configured, it delegates authentication tasks directly to an external `sauravhathi/otp-service` microservice, enabling modern decoupled systems presentations.
* **Persistent SQLite Session Management**: Active user logins, expirations (24-hour TTL), and verification codes (5-minute TTL) are persistently verified against SQLite database tables with strict non-blocking promise-wrapped pools.
* **Offline Query History Catalog**: Preserves natural language inputs, SQL codes, AI analytical explanations, chart configurations, and retrieved raw dataset rows persistently. Users can collapse, view, and interact with visual charts offline even if the main database is disconnected.
* **3D Data Constellation Explorer**: Implements an interactive Three.js and `@react-three/fiber` canvas visually rendering relational database structures as a kinetic 3D node network.
* **Corporate Admin Console**: Comprehensive control panel displaying real-time execution audit logs, query compile latencies, RAM cache efficiency statistics, and a registry table of registered user profiles.

---

## 🏗️ System Architecture

Analyst.AI adopts a decoupled, secure asynchronous monorepo layout:

```
                      ┌──────────────────────────────┐
                      │    Vite / React Frontend     │
                      │  - Three.js Node Constell    │
                      │  - Recharts Visualizations   │
                      └──────────────┬───────────────┘
                                     │
                        Secure API Handshakes (REST)
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │     Express API Backend      │
                      │  - Route Guards Middleware   │
                      │  - Nodemailer SMTP Dispatch  │
                      └──────────────┬───────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
    ┌──────────────────────────────┐  ┌──────────────────────────────┐
    │     Persistent SQLite DB     │  │    MCP standard-I/O Server   │
    │  - User Registry & Sessions  │  │  - Isolated SQL Compiler    │
    │  - Persistent Query History  │  │  - Zero Direct DB Exposure   │
    └──────────────────────────────┘  └──────────────────────────────┘
```

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Vite, React Router v7, GSAP (kinetic layout staggers), Recharts (interactive plotting), `@react-three/fiber` / `@react-three/drei` (3D rendering).
* **Backend**: Node.js, Express, Nodemailer (automated SMTP delivery), Dotenv, Cors.
* **Database**: SQLite (`sqlite3` driver with async Promise wrappers), SQLite MCP (Model Context Protocol) subprocess standard-I/O sandboxing.

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file inside the root directory of your backend folder to configure your credentials:

```env
# Server Port Configuration
PORT=5000

# AI Models & Compiler Keys
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile

# Automatic SMTP Email Configuration (Gmail App Password)
SMTP_USER=analystai.verify@gmail.com
SMTP_PASS=ciooglqikdfgmnwl

# Supabase Production Configuration (If scaling)
NEXT_PUBLIC_SUPABASE_URL=https://nksnqymfkfjpdiapheyj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Mg0rquwivEbyQoU27EOnqA_kZi60nai

# Optional: Decoupled Microservice OTP Service URL
# OTP_SERVICE_URL=http://localhost:4000
```

---

## 🚀 Installation & Local Development

### 1. Prerequisite Installations
Ensure you have **Node.js (v18+)** and **npm** installed on your system.

### 2. Backend Orchestration Setup
Navigate to the backend server directory, install dependencies, and launch the server:
```bash
cd backend
npm install
node server.js
```
The server will boot on `http://localhost:5000` and automatically verify or create your persistent SQLite database tables (`audit_logs`, `users`, `otps`, `sessions`, `query_history`).

### 3. Frontend Client Setup
Open a separate terminal window, navigate to the frontend directory, install packages, and boot the Vite development server:
```bash
npm install
npm run dev -- --port 5173
```
Open `http://localhost:5173` in your browser to interact with the platform.

### 4. Compiling the Production Bundle
To compile and optimize the client application for cloud hosting:
```bash
npm run build
```
This generates a highly tree-shaken, minified static package inside the `/dist` directory.

---

## 🌐 Production Cloud Deployment (Netlify & Render)

To launch this full-stack project live:

### 1. Frontend (Netlify Static Hosting)
* Deploy the compiled `/dist` directory or connect your GitHub repository directly.
* Set the Build Command to `npm run build` and the Publish Directory to `dist`.
* **Important**: Create a `_redirects` file (no extension) inside your frontend **`public/`** folder containing `/* /index.html 200` to prevent React Router client-side reload 404s.
* Add an Environment Variable `VITE_API_URL` pointing to your hosted Express backend.

### 2. Backend (Render / Railway Web Services)
* Connect your repository and select **Node Web Service** with start command `node backend/server.js`.
* Attach a **Persistent Disk Volume** mounted at `/var/data` inside your Render dashboard settings, and ensure your SQLite path points to `/var/data/database.sqlite` to secure persistent data writes across container restarts.

---

## 🔒 Security Compliance Summary

* **OWASP Top 10 Compliant**: Strictly parameterized prepared statements completely mitigate SQL injection vectors.
* **Single-Use OTP Tokens**: OTP codes are instantly purged from SQLite tables upon verification to prevent token reuse.
* **Isolated MCP Pipeline**: Direct client-to-database connections are completely eliminated; queries are safely compiled and ran locally via a sandboxed MCP stdio interface.

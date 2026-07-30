# ⚡ IncidentIQ

**AI-powered incident response platform** that automates triage, root cause analysis, runbook matching, team communications, and postmortem generation using a multi-agent LLM pipeline.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                          │
│              (Vite + React 19 + Tailwind CSS)                  │
│   Dashboard │ Incidents │ Runbooks │ Postmortems │ Pipeline    │
└──────────┬──────────────────────────────────────┬──────────────┘
           │ REST API (fetch)                     │ WebSocket
           │                                      │ (Socket.IO)
┌──────────▼──────────────────────────────────────▼──────────────┐
│                     Express.js Backend                         │
│         Auth (JWT+bcrypt) │ CRUD APIs │ RBAC Middleware        │
│                    MongoDB (Mongoose)                          │
└──────────┬────────────────────────────────────────────────────┘
           │ HTTP (axios)
┌──────────▼───────────────────────────────────────────────────┐
│                   FastAPI AI Service                          │
│                                                               │
│  ┌─────────┐  ┌────────────┐  ┌─────────┐  ┌───────┐  ┌────┐│
│  │ Triage  │→ │ Root Cause │→ │ Runbook │→ │ Comms │→ │Post││
│  │ Agent   │  │   Agent    │  │  Agent  │  │ Agent │  │mort││
│  └─────────┘  └────────────┘  └─────────┘  └───────┘  └────┘│
│       ↕              ↕              ↕                         │
│   Gemini API    Gemini API    MongoDB Atlas                   │
│  (3.6-flash)   (3.6-flash)   Vector Search                   │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Zustand, React Hook Form, Socket.IO Client |
| **Backend** | Node.js, Express 5, Mongoose 9, JWT, bcryptjs, Socket.IO |
| **AI Service** | Python, FastAPI, LangGraph, Google Gemini (3.5/3.6-flash), Gemini Embeddings |
| **Database** | MongoDB Atlas (documents + vector search) |
| **Auth** | JWT tokens (7-day expiry), bcrypt password hashing, Role-Based Access Control |
| **Real-time** | Socket.IO (WebSocket) for live agent pipeline updates |

## Features

- 🔐 **Authentication & RBAC** — JWT-based auth with admin/engineer/viewer roles
- 📊 **Incident Dashboard** — Real-time metrics, incident cards, severity indicators
- 🤖 **5-Agent AI Pipeline** — Automated triage → root cause → runbook → comms → postmortem
- 🔍 **RAG-Powered Runbooks** — Semantic search using Gemini embeddings + MongoDB Atlas Vector Search
- ⚡ **Live Pipeline Feed** — WebSocket-powered real-time agent updates on the dashboard
- 📝 **Automated Postmortems** — AI-generated incident reports with prevention recommendations
- 🔎 **Log-Based Detection** — Auto-parse error logs (e.g., OWASP Juice Shop) and trigger the pipeline

## Project Structure

```
incidentiq/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route page components
│   │   ├── context/         # React Context (Auth)
│   │   ├── store/           # Zustand stores
│   │   ├── config.js        # API URL configuration
│   │   ├── socket.js        # Socket.IO client
│   │   └── App.jsx          # Route definitions
│   └── package.json
├── server/                  # Express backend
│   ├── controllers/         # Route handlers
│   ├── middleware/          # Auth & error middleware
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API route definitions
│   └── app.js               # Server entry point
├── ai-service/              # Python AI service
│   ├── main.py              # FastAPI endpoints
│   ├── pipeline.py          # LangGraph agent pipeline
│   ├── detect_incidents.py  # Log parser & auto-trigger
│   └── requirements.txt
└── README.md
```

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.11+
- MongoDB Atlas account (free tier works)
- Google Gemini API key

### 1. Clone the repository
```bash
git clone https://github.com/your-username/incidentiq.git
cd incidentiq
```

### 2. Set up the backend
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 3. Set up the AI service
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Gemini API key and MongoDB URI
uvicorn main:api --reload --port 8000
```

### 4. Set up the frontend
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

### 5. Open the app
Navigate to `http://localhost:5173` in your browser.

## API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Incidents
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/incidents` | Protected | List all incidents |
| POST | `/api/incidents` | Protected | Create an incident |
| GET | `/api/incidents/:id` | Protected | Get incident by ID |
| PATCH | `/api/incidents/:id` | Protected | Update an incident |
| DELETE | `/api/incidents/:id` | Admin | Delete an incident |

### Runbooks
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/runbooks` | Protected | List all runbooks |
| POST | `/api/runbooks` | Admin | Create runbook (auto-embeds) |
| GET | `/api/runbooks/:id` | Protected | Get runbook by ID |
| PATCH | `/api/runbooks/:id` | Admin | Update a runbook |
| DELETE | `/api/runbooks/:id` | Admin | Delete a runbook |

### Postmortems
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/postmortems` | Protected | List all postmortems |
| POST | `/api/postmortems` | Protected | Create a postmortem |
| GET | `/api/postmortems/:id` | Protected | Get postmortem by ID |
| PATCH | `/api/postmortems/:id` | Protected | Update a postmortem |
| DELETE | `/api/postmortems/:id` | Protected | Delete a postmortem |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | Create a user |
| GET | `/api/users/:id` | Protected | Get user by ID |
| PATCH | `/api/users/:id` | Protected | Update a user |
| DELETE | `/api/users/:id` | Admin | Delete a user |

### AI Service (FastAPI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/run-pipeline` | Run the full 5-agent incident pipeline |
| POST | `/embed` | Generate vector embedding for text |

## AI Pipeline

The pipeline uses **LangGraph** to orchestrate 5 sequential agents:

1. **Triage Agent** — Classifies severity (P0-P3) and identifies affected service
2. **Root Cause Agent** — Generates a technical root cause hypothesis
3. **Runbook Agent** — Semantic search via RAG to find the most relevant runbook
4. **Comms Agent** — Drafts a Slack-style team update
5. **Postmortem Agent** — Generates fix summary and prevention steps

All agents use **Google Gemini** (3.5-flash / 3.6-flash) with retry logic for rate limiting.

## Environment Variables

### Server (`server/.env`)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `AI_SERVICE_URL` | Python AI service URL (default: http://localhost:8000) |
| `CLIENT_URL` | Frontend URL for CORS (default: http://localhost:5173) |

### AI Service (`ai-service/.env`)
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `MONGODB_URI` | MongoDB Atlas connection string |

### Client (`client/.env`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (default: http://localhost:3000) |
| `VITE_WS_URL` | WebSocket URL (default: http://localhost:3000) |

## License

MIT

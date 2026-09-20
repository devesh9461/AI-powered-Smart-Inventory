# 🤖 AI-Powered Smart Inventory Management System

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-000?style=flat-square&logo=flask)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6-f7931e?style=flat-square&logo=scikitlearn&logoColor=white)](https://scikit-learn.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Render](https://img.shields.io/badge/Backend-Render-46e3b7?style=flat-square)](https://render.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000?style=flat-square&logo=vercel)](https://vercel.com)

A full-stack, production-ready inventory management system powered by **machine learning** for demand forecasting, anomaly detection, and predictive inventory insights.

> **Built by [Devesh Jangid](https://github.com/deveshjangid)** to showcase skills in Python, AI/ML, full-stack development, and cloud deployment.

---

## ✨ Key Features

### 🧠 AI/ML Capabilities
- **Demand Forecasting** — RandomForestRegressor with 12 time-series features (rolling averages, lag, seasonality)
- **Anomaly Detection** — IsolationForest analyzing 11 stock movement features to flag unusual patterns
- **Predictive Insights** — Hybrid ML + business rules for reorder suggestions, stockout risk, and trend analysis
- **Confidence Intervals** — Individual tree predictions provide upper/lower bounds on forecasts

### 📦 Inventory Management
- Full CRUD for products with categories, suppliers, and locations
- Stock-in / Stock-out / Adjustment / Return transaction tracking
- Real-time stock status (In Stock, Low Stock, Out of Stock, Overstock)
- Automatic alert generation on stock level changes

### 📊 Analytics Dashboard
- Glassmorphism UI with dark theme and animated components
- Area charts (stock flow), bar charts (category distribution), pie charts (stock health)
- Demand forecast visualization with confidence bands
- Anomaly scatter plot with risk mapping

### 🔐 Security
- JWT-based authentication with bcrypt password hashing
- Protected API routes with token validation
- Role-based user system (admin, manager, user)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Recharts, Lucide Icons, React Router |
| **Backend** | Python 3.11, Flask, Flask-RESTful, SQLAlchemy, Gunicorn |
| **AI/ML** | scikit-learn (RandomForest, IsolationForest), Pandas, NumPy |
| **Database** | PostgreSQL (prod), SQLite (dev) |
| **Auth** | JWT (PyJWT) + bcrypt |
| **Hosting** | Vercel (frontend), Render (backend + DB) |

---

## 🚀 Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Run the server (auto-seeds demo data on first start)
python run.py
```

Backend runs at `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies API to localhost:5000)
npm run dev
```

Frontend runs at `http://localhost:5173`

### Demo Credentials
- **Email:** admin@inventory.ai
- **Password:** admin123

---

## 🌐 Deployment

### Backend → Render (Free Tier)

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New"** → **"Blueprint"**
4. Connect your GitHub repo and select the `backend/` directory
5. Render will auto-detect `render.yaml` and create:
   - Web Service (Flask API)
   - PostgreSQL Database
6. After deployment, copy your backend URL (e.g., `https://smart-inventory-api.onrender.com`)
7. Add `FRONTEND_URL` environment variable with your Vercel frontend URL

### Frontend → Vercel (Free Hobby Tier)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repo
4. Set the **Root Directory** to `frontend`
5. Add Environment Variable:
   - `VITE_API_URL` = `https://your-render-backend.onrender.com`
6. Deploy!

---

## 📁 Project Structure

```
AI-powered Smart Inventory/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── config.py            # Dev/Prod configuration
│   │   ├── extensions.py        # SQLAlchemy, Migrate
│   │   ├── models/              # Database models (User, Product, Transaction, Alert, Category)
│   │   ├── routes/              # API endpoints (auth, products, transactions, dashboard, AI)
│   │   ├── services/            # ML engine (forecasting, anomaly, insights)
│   │   └── utils/               # Auth helpers, seed data
│   ├── requirements.txt
│   ├── run.py                   # Entry point
│   ├── gunicorn.conf.py         # Production WSGI config
│   └── render.yaml              # Render Blueprint
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios client with JWT
│   │   ├── components/          # Sidebar, Topbar, StatCard, Modal, etc.
│   │   ├── context/             # Auth state management
│   │   ├── pages/               # Dashboard, Products, Transactions, Analytics, Alerts, Settings
│   │   ├── utils/               # Constants, helpers
│   │   ├── App.jsx              # Router
│   │   └── index.css            # Design system
│   ├── vercel.json              # SPA routing
│   └── package.json
└── README.md
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login → JWT token |
| `GET` | `/api/auth/me` | Current user profile |
| `GET/POST` | `/api/products` | List / Create products |
| `GET/PUT/DELETE` | `/api/products/:id` | Get / Update / Delete product |
| `GET/POST` | `/api/transactions` | List / Create transactions |
| `GET` | `/api/categories` | List categories |
| `GET` | `/api/dashboard` | Aggregated dashboard data |
| `GET` | `/api/alerts` | List alerts |
| `PATCH` | `/api/alerts/:id/read` | Mark alert as read |
| `GET` | `/api/ai/forecast/:id` | 30-day demand forecast |
| `GET` | `/api/ai/anomalies` | Anomaly detection results |
| `GET` | `/api/ai/insights` | AI-generated insights |

---

## 🧪 AI/ML Details

### Demand Forecasting (RandomForestRegressor)
- **Features:** day_of_week, month, week_of_year, day_of_month, is_weekend, rolling_avg_7d, rolling_avg_14d, rolling_std_7d, lag_1, lag_7, lag_14, trend
- **Training:** Per-product model trained on 90 days of transaction history
- **Output:** 30-day forecast with 10th/90th percentile confidence intervals from individual tree predictions

### Anomaly Detection (IsolationForest)
- **Features:** total_outflow, total_inflow, avg_daily_out/in, std_dev_out/in, max_single_outflow, tx_counts, stock_ratio, flow_imbalance
- **Contamination:** 10% (configurable)
- **Output:** Anomaly score, severity classification, human-readable reason

### Predictive Insights
- Stockout risk (days until zero stock)
- Reorder quantity suggestions (based on 30-day forecast + lead time)
- Trending up/down detection (7-day vs prior comparison)
- Overstock warnings (capacity utilization)

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

**Built with ❤️ by Devesh Jangid**

# 🎬 CineMatch — AI-Powered Movie Recommendation Engine

An IMDB-style movie recommendation engine built with **Hybrid Machine Learning**, a **FastAPI** backend, and a **React** frontend. Includes a Watchlist feature, full search, genre filtering, and one-command Docker deployment.

![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker)

---

## 📁 Complete Project Structure

Below is every single file in this project and what it does. Do not skip this — understanding the structure makes setup much easier.

```
cinematch/                          ← Root project folder
│
├── README.md                       ← This file
├── .gitignore                      ← Tells Git which files to ignore
├── .env.example                    ← Template for your environment variables
├── docker-compose.yml              ← Run the full app with one command (Docker)
├── vercel.json                     ← Config for deploying frontend to Vercel
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml               ← GitHub Actions: auto-test + auto-deploy on push
│
├── backend/                        ← Everything Python/FastAPI lives here
│   ├── Dockerfile                  ← How to build the backend into a Docker container
│   ├── Procfile                    ← Tells Railway how to start the server
│   ├── railway.json                ← Config for deploying backend to Railway
│   ├── requirements.txt            ← Python packages to install
│   │
│   ├── scripts/
│   │   └── setup_data.py           ← Downloads MovieLens 1M dataset automatically
│   │
│   └── app/                        ← Main Python application package
│       ├── __init__.py
│       ├── main.py                 ← FastAPI app entry point (starts the server)
│       │
│       ├── api/                    ← API route handlers (URL endpoints)
│       │   ├── __init__.py
│       │   ├── movies.py           ← /api/movies/* endpoints
│       │   ├── recommendations.py  ← /api/recommend/* endpoints
│       │   └── search.py           ← /api/search endpoints
│       │
│       ├── ml/                     ← All Machine Learning code
│       │   ├── __init__.py
│       │   ├── engine.py           ← Main orchestrator (loads + runs both models)
│       │   ├── content_model.py    ← TF-IDF + Cosine Similarity model
│       │   ├── collab_model.py     ← SVD Collaborative Filtering model
│       │   └── preprocessor.py    ← Data loading, cleaning, feature engineering
│       │
│       └── data/
│           ├── __init__.py
│           └── raw/                ← Dataset files go here (created by setup_data.py)
│               ├── ml-1m/          ← MovieLens 1M files (auto-downloaded)
│               └── tmdb/           ← TMDB 5000 files (manual download from Kaggle)
│
└── frontend/                       ← Everything React/JavaScript lives here
    ├── Dockerfile                  ← How to build the frontend into a Docker container
    ├── index.html                  ← HTML entry point (Vite uses this)
    ├── package.json                ← Node packages and npm scripts
    ├── vite.config.js              ← Vite bundler config (dev server + build)
    │
    └── src/
        ├── main.jsx                ← React entry point (mounts App into index.html)
        └── App.jsx                 ← Entire frontend application (all components)
```

---

## 🧠 How the ML Works (Quick Summary)

```
Your request: "Show me movies like Inception"
        ↓
Content Model (40% weight)          Collaborative Model (60% weight)
  • Reads: genres, cast,              • Reads: what users with
    director, keywords, plot            similar taste watched
  • Method: TF-IDF + Cosine          • Method: SVD Matrix
    Similarity                          Factorization
        ↓                                       ↓
            Hybrid Score = 0.4×content + 0.6×collab
                            ↓
               Top 10 recommendations returned
```

**Datasets used:**
- **MovieLens 1M** — 1 million user ratings on 6,000 movies (auto-downloaded)
- **TMDB 5000** — Rich movie metadata: cast, director, plot, genres (manual download)

---

## ⚙️ Prerequisites — Install These First

Before you do anything else, make sure these are installed on your computer.

### 1. Python 3.11+
- Go to https://www.python.org/downloads/
- Download and install Python 3.11 or newer
- During installation on Windows: ✅ check **"Add Python to PATH"**
- Verify it worked — open a terminal and run:
  ```
  python --version
  ```
  You should see something like `Python 3.11.x`

### 2. Node.js 20+
- Go to https://nodejs.org/
- Download the **LTS** version (Long Term Support)
- Install it with default settings
- Verify:
  ```
  node --version
  npm --version
  ```

### 3. Git
- Go to https://git-scm.com/downloads
- Install with default settings
- Verify:
  ```
  git --version
  ```

### 4. A Code Editor (Optional but recommended)
- Download **VS Code**: https://code.visualstudio.com/

---

## 🚀 Local Setup — Step by Step

### Step 1 — Get the project files

If you downloaded the project as a ZIP, unzip it to a folder called `cinematch`.

If you're cloning from GitHub:
```bash
git clone https://github.com/YOUR_USERNAME/cinematch.git
cd cinematch
```

Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux) and navigate into the folder:
```bash
cd cinematch
```

---

### Step 2 — Set up the Backend

Open a terminal in the `cinematch` folder and run these commands **one at a time**:

**2a. Go into the backend folder**
```bash
cd backend
```

**2b. Create a virtual environment**

A virtual environment keeps Python packages for this project separate from everything else on your computer.

On Mac/Linux:
```bash
python -m venv venv
source venv/bin/activate
```

On Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

You'll know it worked when you see `(venv)` at the start of your terminal line.

**2c. Install Python packages**
```bash
pip install -r requirements.txt
```

This installs FastAPI, scikit-learn, pandas, and all other dependencies. It may take 2–5 minutes.

**2d. Download the MovieLens dataset**
```bash
python scripts/setup_data.py
```

This automatically downloads the MovieLens 1M dataset (~6MB) and saves it to `backend/app/data/raw/ml-1m/`. You'll see a message confirming it worked.

**2e. (Optional) Add TMDB data for richer metadata**

The app works without this, but TMDB data adds cast, director, plot, and keywords.

1. Go to https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata
2. Click **Download** (you need a free Kaggle account)
3. Unzip the downloaded file
4. Copy these two files into `backend/app/data/raw/tmdb/`:
   - `tmdb_5000_movies.csv`
   - `tmdb_5000_credits.csv`

**2f. Start the backend server**
```bash
uvicorn app.main:app --reload --port 8000
```

You should see output like:
```
🎬 Starting CineMatch - Loading ML models...
✅ ML models loaded successfully!
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Leave this terminal open. Open your browser and go to:
- **API health check:** http://localhost:8000/api/health
- **Interactive API docs:** http://localhost:8000/docs

---

### Step 3 — Set up the Frontend

Open a **new terminal** (keep the backend terminal running). Navigate back to the root and into the frontend folder:

```bash
cd cinematch/frontend
```

**3a. Install Node packages**
```bash
npm install
```

This installs React, Vite, and all frontend dependencies. May take 1–2 minutes.

**3b. Start the frontend development server**
```bash
npm run dev
```

You'll see:
```
  VITE ready in 300ms
  ➜  Local:   http://localhost:3000/
```

Open your browser and go to **http://localhost:3000** — you should see the full CineMatch app!

---

### Step 4 — Verify Everything Works

With both servers running, check:

| URL | What you should see |
|-----|-------------------|
| http://localhost:3000 | CineMatch frontend app |
| http://localhost:8000/api/health | `{"status":"healthy","models_loaded":true}` |
| http://localhost:8000/docs | Interactive API documentation |
| http://localhost:8000/api/movies/trending | JSON list of trending movies |

If the frontend shows **"API LIVE"** in the top-right corner (green dot), the backend is connected correctly. If it shows **"DEMO"** (yellow dot), check that your backend terminal is still running.

---

## 📤 Uploading to GitHub — Step by Step

### Step 1 — Create a GitHub account

If you don't have one, go to https://github.com and sign up for free.

### Step 2 — Create a new repository

1. Click the **+** button in the top-right corner of GitHub
2. Click **"New repository"**
3. Fill in:
   - **Repository name:** `cinematch`
   - **Description:** `AI-powered movie recommendation engine`
   - **Visibility:** Public (so others can see it) or Private
   - ❌ Do NOT check "Add a README file" — we already have one
4. Click **"Create repository"**

### Step 3 — Connect your local project to GitHub

In your terminal, navigate to the root `cinematch` folder:
```bash
cd cinematch
```

Run these commands one at a time:

```bash
# Initialize Git in this folder
git init

# Add all files to be tracked
git add .

# Create your first commit (save point)
git commit -m "Initial commit: CineMatch movie recommendation engine"

# Tell Git which branch to use (modern default is 'main')
git branch -M main

# Connect to your GitHub repository
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/cinematch.git

# Push your code to GitHub
git push -u origin main
```

GitHub will ask for your username and password. For the password, you need a **Personal Access Token** (GitHub no longer accepts regular passwords):
1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Give it a name like "cinematch"
4. Check the **"repo"** checkbox
5. Click **"Generate token"**
6. Copy the token and paste it as your password

### Step 4 — Verify the upload

Go to `https://github.com/YOUR_USERNAME/cinematch` in your browser. You should see all your files there with the README displayed.

---

## 🌐 Deployment — Vercel + Railway

This section deploys your app so anyone on the internet can use it — no more "only works on my computer".

**What we're doing:**
- **Vercel** → hosts your React frontend (the website people see)
- **Railway** → hosts your Python backend (the ML engine)

Think of it like this: Vercel is the shop front, Railway is the factory in the back.

---

### Part A — Deploy the Backend to Railway

Railway will run your FastAPI + ML models on a real server in the cloud.

**Step A1 — Create a Railway account**
1. Go to https://railway.app
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your GitHub

**Step A2 — Create a new project**
1. On the Railway dashboard, click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. If prompted, click **"Configure GitHub App"** and give Railway access to your repositories
4. Select your **`cinematch`** repository from the list
5. Railway will detect the project — when asked which folder to deploy, select **`backend`**

**Step A3 — Configure the backend service**
1. Once the project is created, click on your service
2. Click the **"Settings"** tab
3. Under **"Root Directory"**, type: `backend`
4. Under **"Start Command"**, type:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Click **"Save"**

**Step A4 — Trigger a deployment**
1. Click the **"Deploy"** tab
2. Click **"Deploy Now"**
3. Watch the build logs — it will install packages and download the dataset. This takes **3–5 minutes** the first time because it's training the ML models.
4. When you see `✅ ML models loaded successfully!` in the logs, it's working.

**Step A5 — Get your backend URL**
1. Click the **"Settings"** tab
2. Scroll to **"Networking"** → **"Public Networking"**
3. Click **"Generate Domain"**
4. You'll get a URL like: `https://cinematch-backend-production.up.railway.app`
5. **Copy this URL** — you'll need it in Part B.

Test it by going to: `https://YOUR_RAILWAY_URL/api/health` in your browser. You should see `{"status":"healthy"}`.

---

### Part B — Deploy the Frontend to Vercel

Vercel will host your React app and make it available at a public URL.

**Step B1 — Create a Vercel account**
1. Go to https://vercel.com
2. Click **"Sign Up"** → **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub

**Step B2 — Import your project**
1. On the Vercel dashboard, click **"Add New"** → **"Project"**
2. Find your `cinematch` repository and click **"Import"**

**Step B3 — Configure the project**

Vercel will show you a configuration screen. Fill it in exactly like this:

- **Framework Preset:** Select `Vite`
- **Root Directory:** Click "Edit" and type `frontend`
- **Build Command:** `npm run build`  *(Vercel fills this in automatically)*
- **Output Directory:** `dist`  *(Vercel fills this in automatically)*

Now you need to add an **Environment Variable** so the frontend knows where the backend is:

1. Scroll down to **"Environment Variables"**
2. Click **"Add"**
3. Fill in:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://YOUR_RAILWAY_URL/api`
   - (Replace `YOUR_RAILWAY_URL` with the Railway URL you copied in Step A5)
4. Click **"Add"**

**Step B4 — Deploy**
1. Click **"Deploy"**
2. Vercel will build and deploy your frontend. This takes about 1–2 minutes.
3. When it says **"Congratulations!"**, click **"Go to Dashboard"**

**Step B5 — Get your live URL**
1. On your project dashboard, you'll see a URL like: `https://cinematch-abc123.vercel.app`
2. Click it — your app is now live on the internet! 🎉

**Step B6 — Update CORS on the backend (important!)**

For the backend to accept requests from your Vercel URL, you need to add one environment variable on Railway:

1. Go back to Railway → your project → **"Variables"** tab
2. Click **"Add Variable"**
3. Add:
   - **Name:** `ALLOWED_ORIGINS`
   - **Value:** `https://cinematch-abc123.vercel.app` (your actual Vercel URL)
4. Click **"Save"** — Railway will automatically redeploy

---

### Part C — Test Everything End to End

1. Open your Vercel URL in your browser
2. You should see the CineMatch app with a **green "API LIVE"** dot in the top right
3. Browse trending movies, search, click a film, and check that recommendations load
4. Try adding films to your Watchlist

If the dot is still yellow ("DEMO"), double-check that `VITE_API_URL` in Vercel matches your Railway URL exactly, including `https://` and `/api` at the end.

---

### CI/CD — Auto-Deploy on Push (Optional but Recommended)

Once you have Vercel and Railway set up, you can make it so every time you push code to GitHub, it **automatically deploys**. This is what the `.github/workflows/ci-cd.yml` file does.

**Step 1 — Get your tokens**

You need three values from Vercel:
1. Go to https://vercel.com/account/tokens → **"Create"** → name it "cinematch-github" → **Copy the token**
2. Go to your Vercel project → **"Settings"** → copy the **Project ID** and **Org/Team ID**

From Railway:
1. Go to https://railway.app/account/tokens → **"Create token"** → **Copy the token**

**Step 2 — Add secrets to GitHub**
1. Go to your GitHub repo → **"Settings"** → **"Secrets and variables"** → **"Actions"**
2. Click **"New repository secret"** and add each one:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Your Vercel token |
| `VERCEL_ORG_ID` | Your Vercel Org/Team ID |
| `VERCEL_PROJECT_ID` | Your Vercel Project ID |
| `RAILWAY_TOKEN` | Your Railway token |

**Step 3 — Push any change to trigger it**
```bash
git add .
git commit -m "Add CI/CD"
git push
```

Go to your GitHub repo → **"Actions"** tab to watch the pipeline run. From now on, every push to `main` will automatically test and deploy your app.

---

## 🐳 Alternative: Deploy with Docker (One Command)

If you have Docker installed (https://www.docker.com/products/docker-desktop/), you can run the entire app — frontend + backend — with a single command:

```bash
# From the root cinematch folder
docker-compose up --build
```

This will:
1. Build the backend Python container (installs deps, downloads dataset)
2. Build the frontend nginx container (builds React app)
3. Start both services and wire them together

Access at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

To stop:
```bash
docker-compose down
```

To deploy this on a VPS (like DigitalOcean or AWS EC2):
1. SSH into your server
2. Install Docker and docker-compose
3. Clone your GitHub repo
4. Run `docker-compose up -d --build` (the `-d` runs it in the background)

---

## 📡 API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check if backend is running |
| GET | `/api/movies/` | List all movies (paginated) |
| GET | `/api/movies/trending` | Top movies by weighted rating |
| GET | `/api/movies/top-rated` | Highest-rated movies |
| GET | `/api/movies/genres` | All available genres |
| GET | `/api/movies/{id}` | Single movie details |
| GET | `/api/movies/{id}/similar` | Content-similar movies |
| GET | `/api/recommend/content/{movie_id}` | Content-based recommendations |
| GET | `/api/recommend/collab/{user_id}` | Collaborative recommendations |
| GET | `/api/recommend/hybrid/{movie_id}` | Hybrid recommendations (best) |
| POST | `/api/recommend/by-genre` | Recommend by genre list |
| GET | `/api/recommend/info/models` | ML model statistics |
| GET | `/api/search?q=query` | Search movies by title |

Full interactive documentation: **http://localhost:8000/docs**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| Backend | Python 3.11, FastAPI |
| ML — Content | Scikit-learn (TF-IDF, Cosine Similarity) |
| ML — Collaborative | SVD Matrix Factorization (Surprise / NumPy) |
| Data | MovieLens 1M, TMDB 5000 |
| Containerization | Docker, Docker Compose |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |
| CI/CD | GitHub Actions |

---

## ❓ Troubleshooting

**"python is not recognized" on Windows**
→ Re-install Python and make sure to check "Add Python to PATH" during installation.

**"ModuleNotFoundError" when starting the backend**
→ Make sure your virtual environment is activated (`source venv/bin/activate` or `venv\Scripts\activate`) and you ran `pip install -r requirements.txt`.

**The frontend shows "DEMO" instead of "API LIVE"**
→ Your backend isn't running or isn't reachable. Make sure `uvicorn app.main:app --reload --port 8000` is running in a separate terminal.

**Railway build fails with "memory error"**
→ The ML model training uses significant RAM. Upgrade to Railway's Starter plan ($5/month) which gives more memory.

**Vercel build fails**
→ Make sure the Root Directory is set to `frontend` (not the repo root) in Vercel project settings.

---

## 📄 License

MIT License — free to use, modify, and distribute.

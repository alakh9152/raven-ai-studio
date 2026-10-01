# GitHub Deployment Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `raven-ai-studio`
3. Description: "AI Agents & Automation Studio - Full-stack web application"
4. Make it **Public**
5. Do NOT initialize with README, .gitignore, or license
6. Click "Create repository"

## Step 2: Copy the Repository URL

After creating the repo, you'll see:
```
https://github.com/YOUR_USERNAME/raven-ai-studio.git
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Push to GitHub (Run these commands)

```bash
cd /home/alakh/ai-saas-website

# Remove the existing remote and add yours
git remote remove origin 2>/dev/null
git remote add origin https://github.com/YOUR_USERNAME/raven-ai-studio.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Verify on GitHub

Go to https://github.com/YOUR_USERNAME/raven-ai-studio
You should see all your files!

---

## Optional: Install GitHub CLI (gh) for Future Use

```bash
# Install gh CLI
(type -p wget >/dev/null || (sudo apt install wget -y)) \
    && mkdir -p -m 755 /etc/apt/keyrings \
    && out=$(mktemp) && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee $out >/dev/null \
    && sudo chmod go+r $out \
    && sudo mkdir -p /etc/apt/sources.list.d \
    && sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null << 'EOF'
deb [signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main
EOF
    && sudo apt update \
    && sudo apt install gh -y

# Login to GitHub
gh auth login
# Select: GitHub.com
# Preferred protocol: HTTPS
# Authenticate: Login with a web browser
# Follow the URL and enter the code
```

---

## Deploy to Free Hosting (After GitHub Push)

### Option A: Railway (Easiest)
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `raven-ai-studio`
5. Click "+ Add" → "Database" → "Postgres"
6. Railway will automatically configure the database
7. Click "Deploy"

### Option B: Render
1. Go to https://render.com
2. Sign up with GitHub
3. New → "Web Service"
4. Connect your `raven-ai-studio` repo
5. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add PostgreSQL database (free tier)
7. Deploy!

---

## Database Migrations

After deployment, run migrations:

### Via Railway
1. Click on your project
2. Click "Shell"
3. Run:
```bash
psql $DATABASE_URL -f src/config/migrations/001_initial_schema.sql
psql $DATABASE_URL -f src/config/migrations/002_security_improvements.sql
psql $DATABASE_URL -f src/config/migrations/003_email_verification_improvements.sql
psql $DATABASE_URL -f src/config/migrations/004_project_fields.sql
psql $DATABASE_URL -f src/config/migrations/005_enquiry_fields.sql
psql $DATABASE_URL -f src/config/migrations/006_activity_logs.sql
```

### Via Render
1. Go to your service
2. Click "Shell"
3. Run the same commands

---

## Test Your Deployment

Visit: `https://your-app-name.onrailway.app` (or your render URL)

Test endpoints:
- Homepage: `/`
- Login: `/login`
- API: `/api/auth/me` (should return 401 without auth)
- Health: `/health`
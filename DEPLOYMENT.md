# GitHub Deployment Guide for Raven AI Studio

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `raven-ai-studio`
3. Make it **Public** or **Private**
4. Do NOT initialize with README, .gitignore, or license
5. Click "Create repository"

## Step 2: Connect Local Repo to GitHub

```bash
cd /home/alakh/ai-saas-website
git remote add origin https://github.com/YOUR_USERNAME/raven-ai-studio.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Deploy to Free Hosting Options

### Option A: Railway (Recommended)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `raven-ai-studio`
5. Add PostgreSQL database:
   - Click "+ Add" → "Database" → "Postgres"
   - Railway will automatically set DATABASE_URL
6. Deploy!

### Option B: Render

1. Go to https://render.com
2. Sign up with GitHub
3. New → "Web Service"
4. Connect your `raven-ai-studio` repo
5. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add PostgreSQL database (free tier)
6. Add environment variables:
   - `SESSION_SECRET` (generate random string)
   - `NODE_ENV=production`
7. Deploy!

### Option C: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly apps create raven-ai-studio`
4. Add PostgreSQL: `fly postgres attach raven-db`
5. Deploy: `fly deploy`

## Step 4: Set Environment Variables

After deploying, set these environment variables:

```env
NODE_ENV=production
PORT=3000

# Database (Railway/Render will provide this automatically)
DATABASE_URL=postgresql://user:pass@host:5432/raven_studio

# Session
SESSION_SECRET=your_random_secret_here

# CORS (set to your domain)
CORS_ORIGIN=https://your-domain.com
```

## Step 5: Run Database Migrations

### Via Railway
1. Go to your project
2. Click "Shell"
3. Run migrations:
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
3. Run the same migrations

## Step 6: Verify Deployment

1. Visit your deployed URL (e.g., `https://raven-ai-studio.onrender.com`)
2. Test registration: `/api/auth/register`
3. Test login: `/api/auth/login`
4. Check health: `/health`

## Troubleshooting

### Database Connection Issues
- Ensure DATABASE_URL is set correctly
- Check that migrations have been run
- Verify PostgreSQL is running

### Build Failures
- Check Node.js version (should be 18+)
- Ensure all dependencies are in package.json
- Check build logs in hosting platform

### CORS Errors
- Set CORS_ORIGIN to your actual domain
- Don't use wildcard (*) in production

## Cost Estimate

All recommended platforms offer free tiers:
- **Railway**: $5/month credit (enough for small projects)
- **Render**: Free web services + free PostgreSQL
- **Fly.io**: Free allowance (small VM)

Total monthly cost: **$0** for starter projects
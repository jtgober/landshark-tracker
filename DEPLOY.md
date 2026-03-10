# Deploying Shark-in to the Web

This guide gets the **frontend** (Vite/React) and **backend** (Node/Express) deployed and wired together.

## Overview

| Part      | Recommended host | Why                          |
|-----------|------------------|------------------------------|
| Frontend  | [Vercel](https://vercel.com) | Free tier, great Vite support, GitHub integration |
| Backend   | [Render](https://render.com) | Free tier, Node support, optional disk for SQLite |

## 1. Push your code to GitHub

If you haven’t already:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/shark-in.git
git push -u origin main
```

## 2. Deploy the backend (Render)

1. Go to [Render Dashboard](https://dashboard.render.com) and sign in (e.g. with GitHub).
2. **New → Web Service**.
3. Connect the **shark-in** repo.
4. Configure:
   - **Name:** `shark-in-api` (or any name).
   - **Root Directory:** `server`.
   - **Runtime:** Node.
   - **Build Command:** `npm install && npm run build`.
   - **Start Command:** `npm start`.
5. **Environment** (required):
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = a long random string (e.g. 32+ chars).
   - `FRONTEND_URL` = your frontend URL (e.g. `https://shark-in.vercel.app` — set this after deploying the frontend, then redeploy the backend).
   - For Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` = `https://YOUR_RENDER_URL/api/auth/google/callback`.
   - For Facebook OAuth: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI` = `https://YOUR_RENDER_URL/api/auth/facebook/callback`.
6. Create the service. Note the URL (e.g. `https://shark-in-api.onrender.com`).

**Optional:** You can use the repo’s `render.yaml` as a blueprint instead of filling the form (Render will read root directory, build, and start from it).

## 3. Deploy the frontend (Vercel)

1. Go to [Vercel](https://vercel.com) and sign in with GitHub.
2. **Add New → Project**, import the **shark-in** repo.
3. Leave **Root Directory** as `.` (repo root).
4. **Environment Variables:**
   - `VITE_API_URL` = your backend URL **with no trailing slash** (e.g. `https://shark-in-api.onrender.com`).
5. Deploy. Vercel will use the repo’s `vercel.json` (build + SPA rewrites).

After the first deploy, copy your frontend URL (e.g. `https://shark-in.vercel.app`).

## 4. Wire frontend and backend

1. **Backend:** In Render, set `FRONTEND_URL` to your Vercel URL (e.g. `https://shark-in.vercel.app`). Redeploy if needed.
2. **OAuth:** In Google Cloud Console and Facebook Developer Console, add the **production** redirect URIs:
   - Google: `https://YOUR_RENDER_URL/api/auth/google/callback`
   - Facebook: `https://YOUR_RENDER_URL/api/auth/facebook/callback`

## 5. GitHub pipelines (CI)

The repo includes a **CI** workflow (`.github/workflows/ci.yml`) that runs on every push and pull request to `main`/`master`:

- **Frontend:** `npm ci`, `npm run lint`, `npm run build`
- **Backend:** `npm ci`, `npm run build` in the `server/` directory

No secrets are required for CI. To use it, push to GitHub and open the **Actions** tab. If the **Backend** job fails on `npm run build`, fix the TypeScript errors in `server/` (e.g. libsql `InValue` types in controllers) so that `tsc` passes.

## 6. Optional: deploy from GitHub Actions

You can deploy the frontend from GitHub Actions using Vercel’s CLI:

1. In Vercel: **Project Settings → General → Project ID**.
2. Create a [Vercel token](https://vercel.com/account/tokens) and add these **GitHub Secrets**:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
3. The workflow in `.github/workflows/deploy-frontend.yml` (if added) would run on push to `main` and run `vercel --prod`.

For the backend, Render usually deploys automatically when you connect the repo and push to `main`; no extra Actions workflow is required.

## Checklist

- [ ] Repo pushed to GitHub
- [ ] Backend deployed on Render; env vars set (including `JWT_SECRET`, `FRONTEND_URL`, OAuth vars)
- [ ] Frontend deployed on Vercel; `VITE_API_URL` set to backend URL
- [ ] `FRONTEND_URL` on Render set to Vercel URL
- [ ] Google and Facebook redirect URIs updated to production callback URLs
- [ ] CI passing on GitHub Actions

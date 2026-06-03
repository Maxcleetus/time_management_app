# TempoFlow Time Management System

Full-stack MERN time management application based on the supplied PRD.

## Features

- JWT email/password authentication with hashed passwords.
- User profile with timezone, theme, and daily work target.
- Task CRUD with project, tags, due date, priority, and completion state.
- Server-side timer start/stop using UTC timestamps.
- Manual time entries linked to tasks.
- Recent timeline and weekly/dashboard analytics.
- Project allocation report.
- CSV report export and full JSON data export.
- Responsive modern React interface with light/dark theme.

## Project Structure

```text
backend/
  src/
    config/        MongoDB connection
    middleware/    auth and error middleware
    models/        Mongoose schemas
    routes/        REST API routes
frontend/
  src/
    App.jsx        main application UI
    api.js         API helper
    styles.css     responsive design system
docker-compose.yml
```

## Requirements

- Node.js 20+
- npm 11+
- MongoDB running locally, MongoDB Atlas, or Docker

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Configure backend:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set a strong `JWT_SECRET`. The default MongoDB URI points to local MongoDB:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/time_management_app
```

3. Configure frontend if your API is not on port `5000`:

```bash
cp frontend/.env.example frontend/.env
```

## Run Locally

Start MongoDB with Docker:

```bash
docker compose up -d
```

Start the backend:

```bash
npm run dev:backend
```

Start the frontend in another terminal:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/time-entries`
- `POST /api/time-entries`
- `POST /api/time-entries/timer/start`
- `PUT /api/time-entries/timer/stop/:entryId`
- `PUT /api/time-entries/:id`
- `DELETE /api/time-entries/:id`
- `GET /api/reports/summary`
- `GET /api/reports/export/csv`
- `PUT /api/users/me`
- `GET /api/users/me/export`
- `DELETE /api/users/me`

## Production Notes

- Use MongoDB Atlas or a managed MongoDB instance.
- Set `JWT_SECRET`, `MONGODB_URI`, and `CLIENT_ORIGIN`.
- For separate hosting, deploy `backend` and `frontend` as two Vercel projects.

## Deploy Backend Separately To Vercel

Create one Vercel project for the backend:

```text
Root Directory: backend
Install Command: npm install
Build Command: npm run build
Output Directory: leave empty
```

The backend uses [backend/vercel.json](./backend/vercel.json) and exposes the Express API as a serverless function from [backend/api/[...path].js](./backend/api/[...path].js).

Set these backend Vercel environment variables:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/time_management_app?retryWrites=true&w=majority
JWT_SECRET=use-a-long-random-production-secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=https://your-frontend-project.vercel.app
```

After deploy, test:

```text
https://your-backend-project.vercel.app/api/health
```

## Deploy Frontend Separately To Vercel

Create a second Vercel project for the frontend:

```text
Root Directory: frontend
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Set this frontend Vercel environment variable:

```text
VITE_API_URL=https://your-backend-project.vercel.app/api
```

The frontend uses [frontend/vercel.json](./frontend/vercel.json).

## Deploy Full App To Vercel

This repo is configured as a single Vercel project:

- React/Vite builds from `frontend/` into `frontend/dist`.
- Express runs as a Vercel serverless function from `api/[...path].js`.
- API requests use the same Vercel domain at `/api`.

Before deploying, create a MongoDB Atlas cluster or another hosted MongoDB database. Vercel serverless functions cannot connect to the local Docker MongoDB container in production.

Set these Vercel environment variables:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/time_management_app?retryWrites=true&w=majority
JWT_SECRET=use-a-long-random-production-secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=https://your-vercel-project.vercel.app
```

For custom domains, set `CLIENT_ORIGIN` to the custom HTTPS URL. Multiple origins can be comma-separated.

Deploy from the project root:

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

Vercel will use [vercel.json](./vercel.json):

```text
installCommand: npm install --prefix backend && npm install --prefix frontend
buildCommand: npm run build --prefix frontend
outputDirectory: frontend/dist
serverless API: api/[...path].js
```

In the Vercel dashboard, keep the project Root Directory as the repository root. Do not set it to `frontend` or `backend`, because the serverless API lives in the root `api/` folder, imports backend code from `backend/`, and builds the React app from `frontend/`.

If Vercel logs show a path like `/vercel/path0/backend/backend/package.json`, your Root Directory is set to `backend`. Change it to the repository root, then redeploy.

After deployment, test:

```text
https://your-vercel-project.vercel.app/api/health
https://your-vercel-project.vercel.app
```

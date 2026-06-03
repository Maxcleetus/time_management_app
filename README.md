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
- For Vercel, deploy backend and frontend as two separate projects.

## Deploy Backend To Vercel

Create/import one Vercel project for the backend.

```text
Root Directory: backend
Framework Preset: Other
Install Command: npm install
Build Command: npm run build
Output Directory: leave empty
```

The backend uses [backend/vercel.json](./backend/vercel.json), and the serverless API entry is [backend/api/[...path].js](./backend/api/[...path].js).

Before deploying, create a MongoDB Atlas cluster or another hosted MongoDB database. Vercel serverless functions cannot connect to the local Docker MongoDB container in production.

Set these backend environment variables:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/time_management_app?retryWrites=true&w=majority
JWT_SECRET=use-a-long-random-production-secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=https://your-frontend-project.vercel.app
```

After backend deployment, test:

```text
https://your-backend-project.vercel.app/api/health
```

## Deploy Frontend To Vercel

Create/import a second Vercel project for the frontend.

```text
Root Directory: frontend
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Set this frontend environment variable:

```text
VITE_API_URL=https://your-backend-project.vercel.app/api
```

The frontend uses [frontend/vercel.json](./frontend/vercel.json).

After frontend deployment, update the backend `CLIENT_ORIGIN` to the final frontend URL and redeploy the backend.

For custom domains, use the custom HTTPS URL in both `CLIENT_ORIGIN` and `VITE_API_URL`.

You can also deploy each project with Vercel CLI from its folder:

```bash
npm i -g vercel
vercel login
cd backend
vercel
vercel --prod

cd ../frontend
vercel
vercel --prod
```

# GitHub Integration Setup Guide

This document provides step-by-step instructions for setting up the complete GitHub integration for the Creator Corner project workspace.

## Overview

The GitHub integration enables:
- **OAuth Authentication**: Connect your GitHub account securely
- **Repository Connection**: Link GitHub repositories to projects
- **Webhook Sync**: Real-time updates from GitHub events
- **Auto Task Sync**: Automatically create/update tasks from GitHub issues and PRs
- **Real-time Notifications**: Socket.io powered live updates

## Prerequisites

1. GitHub Account with at least one repository
2. Backend server running with MongoDB
3. Frontend running with React

## Step 1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the details:
   - **Application name**: `CodeTermite` (or your app name)
   - **Homepage URL**: `http://localhost:5173` (dev) or your production URL
   - **Authorization callback URL**: `http://localhost:5000/api/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID**
6. Generate a new **Client Secret** and copy it

## Step 2: Environment Variables

### Backend (.env)

Add these variables to your `backend/.env` file:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:5000/api/github/callback

# Encryption key for storing tokens (generate a secure 32-byte hex string)
ENCRYPTION_KEY=your_32_byte_hex_encryption_key

# URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Webhook secret (optional - auto-generated if not provided)
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### Frontend (.env)

Add these variables to your `frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

## Step 3: Generate Encryption Key

Run this command to generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `ENCRYPTION_KEY`.

## Step 4: Start the Servers

1. Start the backend:
```bash
cd backend
npm run dev
```

2. Start the frontend:
```bash
cd frontend
npm run dev
```

## Step 5: Connect GitHub Account

1. Navigate to any project workspace
2. Click on the **"GitHub"** tab
3. Click **"Connect GitHub Account"**
4. Authorize the OAuth application on GitHub
5. You'll be redirected back with your account connected

## Step 6: Connect Repository to Project

1. In the project's GitHub tab, click **"Connect Repository"**
2. Search/select from your available repositories
3. Configure sync settings:
   - **Sync Issues**: Create tasks from GitHub issues
   - **Sync Pull Requests**: Track PR status on tasks
   - **Sync Commits**: Log commits in activity feed
   - **Auto Create Tasks**: Automatically create Kanban tasks from new issues
   - **Auto Update Status**: Move tasks based on branch/PR activity

4. Click **"Connect"** to establish the connection

## Features

### Auto Task Sync

When enabled, the integration automatically:

| GitHub Event | Kanban Action |
|--------------|---------------|
| New Issue Created | Creates task in "To Do" column |
| Issue Closed | Moves task to "Done" column |
| Branch Created (matching task) | Moves task to "In Progress" |
| PR Opened | Links PR to task |
| PR Merged | Moves task to "Done" |

### Task Naming Convention

For auto-linking to work, use this branch naming pattern:
- `task-{taskId}-description`
- `feature/task-{taskId}-description`
- `fix/task-{taskId}-description`

Example: `task-64f8a1b2c3d4e5f6a7b8c9d0-add-user-auth`

### Activity Feed

The GitHub Activity Feed shows:
- Commits with commit messages
- Pull request opens, reviews, merges
- Issue creation, updates, closures
- Branch creation and deletion
- Comments on issues/PRs

### Real-time Updates

Using Socket.io, the integration provides live updates:
- New commits appear instantly in the activity feed
- Task status updates in real-time when PRs are merged
- Team members see changes as they happen

## API Endpoints

### User GitHub Connection

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/github/auth` | Start OAuth flow |
| GET | `/api/github/callback` | OAuth callback |
| GET | `/api/github/status` | Get connection status |
| DELETE | `/api/github/disconnect` | Disconnect account |

### Repository Access

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/github/repos` | List user repositories |
| GET | `/api/github/repos/:owner/:repo/commits` | Get commits |
| GET | `/api/github/repos/:owner/:repo/pulls` | Get pull requests |
| GET | `/api/github/repos/:owner/:repo/issues` | Get issues |
| GET | `/api/github/repos/:owner/:repo/branches` | Get branches |

### Project Connection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/github/projects/:projectId/connect` | Connect repo to project |
| DELETE | `/api/github/projects/:projectId/disconnect` | Disconnect repo |
| GET | `/api/github/projects/:projectId/status` | Get connection status |
| GET | `/api/github/projects/:projectId/activity` | Get activity log |

### Task Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/github/projects/:projectId/tasks/:taskId/issue` | Create GitHub issue from task |
| DELETE | `/api/github/projects/:projectId/tasks/:taskId/issue` | Close GitHub issue |

### Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/github/webhook` | Receive GitHub events |

## Troubleshooting

### OAuth Issues

1. **"Invalid redirect_uri"**: Ensure the callback URL in GitHub settings matches exactly
2. **"OAuth error"**: Check that Client ID and Secret are correct
3. **Redirect loop**: Clear browser cookies and try again

### Webhook Issues

1. **Events not received**:
   - Check if ngrok or similar is running for local development
   - Verify webhook URL is accessible from GitHub
   - Check webhook delivery status in GitHub settings

2. **Signature verification failed**:
   - Ensure `GITHUB_WEBHOOK_SECRET` matches in GitHub and .env

### Connection Issues

1. **"Failed to fetch repositories"**:
   - Token may have expired - disconnect and reconnect
   - Check if GitHub account has access to the repositories

2. **"Encryption error"**:
   - Ensure `ENCRYPTION_KEY` is exactly 64 hex characters (32 bytes)
   - Don't change the key after tokens are stored

## Security Considerations

1. **Token Storage**: Access tokens are encrypted with AES-256-CBC
2. **Webhook Verification**: All webhooks are verified with HMAC SHA-256
3. **Scopes**: Minimum required scopes are requested
4. **HTTPS**: Use HTTPS in production for all endpoints

## Production Deployment

For production:

1. Update GitHub OAuth app URLs to production domains
2. Set secure environment variables
3. Use HTTPS for all endpoints
4. Set up proper webhook URL (no ngrok)
5. Configure CORS properly

Example production `.env`:

```env
GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_client_secret
GITHUB_REDIRECT_URI=https://api.yourapp.com/api/github/callback
ENCRYPTION_KEY=production_encryption_key
BACKEND_URL=https://api.yourapp.com
FRONTEND_URL=https://yourapp.com
```

## File Structure

```
backend/
├── src/
│   ├── models/
│   │   └── GitHubIntegration.ts   # MongoDB models
│   ├── routes/
│   │   └── github.ts              # API routes
│   └── services/
│       └── githubService.ts       # GitHub API service

frontend/
├── src/
│   ├── Component/
│   │   └── ProjectComponent/
│   │       └── GitHub/
│   │           ├── GitHubActivityFeed.tsx
│   │           ├── GitHubPanel.tsx
│   │           ├── GitHubSettings.tsx
│   │           ├── ProjectGitHubConnection.tsx
│   │           ├── useGitHubSocket.ts
│   │           └── index.ts
│   └── service/
│       └── githubService.ts       # Frontend API service
```

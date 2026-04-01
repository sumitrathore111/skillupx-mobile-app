import crypto from 'crypto';
import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Board, BoardTask } from '../models/Board';
import GitHubIntegration, { GitHubActivity, ProjectGitHubConnection } from '../models/GitHubIntegration';
import Project from '../models/Project';
import User from '../models/User';
import {
    cancelRepositoryInvitation,
    closeGitHubIssue,
    createGitHubIssue,
    createWebhook,
    decryptToken,
    deleteWebhook,
    encryptToken,
    exchangeCodeForToken,
    generateWebhookSecret,
    getGitHubAuthUrl,
    getGitHubUser,
    getProjectGitHubConnection,
    getRepositoryBranches,
    getRepositoryCollaborators,
    getRepositoryCommits,
    getRepositoryInvitations,
    getRepositoryIssues,
    getRepositoryPullRequests,
    getUserGitHubIntegration,
    getUserRepositories,
    inviteCollaborator,
    removeCollaborator,
    searchGitHubUsers,
    verifyWebhookSignature
} from '../services/githubService';

const router = Router();

// Helper function to get access token (tries current user, then falls back to project owner)
async function getAccessTokenForRepo(userId: string, repoFullName: string): Promise<string | null> {
  // First try current user's GitHub integration
  let integration = await getUserGitHubIntegration(userId);

  if (!integration) {
    // Fall back to project owner's integration
    const projectConnection = await ProjectGitHubConnection.findOne({ repoFullName });
    if (projectConnection) {
      integration = await getUserGitHubIntegration(projectConnection.connectedBy.toString());
    }
  }

  if (!integration) {
    return null;
  }

  return decryptToken(integration.accessToken);
}

// ==========================================
// GITHUB OAUTH AUTHENTICATION
// ==========================================

// Start GitHub OAuth flow
router.get('/auth', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Create state with user ID for callback verification
    const state = Buffer.from(JSON.stringify({
      userId,
      timestamp: Date.now()
    })).toString('base64');

    const authUrl = getGitHubAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error starting GitHub auth:', error);
    res.status(500).json({ message: 'Failed to start GitHub authentication' });
  }
});

// GitHub OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?github=error&message=Missing code or state`);
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?github=error&message=Invalid state`);
    }

    const { userId, timestamp } = stateData;

    // Check if state is not too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?github=error&message=State expired`);
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code as string);
    const accessToken = tokenData.access_token;

    // Get GitHub user info
    const githubUser = await getGitHubUser(accessToken);

    // Store/update GitHub integration
    const encryptedToken = encryptToken(accessToken);

    await GitHubIntegration.findOneAndUpdate(
      { userId },
      {
        userId,
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
        accessToken: encryptedToken,
        avatarUrl: githubUser.avatar_url,
        email: githubUser.email,
        connectedAt: new Date(),
        scopes: tokenData.scope.split(',')
      },
      { upsert: true, new: true }
    );

    // Update user's GitHub username
    await User.findByIdAndUpdate(userId, {
      githubUsername: githubUser.login
    });

    res.redirect(`${process.env.FRONTEND_URL}/settings?github=success`);
  } catch (error) {
    console.error('Error in GitHub callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?github=error&message=Authentication failed`);
  }
});

// Get current user's GitHub connection status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const integration = await getUserGitHubIntegration(userId!);

    if (!integration) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      githubUsername: integration.githubUsername,
      avatarUrl: integration.avatarUrl,
      connectedAt: integration.connectedAt,
      scopes: integration.scopes
    });
  } catch (error) {
    console.error('Error getting GitHub status:', error);
    res.status(500).json({ message: 'Failed to get GitHub status' });
  }
});

// Disconnect GitHub account
router.delete('/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    await GitHubIntegration.findOneAndDelete({ userId });
    await User.findByIdAndUpdate(userId, { githubUsername: '' });

    res.json({ message: 'GitHub account disconnected' });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    res.status(500).json({ message: 'Failed to disconnect GitHub' });
  }
});

// ==========================================
// GITHUB REPOSITORIES
// ==========================================

// Get user's repositories
router.get('/repos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, perPage = 30 } = req.query;

    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    const repos = await getUserRepositories(accessToken, Number(page), Number(perPage));

    // Return simplified repo data
    const simplifiedRepos = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      language: repo.language,
      starCount: repo.stargazers_count,
      forkCount: repo.forks_count,
      updatedAt: repo.updated_at
    }));

    res.json({ repos: simplifiedRepos });
  } catch (error) {
    console.error('Error getting repos:', error);
    res.status(500).json({ message: 'Failed to get repositories' });
  }
});

// Get repository commits
router.get('/repos/:owner/:repo/commits', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { owner, repo } = req.params;
    const { sha, since, until, page = 1, perPage = 30 } = req.query;
    const repoFullName = `${owner}/${repo}`;

    const accessToken = await getAccessTokenForRepo(userId!, repoFullName);
    if (!accessToken) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }
    const commits = await getRepositoryCommits(accessToken, owner, repo, {
      sha: sha as string,
      since: since as string,
      until: until as string,
      page: Number(page),
      perPage: Number(perPage)
    });

    const simplifiedCommits = commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name,
        email: commit.commit.author?.email,
        date: commit.commit.author?.date,
        login: commit.author?.login,
        avatarUrl: commit.author?.avatar_url
      },
      url: commit.html_url,
      stats: commit.stats
    }));

    res.json({ commits: simplifiedCommits });
  } catch (error) {
    console.error('Error getting commits:', error);
    res.status(500).json({ message: 'Failed to get commits' });
  }
});

// Get repository pull requests
router.get('/repos/:owner/:repo/pulls', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { owner, repo } = req.params;
    const { state = 'all' } = req.query;
    const repoFullName = `${owner}/${repo}`;

    const accessToken = await getAccessTokenForRepo(userId!, repoFullName);
    if (!accessToken) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }
    const pulls = await getRepositoryPullRequests(accessToken, owner, repo, state as any);

    const simplifiedPulls = pulls.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: pr.merged_at !== null,
      url: pr.html_url,
      user: {
        login: pr.user.login,
        avatarUrl: pr.user.avatar_url
      },
      branch: pr.head.ref,
      baseBranch: pr.base.ref,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at
    }));

    res.json({ pullRequests: simplifiedPulls });
  } catch (error) {
    console.error('Error getting pull requests:', error);
    res.status(500).json({ message: 'Failed to get pull requests' });
  }
});

// Get repository issues
router.get('/repos/:owner/:repo/issues', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { owner, repo } = req.params;
    const { state = 'all' } = req.query;
    const repoFullName = `${owner}/${repo}`;

    const accessToken = await getAccessTokenForRepo(userId!, repoFullName);
    if (!accessToken) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }
    const issues = await getRepositoryIssues(accessToken, owner, repo, state as any);

    // Filter out pull requests (they appear in issues API)
    const filteredIssues = issues.filter(issue => !issue.pull_request);

    const simplifiedIssues = filteredIssues.map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      url: issue.html_url,
      body: issue.body,
      user: {
        login: issue.user.login,
        avatarUrl: issue.user.avatar_url
      },
      labels: issue.labels.map((l: any) => ({ name: l.name, color: l.color })),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at
    }));

    res.json({ issues: simplifiedIssues });
  } catch (error) {
    console.error('Error getting issues:', error);
    res.status(500).json({ message: 'Failed to get issues' });
  }
});

// Get repository branches
router.get('/repos/:owner/:repo/branches', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { owner, repo } = req.params;
    const repoFullName = `${owner}/${repo}`;

    const accessToken = await getAccessTokenForRepo(userId!, repoFullName);
    if (!accessToken) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }
    const branches = await getRepositoryBranches(accessToken, owner, repo);

    res.json({ branches: branches.map(b => ({ name: b.name, protected: b.protected })) });
  } catch (error) {
    console.error('Error getting branches:', error);
    res.status(500).json({ message: 'Failed to get branches' });
  }
});

// Get repository contributors
router.get('/repos/:owner/:repo/contributors', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { owner, repo } = req.params;
    const repoFullName = `${owner}/${repo}`;

    const accessToken = await getAccessTokenForRepo(userId!, repoFullName);
    if (!accessToken) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    // Fetch contributors from GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=50`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CodeTermite-App'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch contributors');
    }

    const contributors = await response.json() as any[];

    res.json({
      contributors: contributors.map((c: any) => ({
        login: c.login,
        avatar_url: c.avatar_url,
        avatarUrl: c.avatar_url,
        contributions: c.contributions,
        html_url: c.html_url,
        type: c.type
      }))
    });
  } catch (error) {
    console.error('Error getting contributors:', error);
    res.status(500).json({ message: 'Failed to get contributors' });
  }
});

// ==========================================
// PROJECT GITHUB CONNECTION
// ==========================================

// Connect GitHub repo to project
router.post('/projects/:projectId/connect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { repoOwner, repoName, syncSettings } = req.body;

    console.log('GitHub Connect Debug:', {
      projectId,
      userId,
      repoOwner,
      repoName
    });

    // Validate projectId format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID format', debug: { projectId } });
    }

    // Check project access - first try by _id, then by ideaId (same as projects.ts)
    let project = await Project.findById(projectId);
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }
    console.log('Project lookup result:', project ? 'Found' : 'Not found', 'ID:', projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found', debug: { projectId } });
    }

    // Use the actual MongoDB _id for all operations
    const actualProjectId = project._id.toString();

    if (String(project.owner) !== userId) {
      return res.status(403).json({ message: 'Only project owner can connect GitHub' });
    }

    // Get user's GitHub integration
    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    const webhookSecret = generateWebhookSecret();
    const webhookUrl = `${process.env.BACKEND_URL || 'https://nextstepbackend-qhxw.onrender.com'}/api/github/webhook`;

    // Create webhook on the repository
    let webhookId;
    try {
      const webhook = await createWebhook(accessToken, repoOwner, repoName, webhookUrl, webhookSecret);
      webhookId = webhook.id;
    } catch (error: any) {
      // Webhook might already exist
      console.error('Webhook creation error:', error);
    }

    // Save connection - use actualProjectId (real _id) not the URL param
    const connection = await ProjectGitHubConnection.findOneAndUpdate(
      { projectId: actualProjectId },
      {
        projectId: actualProjectId,
        repoOwner,
        repoName,
        repoFullName: `${repoOwner}/${repoName}`,
        repoUrl: `https://github.com/${repoOwner}/${repoName}`,
        webhookId,
        webhookSecret,
        connectedBy: userId,
        connectedAt: new Date(),
        syncSettings: syncSettings || {
          syncIssues: true,
          syncPullRequests: true,
          syncCommits: true,
          autoPR: false,
          autoIssue: false
        }
      },
      { upsert: true, new: true }
    );

    // Update project with repository URL
    await Project.findByIdAndUpdate(actualProjectId, {
      repositoryUrl: `https://github.com/${repoOwner}/${repoName}`
    });

    res.json({
      message: 'GitHub repository connected successfully',
      connection: {
        repoFullName: connection.repoFullName,
        repoUrl: connection.repoUrl,
        syncSettings: connection.syncSettings
      }
    });
  } catch (error) {
    console.error('Error connecting repo:', error);
    res.status(500).json({ message: 'Failed to connect repository' });
  }
});

// Disconnect GitHub repo from project
router.delete('/projects/:projectId/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    // Try finding by _id first, then by ideaId
    let project = await Project.findById(projectId);
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (String(project.owner) !== userId) {
      return res.status(403).json({ message: 'Only project owner can disconnect GitHub' });
    }

    // Use the actual project _id for the connection lookup
    const actualProjectId = project._id.toString();
    const connection = await getProjectGitHubConnection(actualProjectId);
    if (!connection) {
      return res.status(404).json({ message: 'No GitHub connection found' });
    }

    // Delete webhook if exists
    if (connection.webhookId) {
      const integration = await getUserGitHubIntegration(userId!);
      if (integration) {
        const accessToken = decryptToken(integration.accessToken);
        try {
          await deleteWebhook(accessToken, connection.repoOwner, connection.repoName, connection.webhookId);
        } catch (error) {
          console.error('Error deleting webhook:', error);
        }
      }
    }

    await ProjectGitHubConnection.findOneAndDelete({ projectId });

    res.json({ message: 'GitHub repository disconnected' });
  } catch (error) {
    console.error('Error disconnecting repo:', error);
    res.status(500).json({ message: 'Failed to disconnect repository' });
  }
});

// Get project's GitHub connection status
router.get('/projects/:projectId/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    // Resolve projectId (might be ideaId) to actual project _id
    let project = await Project.findById(projectId).select('_id');
    if (!project) {
      project = await Project.findOne({ ideaId: projectId }).select('_id');
    }
    const actualProjectId = project?._id?.toString() || projectId;

    const connection = await getProjectGitHubConnection(actualProjectId);
    if (!connection) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      repoFullName: connection.repoFullName,
      repoUrl: connection.repoUrl,
      webhookActive: !!connection.webhookId,
      syncSettings: connection.syncSettings,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt
    });
  } catch (error) {
    console.error('Error getting project GitHub status:', error);
    res.status(500).json({ message: 'Failed to get GitHub status' });
  }
});

// Get project's GitHub activity feed
router.get('/projects/:projectId/activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Resolve projectId (might be ideaId) to actual project _id
    let project = await Project.findById(projectId).select('_id');
    if (!project) {
      project = await Project.findOne({ ideaId: projectId }).select('_id');
    }
    const actualProjectId = project?._id?.toString() || projectId;

    const activities = await GitHubActivity.find({ projectId: actualProjectId })
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    res.json({ activities });
  } catch (error) {
    console.error('Error getting GitHub activity:', error);
    res.status(500).json({ message: 'Failed to get activity' });
  }
});

// ==========================================
// GITHUB WEBHOOK HANDLER
// ==========================================

// Webhook endpoint (receives GitHub events)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;

    if (!signature || !event) {
      return res.status(400).json({ message: 'Missing headers' });
    }

    // Get payload as string for signature verification
    const payload = req.body.toString();
    const payloadJson = JSON.parse(payload);

    // Find the project connection by repository
    const repoFullName = payloadJson.repository?.full_name;
    if (!repoFullName) {
      return res.status(400).json({ message: 'Missing repository info' });
    }

    const connection = await ProjectGitHubConnection.findOne({ repoFullName });
    if (!connection) {
      return res.status(404).json({ message: 'No project connected to this repository' });
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, connection.webhookSecret)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // Get io instance for real-time updates
    const io = req.app.get('io');

    // Process event based on type
    await processGitHubEvent(event, payloadJson, connection, deliveryId, io);

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// Process GitHub webhook events
async function processGitHubEvent(
  event: string,
  payload: any,
  connection: any,
  deliveryId: string,
  io: any
) {
  const projectId = connection.projectId;
  const sender = {
    login: payload.sender?.login || 'unknown',
    avatarUrl: payload.sender?.avatar_url,
    id: payload.sender?.id || 0
  };

  switch (event) {
    case 'push':
      await handlePushEvent(payload, projectId, sender, deliveryId, io);
      break;

    case 'pull_request':
      await handlePullRequestEvent(payload, projectId, sender, deliveryId, io, connection);
      break;

    case 'issues':
      await handleIssueEvent(payload, projectId, sender, deliveryId, io, connection);
      break;

    case 'issue_comment':
      await handleIssueCommentEvent(payload, projectId, sender, deliveryId, io);
      break;

    case 'create':
      await handleCreateEvent(payload, projectId, sender, deliveryId, io);
      break;

    case 'delete':
      await handleDeleteEvent(payload, projectId, sender, deliveryId, io);
      break;

    default:
      console.log(`Unhandled GitHub event: ${event}`);
  }

  // Update last sync time
  await ProjectGitHubConnection.findByIdAndUpdate(connection._id, {
    lastSyncAt: new Date()
  });
}

// Handle push events (commits)
async function handlePushEvent(
  payload: any,
  projectId: mongoose.Types.ObjectId,
  sender: any,
  deliveryId: string,
  io: any
) {
  const commits = payload.commits?.map((c: any) => ({
    sha: c.id,
    message: c.message,
    author: c.author?.name || c.author?.username,
    url: c.url,
    timestamp: c.timestamp
  })) || [];

  // Check for task references in commit messages
  for (const commit of commits) {
    const taskRefs = extractTaskReferences(commit.message);
    for (const taskRef of taskRefs) {
      // Find task by title pattern or custom field
      const task = await BoardTask.findOne({
        projectId,
        $or: [
          { title: { $regex: taskRef, $options: 'i' } },
          { 'metadata.githubRef': taskRef }
        ]
      });

      if (task) {
        // Add commit as comment on task
        const comment = {
          id: crypto.randomBytes(8).toString('hex'),
          content: `📦 **Commit** by ${sender.login}:\n\`${commit.sha.slice(0, 7)}\` - ${commit.message.split('\n')[0]}`,
          author: new mongoose.Types.ObjectId(),
          authorName: sender.login,
          authorAvatar: sender.avatarUrl,
          mentions: [],
          createdAt: new Date(),
          isEdited: false
        };

        await BoardTask.findByIdAndUpdate(task._id, {
          $push: { comments: comment }
        });

        // Emit task update
        io?.to(`project:${projectId}`).emit('task:updated', {
          taskId: task._id,
          update: { comments: [...task.comments, comment] }
        });
      }
    }
  }

  // Save activity
  await GitHubActivity.create({
    projectId,
    eventType: 'push',
    githubEventId: deliveryId,
    sender,
    payload: {
      commits,
      ref: payload.ref
    }
  });

  // Emit real-time event
  io?.to(`project:${projectId}`).emit('github:push', {
    projectId: projectId.toString(),
    commits,
    sender,
    branch: payload.ref?.replace('refs/heads/', '')
  });
}

// Handle pull request events
async function handlePullRequestEvent(
  payload: any,
  projectId: mongoose.Types.ObjectId,
  sender: any,
  deliveryId: string,
  io: any,
  connection: any
) {
  const action = payload.action;
  const pr = payload.pull_request;

  const pullRequest = {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.html_url,
    merged: pr.merged,
    branch: pr.head?.ref
  };

  // Save activity
  await GitHubActivity.create({
    projectId,
    eventType: 'pull_request',
    action,
    githubEventId: deliveryId,
    sender,
    payload: { pullRequest }
  });

  // Find tasks linked to this PR or branch
  const taskRefs = extractTaskReferences(pr.title + ' ' + (pr.body || ''));

  for (const taskRef of taskRefs) {
    const task = await BoardTask.findOne({
      projectId,
      $or: [
        { title: { $regex: taskRef, $options: 'i' } },
        { 'metadata.githubRef': taskRef }
      ]
    });

    if (task) {
      if (action === 'opened') {
        // Add PR opened comment
        const comment = {
          id: crypto.randomBytes(8).toString('hex'),
          content: `🔀 **Pull Request Opened** by ${sender.login}:\n[#${pr.number} - ${pr.title}](${pr.html_url})`,
          author: new mongoose.Types.ObjectId(),
          authorName: sender.login,
          authorAvatar: sender.avatarUrl,
          mentions: [],
          createdAt: new Date(),
          isEdited: false
        };

        await BoardTask.findByIdAndUpdate(task._id, {
          $push: { comments: comment }
        });
      } else if (action === 'closed' && pr.merged) {
        // PR merged - complete the task
        const board = await Board.findById(task.boardId);
        const doneColumn = board?.columns.find(c => c.title.toLowerCase() === 'done');

        if (doneColumn) {
          await BoardTask.findByIdAndUpdate(task._id, {
            columnId: doneColumn.id,
            completedAt: new Date(),
            reviewStatus: 'approved'
          });

          io?.to(`project:${projectId}`).emit('task:moved', {
            taskId: task._id,
            columnId: doneColumn.id
          });
        }
      }
    }
  }

  // Emit real-time event
  io?.to(`project:${projectId}`).emit('github:pull_request', {
    projectId: projectId.toString(),
    action,
    pullRequest,
    sender
  });
}

// Handle issue events
async function handleIssueEvent(
  payload: any,
  projectId: mongoose.Types.ObjectId,
  sender: any,
  deliveryId: string,
  io: any,
  connection: any
) {
  const action = payload.action;
  const issue = payload.issue;

  const issueData = {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    body: issue.body
  };

  // Save activity
  await GitHubActivity.create({
    projectId,
    eventType: 'issue',
    action,
    githubEventId: deliveryId,
    sender,
    payload: { issue: issueData }
  });

  // Auto-sync: Create task from GitHub issue
  if (connection.syncSettings.syncIssues && action === 'opened') {
    // Find or create board for project
    let board = await Board.findOne({ projectId });

    if (board) {
      const todoColumn = board.columns.find(c => c.title.toLowerCase().includes('to do') || c.position === 0);

      if (todoColumn) {
        // Check if task already exists for this issue
        const existingTask = await BoardTask.findOne({
          projectId,
          'metadata.githubIssueNumber': issue.number
        });

        if (!existingTask) {
          const task = await BoardTask.create({
            boardId: board._id,
            columnId: todoColumn.id,
            projectId,
            title: `[#${issue.number}] ${issue.title}`,
            description: issue.body || '',
            position: 0,
            priority: 'medium',
            labels: issue.labels?.map((l: any) => l.name) || [],
            assignees: [],
            reporter: connection.connectedBy,
            metadata: {
              githubIssueNumber: issue.number,
              githubIssueUrl: issue.html_url,
              githubRef: `#${issue.number}`
            }
          });

          io?.to(`project:${projectId}`).emit('task:created', { task });
        }
      }
    }
  }

  // Handle issue closed - move task to done
  if (connection.syncSettings.syncIssues && action === 'closed') {
    const task = await BoardTask.findOne({
      projectId,
      'metadata.githubIssueNumber': issue.number
    });

    if (task) {
      const board = await Board.findById(task.boardId);
      const doneColumn = board?.columns.find(c => c.title.toLowerCase() === 'done');

      if (doneColumn) {
        await BoardTask.findByIdAndUpdate(task._id, {
          columnId: doneColumn.id,
          completedAt: new Date()
        });

        io?.to(`project:${projectId}`).emit('task:moved', {
          taskId: task._id,
          columnId: doneColumn.id
        });
      }
    }
  }

  // Emit real-time event
  io?.to(`project:${projectId}`).emit('github:issue', {
    projectId: projectId.toString(),
    action,
    issue: issueData,
    sender
  });
}

// Handle issue comment events
async function handleIssueCommentEvent(
  payload: any,
  projectId: mongoose.Types.ObjectId,
  sender: any,
  deliveryId: string,
  io: any
) {
  // Save activity
  await GitHubActivity.create({
    projectId,
    eventType: 'issue_comment',
    action: payload.action,
    githubEventId: deliveryId,
    sender,
    payload: {
      issue: {
        number: payload.issue.number,
        title: payload.issue.title
      },
      comment: {
        body: payload.comment.body,
        url: payload.comment.html_url
      }
    }
  });

  // Add comment to linked task
  const task = await BoardTask.findOne({
    projectId,
    'metadata.githubIssueNumber': payload.issue.number
  });

  if (task && payload.action === 'created') {
    const comment = {
      id: crypto.randomBytes(8).toString('hex'),
      content: `💬 **GitHub Comment** by ${sender.login}:\n${payload.comment.body}`,
      author: new mongoose.Types.ObjectId(),
      authorName: sender.login,
      authorAvatar: sender.avatarUrl,
      mentions: [],
      createdAt: new Date(),
      isEdited: false
    };

    await BoardTask.findByIdAndUpdate(task._id, {
      $push: { comments: comment }
    });

    io?.to(`project:${projectId}`).emit('task:updated', {
      taskId: task._id
    });
  }
}

// Handle create events (branch/tag created)
async function handleCreateEvent(
  payload: any,
  projectId: mongoose.Types.ObjectId,
  sender: any,
  deliveryId: string,
  io: any
) {
  const refType = payload.ref_type; // 'branch' or 'tag'
  const ref = payload.ref;

  // Save activity
  await GitHubActivity.create({
    projectId,
    eventType: 'create',
    githubEventId: deliveryId,
    sender,
    payload: {
      ref,
      refType
    }
  });

  // If branch name contains task reference, move task to In Progress
  if (refType === 'branch') {
    const taskRefs = extractTaskReferences(ref);

    for (const taskRef of taskRefs) {
      const task = await BoardTask.findOne({
        projectId,
        $or: [
          { title: { $regex: taskRef, $options: 'i' } },
          { 'metadata.githubRef': taskRef }
        ]
      });

      if (task) {
        const board = await Board.findById(task.boardId);
        const inProgressColumn = board?.columns.find(c =>
          c.title.toLowerCase().includes('progress') || c.position === 1
        );

        if (inProgressColumn && task.columnId !== inProgressColumn.id) {
          await BoardTask.findByIdAndUpdate(task._id, {
            columnId: inProgressColumn.id,
            startDate: new Date()
          });

          io?.to(`project:${projectId}`).emit('task:moved', {
            taskId: task._id,
            columnId: inProgressColumn.id
          });
        }
      }
    }
  }

  // Emit real-time event
  io?.to(`project:${projectId}`).emit('github:create', {
    projectId: projectId.toString(),
    refType,
    ref,
    sender
  });
}

// Handle delete events (branch/tag deleted)
async function handleDeleteEvent(
  payload: any,
  projectId: mongoose.Types.ObjectId,
  sender: any,
  deliveryId: string,
  io: any
) {
  await GitHubActivity.create({
    projectId,
    eventType: 'delete',
    githubEventId: deliveryId,
    sender,
    payload: {
      ref: payload.ref,
      refType: payload.ref_type
    }
  });

  io?.to(`project:${projectId}`).emit('github:delete', {
    projectId: projectId.toString(),
    refType: payload.ref_type,
    ref: payload.ref,
    sender
  });
}

// ==========================================
// TASK SYNC ACTIONS
// ==========================================

// Create GitHub issue from task
router.post('/tasks/:taskId/create-issue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { taskId } = req.params;

    const task = await BoardTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const connection = await getProjectGitHubConnection(task.projectId.toString());
    if (!connection) {
      return res.status(400).json({ message: 'Project not connected to GitHub' });
    }

    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    const issue = await createGitHubIssue(
      accessToken,
      connection.repoOwner,
      connection.repoName,
      task.title,
      task.description || `Task from SkillUpX Creator Corner\n\nPriority: ${task.priority}`,
      task.labels
    );

    // Update task with GitHub issue link
    await BoardTask.findByIdAndUpdate(taskId, {
      'metadata.githubIssueNumber': issue.number,
      'metadata.githubIssueUrl': issue.html_url,
      'metadata.githubRef': `#${issue.number}`
    });

    res.json({
      message: 'GitHub issue created',
      issueNumber: issue.number,
      issueUrl: issue.html_url
    });
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    res.status(500).json({ message: 'Failed to create GitHub issue' });
  }
});

// Close GitHub issue when task is completed
router.post('/tasks/:taskId/close-issue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { taskId } = req.params;

    const task = await BoardTask.findById(taskId) as any;
    if (!task || !task.metadata?.githubIssueNumber) {
      return res.status(404).json({ message: 'Task or linked issue not found' });
    }

    const connection = await getProjectGitHubConnection(task.projectId.toString());
    if (!connection) {
      return res.status(400).json({ message: 'Project not connected to GitHub' });
    }

    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    await closeGitHubIssue(
      accessToken,
      connection.repoOwner,
      connection.repoName,
      task.metadata.githubIssueNumber
    );

    res.json({ message: 'GitHub issue closed' });
  } catch (error) {
    console.error('Error closing GitHub issue:', error);
    res.status(500).json({ message: 'Failed to close GitHub issue' });
  }
});

// Helper: Extract task references from text (e.g., #123, TASK-123, etc.)
function extractTaskReferences(text: string): string[] {
  const refs: string[] = [];

  // Match #123 pattern
  const hashPattern = /#(\d+)/g;
  let match;
  while ((match = hashPattern.exec(text)) !== null) {
    refs.push(`#${match[1]}`);
  }

  // Match TASK-123 or similar patterns
  const taskPattern = /\b(TASK|ISSUE|BUG|FEAT|FIX)-(\d+)\b/gi;
  while ((match = taskPattern.exec(text)) !== null) {
    refs.push(match[0].toUpperCase());
  }

  return refs;
}

// ==========================================
// COLLABORATOR MANAGEMENT
// ==========================================

// Search GitHub users for collaborator invitation
router.get('/users/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    const users = await searchGitHubUsers(accessToken, q.trim());

    res.json({
      users: users.map(u => ({
        id: u.id,
        login: u.login,
        avatarUrl: u.avatar_url,
        profileUrl: u.html_url
      }))
    });
  } catch (error) {
    console.error('Error searching GitHub users:', error);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

// Get collaborators for a project's connected repository
router.get('/projects/:projectId/collaborators', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    // Resolve projectId (might be ideaId) to actual project _id
    let project = await Project.findById(projectId);
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const actualProjectId = project._id.toString();
    const connection = await getProjectGitHubConnection(actualProjectId);
    if (!connection) {
      return res.status(400).json({ message: 'No GitHub repository connected to this project' });
    }

    const integration = await getUserGitHubIntegration(connection.connectedBy.toString());
    if (!integration) {
      return res.status(400).json({ message: 'GitHub integration not found' });
    }

    const accessToken = decryptToken(integration.accessToken);
    const collaborators = await getRepositoryCollaborators(accessToken, connection.repoOwner, connection.repoName);

    res.json({
      collaborators: collaborators.map(c => ({
        id: c.id,
        login: c.login,
        avatarUrl: c.avatar_url,
        permissions: c.permissions,
        roleName: c.role_name
      }))
    });
  } catch (error) {
    console.error('Error getting collaborators:', error);
    res.status(500).json({ message: 'Failed to get collaborators' });
  }
});

// Get pending invitations for a project's connected repository
router.get('/projects/:projectId/invitations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    // Resolve projectId
    let project = await Project.findById(projectId);
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner can view invitations
    if (String(project.owner) !== userId) {
      return res.status(403).json({ message: 'Only project owner can view invitations' });
    }

    const actualProjectId = project._id.toString();
    const connection = await getProjectGitHubConnection(actualProjectId);
    if (!connection) {
      return res.status(400).json({ message: 'No GitHub repository connected to this project' });
    }

    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    const invitations = await getRepositoryInvitations(accessToken, connection.repoOwner, connection.repoName);

    res.json({
      invitations: invitations.map(inv => ({
        id: inv.id,
        invitee: {
          login: inv.invitee.login,
          avatarUrl: inv.invitee.avatar_url
        },
        inviter: {
          login: inv.inviter.login,
          avatarUrl: inv.inviter.avatar_url
        },
        permissions: inv.permissions,
        createdAt: inv.created_at,
        url: inv.html_url
      }))
    });
  } catch (error) {
    console.error('Error getting invitations:', error);
    res.status(500).json({ message: 'Failed to get invitations' });
  }
});

// Invite a collaborator to a project's connected repository
router.post('/projects/:projectId/collaborators', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { username, permission = 'push' } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Validate permission
    const validPermissions = ['pull', 'push', 'admin', 'maintain', 'triage'];
    if (!validPermissions.includes(permission)) {
      return res.status(400).json({ message: 'Invalid permission level' });
    }

    // Resolve projectId
    let project = await Project.findById(projectId);
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner can invite collaborators
    if (String(project.owner) !== userId) {
      return res.status(403).json({ message: 'Only project owner can invite collaborators' });
    }

    const actualProjectId = project._id.toString();
    const connection = await getProjectGitHubConnection(actualProjectId);
    if (!connection) {
      return res.status(400).json({ message: 'No GitHub repository connected to this project' });
    }

    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    const result = await inviteCollaborator(
      accessToken,
      connection.repoOwner,
      connection.repoName,
      username.trim(),
      permission as 'pull' | 'push' | 'admin' | 'maintain' | 'triage'
    );

    // If result.id is 0, user already had access
    const alreadyHadAccess = result.id === 0;

    res.json({
      message: alreadyHadAccess
        ? `${username} already has access to the repository`
        : `Invitation sent to ${username}`,
      invitation: alreadyHadAccess ? null : {
        id: result.id,
        invitee: {
          login: result.invitee.login,
          avatarUrl: result.invitee.avatar_url
        },
        permissions: result.permissions,
        url: result.html_url
      },
      alreadyHadAccess
    });
  } catch (error: any) {
    console.error('Error inviting collaborator:', error);
    res.status(500).json({ message: error.message || 'Failed to invite collaborator' });
  }
});

// Remove a collaborator from a project's connected repository
router.delete('/projects/:projectId/collaborators/:username', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId, username } = req.params;

    // Resolve projectId
    let project = await Project.findById(projectId);
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner can remove collaborators
    if (String(project.owner) !== userId) {
      return res.status(403).json({ message: 'Only project owner can remove collaborators' });
    }

    const actualProjectId = project._id.toString();
    const connection = await getProjectGitHubConnection(actualProjectId);
    if (!connection) {
      return res.status(400).json({ message: 'No GitHub repository connected to this project' });
    }

    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    await removeCollaborator(accessToken, connection.repoOwner, connection.repoName, username);

    res.json({ message: `${username} has been removed from the repository` });
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ message: error.message || 'Failed to remove collaborator' });
  }
});

// Cancel a pending invitation
router.delete('/projects/:projectId/invitations/:invitationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId, invitationId } = req.params;

    // Resolve projectId
    let project = await Project.findById(projectId);
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner can cancel invitations
    if (String(project.owner) !== userId) {
      return res.status(403).json({ message: 'Only project owner can cancel invitations' });
    }

    const actualProjectId = project._id.toString();
    const connection = await getProjectGitHubConnection(actualProjectId);
    if (!connection) {
      return res.status(400).json({ message: 'No GitHub repository connected to this project' });
    }

    const integration = await getUserGitHubIntegration(userId!);
    if (!integration) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const accessToken = decryptToken(integration.accessToken);
    await cancelRepositoryInvitation(accessToken, connection.repoOwner, connection.repoName, Number(invitationId));

    res.json({ message: 'Invitation cancelled' });
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ message: error.message || 'Failed to cancel invitation' });
  }
});

export default router;

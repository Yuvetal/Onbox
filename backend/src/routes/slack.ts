import { Router, Request, Response } from 'express';
import { WebClient } from '@slack/web-api';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/slack/authorize
 * Redirects user to Slack's OAuth 2.0 authorization URL with 'chat:write' scope.
 */
router.get('/authorize', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  if (!env.slackClientId) {
    return res.status(400).json({ error: 'SLACK_CLIENT_ID environment variable is not configured' });
  }

  const slackAuthUrl =
    `https://slack.com/oauth/v2/authorize?` +
    `client_id=${encodeURIComponent(env.slackClientId)}` +
    `&scope=chat:write,chat:write.public` +
    `&redirect_uri=${encodeURIComponent(env.slackRedirectUri)}`;

  res.redirect(slackAuthUrl);
});

/**
 * GET /api/slack/callback
 * Exchanging authorization code for Slack access token and saving on User model.
 */
router.get('/callback', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Slack authorization code is missing' });
    }

    const client = new WebClient();

    // Exchange authorization code for OAuth access token
    const tokenResponse = await client.oauth.v2.access({
      client_id: env.slackClientId,
      client_secret: env.slackClientSecret,
      code,
      redirect_uri: env.slackRedirectUri,
    });

    if (!tokenResponse.ok || !tokenResponse.access_token) {
      console.error('❌ Slack OAuth Token Exchange Failed:', tokenResponse.error);
      return res.redirect(`${env.frontendUrl}?slack_error=${encodeURIComponent(tokenResponse.error || 'Failed to exchange Slack token')}`);
    }

    const userId = req.user?.id;
    if (userId) {
      // Store Slack access token per User account
      await prisma.user.update({
        where: { id: userId },
        data: {
          slackAccessToken: tokenResponse.access_token,
          slackTeamId: tokenResponse.team?.id || null,
        },
      });
      console.log(`✅ Stored Slack access token for User ${userId} (Team: ${tokenResponse.team?.id})`);
    }

    res.redirect(`${env.frontendUrl}?slack=connected`);
  } catch (err: any) {
    console.error('❌ Slack Callback Error:', err.message);
    res.redirect(`${env.frontendUrl}?slack_error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /api/slack/status
 * Returns Slack workspace connection status for current user.
 */
router.get('/status', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    res.json({
      connected: Boolean(user?.slackAccessToken),
      teamId: user?.slackTeamId || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/slack/disconnect
 * Disconnects Slack workspace for current user.
 */
router.post('/disconnect', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          slackAccessToken: null,
          slackTeamId: null,
        },
      });
    }
    res.json({ message: 'Slack disconnected successfully', connected: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { generateAuthToken, authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const oauth2Client = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleCallbackUrl
);

/**
 * GET /api/auth/google
 * Initiates real Google OAuth 2.0 authorization code flow by redirecting to Google's consent screen.
 */
router.get('/google', (req: Request, res: Response) => {
  if (!env.googleClientId) {
    // If no credentials configured yet, redirect to dev login
    return res.redirect('/api/auth/dev-login');
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });

  res.redirect(authUrl);
});

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback, exchanges code for tokens, upserts User, and sets httpOnly JWT cookie.
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code is missing' });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Verify Google ID token to extract profile info
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google user payload' });
    }

    const { sub: googleId, email, name, picture: avatarUrl } = payload;

    // Upsert User in MySQL
    const user = await prisma.user.upsert({
      where: { googleId },
      update: {
        email,
        name: name || email,
        avatarUrl,
      },
      create: {
        googleId,
        email,
        name: name || email,
        avatarUrl,
      },
    });

    // Ensure user has at least one default Sender record
    const existingSender = await prisma.sender.findFirst({
      where: { userId: user.id },
    });
    if (!existingSender) {
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
        },
      });
    }

    // Generate httpOnly JWT cookie (7 days)
    const jwtToken = generateAuthToken({ userId: user.id, email: user.email });

    res.cookie('token', jwtToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    // Redirect to frontend app
    res.redirect(env.frontendUrl);
  } catch (err: any) {
    console.error('❌ Google OAuth Callback Error:', err);
    res.redirect(`${env.frontendUrl}/login?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /api/auth/dev-login
 * Helper endpoint for local development / testing without Google OAuth keys.
 */
router.get('/dev-login', async (req: Request, res: Response) => {
  try {
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: 'demo-google-id',
          email: 'demo@onb.com',
          name: 'Demo User',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser',
        },
      });

      await prisma.sender.create({
        data: {
          userId: user.id,
          email: 'sender@onb.com',
        },
      });
    }

    const jwtToken = generateAuthToken({ userId: user.id, email: user.email });

    res.cookie('token', jwtToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(env.frontendUrl);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns profile info for currently authenticated user.
 */
router.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.user });
});

/**
 * POST /api/auth/email-login
 * Signs in or creates a user using the email typed in the login card.
 */
router.post('/email-login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const displayName = cleanEmail.split('@')[0];

    // Upsert User in MySQL
    let user = await prisma.user.findFirst({ where: { email: cleanEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: `email-user-${Date.now()}`,
          email: cleanEmail,
          name: displayName,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
        },
      });
    }

    // Ensure user has their own email as default sender
    const existingSender = await prisma.sender.findFirst({
      where: { userId: user.id },
    });
    if (!existingSender) {
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
        },
      });
    }

    // Set 7-day httpOnly JWT cookie
    const jwtToken = generateAuthToken({ userId: user.id, email: user.email });
    res.cookie('token', jwtToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: 'Login successful', user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

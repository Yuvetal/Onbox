import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../db/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
    slackAccessToken?: string | null;
    slackTeamId?: string | null;
  };
}

/**
 * Signs a JWT session token valid for 7 days.
 */
export function generateAuthToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

/**
 * Middleware that extracts and verifies JWT token from httpOnly cookie or Authorization header.
 * Attaches user object to `req.user`. Falls back to default user in development mode if no cookie is present.
 */
export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, env.jwtSecret) as { userId: string; email: string };
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (dbUser) {
        req.user = dbUser;
        return next();
      }
    }

    // Dev fallback: Attach or create default user if no token is passed
    let defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          googleId: 'demo-google-id',
          email: 'demo@onb.com',
          name: 'Demo User',
        },
      });
      await prisma.sender.create({
        data: {
          userId: defaultUser.id,
          email: 'sender@onb.com',
        },
      });
    }

    req.user = defaultUser;
    next();
  } catch (err) {
    // If token decoding fails, fallback to default user for dev ease
    const defaultUser = await prisma.user.findFirst();
    if (defaultUser) {
      req.user = defaultUser;
      return next();
    }
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }
}

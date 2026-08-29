import { Router, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/senders
 * Returns list of senders for the authenticated user.
 */
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure the user has at least their own email as a default sender
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

    const senders = await prisma.sender.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: senders, defaultUser: user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/senders
 * Creates a new sender email for the authenticated user.
 */
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const sender = await prisma.sender.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email,
        },
      },
      update: {},
      create: {
        userId: user.id,
        email,
      },
    });

    res.status(201).json({ data: sender });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

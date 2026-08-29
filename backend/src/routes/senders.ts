import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

/**
 * GET /api/senders
 * Returns list of senders for an authenticated user (or default user).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    // Find default demo user if not authenticated yet
    let user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: 'demo-google-id',
          email: 'demo@onb.com',
          name: 'Demo User',
        },
      });

      await prisma.sender.create({
        data: {
          userId: user.id,
          email: 'sender@onb.com',
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
 * Creates a new sender email for a user.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: 'demo-google-id',
          email: 'demo@onb.com',
          name: 'Demo User',
        },
      });
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

import { Router, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/emails/scheduled?page=1&pageSize=20
 * Returns paginated list of SCHEDULED email records for the authenticated user.
 */
router.get('/scheduled', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));
    const skip = (page - 1) * pageSize;

    const [total, emails] = await Promise.all([
      prisma.email.count({
        where: {
          userId: user.id,
          status: 'SCHEDULED',
        },
      }),
      prisma.email.findMany({
        where: {
          userId: user.id,
          status: 'SCHEDULED',
        },
        include: { sender: true },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      data: emails,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/sent?page=1&pageSize=20
 * Returns paginated list of SENT and FAILED email records for the authenticated user.
 */
router.get('/sent', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));
    const skip = (page - 1) * pageSize;

    const [total, emails] = await Promise.all([
      prisma.email.count({
        where: {
          userId: user.id,
          status: { in: ['SENT', 'FAILED'] },
        },
      }),
      prisma.email.findMany({
        where: {
          userId: user.id,
          status: { in: ['SENT', 'FAILED'] },
        },
        include: { sender: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      data: emails,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/:id
 * Fetches a single Email record by primary key ID (enforcing user ownership).
 */
router.get('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const email = await prisma.email.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        sender: true,
        user: true,
      },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email record not found' });
    }

    res.json({ data: email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

/**
 * GET /api/emails/scheduled?page=1&pageSize=20
 * Returns paginated list of SCHEDULED email records.
 */
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));
    const skip = (page - 1) * pageSize;

    const [total, emails] = await Promise.all([
      prisma.email.count({
        where: { status: 'SCHEDULED' },
      }),
      prisma.email.findMany({
        where: { status: 'SCHEDULED' },
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
 * Returns paginated list of SENT and FAILED email records.
 */
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));
    const skip = (page - 1) * pageSize;

    const [total, emails] = await Promise.all([
      prisma.email.count({
        where: { status: { in: ['SENT', 'FAILED'] } },
      }),
      prisma.email.findMany({
        where: { status: { in: ['SENT', 'FAILED'] } },
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
 * Fetches a single Email record by primary key ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const email = await prisma.email.findUnique({
      where: { id },
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

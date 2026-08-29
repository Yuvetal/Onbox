import { Router, Response } from 'express';
import { searchEmailsInES } from '../services/elasticsearch';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/search?q=query_string
 * Queries Elasticsearch for matching email documents belonging to the authenticated user.
 */
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const q = (req.query.q as string || '').trim();
    if (!q) {
      return res.json({ data: [] });
    }

    const results = await searchEmailsInES(q, user.id);
    res.json({ data: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

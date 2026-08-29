import { Router, Request, Response } from 'express';
import { searchEmailsInES } from '../services/elasticsearch';

const router = Router();

/**
 * GET /api/search?q=query_string
 * Queries Elasticsearch for matching email documents across subject, body, recipient, and status.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) {
      return res.json({ data: [] });
    }

    const results = await searchEmailsInES(q);
    res.json({ data: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

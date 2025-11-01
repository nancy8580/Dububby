import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log('[auth] sessionID=', (req as any).sessionID, 'session=', req.session && Object.keys(req.session || {}).join(','));
  const user = req.session && req.session.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated (session missing)' });
  req.user = user;
  next();
}

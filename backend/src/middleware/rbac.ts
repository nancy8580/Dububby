import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

export function rbacMiddlewareFactory(modelsDir: string, modelName: string) {
  return function rbacMiddleware(req: Request, res: Response, next: NextFunction) {
    const targetModel = modelName;
    if (!targetModel) return res.status(400).json({ error: 'Model not specified' });

    const modelFile = path.join(modelsDir, `${targetModel}.json`);
    if (!fs.existsSync(modelFile)) return res.status(404).json({ error: 'Model not found' });
    const def = JSON.parse(fs.readFileSync(modelFile, 'utf-8')) as any;
    const role = req.user?.role || 'Viewer';

    const op = (() => {
      if (req.method === 'POST') return 'create';
      if (req.method === 'GET') return 'read';
      if (req.method === 'PUT' || req.method === 'PATCH') return 'update';
      if (req.method === 'DELETE') return 'delete';
      return 'read';
    })();

    const permissions = (def.rbac && def.rbac[role]) || [];
    if (permissions.includes('all') || permissions.includes(op)) return next();

    return res.status(403).json({ error: 'Forbidden by RBAC' });
  };
}

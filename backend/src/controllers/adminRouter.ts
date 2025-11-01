import { Router, Request, Response } from 'express';
import { Request as ExRequest } from 'express';
import path from 'path';
import fs from 'fs';
import { publishModel } from '../services/modelPublisher';

const router = Router();

// Publish model endpoint
router.post('/models/publish', async (req: Request, res: Response) => {
  const body = req.body;
  if (!body || !body.name) return res.status(400).json({ error: 'Missing model name' });
  try {
    const root = path.join(__dirname, '..');
    const modelsDir = path.join(root, 'models-definitions');
    await publishModel(modelsDir, body);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('Publish failed', err);
    return res.status(500).json({ error: String(err) });
  }
});

// List models
router.get('/models/list', (req: Request, res: Response) => {
  const root = path.join(__dirname, '..');
  const modelsDir = path.join(root, 'models-definitions');
  if (!fs.existsSync(modelsDir)) return res.json({ models: [] });
  const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.json'));
  const models = files.map((f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(modelsDir, f), 'utf-8'));
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
  return res.json({ models });
});

// Login (sets session) — simple dev helper
router.post('/login', (req: Request, res: Response) => {
  const { userId, role } = req.body || {};
  if (!userId || !role) return res.status(400).json({ error: 'Provide userId and role' });
  req.session = req.session || {};
  req.session.user = { userId, role };
  // Ensure session is saved to the store before responding so cookie+session
  // are persisted when using async DB-backed stores.
  if (typeof req.session.save === 'function') {
    req.session.save((err: any) => {
      if (err) return res.status(500).json({ error: 'Failed to save session' });
      return res.json({ ok: true });
    });
  } else {
    return res.json({ ok: true });
  }
});

export default router;

import { Express, Request, Response, Router } from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { rbacMiddlewareFactory } from '../middleware/rbac';
import { authMiddleware } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const poolConfig = (() => {
  const url = process.env.DATABASE_URL || '';
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: u.username,
      password: u.password,
      database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
    };
  } catch (e) {
    return { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'lowcode_dev' };
  }
})();

const pool = mysql.createPool({ ...poolConfig, waitForConnections: true, connectionLimit: 10 });

function sqlTypeForField(type: string) {
  switch (type) {
    case 'string':
      return 'TEXT';
    case 'number':
      return 'DOUBLE';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATETIME';
    default:
      return 'TEXT';
  }
}

export async function ensureTableForModel(def: any) {
  const fieldsSql = def.fields
    .map((f: any) => `\`${f.name}\` ${sqlTypeForField(f.type)}${f.required ? ' NOT NULL' : ''}${f.unique ? ' UNIQUE' : ''}`)
    .join(', ');
  // Ensure updatedAt has a default and updates automatically on row change so
  // INSERT statements that don't provide updatedAt won't fail.
  const createSql = `CREATE TABLE IF NOT EXISTS \`${def.name}\` (id VARCHAR(36) PRIMARY KEY, ${fieldsSql}, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`;
  const conn = await pool.getConnection();
  try {
    await conn.query(createSql);
  } finally {
    conn.release();
  }
}

export function registerCrudRoutesForModel(app: Express, def: any) {
  const router = Router();
  const modelsDir = path.join(__dirname, '..', 'models-definitions');
  const rbac = rbacMiddlewareFactory(modelsDir, def.name);

  // Ensure DB table exists (skip if no DATABASE_URL configured)
  if (process.env.DATABASE_URL) {
    ensureTableForModel(def).catch((e) => console.error('ensureTable', e));
  } else {
    console.warn('DATABASE_URL not set — skipping table creation for', def.name);
  }

  // Create
  router.post(`/${def.name}`, authMiddleware, rbac, async (req: Request, res: Response) => {
    const body = req.body || {};
    const id = body.id || uuidv4();
    const keys = Object.keys(body);
    const cols = ['id', ...keys].map((c) => `\`${c}\``).join(', ');
    const values = [id, ...keys.map((k) => body[k])];
    const placeholders = values.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${def.name}\` (${cols}) VALUES (${placeholders})`;
    const conn = await pool.getConnection();
    try {
      await conn.query(sql, values);
      const [rows] = await conn.query(`SELECT * FROM \`${def.name}\` WHERE id = ? LIMIT 1`, [id]);
      return res.json((rows as any)[0]);
    } finally {
      conn.release();
    }
  });

  // List
  router.get(`/${def.name}`, authMiddleware, rbac, async (req: Request, res: Response) => {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(`SELECT * FROM \`${def.name}\` LIMIT 100`);
      return res.json(rows);
    } finally {
      conn.release();
    }
  });

  // Get by id
  router.get(`/${def.name}/:id`, authMiddleware, rbac, async (req: Request, res: Response) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(`SELECT * FROM \`${def.name}\` WHERE id = ? LIMIT 1`, [id]);
      if ((rows as any).length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json((rows as any)[0]);
    } finally {
      conn.release();
    }
  });

  // Update
  router.put(`/${def.name}/:id`, authMiddleware, rbac, async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = req.body || {};
    const conn = await pool.getConnection();
    try {
      // if ownerField present, enforce ownership
      if (def.ownerField) {
        const [ownerRows] = await conn.query(`SELECT \`${def.ownerField}\` FROM \`${def.name}\` WHERE id = ?`, [id]);
        if ((ownerRows as any).length === 0) return res.status(404).json({ error: 'Not found' });
        const ownerId = (ownerRows as any)[0][def.ownerField];
        if (req.user?.userId !== ownerId && req.user?.role !== 'Admin') return res.status(403).json({ error: 'Not owner' });
      }
      const keys = Object.keys(body);
      const sets = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const values = keys.map((k) => body[k]);
      values.push(id);
      const sql = `UPDATE \`${def.name}\` SET ${sets} WHERE id = ?`;
      await conn.query(sql, values);
      const [rows] = await conn.query(`SELECT * FROM \`${def.name}\` WHERE id = ? LIMIT 1`, [id]);
      return res.json((rows as any)[0]);
    } finally {
      conn.release();
    }
  });

  // Delete
  router.delete(`/${def.name}/:id`, authMiddleware, rbac, async (req: Request, res: Response) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
      if (def.ownerField) {
        const [ownerRows] = await conn.query(`SELECT \`${def.ownerField}\` FROM \`${def.name}\` WHERE id = ?`, [id]);
        if ((ownerRows as any).length === 0) return res.status(404).json({ error: 'Not found' });
        const ownerId = (ownerRows as any)[0][def.ownerField];
        if (req.user?.userId !== ownerId && req.user?.role !== 'Admin') return res.status(403).json({ error: 'Not owner' });
      }
      await conn.query(`DELETE FROM \`${def.name}\` WHERE id = ?`, [id]);
      return res.json({ ok: true });
    } finally {
      conn.release();
    }
  });

  // Mount under /api
  app.use('/api', router);
}

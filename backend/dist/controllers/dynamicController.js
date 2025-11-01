"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTableForModel = ensureTableForModel;
exports.registerCrudRoutesForModel = registerCrudRoutesForModel;
const express_1 = require("express");
const promise_1 = __importDefault(require("mysql2/promise"));
const path_1 = __importDefault(require("path"));
const rbac_1 = require("../middleware/rbac");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
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
    }
    catch (e) {
        return { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'lowcode_dev' };
    }
})();
const pool = promise_1.default.createPool({ ...poolConfig, waitForConnections: true, connectionLimit: 10 });
function sqlTypeForField(type) {
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
async function ensureTableForModel(def) {
    const fieldsSql = def.fields
        .map((f) => `\`${f.name}\` ${sqlTypeForField(f.type)}${f.required ? ' NOT NULL' : ''}${f.unique ? ' UNIQUE' : ''}`)
        .join(', ');
    // Ensure updatedAt has a default and updates automatically on row change so
    // INSERT statements that don't provide updatedAt won't fail.
    const createSql = `CREATE TABLE IF NOT EXISTS \`${def.name}\` (id VARCHAR(36) PRIMARY KEY, ${fieldsSql}, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`;
    const conn = await pool.getConnection();
    try {
        await conn.query(createSql);
    }
    finally {
        conn.release();
    }
}
function registerCrudRoutesForModel(app, def) {
    const router = (0, express_1.Router)();
    const modelsDir = path_1.default.join(__dirname, '..', 'models-definitions');
    const rbac = (0, rbac_1.rbacMiddlewareFactory)(modelsDir, def.name);
    // Ensure DB table exists (skip if no DATABASE_URL configured)
    if (process.env.DATABASE_URL) {
        ensureTableForModel(def).catch((e) => console.error('ensureTable', e));
    }
    else {
        console.warn('DATABASE_URL not set — skipping table creation for', def.name);
    }
    // Create
    router.post(`/${def.name}`, auth_1.authMiddleware, rbac, async (req, res) => {
        const body = req.body || {};
        const id = body.id || (0, uuid_1.v4)();
        const keys = Object.keys(body);
        const cols = ['id', ...keys].map((c) => `\`${c}\``).join(', ');
        const values = [id, ...keys.map((k) => body[k])];
        const placeholders = values.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${def.name}\` (${cols}) VALUES (${placeholders})`;
        const conn = await pool.getConnection();
        try {
            await conn.query(sql, values);
            const [rows] = await conn.query(`SELECT * FROM \`${def.name}\` WHERE id = ? LIMIT 1`, [id]);
            return res.json(rows[0]);
        }
        finally {
            conn.release();
        }
    });
    // List
    router.get(`/${def.name}`, auth_1.authMiddleware, rbac, async (req, res) => {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM \`${def.name}\` LIMIT 100`);
            return res.json(rows);
        }
        finally {
            conn.release();
        }
    });
    // Get by id
    router.get(`/${def.name}/:id`, auth_1.authMiddleware, rbac, async (req, res) => {
        const { id } = req.params;
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM \`${def.name}\` WHERE id = ? LIMIT 1`, [id]);
            if (rows.length === 0)
                return res.status(404).json({ error: 'Not found' });
            return res.json(rows[0]);
        }
        finally {
            conn.release();
        }
    });
    // Update
    router.put(`/${def.name}/:id`, auth_1.authMiddleware, rbac, async (req, res) => {
        const { id } = req.params;
        const body = req.body || {};
        const conn = await pool.getConnection();
        try {
            // if ownerField present, enforce ownership
            if (def.ownerField) {
                const [ownerRows] = await conn.query(`SELECT \`${def.ownerField}\` FROM \`${def.name}\` WHERE id = ?`, [id]);
                if (ownerRows.length === 0)
                    return res.status(404).json({ error: 'Not found' });
                const ownerId = ownerRows[0][def.ownerField];
                if (req.user?.userId !== ownerId && req.user?.role !== 'Admin')
                    return res.status(403).json({ error: 'Not owner' });
            }
            const keys = Object.keys(body);
            const sets = keys.map((k) => `\`${k}\` = ?`).join(', ');
            const values = keys.map((k) => body[k]);
            values.push(id);
            const sql = `UPDATE \`${def.name}\` SET ${sets} WHERE id = ?`;
            await conn.query(sql, values);
            const [rows] = await conn.query(`SELECT * FROM \`${def.name}\` WHERE id = ? LIMIT 1`, [id]);
            return res.json(rows[0]);
        }
        finally {
            conn.release();
        }
    });
    // Delete
    router.delete(`/${def.name}/:id`, auth_1.authMiddleware, rbac, async (req, res) => {
        const { id } = req.params;
        const conn = await pool.getConnection();
        try {
            if (def.ownerField) {
                const [ownerRows] = await conn.query(`SELECT \`${def.ownerField}\` FROM \`${def.name}\` WHERE id = ?`, [id]);
                if (ownerRows.length === 0)
                    return res.status(404).json({ error: 'Not found' });
                const ownerId = ownerRows[0][def.ownerField];
                if (req.user?.userId !== ownerId && req.user?.role !== 'Admin')
                    return res.status(403).json({ error: 'Not owner' });
            }
            await conn.query(`DELETE FROM \`${def.name}\` WHERE id = ?`, [id]);
            return res.json({ ok: true });
        }
        finally {
            conn.release();
        }
    });
    // Mount under /api
    app.use('/api', router);
}

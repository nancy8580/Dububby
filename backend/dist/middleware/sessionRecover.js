"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoverSessionFromDb = recoverSessionFromDb;
const cookie_1 = __importDefault(require("cookie"));
const cookie_signature_1 = __importDefault(require("cookie-signature"));
const promise_1 = __importDefault(require("mysql2/promise"));
// This middleware attempts to recover a session from the DB when express-session
// didn't populate req.session (some stores or signing mismatches can cause this).
async function recoverSessionFromDb(req, res, next) {
    try {
        if (req.session && req.session.user)
            return next();
        const raw = req.headers.cookie;
        if (!raw)
            return next();
        const parsed = cookie_1.default.parse(raw || '');
        const val = parsed['sid'] || parsed['connect.sid'];
        if (!val)
            return next();
        // unsign
        if (!val.startsWith('s:'))
            return next();
        const unsigned = cookie_signature_1.default.unsign(val.slice(2), process.env.SESSION_SECRET || 'dev_session_secret');
        if (!unsigned)
            return next();
        // create a short-lived pool to query sessions table
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
                    waitForConnections: true,
                    connectionLimit: 2
                };
            }
            catch (e) {
                return {
                    host: process.env.DB_HOST || 'localhost',
                    port: Number(process.env.DB_PORT || 3306),
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASS || '',
                    database: process.env.DB_NAME || 'lowcode_dev',
                    waitForConnections: true,
                    connectionLimit: 2
                };
            }
        })();
        const pool = promise_1.default.createPool(poolConfig);
        const [rows] = await pool.query(`SELECT data, expires FROM sessions WHERE sid = ? LIMIT 1`, [unsigned]);
        await pool.end();
        const r = rows[0];
        if (!r)
            return next();
        if (r.expires && Number(r.expires) < Date.now()) {
            return next();
        }
        const sess = JSON.parse(r.data);
        // attach to req.session and req.user for downstream middleware
        req.session = sess;
        req.user = sess.user;
        return next();
    }
    catch (e) {
        console.warn('recoverSessionFromDb failed', e);
        return next();
    }
}
exports.default = recoverSessionFromDb;

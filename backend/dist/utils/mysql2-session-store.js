"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQL2SessionStore = void 0;
const express_session_1 = __importDefault(require("express-session"));
class MySQL2SessionStore extends express_session_1.default.Store {
    constructor(pool, table = 'sessions') {
        super();
        this.pool = pool;
        this.table = table;
        this.ensureTable().catch((e) => console.error('Failed to ensure sessions table', e));
    }
    async ensureTable() {
        const createSql = `CREATE TABLE IF NOT EXISTS \`${this.table}\` (
      sid VARCHAR(128) NOT NULL PRIMARY KEY,
      data LONGTEXT NOT NULL,
      expires BIGINT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`;
        await this.pool.query(createSql);
    }
    async get(sid, callback) {
        try {
            console.log('[session store] get', sid);
            const [rows] = await this.pool.query(`SELECT data, expires FROM \`${this.table}\` WHERE sid = ? LIMIT 1`, [sid]);
            const r = rows[0];
            if (!r)
                return callback(null, null);
            const now = Date.now();
            if (r.expires && Number(r.expires) < now) {
                // expired
                await this.destroy(sid, () => { });
                return callback(null, null);
            }
            const sess = JSON.parse(r.data);
            console.log('[session store] get returned sess keys=', Object.keys(sess || {}));
            return callback(null, sess);
        }
        catch (err) {
            return callback(err);
        }
    }
    async set(sid, sessionData, callback) {
        try {
            console.log('[session store] set', sid, 'keys=', Object.keys(sessionData || {}));
            const json = JSON.stringify(sessionData);
            const expires = sessionData.cookie && sessionData.cookie.expires ? new Date(sessionData.cookie.expires).getTime() : (Date.now() + (sessionData.cookie && sessionData.cookie.maxAge ? sessionData.cookie.maxAge : 0));
            const sql = `INSERT INTO \`${this.table}\` (sid, data, expires) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)`;
            await this.pool.query(sql, [sid, json, expires]);
            if (callback)
                callback(null);
        }
        catch (err) {
            if (callback)
                callback(err);
        }
    }
    async destroy(sid, callback) {
        try {
            await this.pool.query(`DELETE FROM \`${this.table}\` WHERE sid = ?`, [sid]);
            if (callback)
                callback(null);
        }
        catch (err) {
            if (callback)
                callback(err);
        }
    }
    // touch is optional but useful to update expiry
    async touch(sid, sessionData, callback) {
        try {
            const expires = sessionData.cookie && sessionData.cookie.expires ? new Date(sessionData.cookie.expires).getTime() : (Date.now() + (sessionData.cookie && sessionData.cookie.maxAge ? sessionData.cookie.maxAge : 0));
            await this.pool.query(`UPDATE \`${this.table}\` SET expires = ? WHERE sid = ?`, [expires, sid]);
            if (callback)
                callback(null);
        }
        catch (err) {
            if (callback)
                callback(err);
        }
    }
}
exports.MySQL2SessionStore = MySQL2SessionStore;
exports.default = MySQL2SessionStore;

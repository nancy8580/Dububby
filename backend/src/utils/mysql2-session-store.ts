import session from 'express-session';
import mysql from 'mysql2/promise';

type PoolLike = mysql.Pool;

export class MySQL2SessionStore extends session.Store {
  pool: PoolLike;
  table: string;

  constructor(pool: PoolLike, table = 'sessions') {
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

  async get(sid: string, callback: (err?: any, session?: session.SessionData | null) => void) {
    try {
  console.log('[session store] get', sid);
      const [rows] = await this.pool.query(`SELECT data, expires FROM \`${this.table}\` WHERE sid = ? LIMIT 1`, [sid]);
      const r: any = (rows as any)[0];
      if (!r) return callback(null, null);
      const now = Date.now();
      if (r.expires && Number(r.expires) < now) {
        // expired
        await this.destroy(sid, () => {});
        return callback(null, null);
      }
  const sess = JSON.parse(r.data);
  console.log('[session store] get returned sess keys=', Object.keys(sess || {}));
      return callback(null, sess);
    } catch (err) {
      return callback(err);
    }
  }

  async set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    try {
  console.log('[session store] set', sid, 'keys=', Object.keys(sessionData || {}));
      const json = JSON.stringify(sessionData);
      const expires = sessionData.cookie && sessionData.cookie.expires ? new Date(sessionData.cookie.expires).getTime() : (Date.now() + (sessionData.cookie && (sessionData.cookie as any).maxAge ? (sessionData.cookie as any).maxAge : 0));
      const sql = `INSERT INTO \`${this.table}\` (sid, data, expires) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)`;
      await this.pool.query(sql, [sid, json, expires]);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await this.pool.query(`DELETE FROM \`${this.table}\` WHERE sid = ?`, [sid]);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  // touch is optional but useful to update expiry
  async touch(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    try {
      const expires = sessionData.cookie && sessionData.cookie.expires ? new Date(sessionData.cookie.expires).getTime() : (Date.now() + (sessionData.cookie && (sessionData.cookie as any).maxAge ? (sessionData.cookie as any).maxAge : 0));
      await this.pool.query(`UPDATE \`${this.table}\` SET expires = ? WHERE sid = ?`, [expires, sid]);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}

export default MySQL2SessionStore;
